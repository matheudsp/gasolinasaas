import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";

// CORS middleware for auth endpoints
export const authCorsMiddleware: MiddlewareHandler = (c, next) => {
  const env = c.env as Record<string, string>;
  const corsMiddleware = cors({
    origin: env.CORS_ORIGIN || "*",
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
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
    origin: env.CORS_ORIGIN || "*",
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
