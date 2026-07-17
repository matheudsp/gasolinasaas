// Caminho relativo (não alias): o babel-plugin-inline-import resolve o arquivo
// por conta própria e não conhece os aliases do Metro/tsconfig. Os .md são
// FONTE ÚNICA compartilhada com o admin (packages/policies) — como o plugin
// inlina o conteúdo em tempo de build, o Metro nem precisa resolver o arquivo
// fora de apps/mobile. Ver packages/policies/README.md.
import politicaDePrivacidade from "../../../../../packages/policies/politica-de-privacidade.md"
import regulamento from "../../../../../packages/policies/regulamento.md"
import termosDeUso from "../../../../../packages/policies/termos-de-uso.md"

/**
 * Registro das políticas do app. O conteúdo vem dos .md em
 * packages/policies/ (inlinados como string no build — ver babel.config.js):
 * para alterar um texto, basta editar o .md correspondente.
 */
export const POLICIES = {
  "termos-de-uso": {
    title: "Termos de Uso",
    description: "Regras de uso do aplicativo e da sua conta",
    icon: "file-document-outline",
    content: termosDeUso,
  },
  regulamento: {
    title: "Regulamento",
    description: "Como funciona o programa de fidelidade",
    icon: "star-circle-outline",
    content: regulamento,
  },
  "politica-de-privacidade": {
    title: "Política de Privacidade",
    description: "Como tratamos seus dados (LGPD)",
    icon: "shield-lock-outline",
    content: politicaDePrivacidade,
  },
} as const

export type PolicySlug = keyof typeof POLICIES

export function isPolicySlug(value: string): value is PolicySlug {
  return value in POLICIES
}
