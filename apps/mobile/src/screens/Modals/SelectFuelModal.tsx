import { View, ViewStyle, TextStyle } from "react-native"
import { Link } from "expo-router"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { FuelPicker } from "@/components/FuelPicker"
import { usePreferredFuel } from "@/hooks/usePreferredFuel"

import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { Icon } from "@/components/Icon"
import { Button } from "@/components/Button"

export default function SelectFuelModal() {
  const { themed } = useAppTheme()
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])

  const { preferredFuelSlug, setPreferredFuelSlug } = usePreferredFuel()

  return (
    <Screen preset="scroll" contentContainerStyle={themed($screen)} safeAreaEdges={[]}>
      <View style={themed([$header, $topInsets])}>
        <Text preset="heading" text="Preferências" />
        <Link href=".." asChild>
          <Button hitSlop={12} preset="ghost" RightAccessory={() => <Icon icon="x" size={24} />} />
        </Link>
      </View>

      <View style={themed($content)}>
        <Text
          size="xs"
          style={themed($helperText)}
          text="Para te oferecer uma experiência personalizada, selecione seu combustível preferido."
        />
        <FuelPicker selectedSlug={preferredFuelSlug} onSelect={setPreferredFuelSlug} />
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

const $helperText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $footer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: "auto",
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
})
