import { FC } from "react"
import { ActivityIndicator, Pressable, TextStyle, View, ViewStyle } from "react-native"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Text } from "@/components/Text"
import type { NearbyStation } from "@/hooks/useNearbyStations"
import { formatDistance } from "@/utils/distance"
import { formatPriceBRL } from "@/utils/formatCurrency"

import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"

interface StationCardProps {
  station: NearbyStation
  locationLoading: boolean
  onPress: () => void
}

const ICON_SIZE = 14

export const StationCard: FC<StationCardProps> = function StationCard({
  station,
  locationLoading,
  onPress,
}) {
  const { themed, theme } = useAppTheme()

  const showDistance = station.distanceKm !== null && isFinite(station.distanceKm)
  const displayPrice = formatPriceBRL(station.price!)

  const accessibilityLabel = [
    station.name,
    station.address,
    showDistance ? `a ${formatDistance(station.distanceKm!)}` : null,
    `${station.fuelName ?? "combustível"} a ${displayPrice} reais`,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Abre os detalhes do posto"
      android_ripple={{ color: theme.colors.palette.neutral300 }}
      style={({ pressed }) => [themed($container), pressed && themed($pressed)]}
    >
      <View style={themed($info)}>
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

        <Text preset="bold" numberOfLines={1} text={station.name} />
        <Text size="xs" numberOfLines={1} style={themed($address)} text={station.address} />

        <View style={themed($bottomRow)}>
          {locationLoading ? (
            <ActivityIndicator size="small" color={theme.colors.tint} />
          ) : showDistance ? (
            <>
              <MaterialDesignIcons
                name="map-marker-distance"
                size={ICON_SIZE}
                color={theme.colors.textDim}
              />
              <Text
                size="xs"
                weight="bold"
                style={themed($distanceText)}
                text={formatDistance(station.distanceKm!)}
              />
            </>
          ) : null}
        </View>
      </View>

      <View style={themed($pricePlate)}>
        <View style={themed($priceRow)}>
          <Text style={themed($plateCurrency)} text="R$" />
          {/* allowFontScaling intentionally left enabled — clipping the
              plate at large accessibility text sizes is preferable to
              locking out low-vision users from readable prices. */}
          <Text style={themed($plateValue)} weight="bold" text={displayPrice} />
        </View>
        {station.fuelName ? (
          <Text size="xxs" numberOfLines={1} style={themed($plateFuel)} text={station.fuelName} />
        ) : null}
      </View>
    </Pressable>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: "row",
  alignItems: "stretch",
  borderRadius: 4,
  overflow: "hidden",
  backgroundColor: colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.separator,
})

const $pressed: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.8,
})

const $info: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.md,
})

const $overlineRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  marginBottom: spacing.xxs,
})

const $overline: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  letterSpacing: 0.5,
})

const $address: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginTop: 2,
})

const $bottomRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  marginTop: spacing.sm,
  minHeight: 18,
})

const $distanceText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $pricePlate: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  width: 100,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.xxs,
  backgroundColor: colors.palette.primary600,
})

const $priceRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 2,
})

const $plateCurrency: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral300,
  fontSize: 10,
  marginTop: 3,
})

const $plateValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontSize: 24,
  fontVariant: ["tabular-nums"],
})

const $plateFuel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.palette.neutral300,
  marginTop: spacing.xxxs,
  textAlign: "center",
})
