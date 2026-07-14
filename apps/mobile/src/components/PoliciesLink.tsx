import { Pressable, StyleProp, TextStyle, ViewStyle } from "react-native"
import { useRouter } from "expo-router"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * Link para a central de políticas (Termos de Uso, Regulamento e
 * Privacidade) — rodapé das telas de autenticação.
 */
export function PoliciesLink({ style }: { style?: StyleProp<ViewStyle> }) {
  const router = useRouter()
  const { themed } = useAppTheme()

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Termos de Uso, Regulamento e Política de Privacidade"
      style={[$container, style]}
      onPress={() => router.push("/policies")}
    >
      <Text size="xxs" style={themed($text)}>
        Ao continuar, você concorda com os nossos{" "}
        <Text size="xxs" style={themed($link)} text="Termos e Políticas" />
      </Text>
    </Pressable>
  )
}

const $container: ViewStyle = {
  alignItems: "center",
}

const $text: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
})

const $link: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  textDecorationLine: "underline",
})
