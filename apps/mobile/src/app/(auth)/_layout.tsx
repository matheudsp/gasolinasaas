import { Redirect, Stack } from "expo-router"

import { useActiveTenantSlug } from "@/lib/activeTenant"
import { authClient } from "@/lib/auth"
import { useHasSeenOnboarding } from "@/lib/onboarding"

export default function AuthLayout() {
  const { data: session } = authClient.useSession()
  const [activeSlug] = useActiveTenantSlug()
  const hasSeenOnboarding = useHasSeenOnboarding()

  // Sem rede escolhida não há branding nem header de tenant — o sign-in
  // depende dos dois. Primeiro boot passa pelo onboarding; depois cai
  // direto no seletor de rede.
  if (!activeSlug) {
    return <Redirect href={hasSeenOnboarding ? "/select-network" : "/welcome"} />
  }

  if (session?.user) return <Redirect href="/(app)/(tabs)" />

  return (
    <Stack>
      <Stack.Screen name="sign-in" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen
        name="sign-up"
        options={{ headerShown: false, animation: "fade", presentation: "modal" }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{ headerShown: false, animation: "fade", presentation: "modal" }}
      />
    </Stack>
  )
}
