import { getActiveTenantSlug, setActiveTenantSlug } from "@/lib/activeTenant"
import { setAppIconForTenant } from "@/lib/appIcon"
import { authClient } from "@/lib/auth"
import { client, queryClient } from "@/lib/orpc"
import { QUERY_CACHE_STORAGE_KEY } from "@/lib/queryPersistence"
import { clearPreferredFuel } from "@/hooks/usePreferredFuel"
import { getExpoPushToken } from "@/hooks/usePushNotifications"
import { BRANDING_STORAGE_KEY } from "@/theme/tenantBranding"
import { storage } from "@/utils/storage"

/**
 * Troca a rede (tenant) ativa do app guarda-chuva.
 *
 * Cada etapa é best-effort: falha de rede não pode deixar o usuário preso
 * entre duas redes. A ordem importa:
 * - o unregister de push sai ANTES da troca (o header ainda aponta pra rede
 *   antiga — é lá que o token deve morrer);
 * - a troca de ícone é a ÚLTIMA coisa, porque no Android ela FECHA o app;
 *   como o slug novo já está persistido, o app reabre direto na rede nova
 *   (e o buster por tenant da persistência descarta o cache antigo mesmo
 *   que as limpezas abaixo tenham sido interrompidas).
 */
export async function switchTenant(newSlug: string) {
  const previousSlug = getActiveTenantSlug()
  if (previousSlug === newSlug) return

  // 1. Para de receber push da rede anterior (só faz sentido com sessão).
  if (previousSlug) {
    try {
      const { data: session } = await authClient.getSession()
      if (session?.user) {
        const token = await getExpoPushToken()
        if (token) {
          await client.push.unregisterToken({ token })
        }
      }
    } catch {
      // Sem rede/sessão — o token antigo fica órfão no server; aceitável.
    }
  }

  // 2. A partir daqui toda request sai com o header da rede nova.
  setActiveTenantSlug(newSlug)

  // 3. Branding da rede antiga fora — o ThemeProvider reage na hora
  //    (tema neutro até o branding novo chegar).
  storage.delete(BRANDING_STORAGE_KEY)

  // 4. Nada da rede antiga pode hidratar: memória e disco.
  queryClient.clear()
  storage.delete(QUERY_CACHE_STORAGE_KEY)

  // 5. Combustíveis variam por rede.
  clearPreferredFuel()

  // O re-registro de push acontece sozinho: o root layout remonta o
  // PushNotificationRegistrar via key={activeSlug}.

  // 6. Por último (Android fecha o app aqui).
  setAppIconForTenant(newSlug)
}
