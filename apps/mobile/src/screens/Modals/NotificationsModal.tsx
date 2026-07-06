import { ActivityIndicator, Pressable, Switch, View, ViewStyle, TextStyle } from "react-native"
import { Link } from "expo-router"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { useNotificationSettings } from "@/hooks/useNotificationSettings"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { Icon } from "@/components/Icon"
import { Button } from "@/components/Button"

export default function NotificationsModal() {
  const { themed, theme } = useAppTheme()

  const $topInsets = useSafeAreaInsetsStyle(["top"])

  const { notifEnabled, isToggling, setNotifEnabled } = useNotificationSettings()

  return (
    <Screen preset="scroll" contentContainerStyle={themed($screen)} safeAreaEdges={[]}>
      <View style={themed([$header, $topInsets])}>
        <Text preset="heading" text="Notificações" />
        <Link href=".." asChild>
          <Button preset="ghost" RightAccessory={() => <Icon icon="x" size={24} />} />
        </Link>
      </View>

      <View style={themed($content)}>
        <View style={themed($row)}>
          <View style={themed($rowTextColumn)}>
            <Text text="Notificações in-App" weight="semiBold" size="md" />
            <Text
              size="xs"
              style={themed($rowHint)}
              text="Ofertas e novidades dos postos próximos a você."
            />
          </View>
          {isToggling ? (
            <ActivityIndicator size="small" color={theme.colors.palette.primary500} />
          ) : (
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              accessibilityLabel="Notificações in-App"
              trackColor={{
                false: theme.colors.separator,
                true: theme.colors.palette.primary500,
              }}
              thumbColor={theme.colors.palette.neutral100}
            />
          )}
        </View>
      </View>
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.md,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
})

const $row: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.palette.neutral100,
  gap: spacing.sm,
})

const $rowTextColumn: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  gap: 2,
})

const $rowHint: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
