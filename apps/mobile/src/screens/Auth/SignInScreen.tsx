import { useRef, useState } from "react"
import {
  ActivityIndicator,
  Image,
  ImageStyle,
  Pressable,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
} from "react-native"
import { useRouter } from "expo-router"
import * as Linking from "expo-linking"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Button } from "@/components/Button"
import { PoliciesLink } from "@/components/PoliciesLink"
import { PoweredByGasolinaCloud } from "@/components/PoweredByGasolinaCloud"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"

import { authClient } from "@/lib/auth"
import { useTenantBranding } from "@/lib/branding"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export function SignInScreen() {
  const { themed, theme } = useAppTheme()
  const { name: appName, logoSource } = useTenantBranding()
  const router = useRouter()
  const passwordRef = useRef<TextInput>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isBusy = isLoading || isGoogleLoading

  function handleEmailChange(value: string) {
    setEmail(value)
    if (error) setError(null)
  }

  function handlePasswordChange(value: string) {
    setPassword(value)
    if (error) setError(null)
  }

  async function handleSignIn() {
    if (!email.trim() || !password) return
    setIsLoading(true)
    setError(null)
    try {
      const { error: signInError } = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      })
      if (signInError) {
        // 403 = e-mail não verificado — o server já REENVIA o link nessa
        // tentativa (sendOnSignIn), então a mensagem orienta a caixa de
        // entrada em vez de mostrar o erro cru em inglês.
        if (signInError.status === 403) {
          setError(
            "Seu e-mail ainda não foi confirmado. Reenviamos o link de confirmação — confira sua caixa de entrada e tente de novo.",
          )
        } else {
          setError(signInError.message ?? "Credenciais inválidas. Tente novamente.")
        }
      }
    } catch {
      setError("Não foi possível conectar. Verifique sua internet e tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    setError(null)
    try {
      const { error: googleError } = await authClient.signIn.social({
        provider: "google",
        // Resolve o scheme do app dinamicamente: gasolina:// em build,
        // exp://... em dev — sem scheme hardcoded de tenant.
        callbackURL: Linking.createURL("/"),
      })
      if (googleError) {
        setError(googleError.message ?? "Erro ao entrar com Google.")
      }
    } catch {
      setError("Não foi possível conectar. Verifique sua internet e tente novamente.")
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={themed($screen)}
      keyboardShouldPersistTaps="handled"
    >
      {/* Escolheu a rede errada? Volta pro seletor antes de logar. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Trocar de rede"
        onPress={() => router.replace("/select-network")}
        style={themed($changeNetwork)}
      >
        <MaterialDesignIcons name="chevron-left" size={18} color={theme.colors.textDim} />
        <Text size="xs" text="Trocar de rede" style={themed($changeNetworkText)} />
      </Pressable>

      {/* Branding */}
      <View style={themed($header)}>
        <Image source={logoSource} style={themed($appLogo)} resizeMode="contain" />
        <Text preset="heading" text={appName} style={themed($appName)} />
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
          onChangeText={handleEmailChange}
          autoFocus
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
          onChangeText={handlePasswordChange}
          secureTextEntry={!showPassword}
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={handleSignIn}
          containerStyle={themed($field)}
          status={error ? "error" : undefined}
          RightAccessory={() => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
              android_ripple={{ color: theme.colors.palette.neutral300, borderless: true }}
              style={themed($eyeButton)}
              onPress={() => setShowPassword((v) => !v)}
            >
              <MaterialDesignIcons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={theme.colors.palette.neutral600}
              />
            </Pressable>
          )}
        />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            marginBottom: theme.spacing.md,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Esqueci minha senha"
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text text="Esqueci minha senha" style={themed($footerLink)} />
          </Pressable>
        </View>
        <Button
          text={isLoading ? "Entrando..." : "Entrar"}
          preset="primary"
          onPress={handleSignIn}
          disabled={isBusy || !email || !password}
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
          disabled={isBusy}
          style={themed($googleButton)}
          LeftAccessory={
            isGoogleLoading
              ? ({ style }) => (
                  <ActivityIndicator size="small" color={theme.colors.text} style={style} />
                )
              : ({ style }) => (
                  <MaterialDesignIcons
                    name="google"
                    size={18}
                    color={theme.colors.palette.primary500}
                    style={style}
                  />
                )
          }
        />
      </View>

      {/* Rodapé */}
      <View style={$footer}>
        <Text text="Ainda não tem conta? " style={themed($footerText)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cadastre-se"
          onPress={() => router.push("/(auth)/sign-up")}
        >
          <Text text="Cadastre-se" style={themed($footerLink)} />
        </Pressable>
      </View>

      <PoliciesLink style={themed($poweredBy)} />
      <PoweredByGasolinaCloud style={themed($poweredByCompact)} />
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexGrow: 1,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.xxl,
  justifyContent: "center",
})

const $changeNetwork: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start",
  gap: spacing.xxs,
  paddingVertical: spacing.xs,
  marginBottom: spacing.sm,
})

const $changeNetworkText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  marginBottom: spacing.xxl,
})

const $appLogo: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  width: 84,
  height: 84,
  marginBottom: spacing.md,
})

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
  marginBottom: spacing.xs,
})

const $eyeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
  alignSelf: "center",
})

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

const $poweredBy: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
})

const $poweredByCompact: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
})
