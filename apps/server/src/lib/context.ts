import type { Context as HonoContext } from "hono";
import { createDb } from "../db";
import { resolveTenantContext } from "./tenant";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const env = context.env as Record<string, string>;
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
    ...tenantContext,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
