import { FC } from "react"
import {
  ActivityIndicator,
  Image,
  ImageStyle,
  ScrollView,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Button } from "@/components/Button"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { resolveImageUrl } from "@/lib/branding"
import { orpc } from "@/lib/orpc"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * Modal de confirmação de resgate (operador). Mostra a FOTO do produto para o
 * operador conferir o estoque físico ANTES de baixar: sem estoque no local,
 * ele cancela e o resgate segue pendente (não consome o código).
 *
 * Fluxo: peek (lê sem consumir) → operador confirma → confirmRedemption
 * (transação: consome o código, baixa estoque, debita). Cancelar não consome.
 */
export const ConfirmRedemptionScreen: FC = function ConfirmRedemptionScreen() {
  const router = useRouter()
  const { themed, theme } = useAppTheme()
  const { code } = useLocalSearchParams<{ code: string }>()

  const peek = useQuery({
    ...orpc.loyalty.peekRedemption.queryOptions({ input: { code: code ?? "" } }),
    enabled: !!code,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })

  const confirm = useMutation({
    ...orpc.loyalty.confirmRedemption.mutationOptions(),
  })

  function handleConfirm() {
    if (!code) return
    confirm.mutate({ code })
  }

  const imageUri = resolveImageUrl(peek.data?.rewardImageUrl ?? null) ?? undefined

  return (
    <Screen preset="fixed" safeAreaEdges={["bottom", "top"]} contentContainerStyle={$flex1}>
      <Header title="Confirmar resgate" leftIcon="x" onLeftPress={() => router.back()} />

      {peek.isPending ? (
        <View style={themed($centered)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
        </View>
      ) : peek.isError || !peek.data ? (
        <View style={themed($centered)}>
          <MaterialDesignIcons name="alert-circle-outline" size={40} color={theme.colors.error} />
          <Text
            style={themed($errorText)}
            text={peek.error?.message ?? "Código de resgate inválido, expirado ou já utilizado."}
          />
          <Button text="Fechar" preset="filled" onPress={() => router.back()} />
        </View>
      ) : confirm.isSuccess ? (
        <View style={themed($centered)}>
          <View style={themed($doneBadge)}>
            <MaterialDesignIcons name="check" size={40} color={theme.colors.palette.neutral100} />
          </View>
          <Text preset="heading" text="Resgate entregue!" style={$centeredText} />
          <Text
            style={themed($dim)}
            text={
              confirm.data?.rewardName
                ? `${confirm.data.rewardName} entregue${confirm.data.customerName ? ` para ${confirm.data.customerName}` : ""}.`
                : "Entrega concluída."
            }
          />
          <Button text="Concluir" preset="filled" onPress={() => router.back()} style={$topGap} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={themed($content)} showsVerticalScrollIndicator={false}>
          <View style={themed($imageWrap)}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={themed($image)} resizeMode="cover" />
            ) : (
              <View style={[themed($image), themed($imagePlaceholder)]}>
                <MaterialDesignIcons name="gift-outline" size={64} color={theme.colors.textDim} />
              </View>
            )}
          </View>

          <Text
            preset="subheading"
            text={peek.data.rewardName ?? "Recompensa"}
            style={$centeredText}
          />
          <Text
            style={themed($dim)}
            text={`${peek.data.costPoints} pontos${peek.data.customerName ? ` · ${peek.data.customerName}` : ""}`}
          />

          <View style={themed($warning)}>
            <MaterialDesignIcons name="package-variant" size={20} color={theme.colors.tint} />
            <Text
              size="xs"
              style={themed($warningText)}
              text="Confira o estoque físico do produto antes de confirmar. Sem estoque, cancele — o resgate continua válido para o cliente."
            />
          </View>

          <Button
            text={confirm.isPending ? "Confirmando..." : "Confirmar entrega"}
            preset="filled"
            disabled={confirm.isPending}
            onPress={handleConfirm}
            style={$topGap}
          />
          <Button
            text="Cancelar"
            preset="ghost"
            disabled={confirm.isPending}
            onPress={() => router.back()}
          />
          {confirm.isError ? (
            <Text
              size="xs"
              style={themed($errorInline)}
              text={confirm.error?.message ?? "Não foi possível confirmar. Tente de novo."}
            />
          ) : null}
        </ScrollView>
      )}
    </Screen>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $flex1: ViewStyle = { flex: 1 }
const $centeredText: TextStyle = { textAlign: "center" }
const $topGap: ViewStyle = { marginTop: 8 }

const $centered: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: spacing.md,
  padding: spacing.xl,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  gap: spacing.sm,
  alignItems: "center",
})

const $imageWrap: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignSelf: "stretch",
  alignItems: "center",
  marginBottom: spacing.md,
})

const $image: ThemedStyle<ImageStyle> = ({ colors }) => ({
  width: "100%",
  aspectRatio: 1,
  maxHeight: 320,
  borderRadius: 16,
  backgroundColor: colors.palette.neutral200,
})

const $imagePlaceholder: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  justifyContent: "center",
})

const $warning: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  alignSelf: "stretch",
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
  padding: spacing.md,
  marginVertical: spacing.md,
})

const $warningText: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  color: colors.textDim,
})

const $doneBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 72,
  height: 72,
  borderRadius: 36,
  backgroundColor: colors.tint,
  alignItems: "center",
  justifyContent: "center",
})

const $dim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  textAlign: "center",
})

const $errorInline: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.error,
  textAlign: "center",
  marginTop: spacing.xs,
})
