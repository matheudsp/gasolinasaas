import { useEffect } from "react"
import { SplashScreen, useRouter, useSegments, Slot } from "expo-router"
import { useFonts } from "@expo-google-fonts/space-grotesk"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import { ThemeProvider } from "@/theme/context"
import { customFontsToLoad } from "@/theme/typography"
import { authClient } from "@/lib/auth" 

SplashScreen.preventAutoHideAsync()

if (__DEV__) {
  require("@/devtools/ReactotronConfig")
}

export default function Root() {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const { data: session, isPending } = authClient.useSession()
  const segments = useSegments()
  const router = useRouter()

  // Mantém o splash até fonte + sessão estarem prontos
  const loaded = fontsLoaded && !isPending

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  useEffect(() => {
    if (!loaded) return

    SplashScreen.hideAsync()

    const inAuthGroup = segments[0] === "(auth)"

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in")
    } else if (session && inAuthGroup) {
      router.replace("/(app)/(tabs)")
    }
  }, [loaded, session, segments])

  if (!loaded) return null

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <KeyboardProvider>
          <Slot screenOptions={{ headerShown: false }} />
        </KeyboardProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}