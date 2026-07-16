import { EMBEDDED_ICON_SLUGS } from "../../tenants/registry"

/**
 * Troca o ícone nativo do launcher pro ícone da rede ativa
 * (@bsky.app/expo-dynamic-app-icon). Regras:
 *
 * - Só funciona em build nativo (dev-client/preview/production) — no Expo
 *   Go/web o módulo não existe e a função degrada silenciosamente.
 * - Tenant sem ícone embutido no binário volta pro ícone padrão Gasolina
 *   (setAppIcon(null)).
 * - ATENÇÃO Android: trocar o activity-alias FECHA o app. Chame por último
 *   na troca de rede, com o slug novo já persistido — o app reabre na rede
 *   certa.
 */
export function setAppIconForTenant(slug: string | null) {
  try {
    // Lazy require: módulo nativo ausente (Expo Go/web) não pode quebrar o bundle.
    const { setAppIcon } = require("@bsky.app/expo-dynamic-app-icon") as {
      setAppIcon: (name: string | null) => string | false
    }
    setAppIcon(slug && EMBEDDED_ICON_SLUGS.includes(slug) ? slug : null)
  } catch {
    // Ambiente sem o módulo nativo — segue com o ícone padrão.
  }
}
