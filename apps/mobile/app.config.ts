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
module.exports = ({ config }: ConfigContext): Partial<ExpoConfig> => {
  const existingPlugins = config.plugins ?? []

  return {
    ...config,
    name: "Gasolina",
    scheme: "gasolina",
    icon: `./assets/icons/app-icon-all.png`,
    updates: {
      ...config.updates,
      url: "https://u.expo.dev/03973ce3-5940-445b-835e-b8ec12cad043",
    },
    runtimeVersion: {
      policy: "fingerprint",
    },
    ios: {
      ...config.ios,
      icon: `./assets/icons/app-icon-ios.png`,
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
      icon: `./assets/icons/app-icon-android-legacy.png`,
      package: "cloud.gasolina.app",
      adaptiveIcon: {
        foregroundImage: `./assets/icons/app-icon-android-adaptive-foreground.png`,
        backgroundImage: `./assets/icons/app-icon-android-adaptive-background.png`,
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
          image: `./assets/icons/logo2.png`,
          imageWidth: 300,
          resizeMode: "contain",
          backgroundColor: SPLASH_BACKGROUND,
        },
      ],
      [
        "expo-notifications",
        {
          icon: `./assets/icons/app-icon-android-legacy.png`,
          color: NOTIFICATION_ICON_COLOR,
          sounds: [],
        },
      ],
      // Ícones alternativos do launcher, um por tenant registrado —
      // trocados em runtime pelo src/lib/appIcon.ts na seleção de rede.
      [
        "@bsky.app/expo-dynamic-app-icon",
        Object.fromEntries(
          Object.entries(tenantAlternateIcons).map(([slug, icons]) => [
            slug,
            { ios: icons.ios, android: icons.android, prerendered: true },
          ])
        ),
      ],
      ...existingPlugins,
    ],
  }
}
