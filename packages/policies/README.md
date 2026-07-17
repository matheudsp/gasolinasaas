# Políticas (fonte única)

Textos legais exibidos no **app mobile** (telas de Políticas) e no **admin**
(páginas públicas `/politicas`, usadas também como URL pública exigida pelas
lojas). Editar o `.md` aqui atualiza os dois — não duplique o texto.

## Como cada app consome

Só os `.md` são compartilhados; **o registro de metadados (título, descrição,
ícone) fica em cada app**, porque são coisas diferentes: o mobile usa ícones do
MaterialDesignIcons, o admin usa ícones do lucide-react.

- **mobile** (`apps/mobile/src/screens/Policies/policies.ts`): importa por
  **caminho relativo**, e o `babel-plugin-inline-import` (ver `babel.config.js`)
  inlina o conteúdo como string em tempo de build. Como o plugin faz a
  resolução por conta própria, **alias não funciona** e o Metro nem chega a
  resolver o arquivo — por isso funciona mesmo estando fora de `apps/mobile`.
  Em compensação, o Metro não observa mudanças aqui: editar um `.md` pode
  exigir `expo start -c`.
- **admin** (`apps/admin/src/lib/policies.ts`): importa com o sufixo `?raw` do
  Vite, pelo alias `@policies` (`vite.config.ts`). O `fs.allow` do Vite já
  libera a raiz do workspace por causa do `pnpm-workspace.yaml`.

## Convenções do conteúdo

- Markdown simples: títulos (`#`, `##`), negrito, listas e parágrafos — é o
  subconjunto que os dois renderizadores tratam bem.
- Não use HTML embutido: o renderizador do mobile
  (`react-native-markdown-display`) não interpreta.
- Ao mudar o que é coletado do usuário, atualize a Política de Privacidade
  (LGPD) — ex.: o CPF entrou no cadastro e foi declarado aqui.
