/**
 * Ícones alternativos por tenant — a única coisa por-tenant que ainda vive
 * no lado NATIVO do app guarda-chuva.
 *
 * O app é um só ("Gasolina", cloud.gasolina.app); identidade visual (nome,
 * logo, cores) vem do server em runtime via tenant.branding. O ícone do
 * launcher, porém, precisa estar EMBUTIDO no binário (expo-dynamic-app-icon:
 * iOS alternate icons / Android activity-alias), então:
 *
 * - Adicionar o ícone de um tenant novo = colocar UM PNG quadrado
 *   (>= 1024px) em tenants/<slug>/icon.png, registrar aqui e gerar um NOVO
 *   build nativo. O mesmo arquivo serve iOS e Android.
 * - Tenant sem ícone registrado usa o ícone padrão Gasolina — o app
 *   funciona normalmente, só não personaliza o launcher.
 *
 * Consumido em dois mundos (por isso só strings puras, sem imports RN):
 * - app.config.ts (Node, build-time): gera o config plugin dos ícones.
 * - bundle JS (runtime): src/lib/appIcon.ts decide se o slug tem ícone.
 *
 * Os caminhos são relativos à raiz de apps/mobile.
 */
export const tenantAlternateIcons: Record<string, string> = {
  martinez: "./tenants/martinez/icon.png",
}

export const EMBEDDED_ICON_SLUGS = Object.keys(tenantAlternateIcons)
