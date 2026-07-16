import { FC, useEffect, useState } from "react"
import {
  Pressable,
  type TextStyle,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native"
import { useRouter } from "expo-router"
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { GasolinaCloudMark, useGasolinaCloudColor } from "@/components/PoweredByGasolinaCloud"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { markOnboardingSeen } from "@/lib/onboarding"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * Onboarding do app guarda-chuva — tour animado de 3 passos que explica o
 * modelo antes da primeira escolha de rede: (1) um app pra sua rede de
 * postos, (2) você escolhe a rede, (3) o app inteiro — até o ícone — vira
 * o app da rede. Aparece uma vez; depois o fluxo cai direto no seletor.
 *
 * O pager é um track animado por estado (translateX + withTiming), não um
 * ScrollView: o scroll-snap do RN Web reverte scrolls programáticos, então
 * botões/dots dirigem a navegação — e o shared value `scrollX` alimenta o
 * parallax e os dots exatamente como um scroll de verdade alimentaria.
 */

// Cores de exemplo pra demo de transformação (marcas fictícias de redes).
const DEMO_BRAND_COLORS = ["#7C3AED", "#E6A42A", "#15803D", "#C2410C", "#7C3AED"]

const SLIDES = [
  {
    key: "rede",
    title: "O app da sua rede de postos",
    body: "Preços em tempo real, pontos de fidelidade e recompensas dos postos que você já usa — tudo num app só.",
  },
  {
    key: "escolha",
    title: "Primeiro, escolha a sua rede",
    body: "Na próxima tela você seleciona a rede de postos da sua região. É ela que define o que o app mostra pra você.",
  },
  {
    key: "transforma",
    title: "E o app se transforma",
    body: "Cores, logo e até o ícone na sua tela inicial viram os da rede escolhida. Errou ou mudou de região? Dá pra trocar de rede quando quiser.",
  },
] as const

export const OnboardingScreen: FC = function OnboardingScreen() {
  const router = useRouter()
  const { themed } = useAppTheme()
  const brandColor = useGasolinaCloudColor()
  const { width } = useWindowDimensions()

  const scrollX = useSharedValue(0)
  const [pageIndex, setPageIndex] = useState(0)

  // Progresso cíclico compartilhado pelas demos (flutuação, pulso, troca de
  // cor/ícone) — um relógio só pra todas as animações em loop.
  const demo = useSharedValue(0)
  useEffect(() => {
    demo.value = withRepeat(
      withTiming(DEMO_BRAND_COLORS.length - 1, {
        duration: 8000,
        easing: Easing.linear,
      }),
      -1,
    )
  }, [demo])

  const isLast = pageIndex === SLIDES.length - 1

  function goToPage(index: number) {
    setPageIndex(index)
    scrollX.value = withTiming(index * width, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    })
  }

  function finish() {
    markOnboardingSeen()
    router.replace("/select-network")
  }

  function next() {
    if (isLast) {
      finish()
      return
    }
    goToPage(pageIndex + 1)
  }

  const $track = useAnimatedStyle(() => ({
    transform: [{ translateX: -scrollX.value }],
  }))

  return (
    <Screen preset="fixed" safeAreaEdges={["top", "bottom"]} contentContainerStyle={$flex}>
      {/* Pular — canto superior direito */}
      <View style={themed($topBar)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Pular apresentação" onPress={finish}>
          <Text size="xs" weight="medium" text="Pular" style={themed($skip)} />
        </Pressable>
      </View>

      {/* Pager */}
      <View style={$viewport}>
        <Animated.View style={[$trackRow, { width: width * SLIDES.length }, $track]}>
          {SLIDES.map((slide, index) => (
            <SlideLayout key={slide.key} index={index} width={width} scrollX={scrollX}>
              {index === 0 && <HeroCloud demo={demo} brandColor={brandColor} />}
              {index === 1 && <HeroNetworkPicker demo={demo} />}
              {index === 2 && <HeroAppIcon demo={demo} brandColor={brandColor} />}
              <Text preset="heading" text={slide.title} style={themed($title)} />
              <Text text={slide.body} style={themed($body)} />
            </SlideLayout>
          ))}
        </Animated.View>
      </View>

      {/* Dots + ação */}
      <View style={themed($footer)}>
        <View style={$dotsRow}>
          {SLIDES.map((slide, index) => (
            <Pressable
              key={slide.key}
              accessibilityRole="button"
              accessibilityLabel={`Ir para o passo ${index + 1}`}
              onPress={() => goToPage(index)}
              hitSlop={8}
            >
              <Dot index={index} width={width} scrollX={scrollX} color={brandColor} />
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isLast ? "Escolher minha rede" : "Continuar"}
          onPress={next}
          style={({ pressed }) => [
            themed($cta),
            { backgroundColor: brandColor },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text
            weight="bold"
            text={isLast ? "Escolher minha rede" : "Continuar"}
            style={$ctaText}
          />
          <MaterialDesignIcons
            name={isLast ? "check" : "arrow-right"}
            size={18}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </Screen>
  )
}

// ── Slide com parallax ────────────────────────────────────────────────────────

function SlideLayout({
  index,
  width,
  scrollX,
  children,
}: {
  index: number
  width: number
  scrollX: SharedValue<number>
  children: React.ReactNode
}) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width]

  // Conteúdo desliza um pouco mais rápido que o pager e some nas bordas —
  // parallax clássico de onboarding.
  const $parallax = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0]),
    transform: [
      { translateX: interpolate(scrollX.value, inputRange, [width * 0.25, 0, -width * 0.25]) },
    ],
  }))

  return (
    <View style={[$slide, { width }]}>
      <Animated.View style={[$slideContent, $parallax]}>{children}</Animated.View>
    </View>
  )
}

function Dot({
  index,
  width,
  scrollX,
  color,
}: {
  index: number
  width: number
  scrollX: SharedValue<number>
  color: string
}) {
  const { theme } = useAppTheme()
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width]
  const inactive = theme.colors.separator

  const $dot = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, inputRange, [8, 24, 8], "clamp"),
    backgroundColor: interpolateColor(scrollX.value, inputRange, [inactive, color, inactive]),
  }))

  return <Animated.View style={[$dotBase, $dot]} />
}

// ── Demos animadas por slide ──────────────────────────────────────────────────

/** Slide 1: nuvem da plataforma flutuando com um brilho pulsante atrás. */
function HeroCloud({
  demo,
  brandColor,
}: {
  demo: SharedValue<number>
  brandColor: string
}) {
  const $float = useAnimatedStyle(() => {
    const cycle = demo.value % 1
    return {
      transform: [
        { translateY: interpolate(cycle, [0, 0.5, 1], [0, -14, 0]) },
        { scale: interpolate(cycle, [0, 0.5, 1], [1, 1.04, 1]) },
      ],
    }
  })

  const $glow = useAnimatedStyle(() => {
    const cycle = demo.value % 1
    return {
      opacity: interpolate(cycle, [0, 0.5, 1], [0.15, 0.35, 0.15]),
      transform: [{ scale: interpolate(cycle, [0, 0.5, 1], [1, 1.25, 1]) }],
    }
  })

  return (
    <View style={$hero}>
      <Animated.View style={[$cloudGlow, { backgroundColor: brandColor }, $glow]} />
      <Animated.View style={$float}>
        <GasolinaCloudMark size={96} />
      </Animated.View>
    </View>
  )
}

/** Slide 2: cartões de redes; o do meio pulsa como "selecionado". */
function HeroNetworkPicker({ demo }: { demo: SharedValue<number> }) {
  const { themed, theme } = useAppTheme()
  const brandColor = useGasolinaCloudColor()

  const $selected = useAnimatedStyle(() => {
    const cycle = demo.value % 1
    return {
      borderColor: interpolateColor(
        cycle,
        [0, 0.5, 1],
        [theme.colors.separator, brandColor, theme.colors.separator],
      ),
      transform: [{ scale: interpolate(cycle, [0, 0.5, 1], [1, 1.06, 1]) }],
    }
  })

  const rows = [
    { key: "a", label: "Rede Azul" },
    { key: "b", label: "Sua rede" },
    { key: "c", label: "Postos Sol" },
  ]

  return (
    <View style={$hero}>
      <View style={$pickerColumn}>
        {rows.map((row, i) =>
          i === 1 ? (
            <Animated.View key={row.key} style={[themed($pickerCard), $selected]}>
              <MaterialDesignIcons name="gas-station" size={18} color={brandColor} />
              <Text size="xs" weight="bold" text={row.label} />
              <MaterialDesignIcons name="check-circle" size={16} color={brandColor} />
            </Animated.View>
          ) : (
            <View key={row.key} style={[themed($pickerCard), $pickerCardDim]}>
              <MaterialDesignIcons
                name="gas-station"
                size={18}
                color={theme.colors.textDim}
              />
              <Text size="xs" text={row.label} style={{ color: theme.colors.textDim }} />
            </View>
          ),
        )}
      </View>
    </View>
  )
}

/** Slide 3: o "ícone do app" trocando de cara conforme a rede. */
function HeroAppIcon({
  demo,
  brandColor,
}: {
  demo: SharedValue<number>
  brandColor: string
}) {
  // Fundo do ícone percorre as cores das redes fictícias.
  const $iconBg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      demo.value,
      DEMO_BRAND_COLORS.map((_, i) => i),
      DEMO_BRAND_COLORS,
    ),
    transform: [
      {
        scale: interpolate(demo.value % 1, [0, 0.1, 0.9, 1], [0.96, 1, 1, 0.96]),
      },
    ],
  }))

  return (
    <View style={$hero}>
      <View style={$iconRow}>
        {/* Ícone padrão Gasolina */}
        <View style={[$appIcon, { backgroundColor: brandColor }]}>
          <GasolinaCloudMark size={36} color="#FFFFFF" />
        </View>

        <MaterialDesignIcons name="arrow-right" size={26} color={brandColor} />

        {/* Ícone da rede — cor viva trocando */}
        <Animated.View style={[$appIcon, $iconBg]}>
          <MaterialDesignIcons name="gas-station" size={40} color="#FFFFFF" />
        </Animated.View>
      </View>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $flex: ViewStyle = { flex: 1 }

const $topBar: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "flex-end",
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.sm,
})

const $skip: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  padding: spacing.xs,
})

const $viewport: ViewStyle = {
  flex: 1,
  overflow: "hidden",
}

const $trackRow: ViewStyle = {
  flexDirection: "row",
  height: "100%",
}

const $slide: ViewStyle = {
  height: "100%",
  flexShrink: 0,
  justifyContent: "center",
}

const $slideContent: ViewStyle = {
  alignItems: "center",
  paddingHorizontal: 32,
  gap: 12,
}

const $hero: ViewStyle = {
  height: 190,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 12,
}

const $cloudGlow: ViewStyle = {
  position: "absolute",
  width: 170,
  height: 170,
  borderRadius: 85,
}

const $pickerColumn: ViewStyle = {
  gap: 10,
  width: 230,
}

const $pickerCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: colors.separator,
  backgroundColor: colors.palette.neutral100,
})

const $pickerCardDim: ViewStyle = {
  opacity: 0.55,
  transform: [{ scale: 0.94 }],
}

const $iconRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 20,
}

const $appIcon: ViewStyle = {
  width: 84,
  height: 84,
  borderRadius: 20,
  alignItems: "center",
  justifyContent: "center",
}

const $title: ThemedStyle<TextStyle> = () => ({
  textAlign: "center",
})

const $body: ThemedStyle<TextStyle> = ({ colors }) => ({
  textAlign: "center",
  color: colors.textDim,
  lineHeight: 22,
})

const $footer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.md,
})

const $dotsRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 6,
}

const $dotBase: ViewStyle = {
  height: 8,
  borderRadius: 4,
}

const $cta: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
  minHeight: 52,
  borderRadius: 12,
  paddingHorizontal: spacing.lg,
})

const $ctaText: TextStyle = {
  color: "#FFFFFF",
}
