import type { Theme } from "./types"

/**
 * Branding white-label do tenant aplicado ao tema em runtime.
 *
 * Este módulo é deliberadamente leve (só tipos e funções puras): o
 * ThemeProvider o consome lendo o JSON cacheado no MMKV, sem depender do
 * query client. Quem busca do server e mantém o cache fresco é o hook
 * `useTenantBranding` em `lib/branding.ts`.
 */

export const BRANDING_STORAGE_KEY = "tenant.branding.v1"

export type TenantBranding = {
  name: string
  slug: string
  logoUrl: string | null
  colors: {
    primary: string | null
  }
}

/** Parse defensivo do JSON cacheado — cache corrompido cai no tema padrão. */
export function parseTenantBranding(raw: string | undefined): TenantBranding | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as TenantBranding
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

// ── Escala de cor derivada ─────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex)
  if (!match) return null
  let value = match[1]
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("")
  }
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ]
}

/** Interpola a cor com branco (target 255) ou preto (target 0) em RGB. */
function mixWith(rgb: [number, number, number], target: number, ratio: number): string {
  const channel = (c: number) =>
    Math.round(c + (target - c) * ratio)
      .toString(16)
      .padStart(2, "0")
  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`
}

type PrimaryScale = Record<100 | 200 | 300 | 400 | 500 | 600, string>

/**
 * Deriva a escala primary100–600 a partir da cor única do tenant, com as
 * MESMAS proporções da paleta padrão do app (ex.: primary100 do design
 * system é a base com 82% de branco; primary600, com 22% de preto). Assim
 * os componentes que usam qualquer tom da escala (Button usa primary600 no
 * fundo e primary500 no pressed) continuam coerentes.
 */
export function buildPrimaryScale(base: string): PrimaryScale | null {
  const rgb = hexToRgb(base)
  if (!rgb) return null
  return {
    100: mixWith(rgb, 255, 0.82),
    200: mixWith(rgb, 255, 0.62),
    300: mixWith(rgb, 255, 0.4),
    400: mixWith(rgb, 255, 0.2),
    500: base,
    600: mixWith(rgb, 0, 0.22),
  }
}

/**
 * Sobrepõe a cor principal do tenant no tema base (botões e destaques),
 * substituindo a escala primary100–600 inteira pela derivada da cor única.
 * No tema escuro a escala é invertida — exatamente como a paleta padrão
 * (primary600 do dark é o primary100 do light, e assim por diante), então o
 * tom mais claro vira o destaque sobre fundo escuro. Nula mantém o padrão
 * do build. Fundos NÃO são configuráveis: seguem padronizados pelos temas
 * claro/escuro do app.
 */
export function applyTenantBrandingColors(theme: Theme, branding: TenantBranding | null): Theme {
  const primary = branding?.colors?.primary
  const scale = primary ? buildPrimaryScale(primary) : null
  if (!scale) return theme

  const p: PrimaryScale = theme.isDark
    ? {
        100: scale[600],
        200: scale[500],
        300: scale[400],
        400: scale[300],
        500: scale[200],
        600: scale[100],
      }
    : scale

  return {
    ...theme,
    colors: {
      ...theme.colors,
      // tint acompanha a semântica de cada tema: no light é a própria cor
      // da marca; no dark, o tom suavizado que contrasta com fundo escuro.
      tint: p[500],
      palette: {
        ...theme.colors.palette,
        primary100: p[100],
        primary200: p[200],
        primary300: p[300],
        primary400: p[400],
        primary500: p[500],
        primary600: p[600],
      },
    },
  }
}
