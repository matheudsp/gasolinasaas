import { FC, useCallback } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useRouter, useFocusEffect } from "expo-router"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { StationCard } from "@/components/StationCard"

import { useNearbyStations } from "@/hooks/useNearbyStations"
import { usePreferredFuel } from "@/hooks/usePreferredFuel"
import { useSortOption, SORT_LABELS } from "@/hooks/useSortOption"
import { useUserLocation } from "@/hooks/useUserLocation"
import { authClient } from "@/lib/auth"

import type { ThemedStyle } from "@/theme/types"
import { $styles } from "@/theme/styles"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { useAppTheme } from "@/theme/context"

export const HomeScreen: FC = function HomeScreen() {
  const { themed, theme } = useAppTheme()
  const router = useRouter()
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const { data } = authClient.useSession()

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
  const filterSummary = `${preferredFuelName} · ${SORT_LABELS[sortBy]}`

  return (
    <Screen preset="fixed" contentContainerStyle={$styles.flex1} safeAreaEdges={[]}>
      <View style={themed([$header, $topInsets])}>
        <Text preset="heading" text={`Olá, ${data?.user?.name ?? "Usuário"}`} />

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
          ) : (
            permissionDenied && (
              <Text
                size="xs"
                style={themed($dimText)}
                text="Localização negada — ative nas configurações para ver a distância"
              />
            )
          )}
        </View>

        <Pressable onPress={() => router.push("/(app)/(modals)/filters")} style={themed($filterButton)}>
          <Text size="xs" style={themed($filterButtonText)} text={filterSummary} />
          <Text size="xs" style={themed($filterButtonChevron)} text="Filtros ›" />
        </Pressable>
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

const $emptyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingTop: spacing.xxl,
  alignItems: "center",
})
