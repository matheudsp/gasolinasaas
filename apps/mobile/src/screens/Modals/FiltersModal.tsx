import { Pressable, View, ViewStyle, TextStyle } from "react-native"
import { Link, useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { orpc } from "@/lib/orpc"
import { usePreferredFuel } from "@/hooks/usePreferredFuel"
import { useSortOption, SORT_OPTIONS } from "@/hooks/useSortOption"

import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"

export default function FiltersModal() {
  const { themed } = useAppTheme()
  const router = useRouter()
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])

  const { preferredFuelSlug, setPreferredFuelSlug } = usePreferredFuel()
  const { sortBy, setSortBy } = useSortOption()

  const { data: prices = [] } = useQuery(orpc.fuel.listPrices.queryOptions({ input: {} }))

  const availableFuels = Array.from(
    new Map(prices.map((p) => [p.fuelSlug, p.fuelName])).entries(),
  ).map(([slug, name]) => ({ slug, name }))

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screen)} safeAreaEdges={[]}>
      <View style={themed([$header, $topInsets])}>
        <Text preset="heading" text="Filtros" />
        <Link href=".." asChild>
          <Button preset="ghost" RightAccessory={() => <Icon icon="x" size={24} />} />
        </Link>
      </View>

      <View style={themed($section)}>
        <Text preset="subheading" style={themed($sectionTitle)} text="Combustível" />
        <View style={themed($wrapRow)}>
          {availableFuels.map((item) => {
            const isActive = item.slug === preferredFuelSlug
            return (
              <Pressable
                key={item.slug}
                onPress={() => setPreferredFuelSlug(item.slug)}
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
        <Button
          // style={themed($doneButton)}
          // textStyle={themed($doneButtonText)}
          preset="primary"
          text="Concluído"
          onPress={() => router.back()}
        />
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

const $footer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: "auto",
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
})

const $doneButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
})

const $doneButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})
