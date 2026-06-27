# Architecture

## Overview

Single-page application built with React 19 and TypeScript 6. Communicates with the multi-tenant SaaS API via REST over HTTP. Authentication uses JWT tokens managed through Axios interceptors.

## Auth Flow

```
┌──────────┐     POST /auth/login     ┌──────────┐
│  Browser │  ──────────────────────>  │   API    │
│  SPA     │  <──────────────────────  │          │
│          │   { access_token,         └──────────┘
│          │     refresh_token }
│          │
│          │  Stores refresh_token
│          │  in localStorage
│          │
│          │  Sets Authorization header
│          │  on Axios defaults
└──────────┘
```

### Token lifecycle

1. **Login/Register** → API returns `access_token` + `refresh_token`
2. **On mount** → if `refresh_token` exists in localStorage, attempts silent refresh via `POST /auth/refresh`
3. **On 401** → Axios response interceptor:
   - If not `/auth/refresh`: tries to refresh, retries original request
   - If `/auth/refresh`: clears tokens, rejects immediately (no infinite retry)
4. **On refresh failure** → clears localStorage, user sees Login page

### Token storage

| Token | Storage | Purpose |
|---|---|---|
| `access_token` | Axios default header (in memory) | API authorization (30 min TTL) |
| `refresh_token` | `localStorage` | Silent token refresh (7 day TTL) |

## Routing

React Router v7 with a nested layout structure:

- **Public routes**: `/login`, `/register`
- **Protected routes** (wrapped in `<ProtectedRoute>` + `<Layout>`):
  - `/` — Dashboard
  - `/tenants` — Tenant list
  - `/tenants/:id` — Tenant detail with tabs
  - `/tenants/:id/users` — Tenant user management
  - `/plans` — Plan management (superadmin)
  - `/feature-flags` — Feature flag management (superadmin)
  - `/profile` — Current user profile

`<ProtectedRoute>` checks `isAuthenticated` from `AuthContext`. If loading, shows a spinner. If not authenticated, redirects to `/login`.

## State Management

| Domain | Tool | Purpose |
|---|---|---|
| Auth state | React Context (`AuthContext`) | User profile, login/logout, loading state |
| Server state | TanStack Query v5 | Tenant list, plans, feature flags, cache invalidation |
| Forms | Local state + `useMutation` | Create/edit forms with toast feedback |
| UI state | Local `useState` | Dialog open/close, selected items, form values |

### TanStack Query patterns

- `useQuery` for reads with `queryKey` based cache
- `useMutation` for writes with `queryClient.invalidateQueries()` on success
- Retry: 1 attempt, no refetch on window focus (configured in `main.tsx`)
- Query keys follow the pattern: `['resource']`, `['resource', id]`

## HTTP Layer

Axios instance with interceptors:

```
apiClient (axios.create)
  ├── baseURL: VITE_API_URL
  ├── Content-Type: application/json
  ├── Request interceptor (passthrough)
  └── Response interceptor
       ├── 200-299 → pass through
       └── 401 → attempt token refresh → retry or clear
```

## UI Components

Built with Shadcn/ui primitives on top of Tailwind CSS v4:

| Library | Usage |
|---|---|
| `@radix-ui/*` | Dialog, DropdownMenu, Tabs, Switch, Toast, Select |
| `lucide-react` | Icons |
| `class-variance-authority` | Component variants |
| `clsx` + `tailwind-merge` | `cn()` utility for className merging |

### Layout

Responsive shell with:
- **Header**: App name + user dropdown (profile, logout)
- **Sidebar**: Navigation links, collapsible on mobile (< 768px)
- **Main area**: Renders `<Outlet/>` for nested routes

## Error Handling

- API validation errors (422): extracts Pydantic error messages from `detail` array
- Generic errors: falls back to default message
- Toast notifications via `useToast()` with `success` / `destructive` variants
- Error boundary catches rendering errors
