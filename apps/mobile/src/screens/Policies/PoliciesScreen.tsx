import { FC } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"
import { useRouter } from "expo-router"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Header } from "@/components/Header"
import { PoweredByGasolinaCloud } from "@/components/PoweredByGasolinaCloud"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { POLICIES, PolicySlug } from "@/screens/Policies/policies"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const PoliciesScreen: FC = function PoliciesScreen() {
  const router = useRouter()
  const { themed, theme } = useAppTheme()

  return (
    <Screen preset="fixed" safeAreaEdges={["bottom"]} contentContainerStyle={$flex1}>
      <Header title="Termos e políticas" leftIcon="back" onLeftPress={() => router.back()} />

      <View style={themed($list)}>
        {(Object.keys(POLICIES) as PolicySlug[]).map((slug) => {
          const policy = POLICIES[slug]
          return (
            <Pressable
              key={slug}
              accessibilityRole="button"
              accessibilityLabel={policy.title}
              android_ripple={{ color: theme.colors.palette.neutral300 }}
              style={({ pressed }) => [themed($row), pressed && { opacity: 0.85 }]}
              onPress={() => router.push(`/policies/${slug}`)}
            >
              <MaterialDesignIcons
                name={policy.icon}
                size={22}
                color={theme.colors.tint}
              />
              <View style={$rowText}>
                <Text weight="bold" text={policy.title} />
                <Text size="xs" style={themed($dim)} text={policy.description} />
              </View>
              <MaterialDesignIcons
                name="chevron-right"
                size={20}
                color={theme.colors.textDim}
              />
            </Pressable>
          )
        })}
      </View>

      <View style={$footer}>
        <PoweredByGasolinaCloud />
      </View>
    </Screen>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $flex1: ViewStyle = { flex: 1 }

const $list: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  gap: spacing.sm,
})

const $row: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 14,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.separator,
})

const $rowText: ViewStyle = { flex: 1, gap: 2 }

const $footer: ViewStyle = {
  flex: 1,
  justifyContent: "flex-end",
  alignItems: "center",
  paddingBottom: 24,
}

const $dim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
