import { useCallback, useEffect, useState } from "react"
import * as Notifications from "expo-notifications"
import { router, type Href } from "expo-router"

import { getActiveTenantSlug, useActiveTenantSlug } from "@/lib/activeTenant"
import { authClient } from "@/lib/auth"
import {
  getNotificationTenantSlug,
  resolveNotificationHref,
} from "@/lib/notificationRouting"

/**
 * Deep link ao tocar numa notificação push.
 *
 * Montado no ROOT layout, sem condicional — não dentro de
 * usePushNotifications, que só monta com sessão e é REMONTADO a cada troca
 * de rede (key={activeSlug}), o que destruiria o listener no meio do fluxo.
 *
 * Cobre as três formas de chegada:
 * - app aberto/background: addNotificationResponseReceivedListener;
 * - app FECHADO (cold start): o listener não dispara pra notificação que
 *   abriu o app — getLastNotificationResponseAsync() recupera o tap;
 * - destino pendente: as telas de destino são protegidas (o gate de
 *   (app)/_layout redirecionaria pro sign-in e o destino se perderia), então
 *   guardamos o href e só navegamos quando sessão + rede estão resolvidas.
 */
export function useNotificationDeepLink() {
  const { data: session } = authClient.useSession()
  const [activeSlug] = useActiveTenantSlug()
  const [pendingHref, setPendingHref] = useState<Href | null>(null)

  const handleResponse = useCallback(
    (response: Notifications.NotificationResponse | null) => {
      if (!response) return

      const data = response.notification.request.content.data

      // Notificação de outra rede (ficou na bandeja, de antes de uma troca
      // de rede): navegar deep-linkaria pra um posto de outro tenant → 404.
      const originSlug = getNotificationTenantSlug(data)
      const currentSlug = getActiveTenantSlug()
      if (originSlug && currentSlug && originSlug !== currentSlug) return

      setPendingHref(resolveNotificationHref(data))
    },
    [],
  )

  useEffect(() => {
    let sub: Notifications.EventSubscription | null = null

    try {
      // Cold start: recupera o tap que abriu o app.
      Notifications.getLastNotificationResponseAsync()
        .then(handleResponse)
        .catch(() => {})

      sub = Notifications.addNotificationResponseReceivedListener(handleResponse)
    } catch {
      // expo-notifications indisponível (Expo Go/web) — sem deep link.
    }

    return () => sub?.remove()
  }, [handleResponse])

  useEffect(() => {
    if (!pendingHref) return
    // Espera sessão + rede: antes disso os gates redirecionariam e o destino
    // se perderia.
    if (!session?.user || !activeSlug) return

    const href = pendingHref
    setPendingHref(null)

    // Adia um tick — corrida de navegação no boot (ver app/_layout.tsx).
    const timer = setTimeout(() => router.push(href), 0)
    return () => clearTimeout(timer)
  }, [pendingHref, session, activeSlug])
}
