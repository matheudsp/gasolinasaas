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
import { useRouter, useFocusEffect, Link } from "expo-router"
import { useQuery } from "@tanstack/react-query"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { StationCard } from "@/components/StationCard"
import { orpc } from "@/lib/orpc"

import { useNearbyStations } from "@/hooks/useNearbyStations"
import { usePreferredFuel } from "@/hooks/usePreferredFuel"
import { useSortOption, SORT_LABELS } from "@/hooks/useSortOption"
import { useUserLocation } from "@/hooks/useUserLocation"
import { authClient } from "@/lib/auth"

import type { ThemedStyle } from "@/theme/types"
import { $styles } from "@/theme/styles"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { useAppTheme } from "@/theme/context"
import { Icon } from "@/components/Icon"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

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

  const { data: unread } = useQuery(orpc.user.getUnreadNotificationCount.queryOptions())
  const unreadCount = unread?.count ?? 0

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
    <Screen preset="fixed" contentContainerStyle={$styles.flex1} safeAreaEdges={[]}>
      <View style={themed([$header, $topInsets])}>
        <View style={themed($headerTopRow)}>
          <Text
            preset="heading"
            text={`Olá, ${data?.user?.name ?? "Usuário"}`}
            style={$headingText}
            numberOfLines={1}
          />

          <View style={themed($headerActions)}>
            <Pressable
              onPress={() => router.push("/(app)/(tabs)/loyalty")}
              accessibilityRole="button"
              accessibilityLabel="Meus pontos"
              hitSlop={8}
              style={themed($iconButton)}
            >
              <MaterialDesignIcons
                name="wallet-giftcard"
                size={24}
                color={theme.colors.text}
              />
            </Pressable>

            <Pressable
              onPress={() => router.push("/(app)/notifications")}
              accessibilityRole="button"
              accessibilityLabel={
                unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : "Notificações"
              }
              hitSlop={8}
              style={themed($iconButton)}
            >
              <Icon icon="bell" size={24} color={theme.colors.text} />
              {unreadCount > 0 && (
                <View style={themed($badge)}>
                  <Text
                    size="xxs"
                    weight="bold"
                    style={themed($badgeText)}
                    text={unreadCount > 99 ? "99+" : String(unreadCount)}
                  />
                </View>
              )}
            </Pressable>
          </View>
        </View>

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

        <Link asChild href="/(app)/(modals)/filters">
          <Pressable
            // onPress={() => router.push("/(app)/(modals)/filters")}
            style={themed($filterButton)}
          >
            <Text size="xs" style={themed($filterButtonText)} text={filterSummary} />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
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

const $headerTopRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
})

const $headingText: TextStyle = {
  flexShrink: 1,
}

const $headerActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
})

const $iconButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xxs,
})

const $badge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: -2,
  right: -4,
  minWidth: 16,
  height: 16,
  borderRadius: 8,
  paddingHorizontal: 3,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.error,
})

const $badgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  lineHeight: 14,
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
