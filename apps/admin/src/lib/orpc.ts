import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppRouterClient } from "../../../server/src/routers/index";

let activeTenantId: string | undefined;

export function setActiveTenant(tenantId: string | undefined) {
  activeTenantId = tenantId;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(`Erro: ${error.message}`, {
        action: {
          label: "Tentar novamente",
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});

export const link = new RPCLink({
  url: `${import.meta.env.VITE_API_URL}/rpc`,
  // Chamadas no mesmo tick viram UM request HTTP (server desempacota via
  // BatchHandlerPlugin) — economiza requests do Worker na Cloudflare.
  plugins: [
    new BatchLinkPlugin({
      groups: [{ condition: () => true, context: {} }],
    }),
  ],
  headers: () => ({
    ...(activeTenantId ? { "x-tenant-id": activeTenantId } : {}),
  }),
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);