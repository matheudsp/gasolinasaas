import { mmkvStorageAdapter } from "@/utils/storage";
import { expoClient} from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
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
    // saem sem o branding da rede, porque o servidor resolve o tenant a
    // partir deste header. O cliente oRPC (lib/orpc.ts) já faz o mesmo.
    headers: Config.TENANT_SLUG ? { "x-tenant-slug": Config.TENANT_SLUG } : {},
  },
  plugins: [
    expoClient({
      scheme: "martinezapp",
      storagePrefix: "martinez-auth",
      storage: mmkvStorageAdapter,
    }),
  ],
});
