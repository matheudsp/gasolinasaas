import { useRef, useState } from "react"
import { ActivityIndicator, TextInput, TouchableOpacity, View, ViewStyle, TextStyle } from "react-native"
import { useRouter } from "expo-router"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { authClient } from "@/services/auth"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export function SignInScreen() {
  const { themed, theme } = useAppTheme()
  const router = useRouter()
  const passwordRef = useRef<TextInput>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    if (!email.trim() || !password) return
    setIsLoading(true)
    setError(null)
    const { error: signInError } = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password,
    })
    if (signInError) {
      setError(signInError.message ?? "Credenciais inválidas. Tente novamente.")
    }
    setIsLoading(false)
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    setError(null)
    const { error: googleError } = await authClient.signIn.social({ provider: "google" })
    if (googleError) {
      setError(googleError.message ?? "Erro ao entrar com Google.")
    }
    setIsGoogleLoading(false)
  }

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={themed($screen)}
      keyboardShouldPersistTaps="handled"
    >
      {/* Branding */}
      <View style={themed($header)}>
        <View style={themed($logoContainer)}>
          <Text style={$logoText}>⛽</Text>
        </View>
        <Text preset="heading" text="Martinez" style={themed($appName)} />
        <Text text="Gestão de postos de combustível" style={themed($tagline)} />
      </View>

      {/* Form */}
      <View style={themed($form)}>
        <Text preset="subheading" text="Entrar na conta" style={themed($formTitle)} />

        {!!error && (
          <View style={themed($errorBox)}>
            <Text text={error} style={themed($errorText)} />
          </View>
        )}

        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          containerStyle={themed($field)}
          status={error ? "error" : undefined}
        />

        <TextField
          ref={passwordRef}
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={handleSignIn}
          containerStyle={themed($field)}
          status={error ? "error" : undefined}
          RightAccessory={() => (
            <TouchableOpacity
              style={themed($eyeButton)}
              onPress={() => setShowPassword((v) => !v)}
            >
              <Text style={$eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          )}
        />

        <Button
          text={isLoading ? "Entrando..." : "Entrar"}
          preset="filled"
          onPress={handleSignIn}
          disabled={isLoading || !email || !password}
          style={themed($primaryButton)}
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

        {/* Divisor */}
        <View style={themed($divider)}>
          <View style={themed($dividerLine)} />
          <Text text="ou" style={themed($dividerText)} />
          <View style={themed($dividerLine)} />
        </View>

        {/* Google */}
        <Button
          text={isGoogleLoading ? "Aguarde..." : "Entrar com Google"}
          preset="default"
          onPress={handleGoogleSignIn}
          disabled={isGoogleLoading}
          style={themed($googleButton)}
          LeftAccessory={
            isGoogleLoading
              ? ({ style }) => (
                  <ActivityIndicator size="small" color={theme.colors.text} style={style} />
                )
              : ({ style }) => (
                  <Text text="G" style={[style, themed($googleIcon)]} />
                )
          }
        />
      </View>

      {/* Rodapé */}
      <View style={$footer}>
        <Text text="Ainda não tem conta? " style={themed($footerText)} />
        <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
          <Text text="Cadastre-se" style={themed($footerLink)} />
        </TouchableOpacity>
      </View>
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexGrow: 1,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.xxl,
  justifyContent: "center",
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  marginBottom: spacing.xxl,
})

const $logoContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 72,
  height: 72,
  borderRadius: 20,
  backgroundColor: colors.tint,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: spacing.md,
})

const $logoText: TextStyle = {
  fontSize: 36,
}

const $appName: ThemedStyle<TextStyle> = ({ spacing }) => ({
  textAlign: "center",
  marginBottom: spacing.xs,
})

const $tagline: ThemedStyle<TextStyle> = ({ colors }) => ({
  textAlign: "center",
  color: colors.textDim,
  fontSize: 14,
})

const $form: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xl,
})

const $formTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $errorBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.error + "18",
  borderRadius: 8,
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

const $eyeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  alignSelf: "center",
})

const $eyeIcon: TextStyle = {
  fontSize: 16,
}

const $primaryButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

const $divider: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginVertical: spacing.lg,
})

const $dividerLine: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  height: 1,
  backgroundColor: colors.separator,
})

const $dividerText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginHorizontal: spacing.sm,
  color: colors.textDim,
  fontSize: 13,
})

const $googleButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.border,
})

const $googleIcon: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontWeight: "700",
  fontSize: 16,
  color: colors.text,
})

const $footer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
}

const $footerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
})

const $footerLink: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 14,
  fontWeight: "600",
})