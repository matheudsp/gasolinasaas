import { useCallback, useMemo, useState } from "react"
import {
  Alert,
  Modal,
  Pressable,
  View,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native"
import { useFocusEffect, Link, type Href } from "expo-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useMMKVString } from "react-native-mmkv"
import {
  MaterialDesignIcons,
  type MaterialDesignIconsIconName,
} from "@react-native-vector-icons/material-design-icons"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Icon } from "@/components/Icon"
import { authClient } from "@/lib/auth"
import { orpc } from "@/lib/orpc"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle, ThemeContextModeT } from "@/theme/types"
import { storage } from "@/utils/storage"
import { usePreferredFuel } from "@/hooks/usePreferredFuel"
import { useNotificationSettings } from "@/hooks/useNotificationSettings"

const THEME_SCHEME_KEY = "ignite.themeScheme"

const THEME_LABELS: Record<string, string> = {
  light: "Claro",
  dark: "Escuro",
}

const ICON_SIZE = 16

function SectionHeader({ title, icon }: { title: string; icon: MaterialDesignIconsIconName }) {
  const { themed, theme } = useAppTheme()
  return (
    <View style={themed($sectionHeaderRow)}>
      <MaterialDesignIcons name={icon} size={ICON_SIZE} color={theme.colors.palette.primary500} />
      <Text preset="formLabel" weight="bold" text={title} style={themed($sectionLabel)} />
    </View>
  )
}
function PreferenceRow({
  href,
  icon,
  label,
  value,
}: {
  href: Href
  icon: MaterialDesignIconsIconName
  label: string
  value: string
}) {
  const { themed, theme } = useAppTheme()
  return (
    <Link href={href} asChild>
      <Button
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={`Abre a seleção de ${label.toLowerCase()}`}
        android_ripple={{ color: theme.colors.palette.neutral300 }}
        style={themed($prefRowButton)}
        preset="ghost"
      >
        <View style={themed($prefRowContent)}>
          <MaterialDesignIcons
            name={icon}
            size={ICON_SIZE}
            color={theme.colors.palette.primary500}
          />
          <View style={themed($prefRowTextColumn)}>
            <Text text={label} weight="semiBold" size="md" />
            <Text size="xs" style={themed($prefRowValue)} text={value} />
          </View>
          <Icon icon="caretRight" size={ICON_SIZE} color={theme.colors.palette.primary500} />
        </View>
      </Button>
    </Link>
  )
}

export function MyAccountScreen() {
  const { themed, theme } = useAppTheme()
  const { data: session } = authClient.useSession()
  const user = session?.user

  const [themeScheme] = useMMKVString(THEME_SCHEME_KEY, storage)
  const themeLabel = THEME_LABELS[themeScheme ?? ""] ?? "Auto"

  const { preferredFuelSlug, refresh: refreshFuel } = usePreferredFuel()

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

  const { notifEnabled, refresh: refreshNotif } = useNotificationSettings()

  const { data: balanceData } = useQuery(orpc.loyalty.myBalance.queryOptions())
  const { data: roleData } = useQuery(orpc.loyalty.myRole.queryOptions())
  const isOperator = roleData?.role === "owner" || roleData?.role === "operator"

  useFocusEffect(
    useCallback(() => {
      refreshFuel()
      refreshNotif()
    }, [refreshFuel, refreshNotif]),
  )

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

      <View style={themed($section)}>
        <SectionHeader title="Preferências" icon="tune" />

        {availableFuels.length > 0 && (
          <PreferenceRow
            href="/(app)/(modals)/selectFuel"
            icon="gas-station-outline"
            label="Combustível preferido"
            value={preferredFuelName}
          />
        )}

        <PreferenceRow
          href="/(app)/(modals)/selectTheme"
          icon="theme-light-dark"
          label="Tema"
          value={themeLabel}
        />

        <PreferenceRow
          href="/(app)/(modals)/notificationSettings"
          icon="bell-outline"
          label="Notificações"
          value={notifEnabled ? "Ativadas" : "Desativadas"}
        />
      </View>

      <View style={themed($divider)} />

      <View style={themed($section)}>
        <SectionHeader title="Fidelidade" icon="star-outline" />

        <PreferenceRow
          href="/(app)/loyalty"
          icon="wallet-giftcard"
          label="Meus pontos"
          value={`${balanceData?.balance ?? 0} pontos`}
        />

        {isOperator && (
          <PreferenceRow
            href="/(app)/operator"
            icon="qrcode-scan"
            label="Modo operador"
            value="Creditar pontos no caixa"
          />
        )}
      </View>

      <View style={themed($divider)} />

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
          <Pressable style={themed($modalBox)} onPress={() => undefined} accessibilityViewIsModal>
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

const $screen: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexGrow: 1,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.xxxxl,
})

const $avatarSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  marginBottom: spacing.xl,
})

const $avatar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 80,
  height: 80,
  borderRadius: 4,
  backgroundColor: colors.palette.primary500,
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
  gap: spacing.sm,
})

const $sectionHeaderRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
})

const $sectionLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $prefRowButton: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  minHeight: 0,
  justifyContent: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.palette.neutral100,
})

const $prefRowContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $prefRowTextColumn: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 2,
})

const $prefRowValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
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
  borderRadius: 4,
  borderWidth: 1,
  borderColor: colors.border,
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
