import { FC, useCallback } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"
import type { MaterialDesignIconsIconName } from "@react-native-vector-icons/material-design-icons"

import { Icon } from "@/components/Icon"
import { LoyaltyProgress } from "@/components/LoyaltyProgress"
import { Screen } from "@/components/Screen"
import { StationCard } from "@/components/StationCard"
import { Text } from "@/components/Text"
import { useNearbyStations } from "@/hooks/useNearbyStations"
import { usePreferredFuel } from "@/hooks/usePreferredFuel"
import { useSortOption } from "@/hooks/useSortOption"
import { useUserLocation } from "@/hooks/useUserLocation"
import { authClient } from "@/lib/auth"
import { orpc } from "@/lib/orpc"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"

// Quantos postos aparecem no resumo do hub (o resto fica em "Ver todos").
const NEARBY_PREVIEW = 3

const QUICK_ACTIONS: {
  icon: MaterialDesignIconsIconName
  label: string
  href: Parameters<ReturnType<typeof useRouter>["push"]>[0]
}[] = [
  { icon: "gift-outline", label: "Recompensas", href: "/(app)/rewards" },
  { icon: "help-circle-outline", label: "Como funciona", href: "/(app)/(modals)/howItWorks" },
  { icon: "lifebuoy", label: "Ajuda", href: "/(app)/support" },
]

export const HomeScreen: FC = function HomeScreen() {
  const { themed, theme } = useAppTheme()
  const router = useRouter()
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const { data: session } = authClient.useSession()

  const { preferredFuelSlug, refresh: refreshFuel } = usePreferredFuel()
  const { sortBy, refresh: refreshSort } = useSortOption()
  const { location, isLoading: locationLoading } = useUserLocation()
  const {
    stations,
    isLoading: stationsLoading,
    isRefetching,
    refetch,
  } = useNearbyStations(preferredFuelSlug, location, sortBy)

  const balanceQuery = useQuery(orpc.loyalty.myBalance.queryOptions())
  const campaignQuery = useQuery(orpc.loyalty.activeCampaign.queryOptions())
  const { data: unread } = useQuery(orpc.user.getUnreadNotificationCount.queryOptions())
  const unreadCount = unread?.count ?? 0

  useFocusEffect(
    useCallback(() => {
      refreshFuel()
      refreshSort()
    }, [refreshFuel, refreshSort]),
  )

  const campaign = campaignQuery.data
  const nearby = stations.slice(0, NEARBY_PREVIEW)

  return (
    <Screen preset="fixed" safeAreaEdges={[]}>
      <ScrollView
        contentContainerStyle={themed($content)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch()
              balanceQuery.refetch()
            }}
            tintColor={theme.colors.tint}
          />
        }
      >
        {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
        <View style={[themed($headerRow), $topInsets]}>
          <Text
            preset="heading"
            text={`Olá, ${session?.user?.name?.split(" ")[0] ?? "Motorista"}`}
            style={$headingText}
            numberOfLines={1}
          />
          <Pressable
            onPress={() => router.push("/(app)/notifications")}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : "Notificações"
            }
            hitSlop={8}
            style={themed($iconButton)}
          >
            <Icon icon="bell" size={24} color={theme.colors.text} />
            {unreadCount > 0 && (
              <View style={themed($badge)}>
                <Text
                  size="xxs"
                  weight="bold"
                  style={themed($badgeText)}
                  text={unreadCount > 99 ? "99+" : String(unreadCount)}
                />
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Cartão de pontos ──────────────────────────────────────────── */}
        <View style={themed($pointsCard)}>
          <View style={$rowBetween}>
            <Text size="xxs" weight="bold" style={themed($pointsLabel)} text="SEUS PONTOS" />
            <Pressable
              onPress={() => router.push("/(app)/(tabs)/loyalty")}
              accessibilityRole="button"
              accessibilityLabel="Ver meus pontos"
              hitSlop={8}
            >
              <MaterialDesignIcons
                name="chevron-right"
                size={22}
                color={theme.colors.palette.neutral100}
              />
            </Pressable>
          </View>
          <Text style={themed($pointsValue)} text={`${balanceQuery.data?.balance ?? 0}`} />
          <Pressable
            onPress={() => router.push("/(app)/(tabs)/loyalty")}
            accessibilityRole="button"
            accessibilityLabel="Mostrar QR no caixa"
            style={themed($qrButton)}
          >
            <MaterialDesignIcons name="qrcode" size={18} color={theme.colors.tint} />
            <Text weight="bold" size="sm" style={themed($qrButtonText)} text="Mostrar no caixa" />
          </Pressable>
        </View>

        <LoyaltyProgress />

        {/* ── Banner da campanha ativa ──────────────────────────────────── */}
        {campaign ? (
          <Pressable
            onPress={() => router.push("/(app)/(modals)/howItWorks")}
            style={themed($campaignBanner)}
          >
            <MaterialDesignIcons name="rocket-launch" size={22} color={theme.colors.tint} />
            <View style={$flex1}>
              <Text
                weight="bold"
                size="sm"
                text={`${formatMultiplier(campaign.multiplier)} pontos até ${formatEnds(campaign.endsAt)}`}
              />
              <Text size="xxs" style={themed($dim)} text={campaign.name} />
            </View>
          </Pressable>
        ) : null}

        {/* ── Ações rápidas ─────────────────────────────────────────────── */}
        <View style={$quickRow}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.href)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={themed($quickTile)}
            >
              <MaterialDesignIcons name={action.icon} size={24} color={theme.colors.tint} />
              <Text size="xxs" weight="semiBold" style={$centered} text={action.label} />
            </Pressable>
          ))}
        </View>

        {/* ── Postos próximos ───────────────────────────────────────────── */}
        <View style={$rowBetween}>
          <Text preset="formLabel" style={themed($sectionLabel)} text="Postos próximos" />
          <Pressable onPress={() => router.push("/(app)/stations")} hitSlop={8}>
            <Text size="xs" weight="bold" style={themed($seeAll)} text="Ver todos" />
          </Pressable>
        </View>

        {stationsLoading && nearby.length === 0 ? (
          <ActivityIndicator size="small" color={theme.colors.tint} style={themed($loader)} />
        ) : nearby.length === 0 ? (
          <Text size="xs" style={themed($dim)} text="Nenhum posto encontrado." />
        ) : (
          <View style={$stationList}>
            {nearby.map((item) => (
              <StationCard
                key={item.id}
                station={item}
                locationLoading={locationLoading}
                onPress={() => router.push(`/station/${item.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** 2 → "Pontos em dobro"; 3 → "Pontos em triplo"; resto → "3,5x pontos". */
function formatMultiplier(m: number): string {
  if (m === 2) return "Pontos em dobro"
  if (m === 3) return "Pontos em triplo"
  const s = Number.isInteger(m) ? String(m) : m.toFixed(1).replace(".", ",")
  return `${s}x pontos`
}

/** "hoje", "amanhã" ou "dd/mm" para o fim da campanha. */
function formatEnds(d: Date | string): string {
  const end = new Date(d)
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000)
  if (days <= 1) return "hoje"
  if (days === 2) return "amanhã"
  return end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $flex1: ViewStyle = { flex: 1 }
const $centered: TextStyle = { textAlign: "center" }
const $headingText: TextStyle = { flexShrink: 1 }
const $rowBetween: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
}
const $quickRow: ViewStyle = { flexDirection: "row", gap: 8 }
const $stationList: ViewStyle = { gap: 8 }

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.xxxxl,
  gap: spacing.md,
})

const $headerRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: spacing.xs,
})

const $iconButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xxs,
})

const $badge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: -2,
  right: -4,
  minWidth: 16,
  height: 16,
  borderRadius: 8,
  paddingHorizontal: 3,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.error,
})

const $badgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  lineHeight: 14,
})

const $pointsCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  borderRadius: 16,
  padding: spacing.lg,
  gap: spacing.xs,
})

const $pointsLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  letterSpacing: 1,
})

const $pointsValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontSize: 44,
  lineHeight: 50,
  fontVariant: ["tabular-nums"],
})

const $qrButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 10,
  paddingVertical: spacing.sm,
  marginTop: spacing.xs,
})

const $qrButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $campaignBanner: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
  padding: spacing.md,
})

const $quickTile: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  alignItems: "center",
  gap: spacing.xs,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  paddingVertical: spacing.md,
  borderWidth: 1,
  borderColor: colors.separator,
})

const $sectionLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $seeAll: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $loader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})

const $dim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
