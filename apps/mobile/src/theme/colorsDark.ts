const palette = {
  neutral900: "#FFFFFF",
  neutral800: "#F5F5F5",
  neutral700: "#D5D6D8",
  neutral600: "#ABADB0",
  neutral500: "#7D7F84",
  neutral400: "#4E5159",
  neutral300: "#2D313A",
  neutral200: "#161A24",
  neutral100: "#000000",

  // Escala neutra do fallback white-label (colors.ts), invertida para o dark.
  primary600: "#D9DADC",
  primary500: "#AFB1B4",
  primary400: "#818389",
  primary300: "#575A61",
  primary200: "#2D313A",
  primary100: "#23262D",

  secondary500: "#DBDEE6",
  secondary400: "#BAC1D0",
  secondary300: "#95A0B7",
  secondary200: "#7483A1",
  secondary100: "#5A6B8F",

  accent500: "#FAEFD9",
  accent400: "#F6DCAE",
  accent300: "#F0CA83",
  accent200: "#EBB655",
  accent100: "#E6A42A",

  angry100: "#F2D6CD",
  angry500: "#C03403",

  overlay20: "rgba(22, 26, 36, 0.2)",
  overlay50: "rgba(22, 26, 36, 0.5)",
}

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",
  text: palette.neutral800,
  textDim: palette.neutral600,
  background: palette.neutral200,
  border: palette.neutral400,
  tint: palette.primary500,
  tintInactive: palette.neutral300,
  separator: palette.neutral300,
  error: palette.angry500,
  errorBackground: palette.angry100,
}
