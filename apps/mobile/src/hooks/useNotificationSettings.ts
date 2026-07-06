import { useCallback, useEffect, useState } from "react"
import { Alert, Linking } from "react-native"
import * as Notifications from "expo-notifications"
import { useMMKVBoolean } from "react-native-mmkv"
import { useMutation } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"
import { storage } from "@/utils/storage"
import { PUSH_OPT_OUT_KEY, getPlatform } from "@/hooks/usePushNotifications"

// expo-device requer build nativo — lazy require para não quebrar em Expo Go
let _isDevice = false
try {
  _isDevice = (require("expo-device") as { isDevice?: boolean }).isDevice ?? false
} catch {
  _isDevice = false
}

/**
 * Extraído de MyAccount.tsx para ser compartilhado entre a linha-resumo
 * ("Ativadas"/"Desativadas") na tela de Conta e o toggle de verdade no
 * modal de Notificações — mesmo padrão de usePreferredFuel.
 */
export function useNotificationSettings() {
  const [optedOut, setOptedOut] = useMMKVBoolean(PUSH_OPT_OUT_KEY, storage)
  const [hasPermission, setHasPermission] = useState(false)

  const refresh = useCallback(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setHasPermission(status === "granted")
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const notifEnabled = hasPermission && optedOut !== true

  const { mutate: registerToken, isPending: isRegistering } = useMutation({
    ...orpc.push.registerToken.mutationOptions(),
    onError: () => {
      // OS permission foi genuinamente concedida — mantemos hasPermission.
      // Mas o token não chegou no servidor, então refletimos "desligado".
      setOptedOut(true)
      Alert.alert("Erro", "Não foi possível ativar as notificações. Tente novamente.")
    },
  })

  const { mutate: unregisterToken, isPending: isUnregistering } = useMutation({
    ...orpc.push.unregisterToken.mutationOptions(),
    onError: () => {
      setOptedOut(false)
      Alert.alert("Erro", "Não foi possível desativar as notificações. Tente novamente.")
    },
  })

  const isToggling = isRegistering || isUnregistering

  async function setNotifEnabled(value: boolean) {
    if (value) {
      if (!_isDevice) {
        Alert.alert("Notificações indisponíveis", "Notificações push exigem um dispositivo físico.")
        return
      }
      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Para ativar as notificações, vá em Ajustes e habilite as notificações para este app.",
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Abrir Ajustes", onPress: () => Linking.openSettings() },
          ],
        )
        return
      }
      setHasPermission(true)
      setOptedOut(false)
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync()
        registerToken({ token: tokenData.data, platform: getPlatform() })
      } catch {
        // Sem projectId EAS — ignorar em dev
      }
    } else {
      setOptedOut(true)
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync()
        unregisterToken({ token: tokenData.data })
      } catch {
        // Ignora — token pode não existir
      }
    }
  }

  return { notifEnabled, isToggling, setNotifEnabled, refresh }
}