import { mmkvStorageAdapter } from "@/utils/storage";
import { expoClient} from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import Config from "@/config";


export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_SERVER_URL,
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
