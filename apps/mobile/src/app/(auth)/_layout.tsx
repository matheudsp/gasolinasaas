import { Slot, Stack } from "expo-router"

export default function AuthLayout() {
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
