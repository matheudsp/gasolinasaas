import { AsyncLocalStorage } from "node:async_hooks";
import type { Context } from "hono";

/**
 * Deriva o tipo direto de Context["executionCtx"] em vez de referenciar o
 * símbolo global `ExecutionContext` manualmente — evita conflito entre a
 * definição ambiente/pacote e a gerada pelo `wrangler types` em
 * worker-configuration.d.ts (que adiciona campos como `tracing` e pode
 * divergir conforme a versão do wrangler/@cloudflare/workers-types).
 * Assim o tipo aqui sempre bate exatamente com o que `c.executionCtx`
 * realmente retorna neste projeto, seja qual for a versão.
 */
type ExecCtx = Context["executionCtx"];

/**
 * Permite acessar o ExecutionContext (e portanto `waitUntil`) de dentro de
 * qualquer código, mesmo dentro do singleton `auth` exportado em nível de
 * módulo — sem precisar reconstruir o Better Auth a cada request.
 *
 * Requer a flag `nodejs_compat` no wrangler.toml/wrangler.jsonc.
 */
export const executionCtxStorage = new AsyncLocalStorage<ExecCtx>();