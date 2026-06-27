import type { Context, Next } from "hono";
import { auth } from "../lib/auth";

export const sessionMiddleware = async (c: Context, next: Next) => {
  // Skip auth check for auth endpoints
  if (c.req.path.startsWith("/api/auth/")) {
    return next();
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }
  c.set("user", session.user);
  c.set("session", session.session);
  return next();
};
