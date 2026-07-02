import { FC, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useRouter } from "expo-router"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { StationCard } from "@/components/StationCard"

import { useNearbyStations, type SortOption } from "@/hooks/useNearbyStations"
import { usePreferredFuel } from "@/hooks/usePreferredFuel"
import { useUserLocation } from "@/hooks/useUserLocation"

import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "distance-asc", label: "Mais próximo" },
  { value: "distance-desc", label: "Mais longe" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
]

const SORT_STATUS_LABELS: Record<SortOption, string> = {
  "distance-asc": "Mais próximo primeiro",
  "distance-desc": "Mais longe primeiro",
  "price-asc": "Menor preço primeiro",
  "price-desc": "Maior preço primeiro",
}

export const HomeScreen: FC = function HomeScreen() {
  const { themed, theme } = useAppTheme()
  const router = useRouter()
  const $topInsets = useSafeAreaInsetsStyle(["top"])

  const [sortBy, setSortBy] = useState<SortOption>("distance-asc")
  const { preferredFuelSlug, setPreferredFuelSlug } = usePreferredFuel()
  const {
    location,
    permissionDenied,
    error: locationError,
    isLoading: locationLoading,
    requestLocation,
  } = useUserLocation()
  const { stations, availableFuels, isLoading, isRefetching, refetch } = useNearbyStations(
    preferredFuelSlug,
    location,
    sortBy,
  )

  return (
    <Screen preset="fixed" contentContainerStyle={$styles.flex1} safeAreaEdges={[]}>
      <View style={themed([$header, $topInsets])}>
        <Text preset="heading" text="Postos próximos" />

        <View style={themed($locationRow)}>
          {locationLoading ? (
            <ActivityIndicator size="small" color={theme.colors.tint} />
          ) : locationError ? (
            <Pressable onPress={requestLocation} style={themed($retryRow)}>
              <Text
                size="xs"
                style={themed($errorText)}
                text={`Erro de localização. Tentar novamente`}
              />
            </Pressable>
          ) : permissionDenied ? (
            <Text
              size="xs"
              style={themed($dimText)}
              text="Localização negada — ative nas configurações para ver a distância"
            />
          ) : (
            <Text size="xs" style={themed($dimText)} text={SORT_STATUS_LABELS[sortBy]} />
          )}
        </View>

        {availableFuels.length > 0 && (
          <FlatList
            horizontal
            data={availableFuels}
            keyExtractor={(item) => item.slug}
            showsHorizontalScrollIndicator={false}
            style={themed($chipRow)}
            renderItem={({ item }) => {
              const isActive = item.slug === preferredFuelSlug
              return (
                <Pressable
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
            }}
          />
        )}

        <FlatList
          horizontal
          data={SORT_OPTIONS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isActive = item.value === sortBy
            return (
              <Pressable
                onPress={() => setSortBy(item.value)}
                style={themed(isActive ? $sortChipActive : $sortChip)}
              >
                <Text
                  size="xs"
                  weight={isActive ? "bold" : "normal"}
                  style={themed(isActive ? $chipTextActive : $chipText)}
                  text={item.label}
                />
              </Pressable>
            )
          }}
        />
      </View>

      <FlatList
        data={stations}
        keyExtractor={(item) => item.id}
        extraData={location}
        contentContainerStyle={themed($listContent)}
        ItemSeparatorComponent={() => <View style={themed($separator)} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={themed($emptyContainer)}>
              <Text text="Nenhum posto encontrado." />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <StationCard
            station={item}
            locationLoading={locationLoading}
            onPress={() => router.push(`/station/${item.id}`)}
          />
        )}
      />
    </Screen>
  )
}

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.sm,
})

const $locationRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginTop: spacing.xxs,
  marginBottom: spacing.sm,
  minHeight: 20,
})

const $retryRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  textDecorationLine: "underline",
})

const $dimText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $chip: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 999,
  backgroundColor: colors.palette.neutral200,
  marginRight: spacing.xs,
})

const $chipActive: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 999,
  backgroundColor: colors.tint,
  marginRight: spacing.xs,
})

const $chipText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $chipTextActive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.xl,
})

const $separator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  height: spacing.sm,
})

const $emptyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingTop: spacing.xxl,
  alignItems: "center",
})

const $chipRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
})

const $sortChip: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 999,
  backgroundColor: colors.palette.neutral200,
  marginRight: spacing.xs,
})

const $sortChipActive: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 999,
  backgroundColor: colors.palette.secondary500,
  marginRight: spacing.xs,
})
