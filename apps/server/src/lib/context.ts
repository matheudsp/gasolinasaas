import type { Context as HonoContext } from "hono";

import { resolveTenantContext } from "./tenant";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = context.get("session")
    ? { user: context.get("user"), session: context.get("session") }
    : null;

  const tenantContext = await resolveTenantContext({
    request: context.req.raw,
    sessionUserId: session?.user?.id,
  });

  return {
    session,
    ...tenantContext,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
