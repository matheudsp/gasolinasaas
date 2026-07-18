import { ExpoConfig, ConfigContext } from "@expo/config"
import { existsSync } from "node:fs"

/**
 * Use tsx/cjs here so we can use TypeScript for our Config Plugins
 * and not have to compile them to JavaScript.
 *
 * See https://docs.expo.dev/config-plugins/plugins/#add-typescript-support-and-convert-to-dynamic-app-config
 */
import "tsx/cjs"

import { DEDICATED_APPS } from "./tenants/dedicated"

/**
 * Cores nativas assadas no binário — neutras, iguais para todos.
 * O que é nativo não muda via OTA.
 */
const SPLASH_BACKGROUND = "#FFFFFF"
const NOTIFICATION_ICON_COLOR = "#F7f7f7"

// Identidade padrão do app guarda-chuva.
const UMBRELLA_ICON = "./assets/app-icon/app-icon-all.png"
const UMBRELLA_BUNDLE_ID = "cloud.gasolina.app"

/**
 * Projeto EAS. É a fonte ÚNICA do id: o `updates.url` e o
 * `extra.eas.projectId` têm que apontar pro mesmo projeto — divergir faz o
 * OTA publicar num lugar e o app buscar update/push em outro
 * (`getEasProjectId()` em hooks/usePushNotifications.ts lê o extra, e sem ele
 * o token de push nem é obtido em build nativo). Decisão de produto: todos os
 * apps dedicados COMPARTILHAM este projeto (varia só o bundle id); o
 * fingerprint difere por app, então updates não vazam entre eles.
 */
const EAS_PROJECT_ID = "fdc24707-450d-4d54-befc-396a017289ff"

/**
 * `APP_VARIANT=<slug>` (env do profile EAS) monta um BUILD DEDICADO daquela
 * rede: ícone, nome, bundle id e scheme próprios, e `extra.tenantSlug` fixo
 * (o app pula o seletor de rede — ver src/lib/activeTenant.ts). Sem a env, é
 * o app guarda-chuva "Gasolina Cloud".
 */
const APP_VARIANT = process.env.APP_VARIANT?.trim() || null
const dedicated = APP_VARIANT ? DEDICATED_APPS[APP_VARIANT] : null

if (APP_VARIANT && !dedicated) {
  throw new Error(
    `APP_VARIANT="${APP_VARIANT}" não está registrado em tenants/dedicated.ts.`,
  )
}

// O google-services.json do app dedicado precisa existir no build (bundle id
// próprio = app Firebase próprio). Falha cedo com mensagem clara em vez do
// erro cru do prebuild.
if (dedicated && !existsSync(dedicated.googleServicesFile)) {
  throw new Error(
    `Build dedicado "${dedicated.slug}": falta ${dedicated.googleServicesFile}. ` +
      `Baixe o google-services.json do app Firebase do bundle id ${dedicated.bundleId} e coloque nesse caminho.`,
  )
}

const appIcon = dedicated?.icon ?? UMBRELLA_ICON
const bundleId = dedicated?.bundleId ?? UMBRELLA_BUNDLE_ID
const scheme = dedicated?.slug ?? "gasolina"

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
    name: dedicated?.name ?? "Gasolina Cloud",
    // `slug` identifica o PROJETO EAS (compartilhado) — NÃO é o slug da rede.
    // Mantém "gasolina" em todos os variantes; o scheme é que == slug da rede.
    slug: "gasolina",
    scheme,
    icon: appIcon,
    updates: {
      ...config.updates,
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    // runtimeVersion = a `version` do app (app.json, hoje "1.0.0"). Estável
    // por construção: Mac e EAS leem a mesma string, sem recomputar hash. A
    // policy "fingerprint" era recalculada em cada ambiente e divergia por
    // causa do hoisting não-determinístico do pnpm (local macOS vs EAS Linux).
    // Regra: suba a `version` a cada release de LOJA (quando muda nativo); OTA
    // (eas update) continua compatível entre builds da MESMA version.
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      ...config.extra,
      eas: { ...config.extra?.eas, projectId: EAS_PROJECT_ID },
      // Fixa a rede no build dedicado — a fonte única em runtime. Undefined
      // no guarda-chuva (a rede é escolhida no seletor).
      tenantSlug: dedicated?.slug,
    },
    ios: {
      ...config.ios,
      icon: appIcon,
      bundleIdentifier: bundleId,
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
      icon: appIcon,
      package: bundleId,
      adaptiveIcon: dedicated
        ? {
            foregroundImage: dedicated.icon,
            backgroundColor: dedicated.adaptiveBackgroundColor,
          }
        : {
            foregroundImage: `./assets/app-icon/android-adaptive-foreground.png`,
            backgroundImage: `./assets/app-icon/android-adaptive-background.png`,
          },
      // Guarda-chuva: google-services.json do app cloud.gasolina.app (o da
      // raiz). Dedicado: o do bundle id próprio (validado acima).
      googleServicesFile: dedicated?.googleServicesFile ?? "./google-services.json",
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
          icon: appIcon,
          color: NOTIFICATION_ICON_COLOR,
          sounds: [],
        },
      ],
      ...existingPlugins,
    ],
  }
}
