const palette = {
  neutral100: "#FFFFFF",
  neutral200: "#F5F5F5",
  neutral300: "#D5D6D8",
  neutral400: "#ABADB0",
  neutral500: "#7D7F84",
  neutral600: "#4E5159",
  neutral700: "#2D313A",
  neutral800: "#161A24",
  neutral900: "#000000",

  // Escala primary NEUTRA de propósito: é o fallback white-label quando o
  // tenant não configurou cor no /admin (derivada de #2D313A com as mesmas
  // proporções que theme/tenantBranding.ts usa para a cor do tenant).
  primary100: "#D9DADC",
  primary200: "#AFB1B4",
  primary300: "#818389",
  primary400: "#575A61",
  primary500: "#2D313A",
  primary600: "#23262D",

  secondary100: "#DBDEE6",
  secondary200: "#BAC1D0",
  secondary300: "#95A0B7",
  secondary400: "#7483A1",
  secondary500: "#5A6B8F",

  accent100: "#FAEFD9",
  accent200: "#F6DCAE",
  accent300: "#F0CA83",
  accent400: "#EBB655",
  accent500: "#E6A42A",

  angry100: "#F2D6CD",
  angry500: "#C03403",

  overlay20: "rgba(22, 26, 36, 0.2)",
  overlay50: "rgba(22, 26, 36, 0.5)",
}

export const colors = {
  /**
   * The palette is available to use, but prefer using the name.
   * This is only included for rare, one-off cases. Try to use
   * semantic names as much as possible.
   */
  palette,
  /**
   * A helper for making something see-thru.
   */
  transparent: "rgba(0, 0, 0, 0)",
  /**
   * The default text color in many components.
   */
  text: palette.neutral800,
  /**
   * Secondary text information.
   */
  textDim: palette.neutral600,
  /**
   * The default color of the screen background.
   */
  background: palette.neutral200,
  /**
   * The default border color.
   */
  border: palette.neutral400,
  /**
   * The main tinting color.
   */
  tint: palette.primary500,
  /**
   * The inactive tinting color.
   */
  tintInactive: palette.neutral300,
  /**
   * A subtle color used for lines.
   */
  separator: palette.neutral300,
  /**
   * Error messages.
   */
  error: palette.angry500,
  /**
   * Error Background.
   */
  errorBackground: palette.angry100,
}
