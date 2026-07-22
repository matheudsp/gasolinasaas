import { FC, useCallback, useEffect } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import QRCode from "react-native-qrcode-svg"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { markLoyaltyIntroSeen, useHasSeenLoyaltyIntro } from "@/lib/loyaltyOnboarding"
import { orpc } from "@/lib/orpc"
import { formatBRL } from "@/utils/formatCurrency"
import { formatDateBR } from "@/utils/formatDate"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

// O código do cliente vive pouco no server (90s). Renovamos com folga antes
// disso para o QR na tela nunca estar expirado quando o frentista escanear.
const CODE_REFRESH_MS = 60_000

interface LoyaltyCardScreenProps {
  /** false quando renderizada como tab — sem botão de voltar. */
  showBack?: boolean
}

export const LoyaltyCardScreen: FC<LoyaltyCardScreenProps> = function LoyaltyCardScreen({
  showBack = true,
}) {
  const router = useRouter()
  const { themed, theme } = useAppTheme()

  const codeQuery = useQuery({
    ...orpc.loyalty.issueScanCode.queryOptions(),
    refetchInterval: CODE_REFRESH_MS,
    staleTime: 0,
    gcTime: 0,
  })
  const balanceQuery = useQuery(orpc.loyalty.myBalance.queryOptions())
  const txQuery = useQuery(orpc.loyalty.myTransactions.queryOptions({ input: { limit: 20 } }))

  const refetchAll = useCallback(() => {
    codeQuery.refetch()
    balanceQuery.refetch()
    txQuery.refetch()
  }, [codeQuery, balanceQuery, txQuery])

  // Primeira visita: abre o explicador sozinho. Sem isso o cliente cai numa
  // tela de saldo zerado sem saber o que fazer com o QR.
  //
  // A flag é marcada AQUI, na abertura — não no fechamento: quem arrasta o
  // modal pra baixo em vez de tocar em "Entendi" não passaria pelo handler e
  // veria o explicador de novo a cada visita à aba.
  const hasSeenIntro = useHasSeenLoyaltyIntro()
  useEffect(() => {
    if (!hasSeenIntro) {
      markLoyaltyIntroSeen()
      router.push("/(app)/(modals)/howItWorks")
    }
  }, [hasSeenIntro, router])

  const code = codeQuery.data?.code
  const transactions = txQuery.data ?? []

  // Lotes de pontos que vencem nos próximos 30 dias (o server manda ordenado
  // do vencimento mais próximo pro mais distante).
  const expiringSoon = balanceQuery.data?.expiringSoon ?? []
  const expiringPoints = expiringSoon.reduce((sum, lot) => sum + lot.points, 0)
  const nearestExpiry = expiringSoon.at(0)

  return (
    <Screen preset="fixed" safeAreaEdges={[]}>
      <Header
        title="Meus pontos"
        leftIcon={showBack ? "back" : undefined}
        onLeftPress={showBack ? () => router.back() : undefined}
      />

      <ScrollView
        contentContainerStyle={themed($content)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={balanceQuery.isRefetching}
            onRefresh={refetchAll}
            tintColor={theme.colors.tint}
          />
        }
      >
        <View style={themed($balanceCard)}>
          <Text size="xxs" weight="bold" style={themed($balanceLabel)} text="SALDO DE PONTOS" />
          <Text style={themed($balanceValue)} text={`${balanceQuery.data?.balance ?? 0}`} />
        </View>

        {nearestExpiry && (
          <View style={themed($expiryWarning)}>
            <MaterialDesignIcons name="clock-alert-outline" size={20} color={theme.colors.error} />
            <View style={$txInfo}>
              <Text
                size="xs"
                weight="bold"
                style={themed($expiryWarningText)}
                text={`${expiringPoints} ${expiringPoints === 1 ? "ponto perto" : "pontos perto"} de expirar`}
              />
              <Text
                size="xxs"
                style={themed($expiryWarningText)}
                text={`${nearestExpiry.points} ${nearestExpiry.points === 1 ? "vence" : "vencem"} ${formatRelativeDays(nearestExpiry.expiresAt)}. Resgate antes de perder!`}
              />
            </View>
          </View>
        )}

        <Pressable
          onPress={() => router.push("/(app)/rewards")}
          accessibilityRole="button"
          accessibilityLabel="Ver recompensas"
          style={themed($rewardsButton)}
        >
          <MaterialDesignIcons name="gift-outline" size={18} color={theme.colors.tint} />
          <Text weight="bold" size="sm" style={themed($rewardsButtonText)} text="Ver recompensas" />
          <MaterialDesignIcons name="chevron-right" size={18} color={theme.colors.tint} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(app)/(modals)/howItWorks")}
          accessibilityRole="button"
          accessibilityLabel="Como funciona o programa de pontos"
          style={themed($rewardsButton)}
        >
          <MaterialDesignIcons name="help-circle-outline" size={18} color={theme.colors.tint} />
          <Text weight="bold" size="sm" style={themed($rewardsButtonText)} text="Como funciona" />
          <MaterialDesignIcons name="chevron-right" size={18} color={theme.colors.tint} />
        </Pressable>

        <View style={themed($qrCard)}>
          <Text weight="bold" text="Mostre no caixa" style={themed($qrTitle)} />
          <Text
            size="xs"
            style={themed($qrSubtitle)}
            text="O frentista escaneia este código para creditar seus pontos."
          />

          <View style={themed($qrBox)}>
            {code ? (
              <QRCode value={code} size={200} backgroundColor="white" color="black" />
            ) : (
              <ActivityIndicator size="large" color={theme.colors.tint} />
            )}
          </View>

          <View style={themed($refreshHint)}>
            <MaterialDesignIcons name="refresh" size={12} color={theme.colors.textDim} />
            <Text
              size="xxs"
              style={themed($refreshText)}
              text="O código renova sozinho a cada minuto."
            />
          </View>
        </View>

        <View style={themed($section)}>
          <Text preset="formLabel" text="Extrato" style={themed($sectionLabel)} />

          {transactions.length === 0 ? (
            <Text
              size="xs"
              style={themed($dim)}
              text="Nenhum ponto ainda. Abasteça e mostre o QR no caixa."
            />
          ) : (
            transactions.map((t) => (
              <View key={t.id} style={themed($txRow)}>
                <View style={$txInfo}>
                  <Text weight="bold" text={txLabel(t.type)} />
                  {t.amountCents != null && t.amountCents > 0 && (
                    <Text
                      size="xxs"
                      style={themed($dim)}
                      text={`Abastecimento de ${formatBRL(t.amountCents)}`}
                    />
                  )}
                  {t.type === "credit" && t.expiresAt != null && (
                    <Text
                      size="xxs"
                      style={themed($dim)}
                      text={`Válidos até ${formatDateBR(t.expiresAt)}`}
                    />
                  )}
                  <Text size="xxs" style={themed($dim)} text={formatDateBR(t.createdAt)} />
                </View>
                <Text
                  weight="bold"
                  style={themed(t.points >= 0 ? $pointsPos : $pointsNeg)}
                  text={`${t.points >= 0 ? "+" : ""}${t.points}`}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function txLabel(type: "credit" | "expiration" | "redemption" | "reversal"): string {
  switch (type) {
    case "credit":
      return "Pontos ganhos"
    case "expiration":
      return "Pontos expirados"
    case "reversal":
      return "Estorno de crédito"
    default:
      return "Resgate"
  }
}

/** "hoje", "amanhã" ou "em N dias" — pro aviso de expiração. */
function formatRelativeDays(d: Date | string): string {
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)
  if (days <= 0) {
    return "hoje"
  }
  if (days === 1) {
    return "amanhã"
  }
  return `em ${days} dias`
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  gap: spacing.md,
  paddingBottom: spacing.xxxxl,
})

const $balanceCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  borderRadius: 16,
  padding: spacing.lg,
  alignItems: "center",
})

const $balanceLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  letterSpacing: 1,
})

const $balanceValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontSize: 48,
  lineHeight: 56,
  fontVariant: ["tabular-nums"],
})

const $expiryWarning: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  backgroundColor: colors.errorBackground,
  borderRadius: 12,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
})

const $expiryWarningText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})

const $rewardsButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 12,
  backgroundColor: colors.palette.neutral200,
})

const $rewardsButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  color: colors.text,
})

const $qrCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.separator,
  alignItems: "center",
  gap: spacing.xs,
})

const $qrTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 18,
})

const $qrSubtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  textAlign: "center",
  marginBottom: spacing.xs,
})

const $qrBox: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor: "white",
  padding: spacing.md,
  borderRadius: 12,
  minHeight: 232,
  minWidth: 232,
  alignItems: "center",
  justifyContent: "center",
})

const $refreshHint: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  marginTop: spacing.xs,
})

const $refreshText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $sectionLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $txRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.separator,
})

const $txInfo: ViewStyle = { flex: 1 }

const $pointsPos: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 18,
})

const $pointsNeg: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  fontSize: 18,
})

const $dim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
