import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";
import { appRouter } from "../routers/index";

export const rpcHandler = new RPCHandler(appRouter, {
  // Aceita requests em lote (BatchLinkPlugin nos clientes): várias chamadas
  // RPC no mesmo tick viram UM request HTTP — cada request do Worker conta
  // na cota da Cloudflare, então o boot do mobile cai de ~4 pra ~2.
  plugins: [new BatchHandlerPlugin()],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});
