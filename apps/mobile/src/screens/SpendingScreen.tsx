import { FC } from "react"
import { ActivityIndicator, RefreshControl, ScrollView, TextStyle, View, ViewStyle } from "react-native"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { orpc } from "@/lib/orpc"
import { formatBRL } from "@/utils/formatCurrency"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const

/** "2026-07" → "Julho de 2026". */
function formatMonth(key: string): string {
  const [year, month] = key.split("-")
  const name = MONTH_NAMES[Number(month) - 1] ?? key
  return `${name} de ${year}`
}

/**
 * Histórico de gastos com abastecimento na rede ativa — agregado do ledger
 * de fidelidade (todo crédito registra o valor abastecido; estornos entram
 * negativos e corrigem o total).
 */
export const SpendingScreen: FC = function SpendingScreen() {
  const router = useRouter()
  const { themed, theme } = useAppTheme()

  const spendingQuery = useQuery(orpc.loyalty.mySpending.queryOptions())
  const spending = spendingQuery.data

  return (
    <Screen preset="fixed" safeAreaEdges={["bottom"]}>
      <Header title="Meus gastos" leftIcon="back" onLeftPress={() => router.back()} />

      {spendingQuery.isPending ? (
        <View style={themed($centered)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={themed($content)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={spendingQuery.isRefetching}
              onRefresh={() => spendingQuery.refetch()}
              tintColor={theme.colors.tint}
            />
          }
        >
          <View style={themed($totalsRow)}>
            <View style={themed($totalCard)}>
              <Text size="xxs" weight="bold" style={themed($totalLabel)} text="ESTE MÊS" />
              <Text
                weight="bold"
                style={themed($totalValue)}
                text={formatBRL(spending?.currentMonthCents ?? 0)}
              />
            </View>
            <View style={themed($totalCard)}>
              <Text size="xxs" weight="bold" style={themed($totalLabel)} text="TOTAL" />
              <Text
                weight="bold"
                style={themed($totalValue)}
                text={formatBRL(spending?.totalCents ?? 0)}
              />
            </View>
          </View>

          <View style={themed($section)}>
            <Text preset="formLabel" text="Por mês" style={themed($sectionLabel)} />

            {!spending || spending.byMonth.length === 0 ? (
              <Text
                size="xs"
                style={themed($dim)}
                text="Nenhum abastecimento registrado ainda. Mostre seu QR no caixa ao abastecer."
              />
            ) : (
              spending.byMonth.map((m) => (
                <View key={m.month} style={themed($monthRow)}>
                  <MaterialDesignIcons
                    name="gas-station-outline"
                    size={20}
                    color={theme.colors.tint}
                  />
                  <View style={$monthInfo}>
                    <Text weight="bold" text={formatMonth(m.month)} />
                    <Text
                      size="xxs"
                      style={themed($dim)}
                      text={`${m.count} ${m.count === 1 ? "abastecimento" : "abastecimentos"}`}
                    />
                  </View>
                  <Text weight="bold" style={themed($monthValue)} text={formatBRL(m.totalCents)} />
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $centered: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  gap: spacing.md,
  paddingBottom: spacing.xxl,
})

const $totalsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
})

const $totalCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  backgroundColor: colors.tint,
  borderRadius: 16,
  padding: spacing.md,
  alignItems: "center",
  gap: spacing.xxs,
})

const $totalLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  letterSpacing: 1,
})

const $totalValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontSize: 20,
  fontVariant: ["tabular-nums"],
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $sectionLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $monthRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.separator,
})

const $monthInfo: ViewStyle = { flex: 1 }

const $monthValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontVariant: ["tabular-nums"],
})

const $dim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
