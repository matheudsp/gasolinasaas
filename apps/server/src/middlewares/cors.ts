import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";

// CORS_ORIGIN aceita lista separada por vírgula (ex: admin + expo web).
// hono/cors com string exige igualdade exata com o Origin da request,
// então uma lista precisa virar array.
const parseOrigins = (value: string | undefined): string | string[] => {
  if (!value) return "*";
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
};

// CORS middleware for auth endpoints
export const authCorsMiddleware: MiddlewareHandler = (c, next) => {
  const env = c.env as Record<string, string>;
  const corsMiddleware = cors({
    origin: parseOrigins(env.CORS_ORIGIN),
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
