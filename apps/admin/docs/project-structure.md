# Project Structure

```
multi-tenant-saas-admin/
├── src/                              # Application source
│   │
│   ├── components/                   # UI components
│   │   ├── Layout.tsx                # App shell: header, sidebar, <Outlet/>
│   │   ├── ProtectedRoute.tsx        # Auth guard → redirect to /login
│   │   └── ui/                       # Shadcn/ui primitives
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── checkbox.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── switch.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── toast.tsx
│   │       ├── toaster.tsx
│   │       └── use-toast.ts
│   │
│   ├── context/
│   │   └── AuthContext.tsx           # Auth state provider + login/logout/register
│   │
│   ├── lib/
│   │   └── utils.ts                  # cn() helper (clsx + tailwind-merge)
│   │
│   ├── pages/                        # Route pages
│   │   ├── Login.tsx                 # Email + password form
│   │   ├── Register.tsx              # Full name + email + password form
│   │   ├── Dashboard.tsx             # Stats cards + tenant list
│   │   ├── Tenants.tsx               # CRUD table + create dialog + batch delete
│   │   ├── TenantDetail.tsx          # Tabs: Settings, Users, Subscription, Feature Flags
│   │   ├── TenantUsers.tsx           # Invite, change role, remove users
│   │   ├── Plans.tsx                 # Plan grid + create/edit (superadmin)
│   │   ├── FeatureFlags.tsx          # Flag list + toggle default (superadmin)
│   │   └── Profile.tsx               # Authenticated user info
│   │
│   ├── App.tsx                       # Route definitions
│   ├── main.tsx                      # Entry point: providers + render
│   └── index.css                     # Tailwind base + global styles
│
├── docs/                             # Documentation
│   ├── getting-started.md
│   ├── architecture.md
│   ├── configuration.md
│   └── project-structure.md
│
├── .env                              # Environment variables (not committed)
├── .gitignore
├── AGENTS.md                         # opencode agent context
├── components.json                   # Shadcn/ui configuration
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript configuration
├── tsconfig.app.json                 # App-level TS config
├── tsconfig.node.json                # Node-level TS config
├── vite.config.ts                    # Vite config (path alias, plugins)
└── README.md                         # Project overview
```

## Key Design Decisions

| Decision                                     | Rationale                                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **TanStack Query**                           | Automatic cache invalidation on mutations, deduplication of requests, background refetch |
| **Shadcn/ui primitives**                     | Unstyled, accessible components (Radix) with Tailwind styling — full design control      |
| **Local state for forms**                    | Simpler than form libraries for basic forms; RHF + Zod available for complex cases       |
| **`verbatimModuleSyntax`**                   | TypeScript 6.0 requirement — explicit type-only imports prevent runtime bundling issues  |
| **Context for auth, Query for server state** | Separates authentication concerns from data fetching concerns                            |
