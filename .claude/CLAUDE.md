# Gasolina — Project Context

SaaS multi-tenant para postos e redes de postos. **Um único app mobile "guarda-chuva"
("Gasolina", bundle `cloud.gasolina.app`) serve todas as redes**: o usuário escolhe a
rede (tenant) em runtime e o app inteiro rebrandeia — nome, logo e cores do tema (o
ícone nativo do launcher é fixo "Gasolina Cloud"; troca de ícone em runtime foi
removida por não ser boa UX). Cada rede tem seus postos, preços de combustível, programa
de fidelidade e envia push para os próprios clientes. **Uma única infraestrutura de
servidor serve todos os tenants** — o isolamento é feito em software, não por deploy
separado. (O modelo antigo de um build white-label por tenant foi removido; binários
`com.mdsp.martinez` antigos auto-selecionam a rede "martinez" via `applicationId`.)

### App dedicado (premium) — flag `tenant.hasDedicatedApp`

`tenant.hasDedicatedApp` (bool, migration 0015; togglado por platform admin no
`/admin`) marca a rede que tem **binário próprio** (fora do guarda-chuva). Ele
governa branding de e-mail e scheme de deep link, via
`lib/auth.ts:resolveEmailTenant`:
- **dedicado**: e-mails assinados com o NOME do tenant; scheme = **slug** do
  tenant (padronização: scheme == slug, lowercase);
- **guarda-chuva** (ou request sem tenant): e-mails "Gasolina Cloud"; scheme
  `gasolina`.

**Mecanismo de build dedicado (mobile):** `APP_VARIANT=<slug>` (env de um
profile EAS) monta a identidade nativa da rede em BUILD-TIME — ícone, nome,
bundle id, scheme (== slug) e `extra.tenantSlug` fixo. Peças:
- `tenants/dedicated.ts` — registry por-tenant (nome, bundleId, icon,
  adaptiveBackgroundColor, googleServicesFile), consumido só no `app.config.ts`
  (Node/build-time). Ícone fixo em `tenants/<slug>/icon.png` (estático, NÃO é o
  ícone dinâmico removido).
- `app.config.ts` lê `APP_VARIANT`: sem env = guarda-chuva "Gasolina Cloud"
  (scheme `gasolina`, bundle `cloud.gasolina.app`); com env = a rede dedicada.
  Falha cedo se o `google-services.json` da rede faltar. **Todos os dedicados
  COMPARTILHAM o mesmo projeto EAS** (`EAS_PROJECT_ID` constante) — varia só a
  identidade nativa (bundle id, ícone, scheme). Com `runtimeVersion` em
  `appVersion`, TODOS os variantes têm o mesmo runtime version (a `version` do
  app.json), então um `eas update` no canal atinge todos — o que é CORRETO: o
  bundle JS é idêntico (a identidade dedicada é nativa, não JS; o `tenantSlug`
  vem de `extra`, fixado no build, não do bundle).
- **Runtime, fonte única:** `lib/activeTenant.ts` lê `extra.tenantSlug` e faz o
  seed da rede ativa (`IS_DEDICATED_APP`/`DEDICATED_TENANT_SLUG` exportados) — o
  dedicado pula seletor e onboarding no cold start. O seed por `applicationId`
  (`com.mdsp.martinez`) virou fallback legado morto; **não copie pra novas
  redes** — use `extra.tenantSlug`.
- `eas.json`: profiles `preview:<slug>` / `production:<slug>` com
  `env.APP_VARIANT`.

**Pendências manuais por rede dedicada (o build só compila com elas):** bundle
id REAL (hoje placeholder `app.gasolina.martinez`) + `google-services.json` do
app Firebase daquele bundle id em `tenants/<slug>/`. As lojas exigem que o app
saia na conta de desenvolvedor do cliente (diretriz 4.2.6 da Apple).

## Monorepo

pnpm workspaces + Turborepo. Três apps e **um único compartilhado**:
`packages/policies` — os `.md` de Termos/Regulamento/Privacidade, fonte única do
mobile (telas de políticas) e do admin (páginas públicas `/politicas`). Só o
CONTEÚDO é compartilhado; o registro de metadados (título/ícone) fica em cada
app, porque os ícones são de bibliotecas diferentes. Ver
`packages/policies/README.md`. Código TS compartilhado continua não existindo
(ex.: validação de CPF é duplicada) — o Metro não está configurado com
`watchFolders` pra resolver módulos fora de `apps/mobile`.

| App | Stack | Dev |
|---|---|---|
| `apps/server` | Hono + oRPC + Drizzle + Better Auth em Cloudflare Workers | `pnpm dev:server` (porta 15000) |
| `apps/admin` | React + Vite + Radix/shadcn + TanStack Query, deploy em CF Pages | `vite dev` (porta 15001) |
| `apps/mobile` | Expo + expo-router | `expo start --dev-client` |

Banco: **Neon Postgres** (serverless driver). Migrations via `drizzle-kit`
(`pnpm db:generate` → `pnpm db:migrate`; `db:push` para iterar rápido em dev).

## Multi-tenancy — o conceito central

Um tenant é uma rede de postos (`tenant`). Usuários se ligam a tenants via
`tenant_membership`, com **dois papéis**: `owner` (dono da rede) e `operator`
(frentista/caixa — só credita/valida fidelidade, sem acesso administrativo).
Toda tabela de negócio (`station`, `push_token`, `push_notification`,
`subscription`, `reward`, `loyalty_transaction`, ...) carrega `tenant_id` com
`onDelete: "cascade"`.

**Crucial:** os clientes finais do app mobile (motoristas) **NÃO** são membros do
tenant — não têm `tenant_membership`. São só `user` autenticados (conta global da
plataforma), e o app manda o `x-tenant-slug` da rede ativa escolhida em runtime. Por
isso endpoints voltados ao cliente usam `protectedProcedure` + checagem manual de
`context.tenant`, **nunca** `tenantProcedure`. Dados por-usuário que são por-rede
(notificações, contador de não lidas) DEVEM filtrar pelo tenant ativo — a mesma conta
transita entre redes.

Há **dois eixos de autorização independentes** — não confunda:
- `user.role` (`admin` | `user`), do plugin admin do Better Auth: operador da
  plataforma Gasolina. Governa o `adminRouter` (CRUD de tenants, planos, usuários).
- `tenant_membership.role` (`owner` | `operator`): governa os dados daquele tenant.

### Como o tenant é resolvido

`lib/tenant.ts:resolveTenantContext` tenta, **nesta ordem de precedência**:
1. header `x-tenant-id`
2. header `x-tenant-slug`
3. subdomínio (`rede.gasolina.cloud` → `rede`; ignora `localhost` e `www`)
4. primeiro segmento do path (`/rede/rpc/...` → `rede`)

Quem usa o quê hoje: o **admin** manda `x-tenant-id` (tenant ativo selecionado na
UI, `apps/admin/src/lib/orpc.ts`); o **mobile** manda `x-tenant-slug` da rede ativa,
lida **POR REQUEST** do MMKV (`src/lib/activeTenant.ts`, chave `tenant.active.slug`)
— nos dois clients (`lib/orpc.ts` via `headers()` e `lib/auth.ts` via
`fetchOptions.onRequest`). Sem rede escolhida o header simplesmente não vai (o
`tenant.listPublic` da tela de seleção depende disso). Nunca fixe o slug em
constante de módulo — trocar de rede muda o header da requisição seguinte.

Resolvido o tenant, `lib/context.ts:createContext` injeta `{ db, session, tenant,
tenantMembership }` no contexto oRPC. **Se o tenant não existe ou o usuário não é
membro, os campos simplesmente vêm `undefined`** — a rejeição acontece no
middleware da procedure, não aqui.

### Prefixo de tenant na URL

`utils/tenant.ts:stripTenantPrefixFromRequest` remove o primeiro segmento quando a
URL é `/{tenant}/api/*` ou `/{tenant}/rpc/*`, para que os handlers oRPC (montados em
`/api` e `/rpc`) continuem casando. Requests já em `/api/*` ou `/rpc/*` passam intactos.

## Autorização — sempre via procedure, nunca à mão

`lib/orpc.ts` define a escada. **Escolher a procedure certa É o controle de acesso**;
não refaça a checagem dentro do handler.

- `publicProcedure` — sem sessão.
- `protectedProcedure` — exige sessão. Para endpoints de **cliente final** que dependem
  do tenant, use este + `if (!context.tenant) throw` (o cliente não é membro).
- `tenantProcedure` — sessão + tenant + membership qualquer. Definido mas **sem uso**.
- `tenantOperatorProcedure` — sessão + membership `owner` OU `operator`. Injeta
  `context.tenant` não-nulo. Padrão do **fluxo de caixa** (creditar pontos, validar resgate).
- `tenantOwnerProcedure` — sessão + membership `owner`. Injeta `context.tenant` não-nulo.
  **Padrão para escrever/administrar dados do tenant.**
- `adminProcedure` — sessão + `user.role === "admin"` (operador da plataforma).

`tenantOwnerProcedure` e `tenantOperatorProcedure` **também autorizam o admin da
plataforma** (via `isPlatformAdmin`) — ele opera qualquer tenant sem membership.
Nunca filtre por `tenantId` vindo do input do cliente — use `context.tenant.id`.

## Estrutura do server

```
apps/server/src/
├── index.ts          # composição do app Hono (~95 linhas — mantenha enxuto)
├── handlers/         # api.ts (OpenAPIHandler) · rpc.ts (RPCHandler)
├── middlewares/      # cors.ts · error.ts · session.ts
├── lib/              # auth · context · orpc · tenant · email · execution-context · hono-env · loyalty-points · push · cpf
├── routers/          # station · fuel · tenant · subscription · admin · push · users · loyalty
├── routes/           # reward-image.ts · tenant-logo.ts — rotas Hono cruas (upload/serve no R2)
├── db/schema/        # auth · tenant · station · push · subscription · loyalty
└── utils/tenant.ts   # strip do prefixo de tenant da URL
```

**Todos os routers estão registrados** em `routers/index.ts` (`station`, `fuel`,
`tenant`, `admin`, `subscription`, `push`, `user`, `loyalty`).

Ordem em `index.ts`: error handler → logger → session (`/api/*`, `/rpc/*`) → Better
Auth (`/api/auth/*`) → CORS → **rotas de imagem R2 (`app.route`, antes do catch-all
pra ter precedência)** → handlers RPC/API → rotas soltas (`/`, `/session`). O app é
tipado com `AppEnv` (`lib/hono-env.ts`): bindings do Worker (inclui
`REWARD_IMAGES: R2Bucket`) + variáveis de sessão.

O handler catch-all tenta **RPC primeiro, depois OpenAPI**; se nenhum casar, cai no
`next()`. Ambos compartilham o mesmo `appRouter` — um router, dois transportes.

### Economia de requests (plano da Cloudflare é limitado por requests/dia)

- **Batching de RPCs:** `BatchHandlerPlugin` no `RPCHandler` + `BatchLinkPlugin` nos
  clients (mobile e admin) — chamadas no mesmo tick viram UM `POST /rpc/.../__batch__`
  (207 Multi-Status, erros individualizados por chamada). **O CORS precisa liberar o
  header `x-orpc-batch`** (`middlewares/cors.ts` tem `allowHeaders` como LISTA FIXA —
  header novo de client web tem que ser adicionado lá, senão o preflight passa e o
  browser mata o POST com `ERR_FAILED`).
- **Cache persistido no mobile:** `PersistQueryClientProvider` + persister MMKV
  (`lib/queryPersistence.ts`), `gcTime` 24h, buster = `versão:slugDaRedeAtiva` (trocar
  de rede invalida o cache no restore). `staleTime` longos nas queries estáveis
  (branding/myRole/fuel.listAvailable = 1h).

## Cloudflare Workers — restrições que já mordem

- `nodejs_compat` está ligado, mas nem tudo funciona. E-mail usa **`aws4fetch`
  contra a API do SES**, não `@aws-sdk/client-ses` (depende de `node:fs`, quebra no Worker).
- Trabalho assíncrono pós-resposta (e-mail, push transacional) precisa de `waitUntil`.
  O `ExecutionContext` é propagado por `AsyncLocalStorage` em
  `lib/execution-context.ts` para **TODAS as rotas** (middleware global no
  `index.ts`), e os consumidores usam `executionCtxStorage.getStore()?.waitUntil(...)`
  — é assim no auth (e-mails) e nos handlers oRPC de fidelidade (push). Sem
  `waitUntil` o Worker mata a promise junto com a resposta.
- **Rate limiting**: binding `CPF_RATE_LIMIT` (`ratelimits` no `wrangler.jsonc`,
  10 req/60s por chave) protege `user.checkCpf` (chave = IP) e `user.setCpf`
  (chave = userId) contra enumeração de CPFs. O binding chega ao handler via
  `context.cpfRateLimit` + `context.clientIp` (`lib/context.ts`); é `undefined`
  fora do Worker. **Depois de mexer no `wrangler.jsonc`, rode `npx wrangler types`
  SEM `--include-runtime=false`** — sem os runtime types quebra `cloudflare:workers`
  e `R2Bucket` no typecheck.
- Secrets vão em `wrangler secret put` / `pnpm secrets:setup`. **Nunca em `vars` do
  `wrangler.jsonc`** — ficam visíveis no dashboard.

## Push notifications — acoplamento a respeitar

`push_notification` é o **agregado da campanha** (totais de sucesso/falha).
`push_notification_recipient` é o **detalhe por destinatário** (`deliveredAt`, `readAt`).

Quem dispara os pushes precisa inserir uma linha em `push_notification_recipient` por
usuário-alvo no momento do envio. Sem isso, a listagem de notificações do usuário
retorna vazia — o agregado sozinho não sabe quem recebeu o quê.

`push_token` é único por `(tenantId, token)`, não por `token` global. No modelo
guarda-chuva, **trocar de rede desregistra o token da rede anterior**
(`push.unregisterToken`, chamado pelo `switchTenant` do mobile) — o usuário recebe
push só da rede ativa. `user.listNotifications` e `getUnreadNotificationCount`
**filtram pelo tenant ativo** (join com `push_notification.tenant_id`) — sem isso a
mesma conta veria notificações misturadas de todas as redes.

**Dois tipos de notificação** (`push_notification.kind`): `campaign` (disparo manual
do painel) e `transactional` (automática por evento — crédito de pontos e resgate
concluído, via `lib/push.ts:sendTransactionalPush`, chamada em `loyalty.credit` e
`loyalty.confirmRedemption` **via waitUntil, fora do caminho crítico e só após o
commit**). O histórico do painel (`push.listNotifications`) filtra `kind='campaign'`
pra não ser inundado; a caixa in-app do usuário mostra tudo — o registro
transacional é gravado MESMO sem token (aparece in-app pra quem desativou push).

**Deep link**: o `data` do push é união discriminada (`promotion` → posto,
`points` → tela de pontos) e o server **sempre injeta `tenantSlug`** — o mobile
descarta notificação de rede não-ativa (`lib/notificationRouting.ts`, um resolver
pras duas origens: tap no push e lista in-app). O listener vive em
`hooks/useNotificationDeepLink.ts`, montado no ROOT layout sem key/gate (sobrevive
à troca de rede; cold start via `getLastNotificationResponseAsync`; destino fica
pendente até sessão + rede resolverem).

## Programa de fidelidade (maior subsistema novo)

Fidelidade white-label por tenant. Schema em `db/schema/loyalty.ts`, lógica em
`routers/loyalty.ts` (`orpc.loyalty.*`). Tabelas:
- `loyalty_transaction` — **ledger**; saldo do cliente = `SUM(points)`. Crédito
  positivo, resgate negativo. **Nunca** há coluna de saldo mutável.
- **Expiração de pontos (validade por crédito, FIFO):** `tenant.pointsValidityDays`
  (null = nunca expiram) estampa `expiresAt` no crédito. Resgates consomem os lotes
  válidos mais antigos. Créditos vencidos viram transação negativa
  (`expiredTransactionId` → crédito de origem, unique = idempotente) via **expire
  pass** em `lib/loyalty-points.ts`, que roda em DOIS lugares: preguiçoso
  (`myBalance`, `requestRedemption`, `confirmRedemption`, `reverseCredit`) e
  **em lote via Cron Trigger** (`jobs/expire-points.ts`, 1x/dia às 03:00 UTC, até
  20 clientes/execução — limite de subrequests; `triggers.crons` no `wrangler.jsonc`,
  handler `scheduled` no `index.ts`). O settle materializa expiração pra TODO
  lote vencido, **inclusive remaining 0** (linha de 0 pontos = marcador que faz
  a query de candidatos do cron convergir; o extrato filtra `points != 0`).
  Isso preserva o invariante `SUM(points)`.
  Tipo da linha no extrato: crédito = `amountCents > 0`, resgate = `redemptionId`,
  expiração = `expiredTransactionId`, **estorno = `reversedTransactionId`**.
- **Estorno de crédito (`reverseCredit`):** débito manual ligado ao crédito de origem
  (`reversedTransactionId`, unique = uso único, mesmo truque da expiração), SEMPRE no
  valor do `remaining` do lote — **nunca `-points`** (lote já resgatado/expirado não
  volta; saldo jamais fica negativo; quebrar essa regra faz a soma dos lotes divergir
  de `SUM(points)` silenciosamente). `amountCents` do estorno é o NEGATIVO do
  original — neta automaticamente `auditTotals`, `topOperators` e "Meus gastos".
  Permissão: frentista estorna só os próprios créditos em até 30min; owner/admin
  sempre. `settleExpiredPoints` devolve `lots` pós-settlement pra isso. UI: botão na
  tela de sucesso do caixa (mobile) e no drill-down de transações da auditoria.
- **Teto por crédito:** `tenant.maxCreditAmountCents` (null = sem teto), validado no
  `credit` ANTES de consumir o QR. Configurável no `/fidelidade` → Config.
- **`credit` é transacional:** consumo do scan code + insert do crédito na mesma
  `db.transaction` — falha no meio não queima o QR sem creditar.
- **`mySpending`** (protected + tenant): gasto do cliente agregado por mês a partir
  de `amountCents` (estornos netam valor e contagem). Não roda expire pass.
- **`customerByCpf`** (owner): busca cliente por CPF **só entre quem tem transação
  no tenant** — NOT_FOUND para CPF sem vínculo com a rede (owner não sonda a base
  global). `topCustomers` também retorna `cpf`.
- `loyalty_scan_code` — QR de identidade do cliente (uso único, ~90s), um por cliente.
- `reward` / `reward_redemption` — catálogo e pedidos de resgate.
- `tenant.pointsPerReal` — multiplicador (`numeric`, aceita frações).

**Anti-fraude — a âncora de confiança é o operador (frentista), não a nota fiscal:**
- **Crédito (caixa):** cliente mostra QR (`issueScanCode`); operador escaneia e digita
  o valor abastecido (`credit`, `tenantOperatorProcedure`). O valor vem SEMPRE do
  operador autenticado, nunca do app do cliente; o código é consumido atomicamente.
  Transação de crédito tem `amountCents` preenchido.
- **Resgate (débito na entrega):** cliente pede (`requestRedemption`) e recebe um
  código — NÃO debita. Operador escaneia → abre o **modal
  `(app)/(modals)/confirmRedemption`** (`ConfirmRedemptionScreen`) que chama
  `peekRedemption` (recompensa/custo/**imageUrl** + cliente, sem consumir) e mostra
  a FOTO do produto pro operador conferir o estoque físico → `confirmRedemption`
  (transação: consome o código, recheca saldo, baixa estoque, insere transação
  negativa com `redemptionId`). Cancelar não consome (resgate segue pendente).
- **Distinguir tipo de transação:** crédito = `amountCents IS NOT NULL`; resgate =
  `redemptionId IS NOT NULL`. Rankings/auditoria filtram por isso — ex: "operadores
  que mais creditaram" só conta `amountCents IS NOT NULL` (senão os resgates que o
  operador confirma entram como débito e negativam a soma).

`loyalty.myRole` (protected) retorna `owner|operator|null` — o mobile usa pra decidir
se mostra a tab/tela de operador. Cliente comum → `null`.

`auditTotals` devolve, além de `totalPoints`/`credits`/`customers`:
`outstandingPoints` (SUM(points) sem filtro = passivo da rede — o cron do expire
pass regulariza clientes dormentes 1x/dia), `redeemedPoints` e
`expiredPoints`. `credits` conta só `amount_cents > 0` (estorno não é +1 crédito).

**Verificação de e-mail é OBRIGATÓRIA no login** (`requireEmailVerification` no
better-auth): cadastro envia o link (sendOnSignUp herda do flag) e **não cria
sessão** — o SignUp mostra "confirme seu e-mail" e manda pro sign-in; tentativa
de login não-verificada responde 403 e **reenvia o link** (`sendOnSignIn`), e o
SignInScreen traduz o 403 pra mensagem amigável. Google OAuth já chega
verificado.

**CPF do cliente:** `user.cpf` (nullable + unique — convive com base legada e
Google OAuth; unique do Postgres ignora NULLs). Obrigatoriedade em DOIS lugares:
SignUp multi-step (valida dígitos + `checkCpf` antes de avançar o step) e **gate
pós-login** (`(app)/_layout` redireciona pra `/complete-profile`, que vive em
`(onboarding)` — grupo sem redirect, não entra em loop; a tela chama `setCpf` e
`refetch()` da sessão antes de voltar). Validação espelhada em `lib/cpf.ts`
(server) e `utils/cpf.ts` (mobile) — sem packages/ compartilhado, manter em
sincronia. No Better Auth: `user.additionalFields.cpf` com `required: false`
(Google não manda CPF) e **sem generic explícito no `betterAuth()`** (fixar
`BetterAuthOptions` mata a inferência do campo); no mobile,
`inferAdditionalFields` com schema EXPLÍCITO (importar `typeof auth` puxaria
`cloudflare:workers` pro bundle).

**Fotos de recompensa (R2):** `reward.imageUrl` guarda **caminho relativo**
(`/images/rewards/{tenantId}/{rewardId}?v=...`), nunca URL absoluta — cada cliente
prefixa com a própria base (`Config.API_URL` no mobile, `VITE_API_URL` no admin; URLs
externas coladas ficam intactas). Upload/serve em `routes/reward-image.ts` + binding
`REWARD_IMAGES`. **Não** derive a URL de `c.req.url` — no `wrangler dev` o host vem
como o domínio de produção (por causa do `custom_domain` em `routes`).

## Branding white-label em runtime

A identidade visual do tenant vive no banco e chega ao app em runtime — nada de
marca no bundle JS (bundle é compartilhado via OTA entre todas as redes):

- **Server:** `tenant.branding` (público — as telas de auth precisam antes do login)
  retorna `{ name, slug, logoUrl, colors: { primary } }` do tenant do header.
  `tenant.listPublic` (público, sem header) lista redes ativas pra tela de seleção.
  `tenant.updateSettings` aceita `brandPrimaryColor` (hex validado, `null` limpa).
  Logo: upload/serve em `routes/tenant-logo.ts` (mesmo bucket `REWARD_IMAGES`,
  prefixo `tenant-logos/`), caminho relativo com `?v=` pra cache-busting.
- **Só logo + cor principal são configuráveis.** Fundos são padronizados pelos temas
  claro/escuro do app (decisão explícita); a coluna `brand_background_color` foi
  REMOVIDA (migration 0011). Cores nativas (splash, ícone de notificação) são fixas
  e neutras no `app.config.ts` — nada por-tenant no lado nativo além dos ícones
  alternativos do launcher.
- **Mobile:** `src/lib/branding.ts` (`useTenantBranding`) busca e cacheia no MMKV
  (`tenant.branding.v1`) — abre offline com a última identidade; fallback pros assets
  do binário. O **ThemeProvider** lê o MESMO cache via `useMMKVString` (não via query
  client — testável sem provider) e aplica `theme/tenantBranding.ts`:
  `buildPrimaryScale` deriva a escala `primary100–600` INTEIRA da cor única, com as
  mesmas proporções da paleta padrão (100 = base+82% branco … 600 = base+22% preto),
  invertida no dark. A paleta primary padrão é NEUTRA (derivada de `#2D313A`) — o
  azul-marinho `#22396D` virou cor configurada do Martinez.
- **Admin:** página `/marca` (`pages/AppBranding.tsx`) — upload de logo + cor
  principal, para owner ou admin da plataforma.

## Frontends (admin e mobile)

**Admin** (`apps/admin`, React + Vite + shadcn):
- `AuthContext` expõe `isAdmin`, `activeTenant`, `membership`. Owner tem tenant fixo;
  admin da plataforma escolhe a rede num seletor (localStorage) — o `orpc.ts` manda
  `x-tenant-id` no header.
- Rotas em `App.tsx` (react-router): owner/admin sob `TenantProtectedRoute` + `Layout`;
  admin-only sob `AdminProtectedRoute`. `Layout` renderiza o `PaymentReminderBanner`.
  Públicas (sem sessão): `/politicas(/:slug)` — URL exigida pelas lojas —,
  `/verify-email` e o fluxo de reset de senha.
- **Botões "Abrir o app"** (`VerifyEmail`, `OnPasswordReset`): o scheme chega
  pronto na query `?app=` e `lib/appScheme.ts:appUrlFromParam` só valida (regex
  RFC 3986; valor inválido → `gasolina://`). Sem registry — por padronização
  **scheme == slug do tenant**. Quem decide o scheme:
  - verify-email: o **server** injeta no callbackURL o scheme derivado de
    `tenant.hasDedicatedApp` (`resolveEmailTenant`);
  - reset de senha: o **mobile** injeta o PRÓPRIO scheme
    (`Constants.expoConfig.scheme`) no `redirectTo`; `/reset-password` repassa.
- Fidelidade numa página só (`/fidelidade`) com abas Auditoria/Recompensas/Config
  (`pages/LoyaltyAudit|RewardsManager|LoyaltyConfig`). A Auditoria tem busca de
  cliente por CPF, cards de passivo/taxa de resgate e estorno no drill-down de
  operador; a Config tem o teto por crédito. Gestão de donos na aba "Donos"
  do `/admin` (`pages/admin/OwnersTab`). Branding do app em `/marca` (`AppBranding`).
  O form de push (`PushNotifications`) tem seletor de destino (genérica/promoção
  com posto/pontos) que monta o `data` do deep link.

**Mobile** (`apps/mobile`, Expo + expo-router) — **app guarda-chuva único**:
- **Identidade nativa única** no `app.config.ts`: nome "Gasolina", scheme `gasolina`,
  bundle/package `cloud.gasolina.app`, ícone fixo em `assets/app-icon/`,
  `google-services.json` único na raiz do app. Sem `TENANT` env, sem perfis EAS por
  tenant. **O ícone do launcher NÃO muda por rede** — trocar o ícone nativo em
  runtime (o antigo `@bsky.app/expo-dynamic-app-icon` + `tenants/registry.ts` +
  `lib/appIcon.ts`) foi REMOVIDO: no Android o módulo matava o processo e os atalhos
  fixados morriam (péssima UX). Todas as redes usam o ícone "Gasolina Cloud".
- **Rede ativa em runtime:** `src/lib/activeTenant.ts` (MMKV `tenant.active.slug`,
  getter síncrono pros headers + hook reativo pros gates). Migração one-shot no
  import: binário `com.mdsp.martinez` → seed "martinez"; em dev,
  `EXPO_PUBLIC_TENANT_SLUG` no `.env` pré-seleciona a rede (e PULA o seletor —
  remova do `.env` pra ver o fluxo frio).
- **Fluxo de rotas:** sem rede → onboarding `/welcome` (uma vez, flag MMKV em
  `lib/onboarding.ts`; pager animado dirigido por estado) → `/select-network`
  (`SelectNetworkScreen`: `tenant.listPublic`, busca, identidade Gasolina Cloud) →
  sign-in já com a marca da rede (botão "‹ Trocar de rede" no topo). Gates
  declarativos por `<Redirect>` nos layouts de `(auth)` e `(app)`; `(onboarding)` não
  tem redirect (acessível sempre). `policies/` segue público.
- **Troca de rede:** `src/lib/switchTenant.ts` — ordem importa: unregister do push
  (header ainda da rede antiga) → persiste slug novo → limpa `tenant.branding.v1` →
  `queryClient.clear()` + cache persistido → `clearPreferredFuel()` → re-registro de
  push via `key={activeSlug}` no root layout. Não fecha mais o app (o ícone é fixo).
- **EAS Update:** `runtimeVersion: { policy: "appVersion" }` (= a `version` do
  app.json) + channels `production`/`preview`. **NÃO use policy `fingerprint`**:
  ela recalcula um hash dos módulos nativos em cada ambiente e DIVERGIA entre o
  Mac e o EAS por causa do hoisting não-determinístico do pnpm (bateu 4x). Com
  appVersion os dois leem a mesma string. Suba a `version` a cada release de
  LOJA (muda nativo); OTA fica compatível entre builds da MESMA version.
- Tabs em `src/app/(app)/(tabs)/`: Início · Meus pontos · Operador (só owner/operator,
  via `hidden` + `loyalty.myRole`) · Minha Conta. Telas empilhadas em `(app)/` (station,
  rewards, notifications, about, spending). Gate de CPF: `(onboarding)/complete-profile`.
  SignUp é multi-step (dados pessoais com CPF mascarado → contato → senha).
- Telas em `src/screens/`; arquivos de rota são finos (`export default () => <Screen/>`).
- Marca da plataforma: `components/PoweredByGasolinaCloud` (nuvem-gota SVG, roxo #7C3AED).
  Políticas (Termos/Regulamento/Privacidade) vêm dos `.md` compartilhados em
  `packages/policies/` (registro de metadados em `screens/Policies/policies.ts`).

## Build & propagação de tipos — pega-ratões que já morderam

- **Server é projeto TS `composite`** (emite em `dist/`). Mobile/admin importam
  `AppRouterClient` do source do server, mas o project reference resolve para os `.d.ts`
  em `dist/`. **Depois de mudar um router, rode `tsc -b --force` no server** — senão o
  front vê tipos antigos (retornos viram `{}`). Em dev, reinicie o `wrangler dev` pro
  endpoint responder.
- **`seed.ts` tem erros de tipo pré-existentes** → `tsc -b` sai com exit 1, mas ainda
  emite os `.d.ts`. Ignore-os; filtre o typecheck pelos arquivos que você mexeu.
- **Tipos de rota do expo-router** (`.expo/types/`) são gitignored e regenerados quando
  o Metro roda. Ao criar/mover rota, `npx expo start` (ou `-c`) rebuilda os tipos — sem
  isso o typecheck acusa a rota nova como inexistente (falso-positivo que se cura sozinho).
- **Imports de `.md` no mobile são RELATIVOS** (hoje
  `../../../../../packages/policies/...`), não alias — o `babel-plugin-inline-import`
  faz resolução própria e não conhece os aliases do Metro/tsconfig. É justamente
  por inlinar em tempo de build que funciona com os `.md` FORA de `apps/mobile`:
  o Metro nem resolve o arquivo. Em compensação ele não observa mudanças lá —
  editar um `.md` às vezes exige `expo start -c`. No admin os mesmos arquivos
  entram via `?raw` do Vite pelo alias `@policies`.
- **Deps nativas** (expo-camera, react-native-svg/qrcode) exigem **rebuild do dev client**
  — `expo start` não basta. `ios/`/`android/` são gitignored (CNG): EAS/prebuild aplica os
  plugins de `app.config.ts`. Instale com `npx expo install` **dentro de `apps/mobile`**.
- **Config do mobile:** `config.prod.ts` lê `EXPO_PUBLIC_*` do `.env`; `config.dev.ts` tem
  localhost hardcoded. Build **local** (`--local`) lê o `.env`; build na **nuvem** não
  (gitignored) — nesse caso as vars vão no `eas.json`/`eas env`.
- **TanStack Query: versões EXATAS alinhadas** (`5.101.2` em react-query +
  query-sync-storage-persister + react-query-persist-client). O node_modules é
  hoisted (`node-linker`); um `pnpm add` que re-resolva o react-query pra outro patch
  descasa os tipos e TODOS os hooks do oRPC passam a retornar `{}` ("No overload
  matches"). Sintoma = dezenas de erros de tipo espalhados; cura = pinar as três na
  mesma versão.
- **Reanimated no WEB tem pegadinhas sérias:** `withSequence`/callbacks encadeados de
  `withTiming` não avançam de etapa (use UM `withTiming` varrendo a timeline inteira
  + timer JS pra efeitos colaterais); `scrollTo` programático em ScrollView com
  `pagingEnabled` é revertido pelo scroll-snap (pager por estado com
  `translateX` + `withTiming`, como no onboarding); animações `entering`
  (FadeIn*) podem travar em opacity 0 sob automação de screenshots — glitch web-only.
  E cuidado com `flex: 1` em slides de pager: o shorthand embute `flexBasis: 0` +
  `flexShrink: 1` e os slides ENCOLHEM pra caber (sem overflow, nada rola).
- **`TextField` LeftAccessory/RightAccessory:** o `style` passado é de CONTAINER
  (height 40 + center) — envolva o ícone num `<View style={style}>`; aplicado direto
  no glifo, o ícone desalinha pro topo.
- **`pnpm check` (Biome/Ultracite)** pode dar erro "nested root configuration" (há
  `biome.json` no worktree e na raiz). Rode a formatação por app ou ignore o conflito.

## Convenções

- IDs são `text` gerados na aplicação, não `serial`.
- `createdAt`/`updatedAt` são `notNull` sem default — passe explicitamente.
- Preços: `numeric(10, 3)`. Coordenadas: `doublePrecision`.
- Comentários de código e strings voltadas ao usuário em **português**.
- Commits: conventional commits via `pnpm commit` (commitizen).
- `pnpm check` roda o Biome/Ultracite com `--write`.

## Pontas soltas conhecidas

- **Pendências de produção do app guarda-chuva (manuais):** o `google-services.json`
  na raiz do mobile é PLACEHOLDER copiado do martinez (não funciona em build Android
  de produção — precisa do app Firebase do package `cloud.gasolina.app`); o app novo
  ainda não foi cadastrado nas lojas. Os assets em `assets/app-icon/` (nuvem
  roxa) JÁ são a identidade definitiva do Gasolina Cloud. Projeto EAS:
  `fdc24707-450d-4d54-befc-396a017289ff`, fonte única em `EAS_PROJECT_ID` no
  `app.config.ts` (updates.url + extra.eas.projectId SEMPRE juntos — divergir
  quebra push/OTA).
- `registerToken` roda em TODO boot logado — falta torná-lo condicional (só quando o
  token muda; guardar o último enviado no MMKV). Última otimização de requests pendente.
- Tagline do sign-in ("Muito mais que combustível") ainda é hardcoded no bundle —
  deveria vir do branding do tenant.
- O botão "Trocar de rede" da Minha Conta está COMENTADO (decisão de produto) — quem
  já logou troca de rede saindo da conta e usando o botão do sign-in; o mecanismo
  `switchTenant` segue ativo no seletor.
- `tenant.getMyMembership` usa `.limit(1)` — multi-membership retorna arbitrário.
- `tenantProcedure` está definido mas nenhum router o usa (clientes finais não são
  membros → `protectedProcedure` + checagem manual de `context.tenant`).
- Migrations: `0007`–`0009` (fidelidade + rewards), `0010` (expiração de pontos +
  colunas de branding), `0011` (remove `brand_background_color`; é `DROP IF EXISTS`
  — bancos de dev que iteraram via `db:push` não a tinham aplicado), `0012`
  (estorno + teto), `0013` (cpf), `0014` (`push_notification.kind`). O **bucket R2
  `gasolina-reward-images` precisa existir** (`wrangler r2 bucket create`) antes de
  deploy — ele também guarda os logos (`tenant-logos/`).
- Criar tenant (`admin.tenant.create`) **não atribui dono** — use
  `admin.tenant.assignOwnerByEmail` (aba "Donos" no painel).
- `seed.ts` está quebrado (erros de tipo); não bloqueia o build, mas `seed:liso` não
  roda. Há ~38 erros de tipo pré-existentes no mobile (testes, Toggle, etc.) — filtre
  o typecheck pelos arquivos que você mexeu.
- Tenants no banco de dev: `martinez` ("Grupo Martinez") e `nordeste` ("Rede Nordeste
  Combustíveis"). O slug antigo `grupo-martinez` foi renomeado pra `martinez`.

---

# Code Quality Tooling (Ultracite)

Ultracite enforces strict type safety, accessibility standards, and consistent code quality for JavaScript/TypeScript projects using Biome's lightning-fast formatter and linter.

## Key Principles
- Zero configuration required
- Subsecond performance
- Maximum type safety
- AI-friendly code generation

## Before Writing Code
1. Analyze existing patterns in the codebase
2. Consider edge cases and error scenarios
3. Follow the rules below strictly
4. Validate accessibility requirements

## Rules

### Accessibility (a11y)
- Don't use `accessKey` attribute on any HTML element.
- Don't set `aria-hidden="true"` on focusable elements.
- Don't add ARIA roles, states, and properties to elements that don't support them.
- Don't use distracting elements like `<marquee>` or `<blink>`.
- Only use the `scope` prop on `<th>` elements.
- Don't assign non-interactive ARIA roles to interactive HTML elements.
- Make sure label elements have text content and are associated with an input.
- Don't assign interactive ARIA roles to non-interactive HTML elements.
- Don't assign `tabIndex` to non-interactive HTML elements.
- Don't use positive integers for `tabIndex` property.
- Don't include "image", "picture", or "photo" in img alt prop.
- Don't use explicit role property that's the same as the implicit/default role.
- Make static elements with click handlers use a valid role attribute.
- Always include a `title` element for SVG elements.
- Give all elements requiring alt text meaningful information for screen readers.
- Make sure anchors have content that's accessible to screen readers.
- Assign `tabIndex` to non-interactive HTML elements with `aria-activedescendant`.
- Include all required ARIA attributes for elements with ARIA roles.
- Make sure ARIA properties are valid for the element's supported roles.
- Always include a `type` attribute for button elements.
- Make elements with interactive roles and handlers focusable.
- Give heading elements content that's accessible to screen readers (not hidden with `aria-hidden`).
- Always include a `lang` attribute on the html element.
- Always include a `title` attribute for iframe elements.
- Accompany `onClick` with at least one of: `onKeyUp`, `onKeyDown`, or `onKeyPress`.
- Accompany `onMouseOver`/`onMouseOut` with `onFocus`/`onBlur`.
- Include caption tracks for audio and video elements.
- Use semantic elements instead of role attributes in JSX.
- Make sure all anchors are valid and navigable.
- Ensure all ARIA properties (`aria-*`) are valid.
- Use valid, non-abstract ARIA roles for elements with ARIA roles.
- Use valid ARIA state and property values.
- Use valid values for the `autocomplete` attribute on input elements.
- Use correct ISO language/country codes for the `lang` attribute.

### Code Complexity and Quality
- Don't use consecutive spaces in regular expression literals.
- Don't use the `arguments` object.
- Don't use primitive type aliases or misleading types.
- Don't use the comma operator.
- Don't use empty type parameters in type aliases and interfaces.
- Don't write functions that exceed a given Cognitive Complexity score.
- Don't nest describe() blocks too deeply in test files.
- Don't use unnecessary boolean casts.
- Don't use unnecessary callbacks with flatMap.
- Use for...of statements instead of Array.forEach.
- Don't create classes that only have static members (like a static namespace).
- Don't use this and super in static contexts.
- Don't use unnecessary catch clauses.
- Don't use unnecessary constructors.
- Don't use unnecessary continue statements.
- Don't export empty modules that don't change anything.
- Don't use unnecessary escape sequences in regular expression literals.
- Don't use unnecessary fragments.
- Don't use unnecessary labels.
- Don't use unnecessary nested block statements.
- Don't rename imports, exports, and destructured assignments to the same name.
- Don't use unnecessary string or template literal concatenation.
- Don't use String.raw in template literals when there are no escape sequences.
- Don't use useless case statements in switch statements.
- Don't use ternary operators when simpler alternatives exist.
- Don't use useless `this` aliasing.
- Don't use any or unknown as type constraints.
- Don't initialize variables to undefined.
- Don't use the void operators (they're not familiar).
- Use arrow functions instead of function expressions.
- Use Date.now() to get milliseconds since the Unix Epoch.
- Use .flatMap() instead of map().flat() when possible.
- Use literal property access instead of computed property access.
- Don't use parseInt() or Number.parseInt() when binary, octal, or hexadecimal literals work.
- Use concise optional chaining instead of chained logical expressions.
- Use regular expression literals instead of the RegExp constructor when possible.
- Don't use number literal object member names that aren't base 10 or use underscore separators.
- Remove redundant terms from logical expressions.
- Use while loops instead of for loops when you don't need initializer and update expressions.
- Don't pass children as props.
- Don't reassign const variables.
- Don't use constant expressions in conditions.
- Don't use `Math.min` and `Math.max` to clamp values when the result is constant.
- Don't return a value from a constructor.
- Don't use empty character classes in regular expression literals.
- Don't use empty destructuring patterns.
- Don't call global object properties as functions.
- Don't declare functions and vars that are accessible outside their block.
- Make sure builtins are correctly instantiated.
- Don't use super() incorrectly inside classes. Also check that super() is called in classes that extend other constructors.
- Don't use variables and function parameters before they're declared.
- Don't use 8 and 9 escape sequences in string literals.
- Don't use literal numbers that lose precision.

### React and JSX Best Practices
- Don't use the return value of React.render.
- Make sure all dependencies are correctly specified in React hooks.
- Make sure all React hooks are called from the top level of component functions.
- Don't forget key props in iterators and collection literals.
- Don't destructure props inside JSX components in Solid projects.
- Don't define React components inside other components.
- Don't use event handlers on non-interactive elements.
- Don't assign to React component props.
- Don't use both `children` and `dangerouslySetInnerHTML` props on the same element.
- Don't use dangerous JSX props.
- Don't use Array index in keys.
- Don't insert comments as text nodes.
- Don't assign JSX properties multiple times.
- Don't add extra closing tags for components without children.
- Use `<>...</>` instead of `<Fragment>...</Fragment>`.
- Watch out for possible "wrong" semicolons inside JSX elements.

### Correctness and Safety
- Don't assign a value to itself.
- Don't return a value from a setter.
- Don't compare expressions that modify string case with non-compliant values.
- Don't use lexical declarations in switch clauses.
- Don't use variables that haven't been declared in the document.
- Don't write unreachable code.
- Make sure super() is called exactly once on every code path in a class constructor before this is accessed if the class has a superclass.
- Don't use control flow statements in finally blocks.
- Don't use optional chaining where undefined values aren't allowed.
- Don't have unused function parameters.
- Don't have unused imports.
- Don't have unused labels.
- Don't have unused private class members.
- Don't have unused variables.
- Make sure void (self-closing) elements don't have children.
- Don't return a value from a function with the return type 'void'
- Use isNaN() when checking for NaN.
- Make sure "for" loop update clauses move the counter in the right direction.
- Make sure typeof expressions are compared to valid values.
- Make sure generator functions contain yield.
- Don't use await inside loops.
- Don't use bitwise operators.
- Don't use expressions where the operation doesn't change the value.
- Make sure Promise-like statements are handled appropriately.
- Don't use __dirname and __filename in the global scope.
- Prevent import cycles.
- Don't use configured elements.
- Don't hardcode sensitive data like API keys and tokens.
- Don't let variable declarations shadow variables from outer scopes.
- Don't use the TypeScript directive @ts-ignore.
- Prevent duplicate polyfills from Polyfill.io.
- Don't use useless backreferences in regular expressions that always match empty strings.
- Don't use unnecessary escapes in string literals.
- Don't use useless undefined.
- Make sure getters and setters for the same property are next to each other in class and object definitions.
- Make sure object literals are declared consistently (defaults to explicit definitions).
- Use static Response methods instead of new Response() constructor when possible.
- Make sure switch-case statements are exhaustive.
- Make sure the `preconnect` attribute is used when using Google Fonts.
- Use `Array#{indexOf,lastIndexOf}()` instead of `Array#{findIndex,findLastIndex}()` when looking for the index of an item.
- Make sure iterable callbacks return consistent values.
- Use `with { type: "json" }` for JSON module imports.
- Use numeric separators in numeric literals.
- Use object spread instead of `Object.assign()` when constructing new objects.
- Always use the radix argument when using `parseInt()`.
- Make sure JSDoc comment lines start with a single asterisk, except for the first one.
- Include a description parameter for `Symbol()`.
- Don't use spread (`...`) syntax on accumulators.
- Don't use the `delete` operator.
- Don't access namespace imports dynamically.
- Don't use namespace imports.
- Declare regex literals at the top level.
- Don't use `target="_blank"` without `rel="noopener"`.

### TypeScript Best Practices
- Don't use TypeScript enums.
- Don't export imported variables.
- Don't add type annotations to variables, parameters, and class properties that are initialized with literal expressions.
- Don't use TypeScript namespaces.
- Don't use non-null assertions with the `!` postfix operator.
- Don't use parameter properties in class constructors.
- Don't use user-defined types.
- Use `as const` instead of literal types and type annotations.
- Use either `T[]` or `Array<T>` consistently.
- Initialize each enum member value explicitly.
- Use `export type` for types.
- Use `import type` for types.
- Make sure all enum members are literal values.
- Don't use TypeScript const enum.
- Don't declare empty interfaces.
- Don't let variables evolve into any type through reassignments.
- Don't use the any type.
- Don't misuse the non-null assertion operator (!) in TypeScript files.
- Don't use implicit any type on variable declarations.
- Don't merge interfaces and classes unsafely.
- Don't use overload signatures that aren't next to each other.
- Use the namespace keyword instead of the module keyword to declare TypeScript namespaces.

### Style and Consistency
- Don't use global `eval()`.
- Don't use callbacks in asynchronous tests and hooks.
- Don't use negation in `if` statements that have `else` clauses.
- Don't use nested ternary expressions.
- Don't reassign function parameters.
- This rule lets you specify global variable names you don't want to use in your application.
- Don't use specified modules when loaded by import or require.
- Don't use constants whose value is the upper-case version of their name.
- Use `String.slice()` instead of `String.substr()` and `String.substring()`.
- Don't use template literals if you don't need interpolation or special-character handling.
- Don't use `else` blocks when the `if` block breaks early.
- Don't use yoda expressions.
- Don't use Array constructors.
- Use `at()` instead of integer index access.
- Follow curly brace conventions.
- Use `else if` instead of nested `if` statements in `else` clauses.
- Use single `if` statements instead of nested `if` clauses.
- Use `new` for all builtins except `String`, `Number`, and `Boolean`.
- Use consistent accessibility modifiers on class properties and methods.
- Use `const` declarations for variables that are only assigned once.
- Put default function parameters and optional function parameters last.
- Include a `default` clause in switch statements.
- Use the `**` operator instead of `Math.pow`.
- Use `for-of` loops when you need the index to extract an item from the iterated array.
- Use `node:assert/strict` over `node:assert`.
- Use the `node:` protocol for Node.js builtin modules.
- Use Number properties instead of global ones.
- Use assignment operator shorthand where possible.
- Use function types instead of object types with call signatures.
- Use template literals over string concatenation.
- Use `new` when throwing an error.
- Don't throw non-Error values.
- Use `String.trimStart()` and `String.trimEnd()` over `String.trimLeft()` and `String.trimRight()`.
- Use standard constants instead of approximated literals.
- Don't assign values in expressions.
- Don't use async functions as Promise executors.
- Don't reassign exceptions in catch clauses.
- Don't reassign class members.
- Don't compare against -0.
- Don't use labeled statements that aren't loops.
- Don't use void type outside of generic or return types.
- Don't use console.
- Don't use control characters and escape sequences that match control characters in regular expression literals.
- Don't use debugger.
- Don't assign directly to document.cookie.
- Use `===` and `!==`.
- Don't use duplicate case labels.
- Don't use duplicate class members.
- Don't use duplicate conditions in if-else-if chains.
- Don't use two keys with the same name inside objects.
- Don't use duplicate function parameter names.
- Don't have duplicate hooks in describe blocks.
- Don't use empty block statements and static blocks.
- Don't let switch clauses fall through.
- Don't reassign function declarations.
- Don't allow assignments to native objects and read-only global variables.
- Use Number.isFinite instead of global isFinite.
- Use Number.isNaN instead of global isNaN.
- Don't assign to imported bindings.
- Don't use irregular whitespace characters.
- Don't use labels that share a name with a variable.
- Don't use characters made with multiple code points in character class syntax.
- Make sure to use new and constructor properly.
- Don't use shorthand assign when the variable appears on both sides.
- Don't use octal escape sequences in string literals.
- Don't use Object.prototype builtins directly.
- Don't redeclare variables, functions, classes, and types in the same scope.
- Don't have redundant "use strict".
- Don't compare things where both sides are exactly the same.
- Don't let identifiers shadow restricted names.
- Don't use sparse arrays (arrays with holes).
- Don't use template literal placeholder syntax in regular strings.
- Don't use the then property.
- Don't use unsafe negation.
- Don't use var.
- Don't use with statements in non-strict contexts.
- Make sure async functions actually use await.
- Make sure default clauses in switch statements come last.
- Make sure to pass a message value when creating a built-in error.
- Make sure get methods always return a value.
- Use a recommended display strategy with Google Fonts.
- Make sure for-in loops include an if statement.
- Use Array.isArray() instead of instanceof Array.
- Make sure to use the digits argument with Number#toFixed().
- Make sure to use the "use strict" directive in script files.

### Next.js Specific Rules
- Don't use `<img>` elements in Next.js projects.
- Don't use `<head>` elements in Next.js projects.
- Don't import next/document outside of pages/_document.jsx in Next.js projects.
- Don't use the next/head module in pages/_document.js on Next.js projects.

### Testing Best Practices
- Don't use export or module.exports in test files.
- Don't use focused tests.
- Make sure the assertion function, like expect, is placed inside an it() function call.
- Don't use disabled tests.

## Common Tasks
- `npx ultracite init` - Initialize Ultracite in your project
- `npx ultracite fix` - Format and fix code automatically
- `npx ultracite check` - Check for issues without fixing

## Example: Error Handling
```typescript
// ✅ Good: Comprehensive error handling
try {
  const result = await fetchData();
  return { success: true, data: result };
} catch (error) {
  console.error('API call failed:', error);
  return { success: false, error: error.message };
}

// ❌ Bad: Swallowing errors
try {
  return await fetchData();
} catch (e) {
  console.log(e);
}
```