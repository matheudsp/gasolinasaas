import { applicationId } from "expo-application"
import Constants from "expo-constants"
import { useMMKVString } from "react-native-mmkv"

import { storage } from "@/utils/storage"

/**
 * Rede fixada no build por um app DEDICADO (extra.tenantSlug no app.config.ts,
 * setado por APP_VARIANT). Undefined no app guarda-chuva. É a fonte única do
 * "este binário é de UMA rede só".
 */
export const DEDICATED_TENANT_SLUG =
  (Constants.expoConfig?.extra?.tenantSlug as string | undefined) ?? null

/** true = build dedicado (um tenant fixo, sem seletor de rede). */
export const IS_DEDICATED_APP = DEDICATED_TENANT_SLUG !== null

/**
 * Fonte única do tenant (rede) ativo do app guarda-chuva.
 *
 * O app "Gasolina" é um só para todas as redes: o usuário escolhe a rede na
 * tela de seleção e o slug fica persistido aqui. TODO request (oRPC e auth)
 * lê este valor na hora do envio — nada de constante de módulo: trocar de
 * rede muda o header da requisição seguinte sem reiniciar nada.
 *
 * Sem slug = nenhuma rede escolhida ainda → os layouts redirecionam pra
 * tela de seleção (identidade Gasolina Cloud).
 */

export const ACTIVE_TENANT_KEY = "tenant.active.slug"

/** Leitura síncrona — usada nos headers por request. */
export function getActiveTenantSlug(): string | null {
  return storage.getString(ACTIVE_TENANT_KEY) ?? null
}

export function setActiveTenantSlug(slug: string | null) {
  if (slug) {
    storage.set(ACTIVE_TENANT_KEY, slug)
  } else {
    storage.delete(ACTIVE_TENANT_KEY)
  }
}

/** Versão reativa — usada nos gates de rota e no root layout. */
export function useActiveTenantSlug() {
  return useMMKVString(ACTIVE_TENANT_KEY, storage)
}

/**
 * Seed da rede ativa (roda no primeiro import), em ordem de precedência:
 * - Build DEDICADO (extra.tenantSlug): fixa a rede do binário — o usuário
 *   nunca vê o seletor. É a fonte única e primária.
 * - Binário legado com.mdsp.martinez: hack morto que sobrevive só se um
 *   desses binários antigos consumir este bundle via OTA. NÃO copie esse
 *   caminho pra novas redes — use extra.tenantSlug (build dedicado).
 * - Dev: EXPO_PUBLIC_TENANT_SLUG pré-seleciona uma rede pra pular o seletor.
 */
if (!storage.contains(ACTIVE_TENANT_KEY)) {
  if (DEDICATED_TENANT_SLUG) {
    storage.set(ACTIVE_TENANT_KEY, DEDICATED_TENANT_SLUG)
  } else if (applicationId === "com.mdsp.martinez") {
    storage.set(ACTIVE_TENANT_KEY, "martinez")
  } else if (__DEV__ && process.env.EXPO_PUBLIC_TENANT_SLUG) {
    storage.set(ACTIVE_TENANT_KEY, process.env.EXPO_PUBLIC_TENANT_SLUG)
  }
}
