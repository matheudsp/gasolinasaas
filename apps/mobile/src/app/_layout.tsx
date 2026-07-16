import { useEffect } from "react"
import { SplashScreen, Slot } from "expo-router"
import { useFonts } from "@expo-google-fonts/space-grotesk"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import { ThemeProvider } from "@/theme/context"
import { customFontsToLoad } from "@/theme/typography"
import { useActiveTenantSlug } from "@/lib/activeTenant"
import { authClient } from "@/lib/auth"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { TenantBrandingLoader } from "@/lib/branding"
import { queryClient } from "@/lib/orpc"
import {
  getQueryCacheBuster,
  QUERY_CACHE_MAX_AGE,
  queryCachePersister,
} from "@/lib/queryPersistence"
import { usePushNotifications } from "@/hooks/usePushNotifications"

SplashScreen.preventAutoHideAsync()

if (__DEV__) {
  require("@/devtools/ReactotronConfig")
}

function PushNotificationRegistrar() {
  usePushNotifications()
  return null
}

export default function Root() {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const { data: session, isPending } = authClient.useSession()
  const [activeSlug] = useActiveTenantSlug()

  // Mantém o splash até fonte + sessão estarem prontos
  const loaded = fontsLoaded && !isPending

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync()
  }, [loaded])

  // O Slot precisa montar já no primeiro render: se o root layout retornar
  // null, o expo-router web descarta o estado derivado da URL ao montar e
  // reseta a navegação para "/", quebrando deep links (ex: /forgot-password).
  // A proteção de rotas é declarativa, via <Redirect> nos layouts de grupo.
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryCachePersister,
          maxAge: QUERY_CACHE_MAX_AGE,
          // Buster por rede: trocar de tenant descarta o cache persistido
          // da anterior já no restore.
          buster: getQueryCacheBuster(activeSlug),
        }}
      >
        <ThemeProvider>
          <KeyboardProvider>
            <TenantBrandingLoader />
            {/* key remonta o registrar na troca de rede → re-registra o
                token sob o header do tenant novo. */}
            {session && <PushNotificationRegistrar key={activeSlug ?? "none"} />}
            <Slot />
          </KeyboardProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  )
}
