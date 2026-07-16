import { FC, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  type ImageStyle,
  Pressable,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Button } from "@/components/Button"
import {
  GasolinaCloudMark,
  PoweredByGasolinaCloud,
  useGasolinaCloudColor,
} from "@/components/PoweredByGasolinaCloud"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { resolveImageUrl } from "@/lib/branding"
import { orpc } from "@/lib/orpc"
import { switchTenant } from "@/lib/switchTenant"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/** Normaliza pra busca sem acento/caixa ("São João" casa com "sao joao"). */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/**
 * Primeira tela do app guarda-chuva: escolher a rede de postos. Identidade
 * Gasolina Cloud (roxo local à tela — o tema global segue neutro até o
 * branding da rede escolhida chegar).
 */
export const SelectNetworkScreen: FC = function SelectNetworkScreen() {
  const router = useRouter()
  const { themed, theme } = useAppTheme()
  const brandColor = useGasolinaCloudColor()

  const [search, setSearch] = useState("")
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null)

  const networksQuery = useQuery({
    ...orpc.tenant.listPublic.queryOptions(),
    staleTime: 1000 * 60 * 5,
  })

  const networks = networksQuery.data ?? []
  const filtered = useMemo(() => {
    const term = normalize(search.trim())
    if (!term) return networks
    return networks.filter((n) => normalize(n.name).includes(term))
  }, [networks, search])

  async function handleSelect(slug: string) {
    if (switchingSlug) return
    setSwitchingSlug(slug)
    try {
      await switchTenant(slug)
      // Se já houver sessão, o redirect declarativo do (auth) leva às tabs.
      router.replace("/(auth)/sign-in")
    } finally {
      setSwitchingSlug(null)
    }
  }

  return (
    <Screen preset="fixed" safeAreaEdges={["top", "bottom"]} contentContainerStyle={themed($screen)}>
      {/* ── Marca da plataforma ─────────────────────────────────────────── */}
      <Animated.View entering={FadeInUp.duration(500)} style={themed($header)}>
        <GasolinaCloudMark size={64} />
        <Text preset="heading" text="Gasolina" style={[$centered, { color: brandColor }]} />
        <Text
          text="Escolha a sua rede de postos para começar"
          style={themed($subtitle)}
        />
      </Animated.View>

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar rede pelo nome"
        autoCapitalize="none"
        autoCorrect={false}
        containerStyle={themed($search)}
        LeftAccessory={({ style }) => (
          // O TextField passa aqui um style de CONTAINER (height 40 + center).
          // Precisa envolver o ícone num View: aplicado direto no glifo, o
          // justify/align não centralizam e o ícone encosta no topo.
          <View style={style as ViewStyle}>
            <MaterialDesignIcons name="magnify" size={20} color={theme.colors.textDim} />
          </View>
        )}
      />

      {networksQuery.isLoading ? (
        <View style={$stateBox}>
          <ActivityIndicator color={brandColor} />
        </View>
      ) : networksQuery.isError ? (
        <View style={$stateBox}>
          <Text text="Não foi possível carregar as redes." style={themed($dim)} />
          <Button
            text="Tentar novamente"
            preset="default"
            onPress={() => networksQuery.refetch()}
            style={themed($retryButton)}
          />
        </View>
      ) : filtered.length === 0 ? (
        <View style={$stateBox}>
          <Text
            text={search ? "Nenhuma rede encontrada com esse nome." : "Nenhuma rede disponível ainda."}
            style={themed($dim)}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.slug}
          contentContainerStyle={themed($list)}
          renderItem={({ item, index }) => {
            const logoUri = resolveImageUrl(item.logoUrl)
            const isSwitching = switchingSlug === item.slug
            return (
              // Entrada em cascata: cada rede desliza de baixo com um
              // pequeno atraso incremental.
              <Animated.View entering={FadeInDown.delay(80 + index * 70).springify()}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Entrar na rede ${item.name}`}
                disabled={!!switchingSlug}
                onPress={() => handleSelect(item.slug)}
                style={({ pressed }) => [
                  themed($networkItem),
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={themed($networkLogoBox)}>
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={$networkLogo} resizeMode="contain" />
                  ) : (
                    <MaterialDesignIcons
                      name="gas-station"
                      size={24}
                      color={theme.colors.textDim}
                    />
                  )}
                </View>
                <Text weight="medium" text={item.name} style={$networkName} numberOfLines={1} />
                {isSwitching ? (
                  <ActivityIndicator size="small" color={brandColor} />
                ) : (
                  <MaterialDesignIcons name="chevron-right" size={22} color={brandColor} />
                )}
              </Pressable>
              </Animated.View>
            )
          }}
        />
      )}

      <PoweredByGasolinaCloud style={themed($footer)} />
    </Screen>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $screen: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xl,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  gap: spacing.xs,
  marginBottom: spacing.lg,
})

const $centered: TextStyle = { textAlign: "center" }

const $subtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  textAlign: "center",
  color: colors.textDim,
  fontSize: 14,
})

const $search: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $stateBox: ViewStyle = {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
}

const $retryButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
  minHeight: 44,
})

const $list: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
  paddingBottom: spacing.lg,
})

const $networkItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  padding: spacing.sm,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.separator,
  backgroundColor: colors.palette.neutral100,
})

const $networkLogoBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 48,
  height: 48,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  backgroundColor: colors.palette.neutral200,
})

const $networkLogo: ImageStyle = {
  width: "100%",
  height: "100%",
}

const $networkName: TextStyle = {
  flex: 1,
}

const $footer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.md,
})

const $dim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
