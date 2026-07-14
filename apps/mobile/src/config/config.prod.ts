/**
 * These are configuration settings for the production environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
import { applicationId } from "expo-application"

import { bundleIdToTenantSlug } from "../../tenants/registry"

/**
 * O tenant é resolvido pelo applicationId nativo (bundle id), que é gravado
 * no binário e NÃO muda via OTA — assim um único update JS pode ser
 * compartilhado por todos os tenants sem sobrescrever a identidade de nenhum.
 * O env EXPO_PUBLIC_TENANT_SLUG fica só como fallback de transição (builds
 * antigos e apps fora do registry).
 */
const tenantSlug =
  (applicationId ? bundleIdToTenantSlug[applicationId] : undefined) ??
  process.env.EXPO_PUBLIC_TENANT_SLUG

export default {
  API_URL: process.env.EXPO_PUBLIC_SERVER_URL,
  TENANT_SLUG: tenantSlug,
  FRONTEND_URL: `https://sistema.gasolina.cloud`,
}
