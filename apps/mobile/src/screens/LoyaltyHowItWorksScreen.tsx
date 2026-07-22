import { FC } from "react"
import { ScrollView, TextStyle, View, ViewStyle } from "react-native"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"
import type { MaterialDesignIconsIconName } from "@react-native-vector-icons/material-design-icons"

import { Button } from "@/components/Button"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { markLoyaltyIntroSeen } from "@/lib/loyaltyOnboarding"
import { orpc } from "@/lib/orpc"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * Explicador do programa de fidelidade. Abre sozinho na primeira visita à
 * tela de pontos e fica disponível pelo botão "Como funciona".
 *
 * As regras (quantos pontos por real, validade) vêm do TENANT — cada rede
 * configura a sua, então o texto se ajusta em vez de prometer número fixo.
 */
const STEPS: {
  icon: MaterialDesignIconsIconName
  title: string
  body: string
}[] = [
  {
    icon: "gas-station",
    title: "1. Abasteça",
    body: "Abasteça normalmente em qualquer posto participante da rede.",
  },
  {
    icon: "qrcode-scan",
    title: "2. Mostre seu QR Code",
    body: "Na hora de pagar, abra a tela “Meus pontos” e mostre o código ao frentista. Ele escaneia e os pontos entram na hora.",
  },
  {
    icon: "gift-outline",
    title: "3. Troque por recompensas",
    body: "Junte pontos e troque por prêmios do catálogo. Você recebe um código e retira no caixa.",
  },
]

export const LoyaltyHowItWorksScreen: FC = function LoyaltyHowItWorksScreen() {
  const router = useRouter()
  const { themed, theme } = useAppTheme()

  // Regras da rede ativa — o multiplicador e a validade variam por tenant.
  const config = useQuery(orpc.loyalty.publicConfig.queryOptions())

  function handleClose() {
    markLoyaltyIntroSeen()
    router.back()
  }

  const pointsPerReal = config.data?.pointsPerReal
  const validityDays = config.data?.pointsValidityDays ?? null

  return (
    <Screen preset="fixed" safeAreaEdges={["bottom"]} contentContainerStyle={$flex1}>
      <Header title="Como funciona" leftIcon="x" onLeftPress={handleClose} />

      <ScrollView contentContainerStyle={themed($content)} showsVerticalScrollIndicator={false}>
        <Text
          style={themed($intro)}
          text="Você ganha pontos toda vez que abastece e troca por recompensas. É só isso."
        />

        {STEPS.map((step) => (
          <View key={step.title} style={themed($step)}>
            <View style={themed($stepIcon)}>
              <MaterialDesignIcons name={step.icon} size={22} color={theme.colors.tint} />
            </View>
            <View style={$stepBody}>
              <Text weight="bold" text={step.title} />
              <Text size="xs" style={themed($dim)} text={step.body} />
            </View>
          </View>
        ))}

        {/* Regras da rede — só aparecem quando carregadas, pra não mostrar
            número errado enquanto busca. */}
        {pointsPerReal != null ? (
          <View style={themed($rulesBox)}>
            <Text weight="bold" size="xs" text="As regras desta rede" />
            <Text
              size="xs"
              style={themed($dim)}
              text={`• Cada R$ 1,00 abastecido vale ${formatPoints(pointsPerReal)} ${pointsPerReal === 1 ? "ponto" : "pontos"}.`}
            />
            <Text
              size="xs"
              style={themed($dim)}
              text={
                validityDays
                  ? `• Os pontos valem por ${validityDays} dias a partir do abastecimento.`
                  : "• Os pontos não expiram."
              }
            />
          </View>
        ) : null}

        <View style={themed($tipBox)}>
          <MaterialDesignIcons name="lightbulb-on-outline" size={20} color={theme.colors.tint} />
          <Text
            size="xs"
            style={themed($tipText)}
            text="O QR Code muda a cada minuto por segurança. Gere na hora de pagar — não adianta tirar print."
          />
        </View>

        <Button text="Entendi" preset="filled" onPress={handleClose} style={themed($cta)} />
      </ScrollView>
    </Screen>
  )
}

/** 2.5 → "2,5"; 10 → "10" (evita "10,0"). */
function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",")
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $flex1: ViewStyle = { flex: 1 }
const $stepBody: ViewStyle = { flex: 1 }

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  gap: spacing.md,
  paddingBottom: spacing.xxl,
})

const $intro: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.text,
  marginBottom: spacing.xs,
})

const $step: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  gap: spacing.md,
  alignItems: "flex-start",
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.separator,
})

const $stepIcon: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  borderRadius: 10,
  padding: spacing.xs,
})

const $rulesBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
  padding: spacing.md,
  gap: spacing.xxs,
})

const $tipBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  alignItems: "center",
  borderRadius: 12,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.separator,
})

const $tipText: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  color: colors.textDim,
})

const $cta: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
})

const $dim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
