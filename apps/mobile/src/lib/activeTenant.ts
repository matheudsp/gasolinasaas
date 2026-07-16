import { applicationId } from "expo-application"
import { useMMKVString } from "react-native-mmkv"

import { storage } from "@/utils/storage"

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
 * Migração one-shot (roda no primeiro import):
 * - Binário antigo do Martinez (com.mdsp.martinez): caso um dia consuma este
 *   bundle via OTA, auto-seleciona a rede "martinez" — o usuário daquele app
 *   nunca vê a tela de seleção.
 * - Dev: EXPO_PUBLIC_TENANT_SLUG pré-seleciona uma rede pra pular o seletor.
 */
if (!storage.contains(ACTIVE_TENANT_KEY)) {
  if (applicationId === "com.mdsp.martinez") {
    storage.set(ACTIVE_TENANT_KEY, "martinez")
  } else if (__DEV__ && process.env.EXPO_PUBLIC_TENANT_SLUG) {
    storage.set(ACTIVE_TENANT_KEY, process.env.EXPO_PUBLIC_TENANT_SLUG)
  }
}
