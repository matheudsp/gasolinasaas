import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
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