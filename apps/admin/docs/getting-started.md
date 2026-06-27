# Getting Started

## Prerequisites

- Node.js 20+
- npm 10+
- API backend [`multi-tenant-saas-api`](https://github.com/anomalyco/multi-tenant-saas-api) running on `http://localhost:8000`

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app is available at `http://localhost:5173`.

## Default Admin

The API creates a default superadmin on first startup:

| Field | Value |
|---|---|
| Email | `admin@saas.example` |
| Password | `admin123` |

## Environment

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Base URL of the API |

Create a `.env` file in the project root to override:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
