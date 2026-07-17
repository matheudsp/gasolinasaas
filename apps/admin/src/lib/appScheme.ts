/**
 * Scheme de deep link do app a reabrir pelos botões "Abrir o app" das
 * páginas de e-mail (VerifyEmail, OnPasswordReset).
 *
 * O scheme chega pronto na query `?app=`:
 * - verify-email: o server injeta o scheme derivado de `tenant.hasDedicatedApp`
 *   (dedicado → slug do tenant; guarda-chuva → "gasolina"). Ver
 *   apps/server/src/lib/auth.ts:resolveEmailTenant.
 * - reset de senha: o app mobile injeta o PRÓPRIO scheme no redirectTo, que o
 *   /reset-password repassa.
 *
 * Padronização: o scheme de um app dedicado é IGUAL ao slug do tenant. Por
 * isso não há registry — o valor de `?app=` já é o scheme. Sem o param
 * (link antigo), cai no guarda-chuva.
 */
const UMBRELLA_SCHEME = "gasolina";

// Schemes são lowercase, letras/números/+/-/. (RFC 3986) — barra valores
// estranhos vindos da query antes de virar href.
const SCHEME_RE = /^[a-z][a-z0-9+.-]*$/;

/** URL de deep link ("scheme://") a partir do `?app=` da query. */
export function appUrlFromParam(appScheme: string | null): string {
  const scheme =
    appScheme && SCHEME_RE.test(appScheme) ? appScheme : UMBRELLA_SCHEME;
  return `${scheme}://`;
}
