# Configuration

All configuration is managed via environment variables loaded at build time (Vite `import.meta.env`).

## API Connection

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Base URL of the multi-tenant SaaS API |

Set in a `.env` file at the project root:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Build Configuration

### Vite (`vite.config.ts`)

| Setting | Value | Description |
|---|---|---|
| `resolve.alias['@']` | `./src` | Path alias for imports (`@/components/...`) |

### TypeScript (`tsconfig.app.json`)

| Setting | Value |
|---|---|
| `target` | `ES2022` |
| `module` | `ESNext` |
| `moduleResolution` | `bundler` |
| `jsx` | `react-jsx` |
| `verbatimModuleSyntax` | `true` |
| `erasableSyntaxOnly` | `true` |

### Environment-specific behavior

### Development (`npm run dev`)

- Vite dev server on `http://localhost:5173`
- HMR enabled
- Source maps

### Production (`npm run build`)

- TypeScript type check (`tsc -b`)
- Vite production build to `dist/`
- Preview with `npm run preview`
