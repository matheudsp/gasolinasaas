import { FC, useCallback } from "react"
import { ActivityIndicator, FlatList, Pressable, RefreshControl, TextStyle, View, ViewStyle } from "react-native"
import { Link, useFocusEffect, useRouter } from "expo-router"

import { Header } from "@/components/Header"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { StationCard } from "@/components/StationCard"
import { Text } from "@/components/Text"
import { useNearbyStations } from "@/hooks/useNearbyStations"
import { usePreferredFuel } from "@/hooks/usePreferredFuel"
import { SORT_LABELS, useSortOption } from "@/hooks/useSortOption"
import { useUserLocation } from "@/hooks/useUserLocation"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * Lista completa de postos da rede, com filtros e ordenação. Antes era a
 * tela inicial inteira; virou uma seção acessível pelo hub ("Ver todos").
 */
export const StationsScreen: FC = function StationsScreen() {
  const { themed, theme } = useAppTheme()
  const router = useRouter()

  const { preferredFuelSlug, refresh: refreshFuel } = usePreferredFuel()
  const { sortBy, refresh: refreshSort } = useSortOption()
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

  useFocusEffect(
    useCallback(() => {
      refreshFuel()
      refreshSort()
    }, [refreshFuel, refreshSort]),
  )

  const preferredFuelName =
    availableFuels.find((f) => f.slug === preferredFuelSlug)?.name ?? "Combustível"
  const filterSummary = `${preferredFuelName} / ${SORT_LABELS[sortBy]}`

  return (
    <Screen preset="fixed" safeAreaEdges={["bottom"]}>
      <Header title="Postos" leftIcon="back" onLeftPress={() => router.back()} />

      <View style={themed($filters)}>
        {locationLoading ? (
          <ActivityIndicator size="small" color={theme.colors.tint} />
        ) : locationError ? (
          <Pressable onPress={requestLocation}>
            <Text size="xs" style={themed($errorText)} text="Erro de localização. Tentar novamente" />
          </Pressable>
        ) : permissionDenied ? (
          <Text
            size="xs"
            style={themed($dimText)}
            text="Localização negada — ative nas configurações para ver a distância"
          />
        ) : null}

        <Link asChild href="/(app)/(modals)/filters">
          <Pressable style={themed($filterButton)}>
            <Text size="xs" style={themed($filterButtonText)} text={filterSummary} />
            <View style={$rowCenter}>
              <Text size="xs" style={themed($filterButtonChevron)} text="Filtros" />
              <Icon icon="caretRight" size={16} color={theme.colors.tint} />
            </View>
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={stations}
        keyExtractor={(item) => item.id}
        extraData={location}
        contentContainerStyle={themed($listContent)}
        ItemSeparatorComponent={() => <View style={themed($separator)} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching || isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={themed($empty)}>
              <Text text="Nenhum posto encontrado." />
            </View>
          )
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

const $rowCenter: ViewStyle = { flexDirection: "row", alignItems: "center" }

const $filters: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.sm,
  gap: spacing.xs,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  textDecorationLine: "underline",
})

const $dimText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $filterButton: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 12,
  backgroundColor: colors.palette.neutral200,
})

const $filterButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $filterButtonChevron: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.xl,
})

const $separator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  height: spacing.sm,
})

const $empty: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingTop: spacing.xxl,
  alignItems: "center",
})
