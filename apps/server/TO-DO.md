# Backend Architecture Guide

## Hono + oRPC + Better Auth + Multi-Tenant SaaS

### Objetivo

Construir um backend SaaS multi-tenant simples, onde várias empresas usam a mesma infraestrutura, mas com isolamento total de dados.

Exemplos de empresas:

- Martinez
- São Cristóvão
- Posto Central

Cada empresa deve enxergar apenas os seus próprios dados:

- postos
- preços

- dados administrativos

Nenhuma empresa pode acessar dados de outra.

---

# Stack

- Hono
- oRPC
- Better Auth
- Drizzle ORM
- PostgreSQL
- TypeScript

---

# Conceitos Fundamentais

## Tenant

Representa uma empresa.

Exemplos:

```txt
martinez
sao-cristovao
posto-central
```

O tenant é a fronteira de isolamento dos dados.

---

## Owner da Empresa

Cada empresa terá apenas **1 owner**.

Esse owner é o responsável por:

- cadastrar e atualizar dados do posto
- gerenciar preços

- controlar configurações da empresa

Não haverá múltiplos cargos internos para simplificar o SaaS.

---

## Cliente Final

Usuário comum do aplicativo.

Exemplos:

```txt
João
Maria
Carlos
```

O cliente final:

- cria conta
- faz login
- consulta preços

- busca postos
- pode acessar outros postos sem problema se baixar outro app no futuro

O cliente final **não participa de tenant_membership**.

---

# Modelo de Segurança

## Hierarquia Simplificada

```txt
Owner
 └── Controle da empresa

Cliente
 └── Consome o app
```

Não há papéis como admin, member ou similares.

---

# Regras Obrigatórias

## Cliente final não entra em tenant_membership

O cliente final deve existir apenas como usuário autenticado do app.

Ele não deve ser vinculado a uma empresa como membro administrativo.

Isso permite que o mesmo cliente use diferentes apps de diferentes postos sem restrição de vínculo.

---

## Owner é o único papel administrativo

Toda rota administrativa deve exigir que o usuário autenticado seja o owner daquele tenant.

Se não for o owner:

```http
403 Forbidden
```

---

## Rotas de leitura exigem autenticação

As seguintes rotas precisam de login:

- listar preços

- buscar postos

Mesmo sendo leitura, o cliente final precisa estar autenticado para acessar o app.

---

## Nunca confiar no frontend

Mesmo que o frontend envie:

```http
x-tenant-slug: sao-cristovao
```

o backend deve validar se a request está autorizada para aquele tenant.

Se não estiver:

```http
403 Forbidden
```

---

# Context

Todo request deve produzir algo próximo de:

```ts
{
  (session, tenant, tenantOwnerMembership);
}
```

- `session`: usuário autenticado via Better Auth
- `tenant`: empresa resolvida na request
- `tenantOwnerMembership`: vínculo do owner com o tenant, quando aplicável

---

# Tenant Resolution

O tenant pode ser identificado por:

## Header

```http
x-tenant-id
```

ou

```http
x-tenant-slug
```

---

## Subdomínio

```txt
martinez.api.com
```

→

```txt
tenant = martinez
```

---

## Path

```txt
/martinez/api/fuel-prices
```

→

```txt
tenant = martinez
```

---

# Procedimentos oRPC

## Public

Não exige autenticação.

Use apenas para rotas realmente públicas, como healthcheck.

```ts
publicProcedure;
```

---

## Protected

Exige autenticação.

Use para rotas de leitura do app e rotas que dependam da sessão do usuário.

```ts
protectedProcedure;
```

Exemplos:

- listar preços

- buscar postos
- acessar perfil
- favoritar posto

---

## Tenant Protected

Exige:

- usuário autenticado
- tenant válido
- owner válido para aquele tenant

```ts
tenantOwnerProcedure;
```

Use nas rotas administrativas.

---

# Middleware Chain

```txt
Request
    ↓
Auth
    ↓
Resolve Tenant
    ↓
Validate Access
    ↓
Procedure
```

# Regras de Acesso

## Rotas de leitura do app

Estas rotas exigem autenticação:

- `listFuelPrices`

- `searchStations`

Elas devem usar:

```ts
protectedProcedure;
```

O tenant deve ser resolvido para retornar apenas dados da empresa correta.

---

## Rotas administrativas

Estas rotas devem usar:

```ts
tenantOwnerProcedure;
```

Exemplos:

- criar posto
- atualizar posto
- atualizar preço

- editar configurações da empresa
