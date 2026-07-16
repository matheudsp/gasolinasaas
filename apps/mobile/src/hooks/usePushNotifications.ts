import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useMMKVBoolean } from "react-native-mmkv";
import { useMutation } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { storage } from "@/utils/storage";

// expo-device requer build nativo — não disponível no Expo Go.
// Usa lazy require para não quebrar o módulo inteiro se não existir.
let _isDevice = false;
try {
  _isDevice = (require("expo-device") as { isDevice?: boolean }).isDevice ?? false;
} catch {
  _isDevice = false;
}

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // expo-notifications não disponível neste ambiente
}

export const PUSH_OPT_OUT_KEY = "push.optedOut";

export function getPlatform(): "ios" | "android" | "web" {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

/**
 * O Expo Go consegue inferir o projectId automaticamente, mas builds EAS
 * (development/preview/production) exigem que ele seja passado explicitamente
 * para getExpoPushTokenAsync() — sem isso, a chamada falha em builds standalone
 * mesmo que funcione normalmente durante o desenvolvimento no Expo Go.
 * O valor vem de app.json -> extra.eas.projectId, populado por `eas init`.
 */
function getEasProjectId(): string | null {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null
  );
}

/**
 * Obtém o Expo push token atual sem pedir permissão (null se não concedida,
 * ambiente sem módulos nativos ou sem projectId). Usado pelo switchTenant
 * pra desregistrar o token na rede anterior antes da troca.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!_isDevice) return null;
  const projectId = getEasProjectId();
  if (!projectId) return null;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return null;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch {
    return null;
  }
}

/**
 * Solicita permissão, obtém o token e o registra no servidor.
 * Degrada silenciosamente em ambientes sem módulos nativos (Expo Go).
 */
export function usePushNotifications() {
  const [optedOut] = useMMKVBoolean(PUSH_OPT_OUT_KEY, storage);

  const { mutate: registerToken } = useMutation(
    orpc.push.registerToken.mutationOptions(),
  );

  const tokenRefreshSub = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (optedOut === true) return;
    // Só prossegue em dispositivo físico com módulos nativos disponíveis
    if (!_isDevice) return;

    const projectId = getEasProjectId();
    if (!projectId) {
      console.warn(
        "[push] projectId ausente — rode `eas init` para vincular o projeto ao EAS",
      );
      return;
    }

    let active = true;

    async function register() {
      try {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();

        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") return;

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        if (active) {
          registerToken({ token: tokenData.data, platform: getPlatform() });
        }
      } catch (err) {
        // Token indisponível — sem projectId válido, sem credencial FCM/APNs
        // configurada no EAS, ou módulo nativo ausente
        console.warn("[push] falha ao obter token:", err);
      }
    }

    register();

    try {
      tokenRefreshSub.current = Notifications.addPushTokenListener((tokenData) => {
        registerToken({ token: tokenData.data, platform: getPlatform() });
      });
    } catch {
      // Listener não disponível neste ambiente
    }

    return () => {
      active = false;
      tokenRefreshSub.current?.remove();
    };
  }, [optedOut, registerToken]);
}