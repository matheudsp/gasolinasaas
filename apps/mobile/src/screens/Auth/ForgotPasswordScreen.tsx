import { useState } from "react"
import { ActivityIndicator, Pressable, View, ViewStyle, TextStyle } from "react-native"
import { Link, useRouter } from "expo-router"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Button } from "@/components/Button"
import { PoliciesLink } from "@/components/PoliciesLink"
import { PoweredByGasolinaCloud } from "@/components/PoweredByGasolinaCloud"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { authClient } from "@/lib/auth"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import Config from "@/config"

export function ForgotPasswordScreen() {
  const { themed, theme } = useAppTheme()
  const router = useRouter()
  const $topInsets = useSafeAreaInsetsStyle(["top"])

  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function handleEmailChange(value: string) {
    setEmail(value)
    if (error) setError(null)
  }

  function validate(): boolean {
    if (!email.trim() || !email.includes("@")) {
      setError("Informe um e-mail válido")
      return false
    }
    return true
  }

  async function handleSubmit() {
    if (!validate()) return
    setIsLoading(true)
    setError(null)
    try {
      await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: `${Config.FRONTEND_URL}/reset-password`,
      })
      // Mesma confirmação independente do e-mail existir ou não na base —
      // evita que essa tela seja usada pra descobrir contas cadastradas.
      setSubmitted(true)
    } catch {
      setError("Não foi possível enviar o link. Verifique sua internet e tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={themed($screen)}
      keyboardShouldPersistTaps="handled"
    >
      <View style={themed([$header, $topInsets])}>
        <Text preset="heading" text="Redefinir senha" />
        <Link href="/(auth)/sign-in" dismissTo asChild>
          <Button
            // onPress={() => router.back()}
            preset="ghost"
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            hitSlop={12}
          >
            <MaterialDesignIcons name="close" size={24} color={theme.colors.text} />
          </Button>
        </Link>
      </View>

      {submitted ? (
        <View style={themed($successContainer)}>
          <View style={themed($successIconBadge)}>
            <MaterialDesignIcons
              name="email-check-outline"
              size={32}
              color={theme.colors.palette.neutral100}
            />
          </View>
          <Text preset="subheading" text="Verifique seu e-mail" style={themed($successTitle)} />
          <Text
            text={`Se ${email.trim()} estiver cadastrado, você vai receber um link para redefinir sua senha em instantes.`}
            style={themed($successBody)}
          />
          <Button
            text="Voltar para o login"
            preset="primary"
            onPress={() => router.back()}
            style={themed($submitButton)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tentar com outro e-mail"
            onPress={() => setSubmitted(false)}
            style={themed($retryLink)}
          >
            <Text text="Usar outro e-mail" style={themed($retryLinkText)} />
          </Pressable>
        </View>
      ) : (
        <>
          <Text
            text="Digite o e-mail da sua conta e enviaremos um link para você criar uma nova senha."
            style={themed($subtitle)}
          />

          {!!error && (
            <View style={themed($errorBox)}>
              <Text text={error} style={themed($errorText)} />
            </View>
          )}

          <TextField
            label="E-mail"
            value={email}
            onChangeText={handleEmailChange}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
            containerStyle={themed($field)}
            status={error ? "error" : undefined}
          />

          <Button
            text={isLoading ? "Enviando..." : "Enviar link de redefinição"}
            preset="primary"
            onPress={handleSubmit}
            disabled={isLoading || !email.trim()}
            style={themed($submitButton)}
            RightAccessory={
              isLoading
                ? ({ style }) => (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.palette.neutral100}
                      style={style}
                    />
                  )
                : undefined
            }
          />
        </>
      )}

      <PoliciesLink style={themed($poweredBy)} />
      <PoweredByGasolinaCloud style={themed($poweredByCompact)} />
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexGrow: 1,
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.xxl,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: spacing.lg,
})

const $subtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  fontSize: 14,
  lineHeight: 20,
  marginBottom: spacing.lg,
})

const $errorBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.errorBackground,
  borderRadius: 4,
  borderLeftWidth: 3,
  borderLeftColor: colors.error,
  padding: spacing.sm,
  marginBottom: spacing.md,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  fontSize: 13,
})

const $field: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $submitButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

// ── Estado de sucesso ──────────────────────────────────────────────────────

const $successContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingTop: spacing.xl,
})

// Literal (não colors.tint) — mesmo motivo do logo do SignInScreen: badge
// de identidade fixa, sempre navy+branco independente do tema.
const $successIconBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 64,
  height: 64,
  borderRadius: 4,
  backgroundColor: colors.palette.primary500,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: spacing.md,
})

const $successTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  textAlign: "center",
  marginBottom: spacing.xs,
})

const $successBody: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  textAlign: "center",
  color: colors.textDim,
  fontSize: 14,
  lineHeight: 20,
  marginBottom: spacing.xl,
})

const $retryLink: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
  padding: spacing.xs,
})

// Sobre o background adaptável da Screen (sem fundo fixo próprio) — tint
// aqui é seguro, mesmo raciocínio do $footerLink do SignInScreen.
const $retryLinkText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 14,
  fontWeight: "600",
})

const $poweredBy: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xl,
})

const $poweredByCompact: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
})
