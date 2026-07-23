import { FC } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Text } from "@/components/Text"
import { orpc } from "@/lib/orpc"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * Barra de progresso até a próxima recompensa + posição do cliente na rede.
 * Reutilizada no hub e na tela de pontos. Silenciosa quando não há dados
 * (sem recompensa cadastrada, ou primeira visita sem pontos).
 */
export const LoyaltyProgress: FC = function LoyaltyProgress() {
  const { themed, theme } = useAppTheme()
  const { data } = useQuery(orpc.loyalty.myStanding.queryOptions())

  if (!data?.nextReward) {
    return null
  }

  const { balance, nextReward, topPercent } = data
  const pct =
    nextReward.costPoints > 0
      ? Math.min(1, balance / nextReward.costPoints)
      : 0
  const reached = nextReward.missing === 0

  return (
    <View style={themed($card)}>
      <View style={$row}>
        <MaterialDesignIcons
          name={reached ? "gift-open" : "gift-outline"}
          size={18}
          color={theme.colors.tint}
        />
        <Text
          size="xs"
          weight="bold"
          style={$flex1}
          text={
            reached
              ? `Você já pode trocar por ${nextReward.name}!`
              : `Faltam ${nextReward.missing} ${nextReward.missing === 1 ? "ponto" : "pontos"} para ${nextReward.name}`
          }
        />
      </View>

      <View style={themed($track)}>
        <View style={[themed($fill), { width: `${Math.round(pct * 100)}%` }]} />
      </View>

      <View style={$row}>
        <Text size="xxs" style={themed($dim)} text={`${balance} / ${nextReward.costPoints} pts`} />
        {topPercent != null ? (
          <Text
            size="xxs"
            weight="bold"
            style={themed($rank)}
            text={`Top ${topPercent}% da rede`}
          />
        ) : null}
      </View>
    </View>
  )
}

const $flex1: TextStyle = { flex: 1 }

const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
}

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.separator,
  gap: spacing.sm,
})

const $track: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.palette.neutral300,
  overflow: "hidden",
})

const $fill: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: "100%",
  borderRadius: 4,
  backgroundColor: colors.tint,
})

const $dim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $rank: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})
