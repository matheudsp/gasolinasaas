import { Pressable, View, ViewStyle, TextStyle } from "react-native"
import { useRouter } from "expo-router"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { FuelPicker } from "@/components/FuelPicker"
import { usePreferredFuel } from "@/hooks/usePreferredFuel"
import { useSortOption, SORT_OPTIONS } from "@/hooks/useSortOption"

import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"

export default function FiltersModal() {
  const { themed, theme } = useAppTheme()
  const router = useRouter()
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])

  const { preferredFuelSlug, setPreferredFuelSlug } = usePreferredFuel()
  const { sortBy, setSortBy } = useSortOption()

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screen)} safeAreaEdges={[]}>
      <View style={themed([$header, $topInsets])}>
        <Text preset="heading" text="Filtrar" />
        <Button
          preset="ghost"
          accessibilityLabel="Fechar"
          onPress={() => router.back()}
          RightAccessory={() => <Icon icon="x" size={24} />}
        />
      </View>

      <View style={themed($section)}>
        <Text preset="subheading" style={themed($sectionTitle)} text="Combustível" />
        <FuelPicker selectedSlug={preferredFuelSlug} onSelect={setPreferredFuelSlug} />
      </View>

      <View style={themed($section)}>
        <Text preset="subheading" style={themed($sectionTitle)} text="Ordenar por" />
        <View style={themed($wrapRow)}>
          {SORT_OPTIONS.map((item) => {
            const isActive = item.value === sortBy
            return (
              <Pressable
                key={item.value}
                onPress={() => setSortBy(item.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={item.label}
                android_ripple={{ color: theme.colors.palette.neutral300 }}
                style={themed(isActive ? $chipActive : $chip)}
              >
                <Text
                  size="xs"
                  weight={isActive ? "bold" : "normal"}
                  style={themed(isActive ? $chipTextActive : $chipText)}
                  text={item.label}
                />
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={themed([$footer, $bottomInsets])}>
        <Button preset="primary" text="Filtrar" onPress={() => router.back()} />
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

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  marginBottom: spacing.lg,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $wrapRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
})

// borderRadius 4 + cores literais de palette (não colors.tint) — mesmo
// padrão de FuelPicker/selectTheme, pra evitar o bug de contraste que
// colors.tint causa quando o tema muda entre claro/escuro.
const $chip: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.palette.neutral100,
})

const $chipActive: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: colors.palette.primary500,
  backgroundColor: colors.palette.primary500,
})

const $chipText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $chipTextActive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $footer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: "auto",
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
})
