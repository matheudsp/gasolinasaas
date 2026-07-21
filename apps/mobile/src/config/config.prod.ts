/**
 * These are configuration settings for the production environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
// O tenant NÃO é mais resolvido aqui: no app guarda-chuva a rede é escolhida
// em runtime e vive em src/lib/activeTenant.ts (MMKV).
export default {
  API_URL: process.env.EXPO_PUBLIC_SERVER_URL,
  FRONTEND_URL: `https://sistema.gasolina.cloud`,
  // Canal de suporte exibido quando o usuário fica travado (ex.: CPF já
  // cadastrado em outra conta, no gate de completar perfil).
  SUPPORT_EMAIL: `suporte@gasolina.cloud`,
}
