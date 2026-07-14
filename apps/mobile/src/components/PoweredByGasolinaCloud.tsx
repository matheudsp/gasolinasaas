import { StyleProp, TextStyle, View, ViewStyle } from "react-native"
import Svg, { Circle, Path, Rect } from "react-native-svg"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

// Roxo da marca Gasolina Cloud — fixo, independente do tema white-label do
// tenant. No dark mode usa um tom mais claro para manter contraste.
const BRAND_PURPLE = "#7C3AED"
const BRAND_PURPLE_DARK_MODE = "#8B5CF6"

export function useGasolinaCloudColor(): string {
  const { theme } = useAppTheme()
  return theme.isDark ? BRAND_PURPLE_DARK_MODE : BRAND_PURPLE
}

/**
 * Símbolo do Gasolina Cloud (nuvem com gota de combustível), desenhado em
 * react-native-svg. Fonte canônica: brand/gasolina-cloud-mark.svg na raiz.
 */
export function GasolinaCloudMark({ size = 16, color }: { size?: number; color?: string }) {
  const brandColor = useGasolinaCloudColor()
  const fill = color ?? brandColor
  // viewBox 108x96 — mantém a proporção a partir da altura pedida.
  const width = (size * 108) / 96

  return (
    <Svg width={width} height={size} viewBox="10 8 108 96">
      <Circle cx={42} cy={52} r={20} fill={fill} />
      <Circle cx={66} cy={40} r={24} fill={fill} />
      <Circle cx={90} cy={56} r={16} fill={fill} />
      <Rect x={42} y={52} width={48} height={20} fill={fill} />
      <Path
        d="M64 62 C 69 72 74 77.5 74 83 A 10 10 0 1 1 54 83 C 54 77.5 59 72 64 62 Z"
        fill={fill}
      />
    </Svg>
  )
}

/**
 * Selo "powered by Gasolina Cloud" — rodapé das telas de autenticação e da
 * tela Sobre. O nome fica no roxo da marca; o resto segue o tema.
 */
export function PoweredByGasolinaCloud({ style }: { style?: StyleProp<ViewStyle> }) {
  const { themed } = useAppTheme()
  const brandColor = useGasolinaCloudColor()

  return (
    <View
      style={[themed($row), style]}
      accessible
      accessibilityLabel="Powered by Gasolina Cloud"
    >
      <Text size="xxs" text="powered by" style={themed($dim)} />
      <GasolinaCloudMark size={14} />
      <Text size="xxs" weight="bold" text="Gasolina Cloud" style={{ color: brandColor }} />
    </View>
  )
}

const $row: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xxs,
})

const $dim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
