import { ExpoConfig, ConfigContext } from "@expo/config"

/**
 * Use tsx/cjs here so we can use TypeScript for our Config Plugins
 * and not have to compile them to JavaScript.
 *
 * See https://docs.expo.dev/config-plugins/plugins/#add-typescript-support-and-convert-to-dynamic-app-config
 */
import "tsx/cjs"

import { tenantAlternateIcons } from "./tenants/registry"

/**
 * Cores nativas assadas no binário — neutras, iguais para todos.
 * O que é nativo não muda via OTA.
 */
const SPLASH_BACKGROUND = "#FFFFFF"
const NOTIFICATION_ICON_COLOR = "#F7f7f7"

/**
 * @param config ExpoConfig coming from the static config app.json if it exists
 *
 * You can read more about Expo's Configuration Resolution Rules here:
 * https://docs.expo.dev/workflow/configuration/#configuration-resolution-rules
 */
/**
 * Projeto EAS do app guarda-chuva. É a fonte ÚNICA do id: o `updates.url`
 * e o `extra.eas.projectId` têm que apontar pro mesmo projeto — divergir
 * faz o OTA publicar num lugar e o app buscar update/push em outro
 * (`getEasProjectId()` em hooks/usePushNotifications.ts lê o extra, e sem
 * ele o token de push nem é obtido em build nativo).
 */
const EAS_PROJECT_ID = "725eef85-bd62-42a2-9b29-320ff5ba0046"

module.exports = ({ config }: ConfigContext): Partial<ExpoConfig> => {
  const existingPlugins = config.plugins ?? []

  return {
    ...config,
    name: "Gasolina Cloud",
    slug: "gasolina",
    scheme: "gasolina",
    icon: `./assets/app-icon/app-icon-all.png`,
    updates: {
      ...config.updates,
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    runtimeVersion: {
      policy: "fingerprint",
    },
    extra: {
      ...config.extra,
      eas: { ...config.extra?.eas, projectId: EAS_PROJECT_ID },
    },
    ios: {
      ...config.ios,
      icon: `./assets/app-icon/app-icon-all.png`,
      bundleIdentifier: "cloud.gasolina.app",
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
      icon: `./assets/app-icon/app-icon-all.png`,
      package: "cloud.gasolina.app",
      adaptiveIcon: {
        foregroundImage: `./assets/app-icon/android-adaptive-foreground.png`,
        backgroundImage: `./assets/app-icon/android-adaptive-background.png`,
      },
      // ATENÇÃO: precisa ser o google-services.json do app Firebase do
      // package cloud.gasolina.app — o arquivo atual é placeholder copiado
      // do martinez e NÃO vai funcionar num build Android de produção.
      googleServicesFile: "./google-services.json",
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
          image: `./assets/images/logo2.png`,
          imageWidth: 300,
          resizeMode: "contain",
          backgroundColor: SPLASH_BACKGROUND,
        },
      ],
      [
        "expo-notifications",
        {
          icon: `./assets/app-icon/app-icon-all.png`,
          color: NOTIFICATION_ICON_COLOR,
          sounds: [],
        },
      ],
      [
        "@bsky.app/expo-dynamic-app-icon",
        // Um único PNG por tenant serve as duas plataformas.
        Object.fromEntries(
          Object.entries(tenantAlternateIcons).map(([slug, icon]) => [
            slug,
            { ios: icon, android: icon, prerendered: true },
          ])
        ),
      ],
      ...existingPlugins,
    ],
  }
}
