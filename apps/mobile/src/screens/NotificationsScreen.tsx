import { FC } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useRouter } from "expo-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { orpc, queryClient } from "@/lib/orpc"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

// A listagem do usuário aceita no máximo 50 itens por página; para uma caixa de
// notificações isso é suficiente, então buscamos uma página única em vez de
// paginar com cursor.
const PAGE_SIZE = 50

type NotificationItem = {
  id: string
  title: string
  body: string
  createdAt: Date | string
  sentAt: Date | string | null
  isRead: boolean
}

export const NotificationsScreen: FC = function NotificationsScreen() {
  const router = useRouter()
  const { themed, theme } = useAppTheme()

  const listQueryOptions = orpc.user.listNotifications.queryOptions({
    input: { limit: PAGE_SIZE },
  })

  const { data, isLoading, isError, isRefetching, refetch } = useQuery(listQueryOptions)

  const { mutate: markAsRead } = useMutation({
    ...orpc.user.markNotificationAsRead.mutationOptions(),
    onSuccess: () => {
      // Atualiza a própria lista e o badge de não lidas (contagem no app).
      queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey })
      queryClient.invalidateQueries({
        queryKey: orpc.user.getUnreadNotificationCount.queryOptions().queryKey,
      })
    },
  })

  const notifications = data?.notifications ?? []

  function handlePress(item: NotificationItem) {
    if (!item.isRead) {
      markAsRead({ notificationId: item.id })
    }
  }

  return (
    <Screen preset="fixed" contentContainerStyle={$flex1} safeAreaEdges={["bottom"]}>
      <Header title="Notificações" leftIcon="back" onLeftPress={() => router.back()} />

      {isLoading ? (
        <View style={themed($centered)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
        </View>
      ) : isError ? (
        <View style={themed($centered)}>
          <MaterialDesignIcons name="alert-circle-outline" size={32} color={theme.colors.textDim} />
          <Text text="Não foi possível carregar suas notificações." style={themed($dimText)} />
          <Pressable
            onPress={() => refetch()}
            accessibilityRole="button"
            accessibilityLabel="Tentar novamente"
            style={({ pressed }) => [themed($retryButton), pressed && { opacity: 0.8 }]}
          >
            <Text weight="bold" text="Tentar novamente" style={themed($retryButtonText)} />
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={themed($listContent)}
          ItemSeparatorComponent={() => <View style={themed($separator)} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.colors.tint}
            />
          }
          ListEmptyComponent={
            <View style={themed($centered)}>
              <MaterialDesignIcons
                name="bell-outline"
                size={32}
                color={theme.colors.textDim}
              />
              <Text text="Você ainda não recebeu notificações." style={themed($dimText)} />
            </View>
          }
          renderItem={({ item }) => (
            <NotificationRow item={item} onPress={() => handlePress(item)} />
          )}
        />
      )}
    </Screen>
  )
}

// ── Item ────────────────────────────────────────────────────────────────────

interface NotificationRowProps {
  item: NotificationItem
  onPress: () => void
}

function NotificationRow(props: NotificationRowProps) {
  const { item, onPress } = props
  const { themed, theme } = useAppTheme()
  const timestamp = item.sentAt ?? item.createdAt

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.isRead ? "Lida" : "Não lida"}: ${item.title}. ${item.body}`}
      android_ripple={{ color: theme.colors.palette.neutral300 }}
      style={({ pressed }) => [
        themed($row),
        !item.isRead && themed($rowUnread),
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={themed($dotColumn)}>
        {item.isRead ? null : <View style={themed($unreadDot)} />}
      </View>

      <View style={$flex1}>
        <Text
          weight={item.isRead ? "normal" : "bold"}
          text={item.title}
          style={themed($title)}
          numberOfLines={2}
        />
        <Text size="xs" text={item.body} style={themed($body)} numberOfLines={3} />
        <Text size="xxs" text={formatRelative(timestamp)} style={themed($time)} />
      </View>
    </Pressable>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return "agora"
  if (diffMin < 60) return `há ${diffMin} min`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `há ${diffHours} h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `há ${diffDays} d`

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $flex1: ViewStyle = { flex: 1 }

const $centered: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: spacing.sm,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xxl,
})

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  flexGrow: 1,
})

const $separator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  height: spacing.sm,
})

const $row: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 14,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.separator,
})

const $rowUnread: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  backgroundColor: colors.palette.neutral200,
})

const $dotColumn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: spacing.sm,
  alignItems: "center",
  paddingTop: spacing.xxs,
})

const $unreadDot: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.tint,
})

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $body: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xxs,
})

const $time: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xs,
})

const $dimText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
})

const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.sm,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 10,
  backgroundColor: colors.palette.neutral200,
})

const $retryButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})
