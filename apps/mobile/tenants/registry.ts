/**
 * Registry de tenants white-label — fonte única de identidade por rede.
 *
 * Consumido em dois mundos:
 * - `app.config.ts` (Node, build-time): compõe nome, bundle ids, ícones e
 *   splash do binário a partir do tenant em `process.env.TENANT`.
 * - bundle JS (runtime): resolve o slug do tenant a partir do
 *   `applicationId` nativo (expo-application), que é imutável por OTA.
 *
 * Por isso este arquivo deve conter apenas dados puros (strings) — nada de
 * imports de React Native nem de `require()` de imagens.
 *
 * Assets de cada tenant vivem em `tenants/<slug>/` com nomes fixos:
 * app-icon-all.png · app-icon-ios.png · app-icon-android-legacy.png ·
 * app-icon-android-adaptive-{foreground,background}.png ·
 * app-icon-web-favicon.png · splash-logo.png · google-services.json
 */

export type TenantAppConfig = {
  /** Slug do tenant no server (header `x-tenant-slug`) e nome do diretório de assets */
  slug: string
  /** Nome do app nas lojas e no launcher */
  name: string
  /** Scheme de deep link (ex.: martinezapp://) */
  scheme: string
  ios: {
    bundleIdentifier: string
  }
  android: {
    package: string
  }
}

export const tenants: Record<string, TenantAppConfig> = {
  "grupo-martinez": {
    slug: "grupo-martinez",
    name: "Martinez",
    scheme: "martinezapp",
    ios: {
      bundleIdentifier: "com.mdsp.martinez",
    },
    android: {
      package: "com.mdsp.martinez",
    },
  },
}

/**
 * Mapa applicationId nativo → slug do tenant. Como o bundle id é gravado no
 * binário e não muda via OTA, é seguro compartilhar um único update JS entre
 * todos os tenants — cada app descobre quem é em runtime por este mapa.
 */
export const bundleIdToTenantSlug: Record<string, string> = Object.fromEntries(
  Object.values(tenants).flatMap((tenant) => [
    [tenant.ios.bundleIdentifier, tenant.slug],
    [tenant.android.package, tenant.slug],
  ])
)
