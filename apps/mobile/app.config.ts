import { ExpoConfig, ConfigContext } from "@expo/config"

/**
 * Use tsx/cjs here so we can use TypeScript for our Config Plugins
 * and not have to compile them to JavaScript.
 *
 * See https://docs.expo.dev/config-plugins/plugins/#add-typescript-support-and-convert-to-dynamic-app-config
 */
import "tsx/cjs"

import { tenants } from "./tenants/registry"

/**
 * Tenant deste build: `TENANT=<slug> eas build ...` (perfis em eas.json).
 * Cada tenant gera um binário próprio (nome, ícones, bundle id), todos a
 * partir deste mesmo codebase. Sem TENANT (ex.: `expo start`), cai no
 * grupo-martinez.
 */
const tenantSlug = process.env.TENANT ?? "grupo-martinez"
const tenant = tenants[tenantSlug]

if (!tenant) {
  throw new Error(
    `Tenant desconhecido: "${tenantSlug}". Registre-o em tenants/registry.ts e crie tenants/${tenantSlug}/ com os assets (veja o comentário do registry).`
  )
}

const tenantAssets = `./tenants/${tenant.slug}`

/**
 * Cores nativas assadas no binário — neutras e IGUAIS para todos os tenants,
 * de propósito: o que é nativo não muda via OTA, e manter tudo idêntico
 * preserva o fingerprint compartilhado entre os builds. A identidade visual
 * por tenant (logo e cores do tema) vem do server em runtime, configurada
 * no painel /admin.
 */
const SPLASH_BACKGROUND = "#FFFFFF"
const NOTIFICATION_ICON_COLOR = "#F7f7f7"

/**
 * @param config ExpoConfig coming from the static config app.json if it exists
 *
 * You can read more about Expo's Configuration Resolution Rules here:
 * https://docs.expo.dev/workflow/configuration/#configuration-resolution-rules
 */
module.exports = ({ config }: ConfigContext): Partial<ExpoConfig> => {
  const existingPlugins = config.plugins ?? []

  return {
    ...config,
    name: tenant.name,
    scheme: tenant.scheme,
    icon: `${tenantAssets}/app-icon-all.png`,
    updates: {
      ...config.updates,
      url: "https://u.expo.dev/03973ce3-5940-445b-835e-b8ec12cad043",
    },
    // fingerprint: enquanto o lado nativo for idêntico, todos os binários
    // (de todos os tenants) aceitam o mesmo update OTA.
    runtimeVersion: {
      policy: "fingerprint",
    },
    ios: {
      ...config.ios,
      icon: `${tenantAssets}/app-icon-ios.png`,
      bundleIdentifier: tenant.ios.bundleIdentifier,
      // This privacyManifests is to get you started.
      // See Expo's guide on apple privacy manifests here:
      // https://docs.expo.dev/guides/apple-privacy/
      // You may need to add more privacy manifests depending on your app's usage of APIs.
      // More details and a list of "required reason" APIs can be found in the Apple Developer Documentation.
      // https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"], // CA92.1 = "Access info from same app, per documentation"
          },
        ],
      },
    },
    android: {
      ...config.android,
      icon: `${tenantAssets}/app-icon-android-legacy.png`,
      package: tenant.android.package,
      adaptiveIcon: {
        foregroundImage: `${tenantAssets}/app-icon-android-adaptive-foreground.png`,
        backgroundImage: `${tenantAssets}/app-icon-android-adaptive-background.png`,
      },
      googleServicesFile: `${tenantAssets}/google-services.json`,
    },
    web: {
      ...config.web,
      favicon: `${tenantAssets}/app-icon-web-favicon.png`,
    },
    plugins: [
      "@react-native-vector-icons/material-icons",
      "@react-native-vector-icons/material-design-icons",
      [
        "expo-camera",
        {
          cameraPermission:
            "Precisamos da câmera para escanear o QR de fidelidade do cliente no caixa.",
        },
      ],
      [
        "expo-splash-screen",
        {
          image: `${tenantAssets}/splash-logo.png`,
          imageWidth: 300,
          resizeMode: "contain",
          backgroundColor: SPLASH_BACKGROUND,
        },
      ],
      [
        "expo-notifications",
        {
          icon: `${tenantAssets}/app-icon-android-legacy.png`,
          color: NOTIFICATION_ICON_COLOR,
          sounds: [],
        },
      ],
      ...existingPlugins,
    ],
  }
}
