import { Pressable, View, ViewStyle, TextStyle } from "react-native"
import { useRouter } from "expo-router"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { FuelPicker } from "@/components/FuelPicker"
import { usePreferredFuel } from "@/hooks/usePreferredFuel"

import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"

export default function SelectFuelModal() {
  const { themed } = useAppTheme()
  const router = useRouter()
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])

  const { preferredFuelSlug, setPreferredFuelSlug } = usePreferredFuel()

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screen)} safeAreaEdges={[]}>
      <View style={themed([$header, $topInsets])}>
        <Text preset="heading" text="Combustível preferido" />
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text preset="bold" size="lg" text="✕" />
        </Pressable>
      </View>

      <View style={themed($content)}>
        <Text
          size="xs"
          style={themed($helperText)}
          text="Usado para destacar o preço nos postos próximos."
        />
        <FuelPicker selectedSlug={preferredFuelSlug} onSelect={setPreferredFuelSlug} />
      </View>

      <View style={themed([$footer, $bottomInsets])}>
        <Pressable onPress={() => router.back()} style={themed($doneButton)}>
          <Text preset="bold" style={themed($doneButtonText)} text="Concluído" />
        </Pressable>
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

const $doneButton: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingVertical: spacing.sm,
  borderRadius: 12,
  backgroundColor: colors.tint,
  alignItems: "center",
})

const $doneButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})