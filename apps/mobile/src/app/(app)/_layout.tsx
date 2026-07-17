import { Redirect, Slot } from "expo-router"
import { ActivityIndicator, View } from "react-native"

import { useActiveTenantSlug } from "@/lib/activeTenant"
import { authClient } from "@/lib/auth"
import { useHasSeenOnboarding } from "@/lib/onboarding"

export default function AppLayout() {
  const { data, isPending } = authClient.useSession()
  const [activeSlug] = useActiveTenantSlug()
  const hasSeenOnboarding = useHasSeenOnboarding()

  // Sem rede escolhida, nada aqui dentro faz sentido (todo dado é da rede).
  if (!activeSlug) {
    return <Redirect href={hasSeenOnboarding ? "/select-network" : "/welcome"} />
  }

  if (isPending) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    )
  }
  if (!data?.user) return <Redirect href="/(auth)/sign-in" />

  // Gate de CPF: contas legadas e login via Google não têm CPF — preencher
  // é obrigatório antes de usar o app. A tela vive em (onboarding), grupo
  // sem redirect de saída (não entra em loop).
  if (!data.user.cpf) return <Redirect href="/complete-profile" />

  return <Slot />
}
