import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";

// CORS_ORIGIN aceita múltiplas origins separadas por vírgula
// (ex: painel admin + Expo web em dev).
const parseOrigins = (value: string | undefined): string[] | string =>
  value ? value.split(",").map((o) => o.trim()) : "*";

// CORS middleware for auth endpoints
export const authCorsMiddleware: MiddlewareHandler = (c, next) => {
  const env = c.env as Record<string, string>;
  const corsMiddleware = cors({
    origin: parseOrigins(env.CORS_ORIGIN),
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
    origin: parseOrigins(env.CORS_ORIGIN),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-tenant-id",
      "x-tenant-slug",
    ],
    credentials: true,
  });
  return corsMiddleware(c, next);
};
