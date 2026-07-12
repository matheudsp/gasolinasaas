import type { auth } from "./auth";

// Tipagem compartilhada do app Hono. Bindings declarados explicitamente (só
// o que usamos) para não depender do nome do interface gerado por
// `wrangler types` — R2Bucket é um global do runtime, sempre presente.
export type AppEnv = {
  Bindings: {
    DATABASE_URL: string;
    REWARD_IMAGES: R2Bucket;
  };
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};
