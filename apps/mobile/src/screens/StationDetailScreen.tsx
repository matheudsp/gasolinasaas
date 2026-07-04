import { FC } from "react"
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { orpc } from "@/lib/orpc"
import { useUserLocation } from "@/hooks/useUserLocation"
import { formatDistance, getDistanceKm } from "@/utils/distance"
import { formatPriceBRL } from "@/utils/formatCurrency"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

// ── Amenity config ────────────────────────────────────────────────────────────

const AMENITIES = {
  wifi: { label: "Wi-Fi", icon: "wifi" },
  accessibility: { label: "Acessibilidade", icon: "wheelchair-accessibility" },
  convenienceStore: { label: "Loja de Conveniência", icon: "store-outline" },
  restaurant: { label: "Restaurante", icon: "silverware-fork-knife" },
  electricCharging: { label: "Recarga Elétrica", icon: "ev-station" },
  carWash: { label: "Lava-Jato", icon: "car-wash" },
  open24h: { label: "Aberto 24h", icon: "clock-outline" },
  tirePressure: { label: "Calibragem", icon: "car-tire-alert" },
  bathroom: { label: "Banheiro", icon: "toilet" },
} as const

const ICON_SIZE = 14

// ── Screen ────────────────────────────────────────────────────────────────────

export const StationDetailScreen: FC = function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { themed, theme } = useAppTheme()
  const { location } = useUserLocation()

  const {
    data: station,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery(orpc.station.getById.queryOptions({ input: { id: id ?? "" }, enabled: !!id }))

  async function openMaps() {
    if (!station) return
    const coords = `${station.latitude},${station.longitude}`
    const url = `https://www.google.com/maps/search/?api=1&query=${coords}`
    try {
      await Linking.openURL(url)
    } catch {
      Alert.alert(
        "Não foi possível abrir o mapa",
        "Verifique se você tem um aplicativo de mapas ou navegador instalado.",
      )
    }
  }

  const distanceKm =
    location && station
      ? getDistanceKm(location.latitude, location.longitude, station.latitude, station.longitude)
      : null

  const activeAmenities = station
    ? (Object.keys(AMENITIES) as Array<keyof typeof AMENITIES>).filter(
        (key) => (station as Record<string, unknown>)[key] === true,
      )
    : []

  return (
    <Screen preset="fixed" safeAreaEdges={["bottom"]}>
      <Header
        title={station?.name ?? "Detalhes do Posto"}
        leftIcon="back"
        onLeftPress={() => router.back()}
      />

      {isLoading ? (
        <View style={themed($centered)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
        </View>
      ) : isError || !station ? (
        <View style={themed($centered)}>
          <MaterialDesignIcons name="alert-circle-outline" size={32} color={theme.colors.textDim} />
          <Text text="Não foi possível carregar este posto." style={themed($dimText)} />
          <Pressable
            onPress={() => refetch()}
            accessibilityRole="button"
            accessibilityLabel="Tentar novamente"
            style={({ pressed }) => [themed($retryButton), pressed && { opacity: 0.8 }]}
          >
            <Text weight="bold" text="Tentar novamente" style={themed($retryButtonText)} />
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={themed($scrollContent)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.colors.tint}
            />
          }
        >
          {/* ── Identidade + distância ─────────────────────────────────── */}
          <View
            style={themed($card)}
            accessible
            accessibilityLabel={[
              station.name,
              station.city,
              station.address,
              distanceKm !== null && isFinite(distanceKm)
                ? `a ${formatDistance(distanceKm)}`
                : null,
            ]
              .filter(Boolean)
              .join(", ")}
          >
            <View style={themed($overlineRow)}>
              <MaterialDesignIcons
                name="gas-station-outline"
                size={ICON_SIZE}
                color={theme.colors.tint}
              />
              <Text
                size="xxs"
                weight="bold"
                numberOfLines={1}
                style={themed($overline)}
                text={station.city.toUpperCase()}
              />
            </View>

            <Text preset="bold" text={station.name} style={themed($stationName)} />
            <Text text={station.address} style={themed($address)} />

            {distanceKm !== null && isFinite(distanceKm) && (
              <View style={themed($distanceBadge)}>
                <MaterialDesignIcons
                  name="map-marker-distance"
                  size={ICON_SIZE}
                  color={theme.colors.palette.accent500}
                />
                <Text
                  size="xs"
                  weight="bold"
                  style={themed($distanceText)}
                  text={formatDistance(distanceKm)}
                />
              </View>
            )}
          </View>

          {/* ── Preços ──────────────────────────────────────────────── */}
          <View style={themed($section)}>
            <Text preset="formLabel" text="Combustíveis" style={themed($sectionLabel)} />
            {station.prices.length > 0 ? (
              <View style={themed($priceGrid)}>
                {station.prices.map((p) => (
                  <View
                    key={p.id}
                    style={themed($priceCard)}
                    accessible
                    accessibilityLabel={`${p.fuelName}, R$ ${formatPriceBRL(p.currentPrice)}, atualizado em ${fmtDate(p.updatedAt)}`}
                  >
                    <Text
                      size="xs"
                      weight="bold"
                      text={p.fuelName}
                      style={themed($fuelName)}
                      numberOfLines={2}
                    />

                    <View style={themed($priceRow)}>
                      <Text style={themed($plateCurrency)} text="R$" />
                      <Text style={themed($plateValue)} text={formatPriceBRL(p.currentPrice)} />
                    </View>

                    <View style={themed($updatedRow)}>
                      <MaterialDesignIcons
                        name="clock-outline"
                        size={11}
                        color={theme.colors.palette.neutral400}
                      />
                      <Text size="xxs" text={fmtDate(p.updatedAt)} style={themed($updatedAt)} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text size="xs" style={themed($dimText)} text="Nenhum preço cadastrado ainda." />
            )}
          </View>

          {/* ── Comodidades ─────────────────────────────────────────── */}
          {activeAmenities.length > 0 && (
            <View style={themed($section)}>
              <Text preset="formLabel" text="Comodidades" style={themed($sectionLabel)} />
              <View style={themed($badgeRow)}>
                {activeAmenities.map((key) => {
                  const amenity = AMENITIES[key]
                  return (
                    <View key={key} style={themed($badge)}>
                      <MaterialDesignIcons
                        name={amenity.icon}
                        size={ICON_SIZE}
                        color={theme.colors.palette.secondary500}
                      />
                      <Text size="xs" text={amenity.label} style={themed($badgeText)} />
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {/* ── Abrir no Maps ───────────────────────────────────────── */}
          <Pressable
            onPress={openMaps}
            accessibilityRole="button"
            accessibilityLabel="Abrir localização no mapa"
            accessibilityHint="Abre o aplicativo de mapas para traçar rota até o posto"
            android_ripple={{ color: theme.colors.palette.neutral400 }}
            style={({ pressed }) => [themed($mapButton), pressed && { opacity: 0.85 }]}
          >
            <MaterialDesignIcons
              name="directions"
              size={18}
              color={theme.colors.palette.neutral100}
            />
            <Text weight="bold" text="Abrir no Google Maps" style={themed($mapButtonText)} />
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $centered: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: spacing.sm,
  paddingHorizontal: spacing.lg,
})

const $scrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  gap: spacing.md,
  paddingBottom: spacing.xxl,
})

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 14,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.separator,
  gap: spacing.xs,
})

const $overlineRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
})

const $overline: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  letterSpacing: 0.5,
})

const $stationName: ThemedStyle<TextStyle> = () => ({
  fontSize: 18,
})

const $address: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
})

const $distanceBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  alignSelf: "flex-start",
  backgroundColor: colors.palette.accent100,
  borderRadius: 20,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
  marginTop: spacing.xxs,
})

const $distanceText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.accent500,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $sectionLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $priceGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
})

const $priceCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  minWidth: 130,
  backgroundColor: colors.palette.neutral800,
  borderRadius: 12,
  borderTopWidth: 3,
  borderTopColor: colors.palette.accent400,
  padding: spacing.sm,
  gap: spacing.xxs,
})

const $fuelName: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral300,
  lineHeight: 16,
})

const $priceRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 2,
})

const $plateCurrency: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral400,
  fontSize: 10,
  marginTop: 5,
})

const $plateValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.accent300,
  fontSize: 20,
  fontWeight: "700",
  fontVariant: ["tabular-nums"],
})

const $updatedRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 3,
  marginTop: spacing.xxxs,
})

const $updatedAt: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral400,
})

const $badgeRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
})

const $badge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  backgroundColor: colors.palette.secondary100,
  borderRadius: 20,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
})

const $badgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.secondary500,
})

const $mapButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
  backgroundColor: colors.tint,
  borderRadius: 12,
  paddingVertical: spacing.md,
  marginTop: spacing.sm,
})

const $mapButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.sm,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 10,
  backgroundColor: colors.palette.neutral200,
})

const $retryButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $dimText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
