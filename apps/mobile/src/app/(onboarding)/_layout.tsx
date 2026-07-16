import { Stack } from "expo-router"

/**
 * Grupo de onboarding do app guarda-chuva. SEM redirect de saída de
 * propósito: a tela de seleção precisa ser acessível mesmo com rede ativa
 * (fluxo "Trocar de rede" da Minha Conta).
 */
export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="welcome" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="select-network" options={{ headerShown: false, animation: "fade" }} />
    </Stack>
  )
}
