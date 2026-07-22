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
import { useMutation } from "@tanstack/react-query"

import { Button } from "@/components/Button"
import { PoliciesLink } from "@/components/PoliciesLink"
import { PoweredByGasolinaCloud } from "@/components/PoweredByGasolinaCloud"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { authClient } from "@/lib/auth"
import { orpc } from "@/lib/orpc"
import { formatCpf, isValidCpf, normalizeCpf } from "@/utils/cpf"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { Icon } from "@/components/Icon"

// Cadastro em etapas: dados pessoais (nome + CPF) → contato → senha.
// Os steps são estado interno — a rota não muda; o redirect pós-cadastro é
// declarativo via sessão no layout de (auth).
const STEPS = ["Dados pessoais", "Contato", "Senha"] as const

const STEP_SUBTITLES = [
  "Como podemos te chamar?",
  "Qual o seu e-mail?",
  "Escolha uma senha segura",
] as const

export function SignUpScreen() {
  const { themed, theme } = useAppTheme()
  const router = useRouter()

  const cpfRef = useRef<TextInput>(null)
  const confirmRef = useRef<TextInput>(null)

  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [cpf, setCpf] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Com requireEmailVerification no server, o cadastro NÃO cria sessão —
  // o usuário confirma o e-mail e então entra pelo sign-in.
  const [awaitingVerification, setAwaitingVerification] = useState(false)

  // Checagem de disponibilidade do CPF antes de avançar o step — erro
  // amigável aqui, em vez de violação de unique lá no fim do cadastro.
  const checkCpfMutation = useMutation(orpc.user.checkCpf.mutationOptions())

  async function handleNextFromPersonal() {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = "Nome é obrigatório"
    if (!isValidCpf(cpf)) next.cpf = "CPF inválido"
    setErrors(next)
    if (Object.keys(next).length > 0) return

    try {
      const { available } = await checkCpfMutation.mutateAsync({
        cpf: normalizeCpf(cpf),
      })
      if (!available) {
        setErrors({ cpf: "Este CPF já está cadastrado em outra conta" })
        return
      }
    } catch (error) {
      setErrors({
        cpf: error instanceof Error ? error.message : "Não foi possível validar o CPF",
      })
      return
    }

    setErrors({})
    setStep(1)
  }

  function handleNextFromContact() {
    if (!email.trim() || !email.includes("@")) {
      setErrors({ email: "E-mail inválido" })
      return
    }
    setErrors({})
    setStep(2)
  }

  async function handleSignUp() {
    const next: Record<string, string> = {}
    if (password.length < 8) next.password = "Mínimo 8 caracteres"
    if (password !== confirmPassword) next.confirmPassword = "As senhas não coincidem"
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setIsLoading(true)
    const { error } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      cpf: normalizeCpf(cpf),
    })
    if (error) {
      // Corrida residual: alguém cadastrou o mesmo CPF entre o check e o
      // submit — o unique do banco barra e voltamos pro step do CPF.
      if (error.message?.toLowerCase().includes("cpf")) {
        setErrors({ cpf: "Este CPF já está cadastrado em outra conta" })
        setStep(0)
      } else {
        setErrors({ general: error.message ?? "Erro ao criar conta. Tente novamente." })
      }
    } else {
      setAwaitingVerification(true)
    }
    setIsLoading(false)
  }

  function handleBack() {
    setErrors({})
    setStep((s) => Math.max(0, s - 1))
  }

  const checkingCpf = checkCpfMutation.isPending

  if (awaitingVerification) {
    return (
      <Screen preset="scroll" contentContainerStyle={themed($screen)}>
        <View style={themed($header)}>
          <Text preset="heading" text="Confirme seu e-mail" />
          <Text
            text={`Enviamos um link de confirmação para ${email.trim().toLowerCase()}. Depois de confirmar, é só entrar com sua senha.`}
            style={themed($subtitle)}
          />
        </View>
        <Button
          text="Ir para o login"
          preset="filled"
          onPress={() => router.replace("/(auth)/sign-in")}
          style={themed($submitButton)}
        />
        <PoweredByGasolinaCloud style={themed($poweredByCompact)} />
      </Screen>
    )
  }

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={themed($screen)}
      keyboardShouldPersistTaps="handled"
    >
      <View style={themed($header)}>
        <View style={$headerRow}>
          <Text preset="heading" text="Criar conta" />
          <Link href="/(auth)/sign-in" dismissTo asChild>
            <Button preset="ghost" accessibilityRole="button" accessibilityLabel="Fechar">
              <Icon icon="x" size={24} color={theme.colors.tint} />
            </Button>
          </Link>
        </View>
        <Text text={STEP_SUBTITLES[step]} style={themed($subtitle)} />
      </View>

      {/* Indicador de progresso */}
      <View style={themed($progressRow)}>
        {STEPS.map((label, i) => (
          <View
            key={label}
            style={[themed($progressSegment), i <= step && themed($progressSegmentActive)]}
          />
        ))}
      </View>
      <Text
        size="xxs"
        style={themed($stepLabel)}
        text={`Etapa ${step + 1} de ${STEPS.length} — ${STEPS[step]}`}
      />

      {/* Erro geral */}
      {!!errors.general && (
        <View style={themed($errorBox)}>
          <Text text={errors.general} style={themed($errorText)} />
        </View>
      )}

      {/* ── Step 1: dados pessoais ─────────────────────────────────────── */}
      {step === 0 && (
        <View>
          <TextField
            label="Nome completo"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
            onSubmitEditing={() => cpfRef.current?.focus()}
            containerStyle={themed($field)}
            status={errors.name ? "error" : undefined}
            helper={errors.name}
          />

          <TextField
            ref={cpfRef}
            label="CPF"
            placeholder="000.000.000-00"
            value={cpf}
            onChangeText={(v) => setCpf(formatCpf(v))}
            keyboardType="number-pad"
            maxLength={14}
            returnKeyType="done"
            onSubmitEditing={handleNextFromPersonal}
            containerStyle={themed($field)}
            status={errors.cpf ? "error" : undefined}
            helper={errors.cpf}
          />

          <Button
            text={checkingCpf ? "Verificando..." : "Continuar"}
            preset="filled"
            onPress={handleNextFromPersonal}
            disabled={checkingCpf || !name || normalizeCpf(cpf).length !== 11}
            style={themed($submitButton)}
            RightAccessory={
              checkingCpf
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
      )}

      {/* ── Step 2: contato ────────────────────────────────────────────── */}
      {step === 1 && (
        <View>
          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={handleNextFromContact}
            autoFocus
            containerStyle={themed($field)}
            status={errors.email ? "error" : undefined}
            helper={errors.email}
          />

          <Button
            text="Continuar"
            preset="filled"
            onPress={handleNextFromContact}
            disabled={!email}
            style={themed($submitButton)}
          />
          <Button text="Voltar" preset="ghost" onPress={handleBack} />
        </View>
      )}

      {/* ── Step 3: senha ──────────────────────────────────────────────── */}
      {step === 2 && (
        <View>
          <TextField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            autoFocus
            containerStyle={themed($field)}
            status={errors.password ? "error" : undefined}
            helper={errors.password ?? "Mínimo 8 caracteres"}
            RightAccessory={() => (
              <TouchableOpacity
                style={themed($eyeButton)}
                onPress={() => setShowPassword((v) => !v)}
              >
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
            disabled={isLoading || !password || !confirmPassword}
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
          <Button text="Voltar" preset="ghost" onPress={handleBack} disabled={isLoading} />
        </View>
      )}

      {/* Rodapé */}
      <View style={themed($footer)}>
        <Text text="Já tem uma conta? " style={themed($footerText)} />
        <TouchableOpacity onPress={() => router.replace("/(auth)/sign-in")}>
          <Text weight="semiBold" text="Entrar" style={themed($footerLink)} />
        </TouchableOpacity>
      </View>

      <PoliciesLink style={themed($poweredBy)} />
      <PoweredByGasolinaCloud style={themed($poweredByCompact)} />
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xl,
  paddingBottom: spacing.xxl,
})

const $headerRow: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $subtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
  lineHeight: 20,
})

const $progressRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
})

const $progressSegment: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  height: 4,
  borderRadius: 2,
  backgroundColor: colors.palette.neutral300,
})

const $progressSegmentActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
})

const $stepLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xs,
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
})

const $poweredBy: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
})

const $poweredByCompact: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
})
