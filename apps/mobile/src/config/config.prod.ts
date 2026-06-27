/**
 * These are configuration settings for the production environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
export default {
  API_URL: process.env.EXPO_PUBLIC_SERVER_URL,
  TENANT_SLUG: process.env.EXPO_PUBLIC_TENANT_SLUG
}
