import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useMMKVBoolean } from "react-native-mmkv";
import { useMutation } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { storage } from "@/utils/storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const PUSH_OPT_OUT_KEY = "push.optedOut";

export function getPlatform(): "ios" | "android" | "web" {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

/**
 * Solicita permissão, obtém o token e o registra no servidor.
 * Respeita a preferência do usuário armazenada em MMKV (push.optedOut).
 */
export function usePushNotifications() {
  const [optedOut] = useMMKVBoolean(PUSH_OPT_OUT_KEY, storage);

  const { mutate: registerToken } = useMutation(
    orpc.push.registerToken.mutationOptions(),
  );

  const tokenRefreshSub = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Usuário optou por não receber notificações
    if (optedOut === true) return;

    let active = true;

    async function register() {
      if (!Device.isDevice) return;

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") return;

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        if (active) {
          registerToken({ token: tokenData.data, platform: getPlatform() });
        }
      } catch {
        // Token indisponível sem projectId EAS configurado
      }
    }

    register();

    tokenRefreshSub.current = Notifications.addPushTokenListener((tokenData) => {
      registerToken({ token: tokenData.data, platform: getPlatform() });
    });

    return () => {
      active = false;
      tokenRefreshSub.current?.remove();
    };
  }, [optedOut, registerToken]);
}
