import { useMMKVBoolean } from "react-native-mmkv"

import { storage } from "@/utils/storage"

/**
 * Flag do explicador do programa de fidelidade ("como funciona"). Abre
 * sozinho na PRIMEIRA visita à tela de pontos — sem isso o cliente cai numa
 * tela de saldo zerado sem saber o que fazer — e depois fica acessível pelo
 * botão da própria tela.
 *
 * Separada de `onboarding.seen.v1` (que é o tour de escolha de rede): o
 * usuário pode trocar de rede sem precisar rever a explicação do programa.
 */
export const LOYALTY_INTRO_SEEN_KEY = "loyalty.intro.seen.v1"

export function markLoyaltyIntroSeen() {
  storage.set(LOYALTY_INTRO_SEEN_KEY, true)
}

export function useHasSeenLoyaltyIntro() {
  const [seen] = useMMKVBoolean(LOYALTY_INTRO_SEEN_KEY, storage)
  return seen === true
}
