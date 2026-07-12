import { FC, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  type ImageStyle,
  Modal,
  Pressable,
  RefreshControl,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useRouter } from "expo-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import QRCode from "react-native-qrcode-svg"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Button } from "@/components/Button"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import Config from "@/config"
import { orpc } from "@/lib/orpc"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/** Fotos vêm como caminho relativo do server; URLs externas (coladas) já são absolutas. */
function resolveImageUrl(url: string | null): string | null {
  if (!url) return null
  return url.startsWith("http") ? url : `${Config.API_URL}${url}`
}

type PendingRedemption = {
  code: string
  reward: { name: string; costPoints: number }
}

export const RewardsScreen: FC = function RewardsScreen() {
  const router = useRouter()
  const { themed, theme } = useAppTheme()

  const [redemption, setRedemption] = useState<PendingRedemption | null>(null)

  const balanceQuery = useQuery(orpc.loyalty.myBalance.queryOptions())
  const rewardsQuery = useQuery(orpc.loyalty.listRewards.queryOptions())

  const requestMutation = useMutation({
    ...orpc.loyalty.requestRedemption.mutationOptions(),
    onSuccess: (data) => setRedemption({ code: data.code, reward: data.reward }),
  })

  const balance = balanceQuery.data?.balance ?? 0
  const rewards = rewardsQuery.data ?? []

  return (
    <Screen preset="fixed" safeAreaEdges={["bottom"]}>
      <Header title="Recompensas" leftIcon="back" onLeftPress={() => router.back()} />

      <View style={themed($balanceStrip)}>
        <MaterialDesignIcons name="star-circle" size={18} color={theme.colors.tint} />
        <Text
          weight="bold"
          text={`${balance} pontos disponíveis`}
          style={themed($balanceText)}
        />
      </View>

      <FlatList
        data={rewards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={themed($listContent)}
        ItemSeparatorComponent={() => <View style={themed($separator)} />}
        refreshControl={
          <RefreshControl
            refreshing={rewardsQuery.isRefetching}
            onRefresh={() => {
              rewardsQuery.refetch()
              balanceQuery.refetch()
            }}
            tintColor={theme.colors.tint}
          />
        }
        ListEmptyComponent={
          rewardsQuery.isLoading ? (
            <View style={themed($centered)}>
              <ActivityIndicator size="large" color={theme.colors.tint} />
            </View>
          ) : (
            <View style={themed($centered)}>
              <MaterialDesignIcons
                name="gift-outline"
                size={32}
                color={theme.colors.textDim}
              />
              <Text style={themed($dim)} text="Nenhuma recompensa disponível ainda." />
            </View>
          )
        }
        renderItem={({ item }) => {
          const soldOut = item.stock !== null && item.stock <= 0
          const canAfford = balance >= item.costPoints
          const disabled = soldOut || !canAfford || requestMutation.isPending

          return (
            <View style={themed($card)}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: resolveImageUrl(item.imageUrl) ?? undefined }}
                  style={themed($cardImage)}
                />
              ) : (
                <View style={themed($cardImagePlaceholder)}>
                  <MaterialDesignIcons
                    name="gift-outline"
                    size={28}
                    color={theme.colors.palette.neutral400}
                  />
                </View>
              )}

              <View style={$cardBody}>
                <Text weight="bold" text={item.name} numberOfLines={1} />
                {!!item.description && (
                  <Text
                    size="xs"
                    style={themed($dim)}
                    text={item.description}
                    numberOfLines={2}
                  />
                )}
                <View style={themed($costRow)}>
                  <MaterialDesignIcons name="star" size={14} color={theme.colors.tint} />
                  <Text weight="bold" size="xs" style={themed($costText)} text={`${item.costPoints} pontos`} />
                  {soldOut && (
                    <Text size="xxs" style={themed($soldOut)} text="• esgotado" />
                  )}
                </View>

                <Button
                  text={soldOut ? "Esgotado" : canAfford ? "Resgatar" : "Saldo insuficiente"}
                  preset="filled"
                  disabled={disabled}
                  style={themed($resgatarButton)}
                  onPress={() => requestMutation.mutate({ rewardId: item.id })}
                />
              </View>
            </View>
          )
        }}
      />

      {/* Modal do QR de resgate */}
      <Modal
        visible={redemption !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRedemption(null)}
      >
        <Pressable style={themed($modalOverlay)} onPress={() => setRedemption(null)}>
          <Pressable style={themed($modalBox)} onPress={() => undefined} accessibilityViewIsModal>
            <Text preset="subheading" text="Mostre no caixa" style={themed($modalTitle)} />
            <Text
              size="xs"
              style={themed($dim)}
              text={
                redemption
                  ? `${redemption.reward.name} · ${redemption.reward.costPoints} pontos`
                  : ""
              }
            />

            <View style={themed($modalQr)}>
              {redemption && (
                <QRCode value={redemption.code} size={200} backgroundColor="white" color="black" />
              )}
            </View>

            <Text
              size="xxs"
              style={themed($dim)}
              text="O operador escaneia e confirma a entrega. Os pontos só são debitados nesse momento."
            />

            <Button
              text="Fechar"
              preset="default"
              style={themed($modalClose)}
              onPress={() => setRedemption(null)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $balanceStrip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  backgroundColor: colors.palette.neutral200,
})

const $balanceText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  flexGrow: 1,
})

const $separator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  height: spacing.sm,
})

const $centered: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.sm,
  paddingTop: spacing.xxl,
})

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  gap: spacing.md,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 14,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.separator,
})

const $cardImage: ThemedStyle<ImageStyle> = () => ({
  width: 72,
  height: 72,
  borderRadius: 10,
})

const $cardImagePlaceholder: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 72,
  height: 72,
  borderRadius: 10,
  backgroundColor: colors.palette.neutral200,
  alignItems: "center",
  justifyContent: "center",
})

const $cardBody: ViewStyle = { flex: 1, justifyContent: "center" }

const $costRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  marginTop: spacing.xxs,
  marginBottom: spacing.xs,
})

const $costText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $soldOut: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})

const $resgatarButton: ThemedStyle<ViewStyle> = () => ({
  alignSelf: "flex-start",
  minHeight: 36,
  paddingVertical: 6,
})

const $dim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $modalOverlay: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  alignItems: "center",
  justifyContent: "center",
  padding: spacing.lg,
})

const $modalBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: "100%",
  maxWidth: 340,
  backgroundColor: colors.background,
  borderRadius: 16,
  padding: spacing.lg,
  alignItems: "center",
  gap: spacing.sm,
})

const $modalTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $modalQr: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor: "white",
  padding: spacing.md,
  borderRadius: 12,
  marginVertical: spacing.sm,
})

const $modalClose: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
  alignSelf: "stretch",
})
