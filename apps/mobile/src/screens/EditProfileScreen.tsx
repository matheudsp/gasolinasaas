import { FC, useState } from "react"
import { Alert, ScrollView, TextStyle, View, ViewStyle } from "react-native"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/Button"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { authClient } from "@/lib/auth"
import { formatCpf } from "@/utils/cpf"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * Edição dos dados da conta.
 *
 * - Nome: troca direta (é só rótulo de exibição).
 * - E-mail: NÃO troca na hora — o Better Auth manda um link de confirmação
 *   para o e-mail ATUAL, e só depois do clique a troca acontece. É o que
 *   impede alguém com a sessão aberta de apontar a conta pro próprio e-mail.
 * - Senha: só existe para contas de e-mail/senha (providerId "credential").
 *   Quem entrou com Google não tem senha para trocar.
 * - CPF: somente leitura — é a identidade única no programa de fidelidade.
 */
export const EditProfileScreen: FC = function EditProfileScreen() {
  const router = useRouter()
  const { themed } = useAppTheme()
  const { data: session, refetch: refetchSession } = authClient.useSession()
  const user = session?.user

  // Contas vinculadas: define se existe senha para trocar.
  const accountsQuery = useQuery({
    queryKey: ["auth", "accounts"],
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts()
      if (error) throw new Error(error.message ?? "Falha ao carregar")
      return data ?? []
    },
  })
  // Em caso de falha, assume que tem senha: esconder o campo prenderia quem
  // usa e-mail/senha; mostrar a mais só resulta num erro claro do server.
  const hasPassword = accountsQuery.isError
    ? true
    : (accountsQuery.data?.some((a) => a.providerId === "credential") ?? false)

  // ── Nome ───────────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "")
  const [savingName, setSavingName] = useState(false)

  async function handleSaveName() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSavingName(true)
    try {
      const { error } = await authClient.updateUser({ name: trimmed })
      if (error) throw new Error(error.message ?? "Erro ao salvar")
      await refetchSession()
      Alert.alert("Pronto", "Seu nome foi atualizado.")
    } catch (err) {
      Alert.alert("Não foi possível salvar", (err as Error).message)
    } finally {
      setSavingName(false)
    }
  }

  // ── E-mail ─────────────────────────────────────────────────────────────
  const [email, setEmail] = useState(user?.email ?? "")
  const [savingEmail, setSavingEmail] = useState(false)

  async function handleSaveEmail() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes("@")) {
      Alert.alert("E-mail inválido", "Confira o endereço digitado.")
      return
    }
    if (trimmed === user?.email) return

    setSavingEmail(true)
    try {
      const { error } = await authClient.changeEmail({ newEmail: trimmed })
      if (error) throw new Error(error.message ?? "Erro ao solicitar troca")
      Alert.alert(
        "Confirme no e-mail atual",
        `Enviamos um link para ${user?.email}. O endereço só muda para ${trimmed} depois que você confirmar por lá.`,
      )
    } catch (err) {
      Alert.alert("Não foi possível trocar o e-mail", (err as Error).message)
    } finally {
      setSavingEmail(false)
    }
  }

  // ── Senha ──────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleSavePassword() {
    if (newPassword.length < 8) {
      Alert.alert("Senha muito curta", "Use no mínimo 8 caracteres.")
      return
    }
    setSavingPassword(true)
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        // Encerra as outras sessões: se a senha vazou, trocar aqui expulsa
        // quem estiver logado em outro aparelho.
        revokeOtherSessions: true,
      })
      if (error) throw new Error(error.message ?? "Erro ao trocar a senha")
      setCurrentPassword("")
      setNewPassword("")
      Alert.alert("Pronto", "Sua senha foi alterada.")
    } catch {
      Alert.alert(
        "Não foi possível trocar a senha",
        "Confira se a senha atual está correta.",
      )
    } finally {
      setSavingPassword(false)
    }
  }

  const nameChanged = name.trim() !== (user?.name ?? "") && !!name.trim()
  const emailChanged = email.trim().toLowerCase() !== (user?.email ?? "")

  return (
    <Screen preset="fixed" safeAreaEdges={["bottom"]} contentContainerStyle={$flex1}>
      <Header title="Meus dados" leftIcon="back" onLeftPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={themed($content)}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Nome ─────────────────────────────────────────────────────── */}
        <View style={themed($section)}>
          <Text preset="formLabel" text="Nome" style={themed($sectionLabel)} />
          <TextField
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            placeholder="Seu nome completo"
          />
          <Button
            text={savingName ? "Salvando..." : "Salvar nome"}
            preset="filled"
            disabled={savingName || !nameChanged}
            onPress={handleSaveName}
          />
        </View>

        {/* ── E-mail ───────────────────────────────────────────────────── */}
        <View style={themed($section)}>
          <Text preset="formLabel" text="E-mail" style={themed($sectionLabel)} />
          <TextField
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            helper="Enviamos um link de confirmação para o seu e-mail atual. A troca só vale depois que você confirmar."
          />
          <Button
            text={savingEmail ? "Enviando..." : "Trocar e-mail"}
            preset="filled"
            disabled={savingEmail || !emailChanged}
            onPress={handleSaveEmail}
          />
        </View>

        {/* ── Senha (só para contas com senha) ─────────────────────────── */}
        {hasPassword ? (
          <View style={themed($section)}>
            <Text preset="formLabel" text="Senha" style={themed($sectionLabel)} />
            <TextField
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoComplete="current-password"
              placeholder="Senha atual"
            />
            <TextField
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholder="Nova senha"
              helper="Mínimo 8 caracteres. Ao trocar, você sai das sessões abertas em outros aparelhos."
            />
            <Button
              text={savingPassword ? "Alterando..." : "Alterar senha"}
              preset="filled"
              disabled={savingPassword || !currentPassword || !newPassword}
              onPress={handleSavePassword}
            />
          </View>
        ) : null}

        {/* ── CPF (somente leitura) ────────────────────────────────────── */}
        <View style={themed($section)}>
          <Text preset="formLabel" text="CPF" style={themed($sectionLabel)} />
          <View style={themed($readonlyBox)}>
            <Text text={formatCpf(user?.cpf ?? "") || "—"} />
          </View>
          <Text
            size="xxs"
            style={themed($dim)}
            text="O CPF identifica você no programa de fidelidade e não pode ser alterado. Se estiver errado, fale com o suporte."
          />
        </View>
      </ScrollView>
    </Screen>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $flex1: ViewStyle = { flex: 1 }

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  gap: spacing.xl,
  paddingBottom: spacing.xxl,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $sectionLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $readonlyBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
})

const $dim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
