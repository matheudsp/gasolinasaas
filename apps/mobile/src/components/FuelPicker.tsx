import { FC } from "react"
import { ActivityIndicator, Pressable, View, ViewStyle, TextStyle } from "react-native"
import { useQuery } from "@tanstack/react-query"

import { Text } from "@/components/Text"
import { orpc } from "@/lib/orpc"

import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"

interface FuelPickerProps {
  selectedSlug: string
  onSelect: (slug: string) => void
}

/**
 * Lista vertical e acessível dos combustíveis vendidos pela rede.
 * Compartilhado entre o modal de filtros da Home e a preferência de
 * combustível da tela de Conta, para manter os dois em sincronia.
 *
 * Usa fuel.listAvailable (server-side, já deduplicado e escopado ao
 * tenant) em vez de derivar a lista a partir de fuel.listPrices no
 * cliente — sem Map manual, sem risco de trazer combustíveis que a
 * rede não vende.
 */
export const FuelPicker: FC<FuelPickerProps> = function FuelPicker({ selectedSlug, onSelect }) {
  const { themed, theme } = useAppTheme()

  const {
    data: fuels = [],
    isLoading,
    isError,
    refetch,
  } = useQuery(orpc.fuel.listAvailable.queryOptions({ input: {} }))

  if (isLoading) {
    return (
      <View style={themed($stateContainer)}>
        <ActivityIndicator color={theme.colors.tint} />
      </View>
    )
  }

  if (isError) {
    return (
      <Pressable onPress={() => refetch()} style={themed($stateContainer)}>
        <Text
          size="sm"
          style={themed($errorText)}
          text="Erro ao carregar combustíveis — toque para tentar de novo"
        />
      </Pressable>
    )
  }

  if (fuels.length === 0) {
    return (
      <View style={themed($stateContainer)}>
        <Text size="sm" style={themed($dimText)} text="Nenhum combustível disponível" />
      </View>
    )
  }

  return (
    <View accessibilityRole="radiogroup" style={themed($listContainer)}>
      {fuels.map((item, index) => {
        const isActive = item.slug === selectedSlug
        const isLast = index === fuels.length - 1

        return (
          <Pressable
            key={item.slug}
            onPress={() => onSelect(item.slug)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.name}
            android_ripple={{ color: theme.colors.palette.neutral300 }}
            style={themed(isLast ? $rowLast : $row)}
          >
            <View style={themed(isActive ? $radioOuterActive : $radioOuter)}>
              {isActive && <View style={themed($radioInner)} />}
            </View>

            <Text
              size="sm"
              weight={isActive ? "bold" : "normal"}
              style={themed(isActive ? $labelActive : $label)}
              text={item.name}
            />
          </Pressable>
        )
      })}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────

const $stateContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.lg,
  alignItems: "center",
  justifyContent: "center",
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  textAlign: "center",
})

const $dimText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $listContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderRadius: 4,
  borderWidth: 1,
  borderColor: colors.separator,
  backgroundColor: colors.palette.neutral100,
  overflow: "hidden",
})

// Touch target de 52pt — acima do mínimo de 44/48pt recomendado em
// ambas as plataformas.
const $row: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  alignItems: "center",
  minHeight: 52,
  paddingHorizontal: spacing.md,
  gap: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
})

const $rowLast: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  minHeight: 52,
  paddingHorizontal: spacing.md,
  gap: spacing.sm,
})

const $radioOuter: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 22,
  height: 22,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: colors.border,
  alignItems: "center",
  justifyContent: "center",
})

const $radioOuterActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 22,
  height: 22,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: colors.tint,
  alignItems: "center",
  justifyContent: "center",
})

const $radioInner: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: colors.tint,
})

const $label: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  flexShrink: 1,
})

const $labelActive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  flexShrink: 1,
})
