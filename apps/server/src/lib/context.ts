import type { Context as HonoContext } from "hono";
import { createDb } from "../db";
import type { RateLimitBinding } from "./hono-env";
import { resolveTenantContext } from "./tenant";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const env = context.env as Record<string, string> & {
    CPF_RATE_LIMIT?: RateLimitBinding;
  };
  const db = createDb(env.DATABASE_URL || "");

  const session = context.get("session")
    ? { user: context.get("user"), session: context.get("session") }
    : null;

  const tenantContext = await resolveTenantContext({
    request: context.req.raw,
    sessionUserId: session?.user?.id,
    db,
  });

  return {
    db,
    session,
    // IP real do cliente (header da Cloudflare) — chave de rate limiting.
    clientIp: context.req.header("cf-connecting-ip") ?? null,
    // Binding do rate limiter; undefined fora do Worker (ex.: testes).
    cpfRateLimit: env.CPF_RATE_LIMIT,
    ...tenantContext,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
