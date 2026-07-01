import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  View,
  ViewStyle,
  TextStyle,
} from "react-native"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { useMutation, useQuery } from "@tanstack/react-query"

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

const THEME_OPTIONS: Array<{ value: ThemeContextModeT; label: string }> = [
  { value: undefined, label: "Auto" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
]

const THEME_SCHEME_KEY = "ignite.themeScheme"

// ── Componentes auxiliares ────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const { themed } = useAppTheme()
  return <Text preset="formLabel" text={title} style={themed($sectionLabel)} />
}

function SettingsRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
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
  const { preferredFuelSlug, setPreferredFuelSlug } = usePreferredFuel()

  const { data: priceRows = [] } = useQuery(
    orpc.fuel.listPrices.queryOptions({ input: {} }),
  )
  const availableFuels = useCallback(() => {
    const map = new Map<string, string>()
    for (const p of priceRows) {
      if (!map.has(p.fuelSlug)) map.set(p.fuelSlug, p.fuelName)
    }
    return Array.from(map, ([slug, name]) => ({ slug, name }))
  }, [priceRows])()

  // ── Notificações ──────────────────────────────────────────────────────────
  const [optedOut, setOptedOut] = useMMKVBoolean(PUSH_OPT_OUT_KEY, storage)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setHasPermission(status === "granted")
    })
  }, [])

  const notifEnabled = hasPermission && optedOut !== true

  const { mutate: registerToken } = useMutation(
    orpc.push.registerToken.mutationOptions(),
  )
  const { mutate: unregisterToken } = useMutation(
    orpc.push.unregisterToken.mutationOptions(),
  )

  async function handleNotifToggle(value: boolean) {
    if (value) {
      if (!Device.isDevice) return
      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== "granted") {
        // Permissão negada — precisa ir nas configurações do SO
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
    await authClient.signOut()
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
    ? user.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "?"

  return (
    <Screen preset="scroll" contentContainerStyle={themed($screen)}>
      {/* ── Avatar ─────────────────────────────────────────────────── */}
      <View style={themed($avatarSection)}>
        <View style={themed($avatar)}>
          <Text text={initials} style={themed($avatarText)} />
        </View>
        <Text preset="heading" text={user?.name ?? "—"} style={themed($userName)} />
        <Text text={user?.email ?? "—"} style={themed($userEmail)} />
      </View>

      <View style={themed($divider)} />

      {/* ── Preferências ───────────────────────────────────────────── */}
      <View style={themed($section)}>
        <SectionHeader title="Preferências" />

        {/* Combustível */}
        {availableFuels.length > 0 && (
          <View style={themed($prefRow)}>
            <Text text="Combustível preferido" style={themed($prefLabel)} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={themed($chipRow)}
            >
              {availableFuels.map((f) => {
                const active = f.slug === preferredFuelSlug
                return (
                  <Pressable
                    key={f.slug}
                    onPress={() => setPreferredFuelSlug(f.slug)}
                    style={themed(active ? $chipActive : $chip)}
                  >
                    <Text
                      text={f.name}
                      style={themed(active ? $chipTextActive : $chipText)}
                    />
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
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
                  style={themed(active ? $chipActive : $chip)}
                >
                  <Text
                    text={opt.label}
                    style={themed(active ? $chipTextActive : $chipText)}
                  />
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Notificações */}
        <SettingsRow label="Notificações push">
          <Switch
            value={notifEnabled}
            onValueChange={handleNotifToggle}
            trackColor={{
              false: theme.colors.separator,
              true: theme.colors.tint,
            }}
            thumbColor={theme.colors.palette.neutral100}
          />
        </SettingsRow>
      </View>

      <View style={themed($divider)} />

      {/* ── Conta ──────────────────────────────────────────────────── */}
      <View style={themed($section)}>
        <SectionHeader title="Conta" />

        <Button
          text={isSigningOut ? "Saindo..." : "Sair da conta"}
          preset="default"
          onPress={handleSignOut}
          disabled={isSigningOut}
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
          onPress={() => setDeleteConfirmVisible(false)}
        >
          <Pressable style={themed($modalBox)} onPress={() => undefined}>
            <Text
              preset="subheading"
              text="Deletar conta"
              style={themed($modalTitle)}
            />
            <Text
              text="Essa ação é irreversível. Todos os seus dados serão permanentemente removidos."
              style={themed($modalBody)}
            />
            <View style={themed($modalActions)}>
              <Button
                text="Cancelar"
                preset="default"
                onPress={() => setDeleteConfirmVisible(false)}
                style={themed($modalCancelBtn)}
              />
              <Button
                text={isDeleting ? "Deletando..." : "Confirmar"}
                onPress={() => deleteAccount()}
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

const $chipRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
  paddingVertical: spacing.xxs,
})

const $chipRowStatic: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
})

const $chip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.background,
})

const $chipActive: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
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