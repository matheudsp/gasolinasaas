import { EMBEDDED_ICON_SLUGS } from "../../tenants/registry"
import { storage } from "@/utils/storage"

/**
 * Troca o ícone nativo do launcher pro ícone da rede ativa
 * (@bsky.app/expo-dynamic-app-icon). Regras:
 *
 * - Só funciona em build nativo (dev-client/preview/production) — no Expo
 *   Go/web o módulo não existe e a função degrada silenciosamente.
 * - Tenant sem ícone embutido no binário volta pro ícone padrão Gasolina.
 * - ATENÇÃO Android: o módulo joga o app pro background e MATA o processo
 *   de propósito (e NÃO relança). Pior: qualquer chamada com
 *   `shouldChangeIcon` mata o app, mesmo sem mudança real de ícone — por
 *   isso o guard abaixo só chama o módulo quando o alvo difere do aplicado.
 *   Além disso, atalhos fixados na tela inicial apontam pro componente
 *   antigo (desabilitado) e MORREM — o app novo fica na gaveta de apps.
 *   Avise o usuário antes (ver willChangeAppIcon) e chame por último na
 *   troca de rede, com o slug novo já persistido.
 */

/** Slug do ícone atualmente aplicado; ausente = ícone padrão Gasolina. */
const APPLIED_ICON_KEY = "appIcon.applied.v1"

function resolveTargetIcon(slug: string | null): string | null {
  return slug && EMBEDDED_ICON_SLUGS.includes(slug) ? slug : null
}

/**
 * true quando aplicar o ícone deste tenant muda algo de verdade — e,
 * portanto, no Android o app vai fechar. Use pra avisar o usuário antes.
 */
export function willChangeAppIcon(slug: string | null): boolean {
  const current = storage.getString(APPLIED_ICON_KEY) ?? null
  return resolveTargetIcon(slug) !== current
}

export function setAppIconForTenant(slug: string | null) {
  const target = resolveTargetIcon(slug)
  const current = storage.getString(APPLIED_ICON_KEY) ?? null

  // No-op quando não há mudança real: evita o background + kill gratuito
  // que o módulo faz no Android mesmo quando o ícone já é o certo.
  if (target === current) return

  try {
    // Lazy require: módulo nativo ausente (Expo Go/web) não pode quebrar o bundle.
    const { setAppIcon } = require("@bsky.app/expo-dynamic-app-icon") as {
      setAppIcon: (name: string | null) => string | false
    }
    const result = setAppIcon(target)
    if (result === false) return

    // Persiste ANTES do kill do Android (o processo morre ~500ms depois).
    if (target) {
      storage.set(APPLIED_ICON_KEY, target)
    } else {
      storage.delete(APPLIED_ICON_KEY)
    }
  } catch {
    // Ambiente sem o módulo nativo — segue com o ícone padrão.
  }
}
