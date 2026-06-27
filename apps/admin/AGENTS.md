# multi-tenant-saas-admin — Context

## Overview

Dashboard administrativo React SPA que consume la API multi-tenant de `multi-tenant-saas-api`. Demo/portfolio project.

## Stack

- React 18 + TypeScript 6 + Vite 8
- React Router v7 (ruteo declarativo)
- TanStack Query v5 (server state, cache, mutations)
- Tailwind CSS v4 + Shadcn/ui (Radix primitives)
- React Hook Form + Zod (formularios)
- Lucide React (iconos)

## Project Structure

```
src/
├── context/
│   └── AuthContext.tsx  # Auth state, login/register/logout, auto-refresh on mount
├── components/
│   ├── Layout.tsx       # Shell principal: header, nav, mobile drawer, <Outlet/>
│   ├── ProtectedRoute.tsx # Redirect a /login si no autenticado
│   └── ui/              # Componentes Shadcn/ui reutilizables
├── pages/
│   ├── Login.tsx        # Formulario email+password
│   ├── Register.tsx     # Formulario full_name+email+password
│   ├── Dashboard.tsx    # Stats + lista de tenants
│   ├── Tenants.tsx      # CRUD tabla + crear diálogo
│   ├── TenantDetail.tsx # Tabs: Settings, Users, Subscription, Feature Flags
│   ├── TenantUsers.tsx  # Invitar, cambiar rol, eliminar usuarios
│   ├── Plans.tsx        # Grid planes + crear/editar (superadmin)
│   ├── FeatureFlags.tsx # Lista + toggle default (superadmin)
│   └── Profile.tsx      # Info del usuario autenticado
├── lib/
│   └── utils.ts         # cn() helper (clsx + tailwind-merge)
├── App.tsx              # Routes definition
└── main.tsx             # Entry point: BrowserRouter + QueryClient + AuthProvider + Toaster
```

## API Connection

- Base URL: `API_URL` env var (default `http://localhost:15000`)
- Auth: better auth client with token via `Authorization` header and tenantMembership ->const requireOwnerAccess = o.middleware(({ context, next }) => {
  if (!context.tenant) {
  throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
  }

  if (!context.tenantMembership || context.tenantMembership.role !== "owner") {
  throw new ORPCError("FORBIDDEN");
  }

  return next({
  context: {
  tenant: context.tenant,
  tenantOwnerMembership: context.tenantMembership,
  },
  });
  });

## Routing

| Path                 | Page                 | Protected |
| -------------------- | -------------------- | --------- |
| `/login`             | Login                | No        |
| `/register`          | Register             | No        |
| `/`                  | Dashboard            | Sí        |
| `/tenants`           | Tenants list         | Sí        |
| `/tenants/:id`       | Tenant detail (tabs) | Sí        |
| `/tenants/:id/users` | Tenant users         | Sí        |
| `/plans`             | Plans                | Sí        |
| `/feature-flags`     | Feature flags        | Sí        |
| `/profile`           | Profile              | Sí        |

Protected routes usan `<ProtectedRoute>` que verifica `session` del AuthContext; si está cargando muestra spinner.

## UI Patterns

- Shadcn/ui components en `components/ui/` — usar `cn()` para className merging
- Formularios con estados locales + `useMutation` para submit
- Mutations invalidan queries vía `queryClient.invalidateQueries`
- Toasts con `useToast()` para feedback de acciones
- Componentes Shadcn importados con `@/components/ui/xxx`
- Path alias `@/` → `src/` (configurado en vite.config.ts y tsconfig)
- Layout responsivo: menú colapsable en mobile (< md breakpoint)

## Important Rules

- No añadir comentarios en el código
- Usar import type-only con `verbatimModuleSyntax` (TS 6.0)
- No usar `as const` en function expressions (no soportado con `erasableSyntaxOnly`)
- `baseUrl` deprecado en TS 6.0, usar `ignoreDeprecations: "6.0"` (ya configurado)
- Las páginas se exportan como `export default function Nombre()`
- Preferir `const queryClient = useQueryClient()` sobre refetch manual
- No hay variables de entorno en runtime; todo via `import.meta.env.VITE_*`
