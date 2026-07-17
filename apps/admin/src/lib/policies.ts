// Textos legais compartilhados com o app mobile (fonte única em
// packages/policies) — `?raw` do Vite entrega o .md como string.
// Ver packages/policies/README.md.
import politicaDePrivacidade from "@policies/politica-de-privacidade.md?raw";
import regulamento from "@policies/regulamento.md?raw";
import termosDeUso from "@policies/termos-de-uso.md?raw";

/**
 * Registro das políticas exibidas nas páginas públicas /politicas.
 *
 * Os metadados vivem aqui (e não em packages/policies) porque são por-app:
 * o mobile tem o registro equivalente com ícones do MaterialDesignIcons; aqui
 * usamos lucide-react. Só o conteúdo é compartilhado.
 */
export const POLICIES = {
  "termos-de-uso": {
    title: "Termos de Uso",
    description: "Regras de uso do aplicativo e da sua conta",
    content: termosDeUso,
  },
  regulamento: {
    title: "Regulamento",
    description: "Como funciona o programa de fidelidade",
    content: regulamento,
  },
  "politica-de-privacidade": {
    title: "Política de Privacidade",
    description: "Como tratamos seus dados (LGPD)",
    content: politicaDePrivacidade,
  },
} as const;

export type PolicySlug = keyof typeof POLICIES;

export const POLICY_SLUGS = Object.keys(POLICIES) as PolicySlug[];

export function isPolicySlug(value: string | undefined): value is PolicySlug {
  return !!value && value in POLICIES;
}
