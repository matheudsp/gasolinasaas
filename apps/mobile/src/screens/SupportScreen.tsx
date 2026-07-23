import { FC, useState } from "react"
import { Alert, Linking, Pressable, ScrollView, TextStyle, View, ViewStyle } from "react-native"
import { useRouter } from "expo-router"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Button } from "@/components/Button"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import Config from "@/config"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * Ajuda e suporte: perguntas frequentes (acordeão) + contato. Desafoga o
 * suporte respondendo o que mais gera dúvida antes de o cliente escrever.
 */
const FAQ: { q: string; a: string }[] = [
  {
    q: "Como eu ganho pontos?",
    a: "Abasteça em um posto da rede e, na hora de pagar, mostre o QR Code da tela “Meus pontos” ao frentista. Ele escaneia e os pontos entram na hora, de acordo com o valor abastecido.",
  },
  {
    q: "Por que o QR Code muda sozinho?",
    a: "Por segurança, ele é renovado a cada minuto e vale por poucos instantes. Gere na hora de pagar — não adianta tirar print, o código antigo não funciona.",
  },
  {
    q: "Meus pontos expiram?",
    a: "Depende da rede. Cada rede define a validade dos pontos; quando há prazo, ele conta a partir da data em que você ganhou. A tela “Meus pontos” avisa quando algo está perto de vencer, e você recebe uma notificação antes.",
  },
  {
    q: "Como troco meus pontos por recompensas?",
    a: "Em “Recompensas”, escolha o prêmio e toque em Resgatar. Você recebe um código para mostrar no caixa; os pontos só saem quando o operador confirma a entrega.",
  },
  {
    q: "Por que preciso informar meu CPF?",
    a: "O CPF identifica você de forma única no programa de fidelidade e evita contas duplicadas. Ele é usado só para isso e para prevenir fraudes.",
  },
  {
    q: "Troquei de celular, e meus pontos?",
    a: "Seus pontos ficam na sua conta, não no aparelho. Entre com o mesmo e-mail (ou Google) no novo celular e o saldo estará lá.",
  },
  {
    q: "Esqueci minha senha.",
    a: "Na tela de login, toque em “Esqueci minha senha” e siga o link enviado por e-mail. Se você entrou com o Google, não há senha — é só usar “Entrar com Google”.",
  },
]

export const SupportScreen: FC = function SupportScreen() {
  const router = useRouter()
  const { themed, theme } = useAppTheme()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function handleEmail() {
    const email = Config.SUPPORT_EMAIL
    const url = `mailto:${email}?subject=${encodeURIComponent("Ajuda no app")}`
    Linking.openURL(url).catch(() => {
      Alert.alert("Fale com o suporte", `Envie um e-mail para ${email}`)
    })
  }

  return (
    <Screen preset="fixed" safeAreaEdges={["bottom"]}>
      <Header title="Ajuda e suporte" leftIcon="back" onLeftPress={() => router.back()} />

      <ScrollView contentContainerStyle={themed($content)} showsVerticalScrollIndicator={false}>
        <Text preset="formLabel" style={themed($sectionLabel)} text="Perguntas frequentes" />

        <View style={themed($faqList)}>
          {FAQ.map((item, i) => {
            const open = openIndex === i
            return (
              <View key={item.q} style={themed($faqItem)}>
                <Pressable
                  onPress={() => setOpenIndex(open ? null : i)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  style={themed($faqHeader)}
                >
                  <Text weight="semiBold" size="sm" style={$flex1} text={item.q} />
                  <MaterialDesignIcons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={22}
                    color={theme.colors.textDim}
                  />
                </Pressable>
                {open ? <Text size="xs" style={themed($faqAnswer)} text={item.a} /> : null}
              </View>
            )
          })}
        </View>

        <View style={themed($contactBox)}>
          <MaterialDesignIcons name="lifebuoy" size={24} color={theme.colors.tint} />
          <Text weight="bold" text="Não achou o que procurava?" style={$centered} />
          <Text
            size="xs"
            style={themed($contactText)}
            text="Fale com a gente — respondemos por e-mail."
          />
          <Button
            text="Falar com o suporte"
            preset="filled"
            onPress={handleEmail}
            style={themed($contactButton)}
          />
        </View>
      </ScrollView>
    </Screen>
  )
}

const $flex1: TextStyle = { flex: 1 }
const $centered: TextStyle = { textAlign: "center" }

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  gap: spacing.md,
  paddingBottom: spacing.xxl,
})

const $sectionLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $faqList: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.separator,
  overflow: "hidden",
})

const $faqItem: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
})

const $faqHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  padding: spacing.md,
})

const $faqAnswer: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.md,
  lineHeight: 20,
})

const $contactBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  gap: spacing.xs,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.separator,
  marginTop: spacing.sm,
})

const $contactText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  textAlign: "center",
  marginBottom: spacing.xs,
})

const $contactButton: ThemedStyle<ViewStyle> = () => ({
  alignSelf: "stretch",
})
