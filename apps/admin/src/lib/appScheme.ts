/**
 * Scheme de deep link do app de cada tenant — usado pelos botões "Abrir o
 * app" das páginas de e-mail (VerifyEmail, OnPasswordReset).
 *
 * O app guarda-chuva ("Gasolina", scheme gasolina://) atende todas as redes,
 * então o mapa fica VAZIO por padrão. Quando um cliente contratar o app
 * premium/dedicado (binário próprio com scheme próprio), registre aqui:
 *
 *   const TENANT_APP_SCHEMES: Record<string, string> = {
 *     martinez: "martinez",
 *   }
 *
 * O slug chega às páginas via query param `?tenant=` — o mobile o injeta no
 * redirectTo do reset de senha e o server no callbackURL da verificação de
 * e-mail. Sem o param (ou sem entrada aqui), cai no guarda-chuva.
 *
 * Espelho conceitual de apps/mobile/tenants/registry.ts (ícones por tenant):
 * é o mesmo tipo de decisão "o que é por-tenant no lado nativo".
 */
const TENANT_APP_SCHEMES: Record<string, string> = {};

const DEFAULT_SCHEME = "gasolina";

/** URL de deep link ("scheme://") do app que atende o tenant. */
export function appUrlForTenant(slug: string | null): string {
  const scheme = (slug && TENANT_APP_SCHEMES[slug]) || DEFAULT_SCHEME;
  return `${scheme}://`;
}
