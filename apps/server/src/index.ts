import { Hono } from "hono";
import { logger } from "hono/logger";
import { apiHandler } from "./handlers/api";
import { rpcHandler } from "./handlers/rpc";
import { auth } from "./lib/auth";
import { createContext } from "./lib/context";
import { executionCtxStorage } from "./lib/execution-context";
import { apiCorsMiddleware, authCorsMiddleware } from "./middlewares/cors";
import { errorHandler } from "./middlewares/error";
import { sessionMiddleware } from "./middlewares/session";
import { stripTenantPrefixFromRequest } from "./utils/tenant";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// Global error handler
app.onError(errorHandler);

// Logger middleware
app.use(logger());

// Session middleware for API and RPC routes
app.use("/api/*", sessionMiddleware);
app.use("/rpc/*", sessionMiddleware);

// CORS for auth endpoints
app.use("/api/auth/*", authCorsMiddleware);
app.use("/api/auth/*", async (c, next) => executionCtxStorage.run(c.executionCtx, next));

// Better Auth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));


// CORS for API and RPC endpoints
app.use("/rpc/*", apiCorsMiddleware);
app.use("/api/*", apiCorsMiddleware);

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

export default app;