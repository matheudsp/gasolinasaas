import { Redirect, Stack } from "expo-router"

import { authClient } from "@/lib/auth"

export default function AuthLayout() {
  const { data: session } = authClient.useSession()

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
