import { FC } from "react"
import { ScrollView, View, ViewStyle } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import Markdown from "react-native-markdown-display"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { isPolicySlug, POLICIES } from "@/screens/Policies/policies"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const PolicyDetailScreen: FC = function PolicyDetailScreen() {
  const router = useRouter()
  const { themed, theme } = useAppTheme()
  const { slug } = useLocalSearchParams<{ slug: string }>()

  const policy = slug && isPolicySlug(slug) ? POLICIES[slug] : null

  const { colors, typography } = theme

  // Estilos do markdown seguem o tema do app (cores, fonte, dark mode).
  const markdownStyles = {
    body: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 23,
      fontFamily: typography.primary.normal,
    },
    heading1: {
      color: colors.text,
      fontSize: 22,
      lineHeight: 30,
      fontFamily: typography.primary.bold,
      marginBottom: 8,
    },
    heading2: {
      color: colors.text,
      fontSize: 17,
      lineHeight: 24,
      fontFamily: typography.primary.bold,
      marginTop: 16,
      marginBottom: 4,
    },
    em: { fontStyle: "italic" as const, color: colors.textDim },
    strong: { fontFamily: typography.primary.bold },
    bullet_list: { marginVertical: 4 },
    list_item: { marginVertical: 3 },
    hr: { backgroundColor: colors.separator, marginVertical: 12 },
  }

  return (
    <Screen preset="fixed" safeAreaEdges={["bottom"]} contentContainerStyle={$flex1}>
      <Header
        title={policy?.title ?? "Política"}
        leftIcon="back"
        onLeftPress={() => router.back()}
      />

      {policy ? (
        <ScrollView
          contentContainerStyle={themed($content)}
          showsVerticalScrollIndicator={false}
        >
          <Markdown style={markdownStyles}>{policy.content}</Markdown>
        </ScrollView>
      ) : (
        <View style={themed($notFound)}>
          <Text text="Documento não encontrado." style={{ color: colors.textDim }} />
        </View>
      )}
    </Screen>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $flex1: ViewStyle = { flex: 1 }

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.sm,
  paddingBottom: spacing.xxl,
})

const $notFound: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: spacing.lg,
})
