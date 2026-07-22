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

// Identidade padrão do app guarda-chuva. O que é nativo não muda via OTA.
const UMBRELLA = {
  name: "Gasolina Cloud",
  bundleId: "cloud.gasolina.app",
  scheme: "gasolina",
  icon: "./assets/app-icon/app-icon-all.png",
  adaptiveForegroundImage: "./assets/app-icon/android-adaptive-foreground.png",
  adaptiveBackgroundImage: "./assets/app-icon/android-adaptive-background.png",
  splashImage: "./assets/images/logo2.png",
  splashBackgroundColor: "#FFFFFF",
  // Silhueta monocromática — o Android descarta as cores do ícone de
  // notificação e usa só a forma.
  notificationIcon: "./assets/app-icon/android-adaptive-foreground.png",
  googleServicesFile: "./google-services.json",
} as const

const NOTIFICATION_ICON_COLOR = "#F7f7f7"

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

/**
 * TODOS os assets nativos num lugar só. Antes o splash e o ícone de
 * notificação estavam escritos direto nos plugins, então um build dedicado
 * saía com a arte do guarda-chuva — o app do cliente com a marca errada.
 *
 * Os opcionais têm fallback dentro da PRÓPRIA rede (splash cai no ícone
 * dela), exceto o de notificação: o Android usa só a silhueta, e um ícone
 * colorido viraria um borrão branco — aí é melhor a silhueta neutra do
 * guarda-chuva do que a marca da rede quebrada.
 */
const identity = dedicated
  ? {
      name: dedicated.name,
      bundleId: dedicated.bundleId,
      scheme: dedicated.slug,
      icon: dedicated.icon,
      adaptiveForegroundImage:
        dedicated.adaptiveForegroundImage ?? dedicated.icon,
      adaptiveBackgroundColor: dedicated.adaptiveBackgroundColor,
      splashImage: dedicated.splashImage ?? dedicated.icon,
      splashBackgroundColor:
        dedicated.splashBackgroundColor ?? dedicated.adaptiveBackgroundColor,
      notificationIcon: dedicated.notificationIcon ?? UMBRELLA.notificationIcon,
      googleServicesFile: dedicated.googleServicesFile,
    }
  : {
      name: UMBRELLA.name,
      bundleId: UMBRELLA.bundleId,
      scheme: UMBRELLA.scheme,
      icon: UMBRELLA.icon,
      adaptiveForegroundImage: UMBRELLA.adaptiveForegroundImage,
      adaptiveBackgroundColor: null,
      splashImage: UMBRELLA.splashImage,
      splashBackgroundColor: UMBRELLA.splashBackgroundColor,
      notificationIcon: UMBRELLA.notificationIcon,
      googleServicesFile: UMBRELLA.googleServicesFile,
    }

// Falha cedo com mensagem clara em vez do erro cru do prebuild — um caminho
// errado no registry passaria despercebido até o app sair sem ícone.
if (dedicated) {
  const required: [string, string][] = [
    ["icon", identity.icon],
    ["adaptiveForegroundImage", identity.adaptiveForegroundImage],
    ["splashImage", identity.splashImage],
    ["notificationIcon", identity.notificationIcon],
    ["googleServicesFile", identity.googleServicesFile],
  ]
  for (const [field, path] of required) {
    if (!existsSync(path)) {
      throw new Error(
        `Build dedicado "${dedicated.slug}": ${field} aponta para ${path}, que não existe.` +
          (field === "googleServicesFile"
            ? ` Baixe o google-services.json do app Firebase do bundle id ${dedicated.bundleId}.`
            : ""),
      )
    }
  }
}

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
    name: identity.name,
    // `slug` identifica o PROJETO EAS (compartilhado) — NÃO é o slug da rede.
    // Mantém "gasolina" em todos os variantes; o scheme é que == slug da rede.
    slug: "gasolina",
    scheme: identity.scheme,
    icon: identity.icon,
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
      icon: identity.icon,
      bundleIdentifier: identity.bundleId,
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
      icon: identity.icon,
      package: identity.bundleId,
      // A rede dedicada define a cor de fundo; o guarda-chuva usa a arte de
      // fundo própria que já existe em assets/.
      adaptiveIcon: identity.adaptiveBackgroundColor
        ? {
            foregroundImage: identity.adaptiveForegroundImage,
            backgroundColor: identity.adaptiveBackgroundColor,
          }
        : {
            foregroundImage: identity.adaptiveForegroundImage,
            backgroundImage: UMBRELLA.adaptiveBackgroundImage,
          },
      googleServicesFile: identity.googleServicesFile,
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
          image: identity.splashImage,
          imageWidth: 300,
          resizeMode: "contain",
          backgroundColor: identity.splashBackgroundColor,
        },
      ],
      [
        "expo-notifications",
        {
          icon: identity.notificationIcon,
          color: NOTIFICATION_ICON_COLOR,
          sounds: [],
        },
      ],
      ...existingPlugins,
    ],
  }
}
