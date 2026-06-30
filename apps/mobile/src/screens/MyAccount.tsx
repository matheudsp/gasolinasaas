import { useState } from "react"
import { ActivityIndicator, View, ViewStyle, TextStyle } from "react-native"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { authClient } from "@/lib/auth"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

export function MyAccountScreen() {
  const { themed, theme } = useAppTheme()
  const { data: session } = authClient.useSession()
  const [isLoading, setIsLoading] = useState(false)

  const user = session?.user
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?"

  async function handleSignOut() {
    setIsLoading(true)
    await authClient.signOut()
    // A sessão vai para null → o guard no _layout.tsx redireciona para sign-in
  }

  return (
    <Screen preset="scroll" contentContainerStyle={themed($screen)}>
      {/* Avatar */}
      <View style={themed($avatarSection)}>
        <View style={themed($avatar)}>
          <Text text={initials} style={themed($avatarText)} />
        </View>
        <Text preset="heading" text={user?.name ?? "—"} style={themed($userName)} />
        <Text text={user?.email ?? "—"} style={themed($userEmail)} />
      </View>

      {/* Divisor */}
      <View style={themed($divider)} />

      {/* Ações */}
      <View style={themed($section)}>
        <Text preset="formLabel" text="Conta" style={themed($sectionLabel)} />

        <Button
          text={isLoading ? "Saindo..." : "Sair da conta"}
          preset="default"
          onPress={handleSignOut}
          disabled={isLoading}
          style={themed($logoutButton)}
          textStyle={themed($logoutText)}
          RightAccessory={
            isLoading
              ? ({ style }) => (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.error}
                    style={style}
                  />
                )
              : undefined
          }
        />
      </View>
    </Screen>
  )
}

// ── Styles ────────────────────────────────────────────────────────

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
  marginBottom: spacing.xl,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $sectionLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginBottom: spacing.xs,
})

const $logoutButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.error,
})

const $logoutText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})