import type { auth } from "./auth";

/**
 * Binding do Workers Rate Limiting API (declarado em `ratelimits` no
 * wrangler.jsonc). Tipo próprio pra não depender da versão dos types
 * gerados pelo wrangler.
 */
export type RateLimitBinding = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
};

// Tipagem compartilhada do app Hono. Bindings declarados explicitamente (só
// o que usamos) para não depender do nome do interface gerado por
// `wrangler types` — R2Bucket é um global do runtime, sempre presente.
export type AppEnv = {
  Bindings: {
    DATABASE_URL: string;
    REWARD_IMAGES: R2Bucket;
    CPF_RATE_LIMIT: RateLimitBinding;
  };
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};
