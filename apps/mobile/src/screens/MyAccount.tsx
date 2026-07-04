import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  Switch,
  View,
  ViewStyle,
  TextStyle,
} from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import * as Notifications from "expo-notifications"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { useMutation, useQuery } from "@tanstack/react-query"
import { MaterialDesignIcons, type MaterialDesignIconsIconName} from "@react-native-vector-icons/material-design-icons"

// expo-device requer build nativo — lazy require para não quebrar em Expo Go
let _isDevice = false
try {
  _isDevice = (require("expo-device") as { isDevice?: boolean }).isDevice ?? false
} catch {
  _isDevice = false
}

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { authClient } from "@/lib/auth"
import { orpc } from "@/lib/orpc"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle, ThemeContextModeT } from "@/theme/types"
import { storage } from "@/utils/storage"
import { usePreferredFuel } from "@/hooks/usePreferredFuel"
import { PUSH_OPT_OUT_KEY, getPlatform } from "@/hooks/usePushNotifications"

// ── Constantes de tema ────────────────────────────────────────────────────────

const THEME_OPTIONS: Array<{ value: ThemeContextModeT; label: string; icon:  MaterialDesignIconsIconName }> = [
  { value: undefined, label: "Auto", icon: "brightness-auto" },
  { value: "light", label: "Claro", icon: "white-balance-sunny" },
  { value: "dark", label: "Escuro", icon: "weather-night" },
]

const THEME_SCHEME_KEY = "ignite.themeScheme"
const ICON_SIZE = 14

// ── Componentes auxiliares ────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon: MaterialDesignIconsIconName }) {
  const { themed, theme } = useAppTheme()
  return (
    <View style={themed($sectionHeaderRow)}>
      <MaterialDesignIcons name={icon} size={ICON_SIZE} color={theme.colors.tint} />
      <Text preset="formLabel" text={title} style={themed($sectionLabel)} />
    </View>
  )
}

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { themed } = useAppTheme()
  return (
    <View style={themed($settingsRow)}>
      <Text text={label} style={themed($settingsRowLabel)} />
      {children}
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function MyAccountScreen() {
  const { themed, theme, setThemeContextOverride } = useAppTheme()
  const { data: session } = authClient.useSession()
  const user = session?.user

  // ── Tema ──────────────────────────────────────────────────────────────────
  const [themeScheme] = useMMKVString(THEME_SCHEME_KEY, storage)
  // themeScheme é "light" | "dark" | undefined (auto)
  const currentTheme = (themeScheme as ThemeContextModeT) ?? undefined

  // ── Combustível preferido ────────────────────────────────────────────────
  const router = useRouter()
  const { preferredFuelSlug, refresh: refreshFuel } = usePreferredFuel()

  useFocusEffect(
    useCallback(() => {
      refreshFuel()
    }, [refreshFuel]),
  )

  const { data: priceRows = [] } = useQuery(orpc.fuel.listPrices.queryOptions({ input: {} }))

  const availableFuels = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of priceRows) {
      if (!map.has(p.fuelSlug)) map.set(p.fuelSlug, p.fuelName)
    }
    return Array.from(map, ([slug, name]) => ({ slug, name }))
  }, [priceRows])

  const preferredFuelName =
    availableFuels.find((f) => f.slug === preferredFuelSlug)?.name ?? "Selecionar"

  // ── Notificações ──────────────────────────────────────────────────────────
  const [optedOut, setOptedOut] = useMMKVBoolean(PUSH_OPT_OUT_KEY, storage)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setHasPermission(status === "granted")
    })
  }, [])

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

  const isTogglingNotif = isRegistering || isUnregistering

  async function handleNotifToggle(value: boolean) {
    if (value) {
      if (!_isDevice) {
        Alert.alert(
          "Notificações indisponíveis",
          "Notificações push exigem um dispositivo físico.",
        )
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

  // ── Sair ──────────────────────────────────────────────────────────────────
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await authClient.signOut()
    } catch {
      Alert.alert("Erro", "Não foi possível sair da conta. Tente novamente.")
    } finally {
      setIsSigningOut(false)
    }
  }

  // ── Deletar conta ─────────────────────────────────────────────────────────
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false)

  const { mutate: deleteAccount, isPending: isDeleting } = useMutation({
    ...orpc.tenant.deleteAccount.mutationOptions(),
    onSuccess: async () => {
      await authClient.signOut()
    },
    onError: () => {
      Alert.alert("Erro", "Não foi possível deletar a conta. Tente novamente.")
    },
  })

  // ── Initials ──────────────────────────────────────────────────────────────
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?"

  return (
    <Screen preset="scroll" contentContainerStyle={themed($screen)}>
      {/* ── Avatar ─────────────────────────────────────────────────── */}
      <View
        style={themed($avatarSection)}
        accessible
        accessibilityLabel={`${user?.name ?? "Usuário"}, ${user?.email ?? ""}`}
      >
        <View style={themed($avatar)}>
          <Text text={initials} style={themed($avatarText)} />
        </View>
        <Text preset="heading" text={user?.name ?? "—"} style={themed($userName)} />
        <Text text={user?.email ?? "—"} style={themed($userEmail)} />
      </View>

      <View style={themed($divider)} />

      {/* ── Preferências ───────────────────────────────────────────── */}
      <View style={themed($section)}>
        <SectionHeader title="Preferências" icon="tune" />

        {/* Combustível */}
        {availableFuels.length > 0 && (
          <Pressable
            onPress={() => router.push("/(app)/(modals)/selectFuel")}
            accessibilityRole="button"
            accessibilityLabel="Combustível preferido"
            accessibilityHint="Abre a seleção de combustível preferido"
            android_ripple={{ color: theme.colors.palette.neutral300 }}
            style={themed($fuelRow)}
          >
            <View style={themed($fuelRowLeft)}>
              <MaterialDesignIcons
                name="gas-station-outline"
                size={ICON_SIZE}
                color={theme.colors.tint}
              />
              <Text text="Combustível preferido" style={themed($prefLabel)} />
            </View>
            <View style={themed($fuelRowRight)}>
              <Text size="xs" style={themed($fuelRowValue)} text={preferredFuelName} />
              <MaterialDesignIcons
                name="chevron-right"
                size={18}
                color={theme.colors.textDim}
              />
            </View>
          </Pressable>
        )}

        {/* Tema */}
        <View style={themed($prefRow)}>
          <Text text="Tema" style={themed($prefLabel)} />
          <View style={themed($chipRowStatic)}>
            {THEME_OPTIONS.map((opt) => {
              const active = currentTheme === opt.value
              return (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => setThemeContextOverride(opt.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={opt.label}
                  android_ripple={{ color: theme.colors.palette.neutral300 }}
                  style={themed(active ? $chipActive : $chip)}
                >
                  <MaterialDesignIcons
                    name={opt.icon}
                    size={ICON_SIZE}
                    color={active ? theme.colors.palette.neutral100 : theme.colors.textDim}
                  />
                  <Text text={opt.label} style={themed(active ? $chipTextActive : $chipText)} />
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Notificações */}
        <SettingsRow label="Receber notificações">
          {isTogglingNotif ? (
            <ActivityIndicator size="small" color={theme.colors.tint} />
          ) : (
            <Switch
              value={notifEnabled}
              onValueChange={handleNotifToggle}
              accessibilityLabel="Receber notificações"
              trackColor={{
                false: theme.colors.separator,
                true: theme.colors.tint,
              }}
              thumbColor={theme.colors.palette.neutral100}
            />
          )}
        </SettingsRow>
      </View>

      <View style={themed($divider)} />

      {/* ── Conta ──────────────────────────────────────────────────── */}
      <View style={themed($section)}>
        <SectionHeader title="Conta" icon="account-circle-outline" />

        <Button
          text={isSigningOut ? "Saindo..." : "Sair da conta"}
          preset="default"
          onPress={handleSignOut}
          disabled={isSigningOut}
          LeftAccessory={({ style }) => (
            <MaterialDesignIcons name="logout" size={18} color={theme.colors.text} style={style} />
          )}
          RightAccessory={
            isSigningOut
              ? ({ style }) => (
                  <ActivityIndicator size="small" color={theme.colors.text} style={style} />
                )
              : undefined
          }
        />

        <Button
          text="Deletar conta"
          onPress={() => setDeleteConfirmVisible(true)}
          style={themed($deleteButton)}
          textStyle={themed($deleteText)}
          LeftAccessory={({ style }) => (
            <MaterialDesignIcons
              name="account-remove-outline"
              size={18}
              color={theme.colors.error}
              style={style}
            />
          )}
        />
      </View>

      {/* ── Modal confirmação de deletar ────────────────────────────── */}
      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <Pressable
          style={themed($modalOverlay)}
          onPress={() => !isDeleting && setDeleteConfirmVisible(false)}
        >
          <Pressable
            style={themed($modalBox)}
            onPress={() => undefined}
            accessibilityViewIsModal
          >
            <MaterialDesignIcons
              name="alert-circle-outline"
              size={32}
              color={theme.colors.error}
              style={themed($modalIcon)}
            />
            <Text preset="subheading" text="Deletar conta" style={themed($modalTitle)} />
            <Text
              text="Essa ação é irreversível. Todos os seus dados serão permanentemente removidos."
              style={themed($modalBody)}
            />
            <View style={themed($modalActions)}>
              <Button
                text="Cancelar"
                preset="default"
                onPress={() => setDeleteConfirmVisible(false)}
                disabled={isDeleting}
                style={themed($modalCancelBtn)}
              />
              <Button
                text={isDeleting ? "Deletando..." : "Confirmar"}
                onPress={() => deleteAccount({})}
                disabled={isDeleting}
                style={themed($deleteButton)}
                textStyle={themed($deleteText)}
                RightAccessory={
                  isDeleting
                    ? ({ style }) => (
                        <ActivityIndicator size="small" color={theme.colors.error} style={style} />
                      )
                    : undefined
                }
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $screen: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexGrow: 1,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xxl,
  paddingBottom: spacing.xxl,
})

const $avatarSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  marginBottom: spacing.xl,
})

const $avatar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 80,
  height: 80,
  borderRadius: 40,
  backgroundColor: colors.tint,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: spacing.md,
  borderWidth: 3,
  borderColor: colors.palette.accent400,
})

const $avatarText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontSize: 28,
  fontWeight: "700",
})

const $userName: ThemedStyle<TextStyle> = ({ spacing }) => ({
  textAlign: "center",
  marginBottom: spacing.xs,
})

const $userEmail: ThemedStyle<TextStyle> = ({ colors }) => ({
  textAlign: "center",
  color: colors.textDim,
  fontSize: 14,
})

const $divider: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  height: 1,
  backgroundColor: colors.separator,
  marginVertical: spacing.lg,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
})

const $sectionHeaderRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
})

const $sectionLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $prefRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $prefLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 15,
})

const $fuelRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: spacing.xs,
})

const $fuelRowLeft: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
})

const $fuelRowRight: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 2,
})

const $fuelRowValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $chipRowStatic: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
})

const $chip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.background,
})

const $chipActive: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.tint,
  backgroundColor: colors.tint,
})

const $chipText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 13,
})

const $chipTextActive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontSize: 13,
  fontWeight: "600",
})

const $settingsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: spacing.xs,
})

const $settingsRowLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 15,
})

const $deleteButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.error,
})

const $deleteText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})

const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  alignItems: "center",
  padding: 24,
})

const $modalBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 16,
  padding: spacing.lg,
  width: "100%",
  gap: spacing.md,
})

const $modalIcon: ThemedStyle<TextStyle> = () => ({
  alignSelf: "center",
})

const $modalTitle: ThemedStyle<TextStyle> = () => ({
  textAlign: "center",
})

const $modalBody: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
  fontSize: 14,
  lineHeight: 20,
})

const $modalActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
})

const $modalCancelBtn: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})