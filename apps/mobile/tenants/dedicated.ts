/**
 * Apps DEDICADOS (premium) — identidade nativa por-tenant aplicada em
 * BUILD-TIME pelo app.config.ts quando `APP_VARIANT=<slug>` está setado.
 *
 * NÃO confundir com o ícone dinâmico removido: aqui o ícone/nome/scheme são
 * FIXOS no binário (estáticos), não trocam em runtime. Um build por rede.
 *
 * Padronização: o `slug` da rede é IGUAL ao scheme de deep link do app
 * dedicado (`extra.tenantSlug` + `scheme` derivam dele). O bundle id é a
 * identidade permanente do app nas lojas — vive na conta do cliente.
 *
 * Consumido só em Node (build-time) pelo app.config.ts — por isso strings
 * puras, sem imports de React Native. Caminhos relativos à raiz de apps/mobile.
 *
 * Como adicionar uma rede dedicada:
 * 1. Coloque o ícone quadrado (≥1024px) em `tenants/<slug>/icon.png`;
 * 2. Coloque o `google-services.json` do app Firebase DESSE bundle id em
 *    `tenants/<slug>/google-services.json` (o guarda-chuva tem o seu próprio);
 * 3. Registre aqui com o bundle id real;
 * 4. Adicione um profile no `eas.json` com `env.APP_VARIANT = "<slug>"`;
 * 5. `APP_VARIANT=<slug> eas build --profile <profile>`.
 */
export type DedicatedApp = {
  /** Slug da rede — IGUAL ao scheme de deep link e ao extra.tenantSlug. */
  slug: string;
  /** Nome exibido no launcher e nas lojas. */
  name: string;
  /** iOS bundleIdentifier + Android package. Identidade permanente. */
  bundleId: string;
  /** PNG quadrado ≥1024px: ícone iOS, Android legacy e adaptive foreground. */
  icon: string;
  /** Cor de fundo do adaptive icon do Android (atrás do foreground). */
  adaptiveBackgroundColor: string;
  /** google-services.json do app Firebase deste bundleId (push Android). */
  googleServicesFile: string;
};

export const DEDICATED_APPS: Record<string, DedicatedApp> = {
  martinez: {
    slug: "martinez",
    name: "Posto Martinez",
    // TODO(produção): trocar pelo bundle id REAL do app do Martinez (vai pra
    // conta de desenvolvedor do cliente nas lojas — é permanente).
    bundleId: "app.gasolina.martinez",
    icon: "./tenants/martinez/icon.png",
    adaptiveBackgroundColor: "#062162",
    // TODO(produção): adicionar o google-services.json do app Firebase do
    // bundle id acima. Sem ele o build Android dedicado falha (de propósito).
    googleServicesFile: "./tenants/martinez/google-services.json",
  },
};
