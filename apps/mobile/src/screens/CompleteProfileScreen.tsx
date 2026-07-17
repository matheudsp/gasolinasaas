import { useState } from "react"
import { ActivityIndicator, View, ViewStyle, TextStyle } from "react-native"
import { useRouter } from "expo-router"
import { useMutation } from "@tanstack/react-query"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
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
  const { refetch: refetchSession } = authClient.useSession()

  const [cpf, setCpf] = useState("")
  const [error, setError] = useState<string | null>(null)

  const setCpfMutation = useMutation({
    ...orpc.user.setCpf.mutationOptions(),
    onSuccess: async () => {
      // O gate lê o cpf da sessão — recarrega antes de voltar pro app,
      // senão o redirect manda de volta pra cá.
      await refetchSession()
      router.replace("/(app)/(tabs)")
    },
    onError: (err) => setError(err.message),
  })

  function handleSubmit() {
    if (!isValidCpf(cpf)) {
      setError("CPF inválido")
      return
    }
    setError(null)
    setCpfMutation.mutate({ cpf: normalizeCpf(cpf) })
  }

  const pending = setCpfMutation.isPending

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

const $subtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
  lineHeight: 20,
})

const $field: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})
