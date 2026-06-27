import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { authClient } from "@/services/auth";
import type { AppRouterClient } from "../../../server/src/routers";
import Config from "@/config";


const TENANT_SLUG = process.env.EXPO_PUBLIC_TENANT_SLUG;

if (!TENANT_SLUG) {
  throw new Error(
    "EXPO_PUBLIC_TENANT_SLUG não está definido. Adicione ao .env do app."
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