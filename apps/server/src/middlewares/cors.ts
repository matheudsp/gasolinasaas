import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";

// CORS middleware for auth endpoints
export const authCorsMiddleware: MiddlewareHandler = (c, next) => {
  const env = c.env as Record<string, string>;
  const corsMiddleware = cors({
    origin: [  ...(env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? []),...(env.NODE_ENV === "development" ? ["http://10.0.2.2:8081",
        "http://localhost:8081",
        "http://localhost:15001",] : []),],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      // Clientes web mandam o tenant também nas rotas de auth, para
      // brandear os e-mails transacionais (ver lib/auth.ts).
      
      "x-tenant-id",
      "x-tenant-slug",
    ],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Set-Cookie"],
    maxAge: 600,
    credentials: true,
  });
  return corsMiddleware(c, next);
};

// CORS middleware for API and RPC endpoints
export const apiCorsMiddleware: MiddlewareHandler = (c, next) => {
  const env = c.env as Record<string, string>;
  const corsMiddleware = cors({
    origin: [  ...(env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? []),...(env.NODE_ENV === "development" ? ["http://10.0.2.2:8081",
        "http://localhost:8081",
        "http://localhost:15001",] : []),],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-tenant-id",
      "x-tenant-slug",
      // Requests em lote do oRPC (BatchLinkPlugin) — sem isso o preflight
      // passa mas o browser mata o POST /__batch__ com ERR_FAILED.
      "x-orpc-batch",
    ],
    credentials: true,
  });
  return corsMiddleware(c, next);
};
