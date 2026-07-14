# Gasolina — Project Context

SaaS multi-tenant que vende apps mobile white-label para postos e redes de postos.
Cada rede (tenant) tem seu app, seus postos, seus preços de combustível e envia push
notifications para os próprios clientes. **Uma única infraestrutura de servidor serve
todos os tenants** — o isolamento é feito em software, não por deploy separado.

## Monorepo

pnpm workspaces + Turborepo. Três apps, sem `packages/` compartilhados por enquanto.

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
tenant — não têm `tenant_membership`. São só `user` autenticados, e o app manda o
`x-tenant-slug` fixo. Por isso endpoints voltados ao cliente usam `protectedProcedure`
+ checagem manual de `context.tenant`, **nunca** `tenantProcedure`.

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
UI, `apps/admin/src/lib/orpc.ts`); o **mobile** manda `x-tenant-slug` fixo,
resolvido em runtime pelo `applicationId` nativo via `tenants/registry.ts`
(fallback: `EXPO_PUBLIC_TENANT_SLUG`) — é isso que torna o app white-label por rede.

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
├── lib/              # auth · context · orpc · tenant · email · execution-context · hono-env
├── routers/          # station · fuel · tenant · subscription · admin · push · users · loyalty
├── routes/           # reward-image.ts — rotas Hono cruas (upload/serve de foto no R2)
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

## Cloudflare Workers — restrições que já mordem

- `nodejs_compat` está ligado, mas nem tudo funciona. E-mail usa **`aws4fetch`
  contra a API do SES**, não `@aws-sdk/client-ses` (depende de `node:fs`, quebra no Worker).
- Trabalho assíncrono pós-resposta (envio de e-mail) precisa de `waitUntil`. Como o
  Better Auth não recebe o `ExecutionContext`, ele é propagado por `AsyncLocalStorage`
  em `lib/execution-context.ts`, e `auth.ts` consome via
  `executionCtxStorage.getStore()?.waitUntil(...)`. Se você adicionar background work
  em auth, siga esse caminho — sem `waitUntil` o Worker mata a promise.
- Secrets vão em `wrangler secret put` / `pnpm secrets:setup`. **Nunca em `vars` do
  `wrangler.jsonc`** — ficam visíveis no dashboard.

## Push notifications — acoplamento a respeitar

`push_notification` é o **agregado da campanha** (totais de sucesso/falha).
`push_notification_recipient` é o **detalhe por destinatário** (`deliveredAt`, `readAt`).

Quem dispara os pushes precisa inserir uma linha em `push_notification_recipient` por
usuário-alvo no momento do envio. Sem isso, a listagem de notificações do usuário
retorna vazia — o agregado sozinho não sabe quem recebeu o quê.

`push_token` é único por `(tenantId, token)`, não por `token` global: projetos
FCM/APNs distintos podem emitir o mesmo valor de token.

## Programa de fidelidade (maior subsistema novo)

Fidelidade white-label por tenant. Schema em `db/schema/loyalty.ts`, lógica em
`routers/loyalty.ts` (`orpc.loyalty.*`). Tabelas:
- `loyalty_transaction` — **ledger**; saldo do cliente = `SUM(points)`. Crédito
  positivo, resgate negativo. **Nunca** há coluna de saldo mutável.
- **Expiração de pontos (validade por crédito, FIFO):** `tenant.pointsValidityDays`
  (null = nunca expiram) estampa `expiresAt` no crédito. Resgates consomem os lotes
  válidos mais antigos. Créditos vencidos viram transação negativa
  (`expiredTransactionId` → crédito de origem, unique = idempotente) via **expire
  pass preguiçoso** em `lib/loyalty-points.ts` (roda em `myBalance`,
  `requestRedemption`, `confirmRedemption` — não há cron; cliente dormente pode
  ter expiração pendente até a próxima leitura de saldo, então rankings podem
  superestimar levemente até lá). Isso preserva o invariante `SUM(points)`.
  Tipo da linha no extrato: crédito = `amountCents`, resgate = `redemptionId`,
  expiração = `expiredTransactionId`.
- `loyalty_scan_code` — QR de identidade do cliente (uso único, ~90s), um por cliente.
- `reward` / `reward_redemption` — catálogo e pedidos de resgate.
- `tenant.pointsPerReal` — multiplicador (`numeric`, aceita frações).

**Anti-fraude — a âncora de confiança é o operador (frentista), não a nota fiscal:**
- **Crédito (caixa):** cliente mostra QR (`issueScanCode`); operador escaneia e digita
  o valor abastecido (`credit`, `tenantOperatorProcedure`). O valor vem SEMPRE do
  operador autenticado, nunca do app do cliente; o código é consumido atomicamente.
  Transação de crédito tem `amountCents` preenchido.
- **Resgate (débito na entrega):** cliente pede (`requestRedemption`) e recebe um
  código — NÃO debita. Operador escaneia → `peekRedemption` (vê recompensa/custo) →
  `confirmRedemption` (transação: consome o código, recheca saldo, baixa estoque,
  insere transação negativa com `redemptionId`).
- **Distinguir tipo de transação:** crédito = `amountCents IS NOT NULL`; resgate =
  `redemptionId IS NOT NULL`. Rankings/auditoria filtram por isso — ex: "operadores
  que mais creditaram" só conta `amountCents IS NOT NULL` (senão os resgates que o
  operador confirma entram como débito e negativam a soma).

`loyalty.myRole` (protected) retorna `owner|operator|null` — o mobile usa pra decidir
se mostra a tab/tela de operador. Cliente comum → `null`.

**Fotos de recompensa (R2):** `reward.imageUrl` guarda **caminho relativo**
(`/images/rewards/{tenantId}/{rewardId}?v=...`), nunca URL absoluta — cada cliente
prefixa com a própria base (`Config.API_URL` no mobile, `VITE_API_URL` no admin; URLs
externas coladas ficam intactas). Upload/serve em `routes/reward-image.ts` + binding
`REWARD_IMAGES`. **Não** derive a URL de `c.req.url` — no `wrangler dev` o host vem
como o domínio de produção (por causa do `custom_domain` em `routes`).

## Frontends (admin e mobile)

**Admin** (`apps/admin`, React + Vite + shadcn):
- `AuthContext` expõe `isAdmin`, `activeTenant`, `membership`. Owner tem tenant fixo;
  admin da plataforma escolhe a rede num seletor (localStorage) — o `orpc.ts` manda
  `x-tenant-id` no header.
- Rotas em `App.tsx` (react-router): owner/admin sob `TenantProtectedRoute` + `Layout`;
  admin-only sob `AdminProtectedRoute`. `Layout` renderiza o `PaymentReminderBanner`.
- Fidelidade numa página só (`/fidelidade`) com abas Auditoria/Recompensas/Config
  (`pages/LoyaltyAudit|RewardsManager|LoyaltyConfig`). Gestão de donos na aba "Donos"
  do `/admin` (`pages/admin/OwnersTab`).

**Mobile** (`apps/mobile`, Expo + expo-router):
- **White-label por build:** `tenants/registry.ts` é a fonte única de identidade
  (nome, scheme, bundle id, cores) e `tenants/<slug>/` guarda ícones, splash e
  `google-services.json`. O `app.config.ts` compõe tudo a partir de `TENANT=<slug>`
  (default `grupo-martinez`; perfil `production:<slug>` no `eas.json`). Em runtime o
  slug vem do `applicationId` nativo (expo-application) → mapa do registry — **nunca
  asse o slug no bundle JS**, senão um update OTA compartilhado sobrescreve a
  identidade dos outros tenants.
- **EAS Update:** `runtimeVersion: { policy: "fingerprint" }` + channels
  `production`/`preview`. Enquanto o lado nativo for idêntico entre tenants, um único
  `eas update --channel production` atualiza os apps de todas as redes.
- Tabs em `src/app/(app)/(tabs)/`: Início · Meus pontos · Operador (só owner/operator,
  via `hidden` + `loyalty.myRole`) · Minha Conta. Telas empilhadas em `(app)/` (station,
  rewards, notifications, about). Políticas públicas em `src/app/policies/` (fora de
  `(app)`, funcionam sem login).
- Telas em `src/screens/`; arquivos de rota são finos (`export default () => <Screen/>`).
- Marca da plataforma: `components/PoweredByGasolinaCloud` (nuvem-gota SVG, roxo #7C3AED).
  Políticas (Termos/Regulamento/Privacidade) vêm de `.md` em `assets/policies/`.

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
- **Imports de `.md` no mobile são RELATIVOS** (`../../../assets/...`), não o alias
  `@assets` — o `babel-plugin-inline-import` faz resolução própria e não conhece os
  aliases do Metro/tsconfig. Editar um `.md` às vezes exige `expo start -c`.
- **Deps nativas** (expo-camera, react-native-svg/qrcode) exigem **rebuild do dev client**
  — `expo start` não basta. `ios/`/`android/` são gitignored (CNG): EAS/prebuild aplica os
  plugins de `app.config.ts`. Instale com `npx expo install` **dentro de `apps/mobile`**.
- **Config do mobile:** `config.prod.ts` lê `EXPO_PUBLIC_*` do `.env`; `config.dev.ts` tem
  localhost hardcoded. Build **local** (`--local`) lê o `.env`; build na **nuvem** não
  (gitignored) — nesse caso as vars vão no `eas.json`/`eas env`.
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

- `tenantProcedure` está definido mas nenhum router o usa (clientes finais não são
  membros → `protectedProcedure` + checagem manual de `context.tenant`).
- Migrations de fidelidade: `0007` (papel operator + tabelas base + `pointsPerReal`),
  `0008` (`pointsPerReal` → `numeric`), `0009` (reward/reward_redemption). O **bucket R2
  `gasolina-reward-images` precisa existir** (`wrangler r2 bucket create`) antes de deploy.
- Criar tenant (`admin.tenant.create`) **não atribui dono** — use
  `admin.tenant.assignOwnerByEmail` (aba "Donos" no painel).
- `seed.ts` está quebrado (erros de tipo); não bloqueia o build, mas `seed:liso` não roda.

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