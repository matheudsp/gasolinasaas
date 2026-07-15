import { FC } from "react"
import { Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"
import { useRouter } from "expo-router"
import Constants from "expo-constants"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import {
  GasolinaCloudMark,
  PoweredByGasolinaCloud,
  useGasolinaCloudColor,
} from "@/components/PoweredByGasolinaCloud"
import { useTenantBranding } from "@/lib/branding"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const AboutScreen: FC = function AboutScreen() {
  const router = useRouter()
  const { themed } = useAppTheme()
  const brandColor = useGasolinaCloudColor()
  const { name: appName, logoSource } = useTenantBranding()
  const version = Constants.expoConfig?.version ?? "1.0.0"

  return (
    <Screen preset="scroll" safeAreaEdges={["bottom"]} contentContainerStyle={themed($content)}>
      <Header title="Sobre" leftIcon="back" onLeftPress={() => router.back()} />

      {/* ── Identidade do app (marca do tenant) ─────────────────────────── */}
      <View style={themed($appSection)}>
        <Image source={logoSource} style={themed($appLogo)} resizeMode="contain" />
        <Text preset="heading" text={appName} style={$centered} />
        <Text size="xs" style={themed($dim)} text={`Versão ${version}`} />
      </View>

      <View style={themed($divider)} />

      {/* ── Powered by Gasolina Cloud ────────────────────────────────────── */}
      <View style={themed($cloudSection)}>
        <GasolinaCloudMark size={56} />
        <Text weight="bold" text="Gasolina Cloud" style={[$cloudName, { color: brandColor }]} />
        <Text
          size="xs"
          style={themed([$dim, $cloudText])}
          text={`O ${appName} é construído e operado na plataforma Gasolina Cloud — a infraestrutura que conecta redes de postos aos seus clientes: preços em tempo real, notificações e programa de fidelidade.`}
        />
      </View>

      <View style={$footer}>
        <PoweredByGasolinaCloud />
      </View>
    </Screen>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexGrow: 1,
  paddingBottom: spacing.xl,
})

const $appSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  gap: spacing.xs,
  paddingTop: spacing.xl,
  paddingHorizontal: spacing.lg,
})

const $appLogo: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  width: 96,
  height: 96,
  marginBottom: spacing.sm,
})

const $centered: TextStyle = { textAlign: "center" }

const $divider: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  height: 1,
  backgroundColor: colors.separator,
  marginVertical: spacing.xl,
  marginHorizontal: spacing.lg,
})

const $cloudSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  gap: spacing.sm,
  paddingHorizontal: spacing.xl,
})

const $cloudName: TextStyle = {
  fontSize: 18,
  textAlign: "center",
}

const $cloudText: TextStyle = {
  textAlign: "center",
  lineHeight: 20,
}

const $footer: ViewStyle = {
  flex: 1,
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 8,
  marginTop: 32,
}

const $dim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
