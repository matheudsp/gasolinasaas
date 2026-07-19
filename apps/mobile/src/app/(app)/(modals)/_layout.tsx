import { Stack } from "expo-router"

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="filters"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="selectFuel"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="confirmRedemption/index"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack>
  )
}
