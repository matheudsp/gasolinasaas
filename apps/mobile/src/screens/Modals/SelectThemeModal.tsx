import { Pressable, View, ViewStyle, TextStyle } from "react-native"
import { Link } from "expo-router"
import { useMMKVString } from "react-native-mmkv"
import {
  MaterialDesignIcons,
  type MaterialDesignIconsIconName,
} from "@react-native-vector-icons/material-design-icons"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle, ThemeContextModeT } from "@/theme/types"
import { storage } from "@/utils/storage"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"

const THEME_SCHEME_KEY = "ignite.themeScheme"

const THEME_OPTIONS: Array<{
  value: ThemeContextModeT
  label: string
  icon: MaterialDesignIconsIconName
}> = [
  { value: undefined, label: "Auto", icon: "brightness-auto" },
  { value: "light", label: "Claro", icon: "white-balance-sunny" },
  { value: "dark", label: "Escuro", icon: "weather-night" },
]

export default function SelectThemeModal() {
  const { themed, theme, setThemeContextOverride } = useAppTheme()

  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const [themeScheme] = useMMKVString(THEME_SCHEME_KEY, storage)
  const currentTheme = (themeScheme as ThemeContextModeT) ?? undefined

  return (
    <Screen preset="scroll" contentContainerStyle={themed($screen)} safeAreaEdges={[]}>
      <View style={themed([$header, $topInsets])}>
        <Text preset="heading" text="Tema" />
        <Link href=".." asChild>
          <Button preset="ghost" RightAccessory={() => <Icon icon="x" size={24} />} />
        </Link>
      </View>

      <View style={themed($content)}>
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
              style={themed(active ? $optionActive : $option)}
            >
              <MaterialDesignIcons
                name={opt.icon}
                size={18}
                color={active ? theme.colors.palette.neutral100 : theme.colors.palette.primary500}
              />
              <Text
                text={opt.label}
                weight={active ? "bold" : "normal"}
                style={themed(active ? $optionTextActive : $optionText)}
              />
            </Pressable>
          )
        })}
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
  gap: spacing.sm,
})

const $option: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.palette.neutral100,
})

const $optionActive: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: colors.palette.primary500,
  backgroundColor: colors.palette.primary500,
})

const $optionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $optionTextActive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})
