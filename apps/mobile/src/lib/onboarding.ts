import { useMMKVBoolean } from "react-native-mmkv"

import { storage } from "@/utils/storage"

/**
 * Flag do onboarding do app guarda-chuva: o tour animado que explica a
 * escolha de rede aparece UMA vez, antes da primeira seleção. Depois disso
 * o usuário sem rede cai direto no seletor (ex.: fluxo "Trocar de rede").
 */
export const ONBOARDING_SEEN_KEY = "onboarding.seen.v1"

export function markOnboardingSeen() {
  storage.set(ONBOARDING_SEEN_KEY, true)
}

export function useHasSeenOnboarding() {
  const [seen] = useMMKVBoolean(ONBOARDING_SEEN_KEY, storage)
  return seen === true
}
