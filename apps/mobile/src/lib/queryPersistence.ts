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
export const queryCachePersister = createSyncStoragePersister({
  storage: {
    getItem: (key: string) => storage.getString(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  key: "tanstack.query.cache.v1",
})

/** Quanto tempo o cache persistido vale entre aberturas. */
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 // 24h

/**
 * Trocar de versão do app descarta o cache persistido — evita hidratar
 * shapes antigos depois de um update OTA que mudou o contrato de um router.
 */
export const queryCacheBuster = `v${Constants.expoConfig?.version ?? "0"}`
