import { FC } from "react"
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { orpc } from "@/lib/orpc"
import { useUserLocation } from "@/hooks/useUserLocation"
import { formatDistance, getDistanceKm } from "@/utils/distance"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

// ── Amenity config ────────────────────────────────────────────────────────────

const AMENITY_LABELS: Record<string, string> = {
  wifi: "Wi-Fi",
  accessibility: "Acessibilidade",
  convenienceStore: "Loja de Conveniência",
  restaurant: "Restaurante",
  electricCharging: "Recarga Elétrica",
  carWash: "Lava-Jato",
  open24h: "Aberto 24h",
  tirePressure: "Calibragem",
  bathroom: "Banheiro",
}

// ── Screen ────────────────────────────────────────────────────────────────────

export const StationDetailScreen: FC = function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { themed, theme } = useAppTheme()
  const { location } = useUserLocation()

  const { data: station, isLoading, isError } = useQuery(
    orpc.station.getById.queryOptions({ input: { id: id ?? "" }, enabled: !!id }),
  )

  function openMaps() {
    if (!station) return
    const label = encodeURIComponent(station.name)
    const coords = `${station.latitude},${station.longitude}`
    const url =
      `https://www.google.com/maps/search/?api=1&query=${coords}&query_place_id=${label}`
    Linking.openURL(url)
  }

  const distanceKm =
    location && station
      ? getDistanceKm(
          location.latitude,
          location.longitude,
          station.latitude,
          station.longitude,
        )
      : null

  const activeAmenities = station
    ? (Object.keys(AMENITY_LABELS) as Array<keyof typeof AMENITY_LABELS>).filter(
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
          <Text text="Posto não encontrado." style={themed($dimText)} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={themed($scrollContent)}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Endereço + distância ──────────────────────────────────── */}
          <View style={themed($card)}>
            <Text preset="bold" text={station.name} style={themed($stationName)} />
            <Text
              text={`${station.address}, ${station.city}`}
              style={themed($address)}
            />
            {distanceKm !== null && isFinite(distanceKm) && (
              <View style={themed($distanceBadge)}>
                <Text
                  size="xs"
                  weight="bold"
                  style={themed($distanceText)}
                  text={`📍 ${formatDistance(distanceKm)}`}
                />
              </View>
            )}
          </View>

          {/* ── Preços ──────────────────────────────────────────────── */}
          {station.prices.length > 0 && (
            <View style={themed($section)}>
              <Text preset="formLabel" text="Combustíveis" style={themed($sectionLabel)} />
              <View style={themed($priceGrid)}>
                {station.prices.map((p) => (
                  <View key={p.id} style={themed($priceCard)}>
                    <Text
                      size="xs"
                      weight="bold"
                      text={p.fuelName}
                      style={themed($fuelName)}
                      numberOfLines={2}
                    />
                    <Text
                      preset="bold"
                      text={`R$ ${p.currentPrice}`}
                      style={themed($price)}
                    />
                    <Text
                      size="xxs"
                      text={`Atualizado ${fmtDate(p.updatedAt)}`}
                      style={themed($updatedAt)}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Comodidades ─────────────────────────────────────────── */}
          {activeAmenities.length > 0 && (
            <View style={themed($section)}>
              <Text preset="formLabel" text="Comodidades" style={themed($sectionLabel)} />
              <View style={themed($badgeRow)}>
                {activeAmenities.map((key) => (
                  <View key={key} style={themed($badge)}>
                    <Text size="xs" text={AMENITY_LABELS[key]} style={themed($badgeText)} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Abrir no Maps ───────────────────────────────────────── */}
          <Pressable
            onPress={openMaps}
            style={({ pressed }) => [themed($mapButton), pressed && { opacity: 0.75 }]}
          >
            <Text
              weight="bold"
              text="Abrir no Google Maps"
              style={themed($mapButtonText)}
            />
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

const $centered: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
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

const $stationName: ThemedStyle<TextStyle> = () => ({
  fontSize: 18,
})

const $address: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
})

const $distanceBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
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
  minWidth: 120,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.separator,
  gap: spacing.xxs,
})

const $fuelName: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  lineHeight: 16,
})

const $price: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 20,
})

const $updatedAt: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $badgeRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
})

const $badge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.secondary100,
  borderRadius: 20,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
})

const $badgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.secondary500,
})

const $mapButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  borderRadius: 12,
  paddingVertical: spacing.md,
  alignItems: "center",
  marginTop: spacing.sm,
})

const $mapButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $dimText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
