import { FC, useCallback, useRef, useState } from "react"
import { Alert, StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { CameraView, useCameraPermissions } from "expo-camera"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons"

import { Button } from "@/components/Button"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { orpc } from "@/lib/orpc"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

type Mode = "credit" | "redeem"
// Só o fluxo de CRÉDITO é inline (scan → amount → done). O resgate abre o
// modal de confirmação (com foto do produto) e volta pra "scan".
type Stage = "scan" | "amount" | "done"

interface OperatorScanScreenProps {
  /** false quando renderizada como tab — sem botão de voltar. */
  showBack?: boolean
}

export const OperatorScanScreen: FC<OperatorScanScreenProps> = function OperatorScanScreen({
  showBack = true,
}) {
  const router = useRouter()
  const { themed, theme } = useAppTheme()
  const insets = useSafeAreaInsets()

  const [permission, requestPermission] = useCameraPermissions()
  const [mode, setMode] = useState<Mode>("credit")
  const [stage, setStage] = useState<Stage>("scan")
  const [code, setCode] = useState<string | null>(null)
  const [amount, setAmount] = useState("")

  // Trava contra múltiplos disparos do scanner antes da câmera desmontar.
  const lockRef = useRef(false)

  const creditMutation = useMutation({
    ...orpc.loyalty.credit.mutationOptions(),
    onSuccess: () => setStage("done"),
    onError: (error) => {
      Alert.alert("Não foi possível creditar", error.message)
      resetToScan()
    },
  })

  const reverseMutation = useMutation({
    ...orpc.loyalty.reverseCredit.mutationOptions(),
    onSuccess: (data) => {
      Alert.alert(
        "Crédito estornado",
        `${data.reversedPoints} pontos foram devolvidos${data.customerName ? ` de ${data.customerName}` : ""}. Para creditar o valor certo, peça ao cliente para gerar um novo QR.`,
      )
      resetToScan()
    },
    onError: (error) => {
      Alert.alert("Não foi possível estornar", error.message)
    },
  })

  function handleReverse() {
    const transactionId = creditMutation.data?.transactionId
    if (!transactionId) return
    Alert.alert(
      "Estornar crédito?",
      "Os pontos deste crédito serão devolvidos. O QR escaneado já foi consumido — para creditar o valor certo, o cliente precisa gerar um novo QR.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Estornar",
          style: "destructive",
          onPress: () => reverseMutation.mutate({ transactionId }),
        },
      ],
    )
  }

  function resetToScan() {
    lockRef.current = false
    creditMutation.reset()
    reverseMutation.reset()
    setCode(null)
    setAmount("")
    setStage("scan")
  }

  // Ao voltar do modal de resgate (ou reentrar na tela), libera o scanner.
  useFocusEffect(
    useCallback(() => {
      lockRef.current = false
    }, []),
  )

  function handleScanned(value: string) {
    if (lockRef.current) return
    lockRef.current = true

    if (mode === "credit") {
      setCode(value)
      setStage("amount")
    } else {
      // Resgate: confirma no modal (com foto do produto). Não altera o stage
      // — a tela fica em "scan"; o useFocusEffect solta a trava na volta.
      router.push({
        pathname: "/(app)/(modals)/confirmRedemption",
        params: { code: value },
      })
    }
  }

  const amountCents = parseAmountToCents(amount)
  const amountValid = amountCents !== null && amountCents > 0

  function handleCredit() {
    if (!(code && amountValid)) return
    creditMutation.mutate({ code, amountCents })
  }

  const $bottomSafe = { paddingBottom: insets.bottom + theme.spacing.lg }

  return (
    <Screen preset="fixed" safeAreaEdges={[]} contentContainerStyle={$flex1}>
      <Header
        title="Caixa"
        leftIcon={showBack ? "back" : undefined}
        onLeftPress={showBack ? () => router.back() : undefined}
      />

      {stage === "scan" && (
        <View style={themed($modeRow)}>
          <Button
            text="Creditar"
            preset={mode === "credit" ? "primary" : "default"}
            style={$modeButton}
            onPress={() => setMode("credit")}
          />
          <Button
            text="Resgatar"
            preset={mode === "redeem" ? "primary" : "default"}
            style={$modeButton}
            onPress={() => setMode("redeem")}
          />
        </View>
      )}

      {stage === "scan" ? (
        <ScanStage
          permission={permission}
          requestPermission={requestPermission}
          onScanned={handleScanned}
          hint={mode === "credit" ? "Aponte para o QR do cliente" : "Aponte para o QR de resgate"}
        />
      ) : stage === "amount" ? (
        <View style={[themed($panel), $bottomSafe]}>
          <MaterialDesignIcons
            name="qrcode-scan"
            size={40}
            color={theme.colors.tint}
            style={themed($panelIcon)}
          />
          <Text weight="bold" text="Cliente identificado" style={themed($panelTitle)} />
          <Text
            size="xs"
            style={themed($dim)}
            text="Informe o valor abastecido para creditar os pontos."
          />

          <TextField
            label="Valor do abastecimento (R$)"
            placeholder="0,00"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
            containerStyle={themed($field)}
          />

          <Button
            text={creditMutation.isPending ? "Creditando..." : "Confirmar crédito"}
            preset="filled"
            disabled={!amountValid || creditMutation.isPending}
            onPress={handleCredit}
          />
          <Button text="Cancelar" preset="ghost" onPress={resetToScan} />
        </View>
      ) : (
        <View style={[themed($panel), themed($panelCentered), $bottomSafe]}>
          <View style={themed($doneBadge)}>
            <MaterialDesignIcons name="check" size={40} color={theme.colors.palette.neutral100} />
          </View>
          <Text preset="heading" text={`+${creditMutation.data?.points ?? 0} pontos`} />
          <Text
            style={themed($dim)}
            text={
              creditMutation.data?.customerName
                ? `Creditados para ${creditMutation.data.customerName}.`
                : "Pontos creditados."
            }
          />
          <Button
            text="Escanear outro"
            preset="filled"
            onPress={resetToScan}
            style={themed($doneButton)}
          />
          {creditMutation.data?.transactionId ? (
            <Button
              text={reverseMutation.isPending ? "Estornando..." : "Estornar este crédito"}
              preset="ghost"
              disabled={reverseMutation.isPending}
              onPress={handleReverse}
              style={themed($reverseButton)}
            />
          ) : null}
        </View>
      )}
    </Screen>
  )
}

// ── Estágio da câmera ───────────────────────────────────────────────────────

interface ScanStageProps {
  permission: ReturnType<typeof useCameraPermissions>[0]
  requestPermission: ReturnType<typeof useCameraPermissions>[1]
  onScanned: (value: string) => void
  hint: string
}

function ScanStage(props: ScanStageProps) {
  const { permission, requestPermission, onScanned, hint } = props
  const { themed, theme } = useAppTheme()
  const insets = useSafeAreaInsets()

  if (!permission) {
    return <View style={themed($cameraFill)} />
  }

  if (!permission.granted) {
    return (
      <View style={themed($permission)}>
        <MaterialDesignIcons name="camera-off-outline" size={40} color={theme.colors.textDim} />
        <Text
          style={themed($permissionText)}
          text="Precisamos da câmera para escanear o QR do cliente."
        />
        <Button text="Permitir câmera" preset="filled" onPress={requestPermission} />
      </View>
    )
  }

  return (
    <View style={themed($cameraFill)}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => onScanned(data)}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, themed($reticleCenter)]}>
          <View style={themed($reticle)} />
        </View>

        <View style={[themed($hintWrap), { paddingBottom: insets.bottom + theme.spacing.xl }]}>
          <View style={themed($scanHint)}>
            <Text size="xs" weight="bold" style={themed($scanHintText)} text={hint} />
          </View>
        </View>
      </View>
    </View>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "150,50" ou "150.50" → 15050 centavos. null se inválido. */
function parseAmountToCents(raw: string): number | null {
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".")
  if (!normalized) return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100)
}

// ── Styles ────────────────────────────────────────────────────────────────────

const $flex1: ViewStyle = { flex: 1 }

const $modeButton: ViewStyle = { flex: 1 }

const $modeRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.sm,
})

const $cameraFill: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  overflow: "hidden",
  backgroundColor: "#000",
})

const $reticleCenter: ThemedStyle<ViewStyle> = () => ({
  justifyContent: "center",
  alignItems: "center",
})

const $reticle: ThemedStyle<ViewStyle> = () => ({
  width: 240,
  height: 240,
  maxWidth: "70%",
  borderWidth: 2,
  borderColor: "rgba(255,255,255,0.9)",
  borderRadius: 20,
})

const $hintWrap: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: "center",
})

const $scanHint: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor: "rgba(0,0,0,0.6)",
  borderRadius: 20,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
})

const $scanHintText: ThemedStyle<TextStyle> = () => ({
  color: "white",
})

const $permission: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: spacing.md,
  paddingHorizontal: spacing.xl,
})

const $permissionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
})

const $panel: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.lg,
  gap: spacing.sm,
})

const $panelCentered: ThemedStyle<ViewStyle> = () => ({
  justifyContent: "center",
  alignItems: "center",
})

const $panelIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  alignSelf: "center",
  marginTop: spacing.xl,
})

const $panelTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 18,
  textAlign: "center",
})

const $field: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
  marginBottom: spacing.sm,
})

const $doneBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 72,
  height: 72,
  borderRadius: 36,
  backgroundColor: colors.tint,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: spacing.sm,
})

const $doneButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
  alignSelf: "stretch",
})

const $reverseButton: ThemedStyle<ViewStyle> = () => ({
  alignSelf: "stretch",
})

const $dim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
})
