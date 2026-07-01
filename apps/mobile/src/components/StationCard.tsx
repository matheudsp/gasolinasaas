import { FC } from "react"
import { ActivityIndicator, Pressable, TextStyle, View, ViewStyle } from "react-native"

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

export const StationCard: FC<StationCardProps> = function StationCard({
  station,
  locationLoading,
  onPress,
}) {
  const { themed, theme } = useAppTheme()

  const showDistance = station.distanceKm !== null && isFinite(station.distanceKm)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [themed($container), pressed && themed($pressed)]}
    >
      <View style={themed($info)}>
        <Text preset="bold" text={station.name} />
        <Text size="xs" style={themed($address)} text={`${station.address}, ${station.city}`} />
      </View>

      <View style={themed($right)}>
        {locationLoading ? (
          <ActivityIndicator
            size="small"
            color={theme.colors.textDim}
            style={themed($distanceLoader)}
          />
        ) : showDistance ? (
          <Text
            size="xs"
            weight="bold"
            style={themed($distance)}
            text={formatDistance(station.distanceKm!)}
          />
        ) : null}

        <Text size="md" weight="bold" text={station.price ? `R$ ${station.price}` : "—"} />
        {station.fuelName ? (
          <Text size="xxs" style={themed($fuelName)} text={station.fuelName} />
        ) : null}
      </View>
    </Pressable>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 12,
  backgroundColor: colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.separator,
})

const $pressed: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.7,
})

const $info: ThemedStyle<ViewStyle> = () => ({
  flexShrink: 1,
  paddingRight: 8,
})

const $address: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xxxs,
})

const $right: ThemedStyle<ViewStyle> = () => ({
  alignItems: "flex-end",
})

const $distanceLoader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xxxs,
  alignSelf: "flex-end",
})

const $distance: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginBottom: spacing.xxxs,
})

const $fuelName: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
