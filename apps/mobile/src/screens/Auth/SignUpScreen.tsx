import { useRef, useState } from "react"
import {
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
} from "react-native"
import { Link, useRouter } from "expo-router"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { authClient } from "@/lib/auth"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { Icon } from "@/components/Icon"

export function SignUpScreen() {
  const { themed, theme } = useAppTheme()
  const router = useRouter()

  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const confirmRef = useRef<TextInput>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = "Nome é obrigatório"
    if (!email.trim() || !email.includes("@")) next.email = "E-mail inválido"
    if (password.length < 8) next.password = "Mínimo 8 caracteres"
    if (password !== confirmPassword) next.confirmPassword = "As senhas não coincidem"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSignUp() {
    if (!validate()) return
    setIsLoading(true)
    const { error } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      setErrors({ general: error.message ?? "Erro ao criar conta. Tente novamente." })
    }
    setIsLoading(false)
  }

  const isFormFilled = !!name && !!email && !!password && !!confirmPassword

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={themed($screen)}
      keyboardShouldPersistTaps="handled"
    >
      <View style={themed($header)}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            // marginBottom: theme.spacing.xs,
          }}
        >
          <Text preset="heading" text="Criar conta" />
          <Link href="/(auth)/sign-in" dismissTo asChild>
            <Button preset="ghost" accessibilityRole="button" accessibilityLabel="Fechar">
              <Icon icon="x" size={24} color={theme.colors.tint} />
            </Button>
          </Link>
        </View>
        <Text text="Preencha os dados para acessar o sistema" style={themed($subtitle)} />
      </View>

      {/* Erro geral */}
      {!!errors.general && (
        <View style={themed($errorBox)}>
          <Text text={errors.general} style={themed($errorText)} />
        </View>
      )}

      {/* Formulário */}
      <View>
        <TextField
          label="Nome completo"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          containerStyle={themed($field)}
          status={errors.name ? "error" : undefined}
          helper={errors.name}
        />

        <TextField
          ref={emailRef}
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
          status={errors.email ? "error" : undefined}
          helper={errors.email}
        />

        <TextField
          ref={passwordRef}
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="new-password"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          containerStyle={themed($field)}
          status={errors.password ? "error" : undefined}
          helper={errors.password ?? "Mínimo 8 caracteres"}
          RightAccessory={() => (
            <TouchableOpacity style={themed($eyeButton)} onPress={() => setShowPassword((v) => !v)}>
              <Text style={$eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          )}
        />

        <TextField
          ref={confirmRef}
          label="Confirmar senha"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={handleSignUp}
          containerStyle={themed($field)}
          status={errors.confirmPassword ? "error" : undefined}
          helper={errors.confirmPassword}
        />

        <Button
          text={isLoading ? "Criando conta..." : "Criar conta"}
          preset="filled"
          onPress={handleSignUp}
          disabled={isLoading || !isFormFilled}
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
      </View>

      {/* Rodapé */}
      <View style={themed($footer)}>
        <Text text="Já tem uma conta? " style={themed($footerText)} />
        <TouchableOpacity onPress={() => router.replace("/(auth)/sign-in")}>
          <Text text="Entrar" style={themed($footerLink)} />
        </TouchableOpacity>
      </View>
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  // flexGrow: 1,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xl,
  paddingBottom: spacing.xxl,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xl,
})

const $subtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
  lineHeight: 20,
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

const $submitButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
})

const $footer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  marginTop: spacing.xl,
})

const $footerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
})

const $footerLink: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 14,
  fontWeight: "600",
})
