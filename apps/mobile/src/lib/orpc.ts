import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import type { AppRouterClient } from "../../../server/src/routers";
import Config from "@/config";


const TENANT_SLUG = Config.TENANT_SLUG;

if (!TENANT_SLUG) {
  throw new Error(
    "Tenant não resolvido: o applicationId deste binário não está em tenants/registry.ts e não há EXPO_PUBLIC_TENANT_SLUG de fallback."
  );
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      // Precisa ser >= maxAge da persistência (queryPersistence.ts): só
      // queries ainda vivas no cache são gravadas/hidratadas do MMKV.
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      console.error(error);
    },
  }),
});

export const link = new RPCLink({
  url: `${Config.API_URL}/rpc`,
  // Chamadas disparadas no mesmo tick (ex.: as queries do boot) viram UM
  // request HTTP — o server desempacota via BatchHandlerPlugin. Cada request
  // do Worker conta na cota da Cloudflare.
  plugins: [
    new BatchLinkPlugin({
      groups: [{ condition: () => true, context: {} }],
    }),
  ],
  headers() {
    const headers: Record<string, string> = {
      "x-tenant-slug": TENANT_SLUG,
    };

    const cookies = authClient.getCookie();
    if (cookies) {
      headers["Cookie"] = cookies;
    }

    return headers;
  },
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);