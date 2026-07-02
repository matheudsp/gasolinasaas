import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
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

        const tokenData = await Notifications.getExpoPushTokenAsync();
        if (active) {
          registerToken({ token: tokenData.data, platform: getPlatform() });
        }
      } catch {
        // Token indisponível sem projectId EAS ou sem módulo nativo
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
