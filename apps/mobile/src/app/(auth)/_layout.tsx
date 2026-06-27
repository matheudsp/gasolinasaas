import { Slot } from "expo-router"

export default function AuthLayout() {
  return (
    <Slot screenOptions={{ headerShown: false, animation: "fade" }} />
  )
}