import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import Constants from "expo-constants"

import { storage } from "@/utils/storage"

/**
 * Persistência do cache do TanStack Query no MMKV.
 *
 * Motivação: cada abertura do app custava uma rodada completa de requests ao
 * Worker (plano da Cloudflare é limitado por requests/dia). Com o cache
 * persistido, queries estáveis (branding, papel no tenant, combustíveis)
 * hidratam do disco e só vão à rede quando o staleTime delas expira — o
 * boot típico cai de ~7 pra ~4 requests.
 *
 * O MMKV é síncrono, então a restauração acontece antes do primeiro render —
 * sem flicker de loading pra dados já conhecidos.
 */
export const QUERY_CACHE_STORAGE_KEY = "tanstack.query.cache.v1"

export const queryCachePersister = createSyncStoragePersister({
  storage: {
    getItem: (key: string) => storage.getString(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  key: QUERY_CACHE_STORAGE_KEY,
})

/** Quanto tempo o cache persistido vale entre aberturas. */
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 // 24h

/**
 * O buster amarra o cache persistido à versão do app E à rede ativa:
 * - update OTA que muda contrato de router descarta shapes antigos;
 * - trocar de rede descarta o cache da anterior mesmo se a limpeza do
 *   switchTenant for interrompida (ex.: Android fecha o app na troca de
 *   ícone) — o restore com buster diferente joga tudo fora.
 */
export function getQueryCacheBuster(tenantSlug: string | null | undefined) {
  return `v${Constants.expoConfig?.version ?? "0"}:${tenantSlug ?? "none"}`
}
