/**
 * These are configuration settings for the dev environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */

import { Platform } from "react-native"

const API_HOST = Platform.select({
  android: "10.0.2.2",
  default: "localhost", // iOS simulator e demais
})

export default {
  API_URL: `http://${API_HOST}:15000`,
  // API_URL: `http://localhost:15000`,
  TENANT_SLUG: "grupo-martinez",
  FRONTEND_URL: `http://localhost:15001`,
}
