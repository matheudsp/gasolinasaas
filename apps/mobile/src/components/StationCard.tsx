import { FC } from "react"
import { ActivityIndicator, Pressable, TextStyle, View, ViewStyle } from "react-native"
import MaterialCommunityIcons from "@expo/vector-icons"

import { Text } from "@/components/Text"
import type { NearbyStation } from "@/hooks/useNearbyStations"
import { formatDistance } from "@/utils/distance"

import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"

interface StationCardProps {
  station: NearbyStation
  locationLoading: boolean
  onPress: () => void
}

const PERFORATION_DOTS = 6

export const StationCard: FC<StationCardProps> = function StationCard({
  station,
  locationLoading,
  onPress,
}) {
  const { themed, theme } = useAppTheme()

  const showDistance = station.distanceKm !== null && isFinite(station.distanceKm)
  const hasPrice = !!station.price

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [themed($container), pressed && themed($pressed)]}
    >
      <View style={themed($info)}>
        <View style={themed($overlineRow)}>
          <MaterialCommunityIcons name="gas-station-outline" size={11} color={theme.colors.tint} />
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
              <MaterialCommunityIcons
                name="map-marker-distance"
                size={13}
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

      <View style={themed($perforationColumn)}>
        <View style={themed($notchTop)} />
        <View style={themed($dotsColumn)}>
          {Array.from({ length: PERFORATION_DOTS }).map((_, i) => (
            <View key={i} style={themed($dot)} />
          ))}
        </View>
        <View style={themed($notchBottom)} />
      </View>

      <View style={themed(hasPrice ? $pricePlate : $pricePlateEmpty)}>
        <View style={themed($priceRow)}>
          <Text style={themed($plateCurrency)} text="R$" />
          <Text
            style={themed(hasPrice ? $plateValue : $plateValueEmpty)}
            text={hasPrice ? station.price! : "—"}
          />
        </View>
        {hasPrice && station.fuelName ? (
          <Text size="xxs" numberOfLines={1} style={themed($plateFuel)} text={station.fuelName} />
        ) : null}
      </View>
    </Pressable>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: "row",
  alignItems: "stretch",
  borderRadius: 14,
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
  minHeight: 16,
})

const $distanceText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $perforationColumn: ThemedStyle<ViewStyle> = () => ({
  width: 16,
  position: "relative",
  alignItems: "center",
})

const $notchTop: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: -7,
  width: 14,
  height: 14,
  borderRadius: 7,
  backgroundColor: colors.background,
  zIndex: 2,
})

const $notchBottom: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  bottom: -7,
  width: 14,
  height: 14,
  borderRadius: 7,
  backgroundColor: colors.background,
  zIndex: 2,
})

const $dotsColumn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "space-evenly",
  alignItems: "center",
  paddingVertical: spacing.lg,
})

const $dot: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 3,
  height: 3,
  borderRadius: 1.5,
  backgroundColor: colors.separator,
})

const $pricePlate: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  width: 92,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.xxs,
  backgroundColor: colors.palette.neutral800,
  borderTopWidth: 3,
  borderTopColor: colors.palette.accent400,
})

const $pricePlateEmpty: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  width: 92,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.xxs,
  backgroundColor: colors.palette.neutral200,
})

const $priceRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 2,
})

const $plateCurrency: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral400,
  fontSize: 10,
  marginTop: 3,
})

const $plateValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.accent300,
  fontSize: 18,
  fontWeight: "700",
  fontVariant: ["tabular-nums"],
})

const $plateValueEmpty: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 18,
  fontWeight: "700",
})

const $plateFuel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.palette.neutral400,
  marginTop: spacing.xxxs,
  textAlign: "center",
})
