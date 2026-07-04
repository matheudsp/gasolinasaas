import { FC } from "react"
import { Pressable, View, ViewStyle, TextStyle } from "react-native"
import { useQuery } from "@tanstack/react-query"

import { Text } from "@/components/Text"
import { orpc } from "@/lib/orpc"

import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"

interface FuelPickerProps {
  selectedSlug: string
  onSelect: (slug: string) => void
}

/**
 * Renders the list of available fuel types as selectable chips.
 * Shared between the Home filters modal and the Account fuel
 * preference modal so both stay visually/behaviorally in sync.
 */
export const FuelPicker: FC<FuelPickerProps> = function FuelPicker({
  selectedSlug,
  onSelect,
}) {
  const { themed, theme } = useAppTheme()

  const { data: prices = [] } = useQuery(orpc.fuel.listPrices.queryOptions({ input: {} }))

  const availableFuels = Array.from(
    new Map(prices.map((p) => [p.fuelSlug, p.fuelName])).entries(),
  ).map(([slug, name]) => ({ slug, name }))

  return (
    <View style={themed($wrapRow)}>
      {availableFuels.map((item) => {
        const isActive = item.slug === selectedSlug
        return (
          <Pressable
            key={item.slug}
            onPress={() => onSelect(item.slug)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.name}
            android_ripple={{ color: theme.colors.palette.neutral300 }}
            style={themed(isActive ? $chipActive : $chip)}
          >
            <Text
              size="xs"
              weight={isActive ? "bold" : "normal"}
              style={themed(isActive ? $chipTextActive : $chipText)}
              text={item.name}
            />
          </Pressable>
        )
      })}
    </View>
  )
}

const $wrapRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
})

const $chip: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 999,
  backgroundColor: colors.palette.neutral200,
})

const $chipActive: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 999,
  backgroundColor: colors.tint,
})

const $chipText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $chipTextActive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})