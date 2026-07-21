import { useState } from "react"
import { ActivityIndicator, Alert, Linking, View, ViewStyle, TextStyle } from "react-native"
import { Redirect, useRouter } from "expo-router"
import { useMutation } from "@tanstack/react-query"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import Config from "@/config"
import { authClient } from "@/lib/auth"
import { orpc } from "@/lib/orpc"
import { formatCpf, isValidCpf, normalizeCpf } from "@/utils/cpf"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * Gate pós-login de CPF: contas antigas (anteriores ao campo) e cadastros
 * via Google chegam sem CPF — o layout de (app) redireciona pra cá até o
 * usuário preencher. Vive no grupo (onboarding), que não tem redirect de
 * saída, evitando loop de navegação.
 */
export function CompleteProfileScreen() {
  const { themed, theme } = useAppTheme()
  const router = useRouter()
  const {
    data: session,
    isPending: sessionPending,
    refetch: refetchSession,
  } = authClient.useSession()

  const [cpf, setCpf] = useState("")
  const [error, setError] = useState<string | null>(null)
  // CPF pertence a OUTRA conta (409 do setCpf). É o único erro em que digitar
  // de novo não resolve — a tela troca de modo e oferece as saídas.
  const [isTaken, setIsTaken] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const setCpfMutation = useMutation({
    ...orpc.user.setCpf.mutationOptions(),
    onSuccess: async () => {
      // O gate lê o cpf da sessão — recarrega antes de voltar pro app,
      // senão o redirect manda de volta pra cá.
      await refetchSession()
      router.replace("/(app)/(tabs)")
    },
    onError: (err) => {
      const conflict =
        (err as { status?: number }).status === 409 ||
        (err as { code?: string }).code === "CONFLICT"
      setIsTaken(conflict)
      setError(err.message)
    },
  })

  function handleSubmit() {
    if (!isValidCpf(cpf)) {
      setError("CPF inválido")
      return
    }
    setError(null)
    setCpfMutation.mutate({ cpf: normalizeCpf(cpf) })
  }

  // Saída de emergência: sem isso o usuário fica PRESO aqui se o CPF dele já
  // estiver em outra conta (ex.: entrou com Google num e-mail diferente do
  // cadastro antigo). Quem tira o usuário da tela é o <Redirect> lá embaixo,
  // quando a sessão zera.
  async function handleSignOut() {
    Alert.alert(
      "Sair da conta",
      "Você voltará para a tela de login. Use a conta em que seu CPF já está cadastrado.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            setIsSigningOut(true)
            try {
              // Não navega aqui: quem tira o usuário da tela é o <Redirect>
              // declarativo abaixo, disparado quando a sessão zera. Um
              // router.replace imediato correria com o (auth)/_layout, que
              // ainda veria a sessão antiga e devolveria pro (app) — e o gate
              // de CPF traria de volta pra cá (loop).
              await authClient.signOut()
            } catch {
              Alert.alert("Erro", "Não foi possível sair. Tente novamente.")
            } finally {
              setIsSigningOut(false)
            }
          },
        },
      ],
    )
  }

  function handleSupport() {
    const email = Config.SUPPORT_EMAIL
    const subject = "Ajuda com CPF no cadastro"
    // O e-mail da conta ajuda o suporte a localizar o cadastro duplicado.
    const body = `Olá! Não consigo concluir meu cadastro no app.\n\nConta: ${session?.user?.email ?? "(não identificada)"}\nProblema: `
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

    Linking.openURL(url).catch(() => {
      Alert.alert("Fale com o suporte", `Envie um e-mail para ${email}`)
    })
  }

  const pending = setCpfMutation.isPending

  // Sem sessão (o botão "Sair" abaixo, ou expiração) esta tela não faz
  // sentido. Precisa ser explícito porque (onboarding) não tem gate de saída
  // — é o que evita loop com o redirect de CPF do (app). O `sessionPending`
  // é essencial: sem ele, o primeiro render (sessão ainda carregando) jogaria
  // o usuário pro sign-in sem motivo.
  if (!sessionPending && !session?.user) {
    return <Redirect href="/(auth)/sign-in" />
  }

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={["top", "bottom"]}
      contentContainerStyle={themed($screen)}
      keyboardShouldPersistTaps="handled"
    >
      <View style={themed($header)}>
        <Text preset="heading" text="Complete seu cadastro" />
        <Text
          text="Para continuar usando o app, precisamos do seu CPF. Ele identifica seus pontos de fidelidade e é usado uma única vez."
          style={themed($subtitle)}
        />
      </View>

      <TextField
        label="CPF"
        placeholder="000.000.000-00"
        value={cpf}
        onChangeText={(v) => {
          setCpf(formatCpf(v))
          setError(null)
          setIsTaken(false)
        }}
        keyboardType="number-pad"
        maxLength={14}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        autoFocus
        containerStyle={themed($field)}
        status={error ? "error" : undefined}
        helper={error ?? undefined}
      />

      <Button
        text={pending ? "Salvando..." : "Salvar e continuar"}
        preset="filled"
        onPress={handleSubmit}
        disabled={pending || normalizeCpf(cpf).length !== 11}
        RightAccessory={
          pending
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

      {/* Saídas de emergência. Quando o CPF é de OUTRA conta, digitar de novo
          nunca resolve — o bloco vira destaque e explica o que fazer. */}
      {isTaken ? (
        <View style={themed($takenBox)}>
          <Text weight="bold" style={themed($takenTitle)} text="Este CPF já tem uma conta" />
          <Text
            size="xs"
            style={themed($takenText)}
            text={`Seu CPF está cadastrado em outra conta — provavelmente com outro e-mail. Saia e entre com ela para não perder seus pontos. Se não lembrar qual é, o suporte resolve pra você.`}
          />
          <Button
            text={isSigningOut ? "Saindo..." : "Sair e entrar com a outra conta"}
            preset="filled"
            disabled={isSigningOut}
            onPress={handleSignOut}
            style={themed($takenAction)}
          />
          <Button
            text="Falar com o suporte"
            preset="default"
            disabled={isSigningOut}
            onPress={handleSupport}
          />
        </View>
      ) : (
        <View style={themed($escapeHatch)}>
          <Text
            size="xxs"
            style={themed($escapeHint)}
            text="Seu CPF já está cadastrado em outra conta? Entre com ela ou fale com a gente."
          />
          <Button
            text={isSigningOut ? "Saindo..." : "Sair da conta"}
            preset="default"
            disabled={isSigningOut || pending}
            onPress={handleSignOut}
          />
          <Button
            text="Falar com o suporte"
            preset="ghost"
            disabled={isSigningOut}
            onPress={handleSupport}
          />
        </View>
      )}
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xxl,
  paddingBottom: spacing.xxl,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xl,
  gap: spacing.sm,
})

const $escapeHatch: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.xxl,
  paddingTop: spacing.lg,
  borderTopWidth: 1,
  borderTopColor: colors.separator,
  gap: spacing.xs,
})

const $escapeHint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  textAlign: "center",
  marginBottom: spacing.xs,
})

// Modo "CPF já cadastrado": destaque, porque aqui está a única saída possível.
const $takenBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.lg,
  padding: spacing.md,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.error,
  backgroundColor: colors.errorBackground,
  gap: spacing.xs,
})

const $takenTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})

const $takenText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.text,
  marginBottom: spacing.xs,
})

const $takenAction: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

const $subtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
  lineHeight: 20,
})

const $field: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})
