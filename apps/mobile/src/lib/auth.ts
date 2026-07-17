import { mmkvStorageAdapter } from "@/utils/storage";
import { expoClient} from "@better-auth/expo/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { getActiveTenantSlug } from "@/lib/activeTenant";
import Config from "@/config";


export const authClient = createAuthClient({
  // MESMA base do cliente oRPC (lib/orpc.ts): localhost em dev, produção em
  // build. Auth e dados precisam apontar pro mesmo servidor — o cookie de
  // sessão é assinado pelo BETTER_AUTH_SECRET daquele backend, então logar
  // em um servidor e chamar RPC em outro resulta em 401 em tudo.
  baseURL: Config.API_URL,
  fetchOptions: {
    // Identifica a rede (tenant) também nas rotas de auth — sem isso os
    // e-mails transacionais do Better Auth (reset de senha, verificação)
    // saem sem o branding da rede. Lido POR REQUEST (onRequest, não objeto
    // estático): no app guarda-chuva a rede é escolhida/trocada em runtime.
    onRequest(context) {
      const tenantSlug = getActiveTenantSlug();
      if (tenantSlug) {
        context.headers.set("x-tenant-slug", tenantSlug);
      }
    },
  },
  plugins: [
    // Schema EXPLÍCITO (não inferAdditionalFields<typeof auth>): importar o
    // tipo do server puxaria `cloudflare:workers` pro bundle do app.
    inferAdditionalFields({
      user: { cpf: { type: "string", required: false } },
    }),
    expoClient({
      scheme: "gasolina",
      storagePrefix: "gasolina-auth",
      storage: mmkvStorageAdapter,
    }),
  ],
});
