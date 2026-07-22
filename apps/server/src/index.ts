import { Hono } from "hono";
import { logger } from "hono/logger";
import { createDb } from "./db";
import { apiHandler } from "./handlers/api";
import { rpcHandler } from "./handlers/rpc";
import { runExpirePointsJob } from "./jobs/expire-points";
import { runExpiringPointsWarningJob } from "./jobs/expiring-points-warning";

/** Precisa bater EXATAMENTE com a entrada em triggers.crons do wrangler.jsonc. */
const EXPIRING_WARNING_CRON = "0 12 * * *";
import { auth } from "./lib/auth";
import { createContext } from "./lib/context";
import { executionCtxStorage } from "./lib/execution-context";
import type { AppEnv } from "./lib/hono-env";
import { apiCorsMiddleware, authCorsMiddleware } from "./middlewares/cors";
import { errorHandler } from "./middlewares/error";
import { sessionMiddleware } from "./middlewares/session";
import { rewardImageRoutes } from "./routes/reward-image";
import { tenantLogoRoutes } from "./routes/tenant-logo";
import { stripTenantPrefixFromRequest } from "./utils/tenant";

const app = new Hono<AppEnv>();

// Global error handler
app.onError(errorHandler);

// Logger middleware
app.use(logger());

// ExecutionContext acessível via AsyncLocalStorage em QUALQUER handler —
// waitUntil pra trabalho pós-resposta (e-mails do auth, push transacional
// de fidelidade). Sem isso o Worker mata a promise junto com a resposta.
app.use(async (c, next) => executionCtxStorage.run(c.executionCtx, next));

// Session middleware for API and RPC routes
app.use("/api/*", sessionMiddleware);
app.use("/rpc/*", sessionMiddleware);

// CORS for auth endpoints
app.use("/api/auth/*", authCorsMiddleware);

// Better Auth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));


// CORS for API and RPC endpoints
app.use("/rpc/*", apiCorsMiddleware);
app.use("/api/*", apiCorsMiddleware);

// Fotos de recompensa (R2): upload e serviço. Antes do catch-all oRPC para
// terem precedência sobre os handlers RPC/API.
app.route("/", rewardImageRoutes);

// Logo white-label do tenant (R2): upload e serviço. Mesma razão de vir
// antes do catch-all.
app.route("/", tenantLogoRoutes);

// RPC and API handler
app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });
  const normalizedRequest = stripTenantPrefixFromRequest(c.req.raw);

  const rpcResult = await rpcHandler.handle(normalizedRequest, {
    prefix: "/rpc",
    context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(normalizedRequest, {
    prefix: "/api",
    context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

// Health check endpoint
app.get("/", (c) =>
  c.json({
    status: "ok",
    service: "Gasolina API",
    timestamp: new Date().toISOString(),
  })
);

app.get("/session", (c) => {
  const session = c.get("session");
  const user = c.get("user");

  if (!user) {
    return c.body(null, 401);
  }

  return c.json({
    session,
    user,
  });
});

export default {
  fetch: app.fetch,

  /**
   * Cron Triggers (wrangler.jsonc → triggers.crons). São DOIS horários de
   * propósito: cada invocação tem seu próprio orçamento de subrequests, e
   * somar os dois jobs numa só estouraria o teto do plano.
   *
   * - 03:00 UTC (meia-noite BRT): expire pass em lote — complementa o expire
   *   pass preguiçoso pra clientes dormentes, senão o passivo do painel fica
   *   superestimado até cada um abrir o app.
   * - 12:00 UTC (09:00 BRT): aviso de pontos a vencer — horário em que a
   *   pessoa está acordada e o push tem chance de ser lido.
   */
  async scheduled(
    controller: { cron?: string },
    env: AppEnv["Bindings"],
    _ctx: unknown,
  ) {
    const db = createDb(env.DATABASE_URL || "");

    if (controller.cron === EXPIRING_WARNING_CRON) {
      const result = await runExpiringPointsWarningJob(db);
      console.log(
        `[expiring-points] avisados: ${result.notified}, falhas: ${result.failed}`,
      );
      return;
    }

    const result = await runExpirePointsJob(db);
    console.log(
      `[expire-points] clientes: ${result.processed} ok, ${result.failed} falhas; pontos expirados: ${result.expiredPoints}`,
    );
  },
};