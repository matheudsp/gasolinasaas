import type { Href } from "expo-router"

/**
 * Resolve o destino de uma notificação a partir do payload `data` enviado
 * pelo server (união discriminada em routers/push.ts). Uma função, duas
 * origens: o tap no push (useNotificationDeepLink) e o tap na lista in-app
 * (NotificationsScreen) navegam pelo mesmo resolver.
 */

export const NOTIFICATIONS_FALLBACK_HREF = "/(app)/notifications" as const

type ParsedNotificationData = {
  type?: string
  stationId?: string
  tenantSlug?: string
}

function parseData(data: unknown): ParsedNotificationData | null {
  if (!data || typeof data !== "object") return null
  return data as ParsedNotificationData
}

/** Rede de origem da notificação (pra descartar push de rede não-ativa). */
export function getNotificationTenantSlug(data: unknown): string | null {
  return parseData(data)?.tenantSlug ?? null
}

export function resolveNotificationHref(data: unknown): Href {
  const parsed = parseData(data)

  if (parsed?.type === "promotion" && parsed.stationId) {
    return `/(app)/station/${parsed.stationId}` as Href
  }
  if (parsed?.type === "points") {
    return "/(app)/(tabs)/loyalty"
  }
  // Saldo cruzou o custo da recompensa mais barata — cai direto no catálogo.
  if (parsed?.type === "rewards") {
    return "/(app)/rewards"
  }
  // Tipo desconhecido/ausente: a lista de notificações é o fallback seguro.
  return NOTIFICATIONS_FALLBACK_HREF
}
