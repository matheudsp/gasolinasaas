# ShipFullStack

A modern TypeScript stack that combines React, TanStack Start, Hono, ORPC,  Expo and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Node.js** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Husky** - Git hooks for code quality
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```
## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:
```bash
pnpm db:push
```


Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
Use the Expo Go app to run the mobile application.
The API is running at [http://localhost:3000](http://localhost:3000).







## Project Structure

```
ShipFullStack/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Start)
│   ├── native/      # Mobile application (React Native, Expo)
│   └── server/      # Backend API (Hono, ORPC)
```

## Available Scripts

- `pnpm dev`: Start all applications in development mode
- `pnpm build`: Build all applications
- `pnpm dev:web`: Start only the web application
- `pnpm dev:server`: Start only the server
- `pnpm check-types`: Check TypeScript types across all apps
- `pnpm dev:native`: Start the React Native/Expo development server
- `pnpm db:push`: Push schema changes to database
- `pnpm db:studio`: Open database studio UI

## 🚀 Deployment

This project supports **automatic deployment** via GitHub Actions. Simply push to the `main` branch and your apps will be automatically deployed to Cloudflare!

### Quick Setup

1. **Configure Cloudflare Secrets** in GitHub:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

2. **Push to deploy**:
   ```bash
   git add .
   git commit -m "feat: your changes"
   git push origin main
   ```

That's it! Your changes will be automatically deployed. 🎉

### Features

- ✅ **Smart deployment**: Only deploys apps with actual changes
- ✅ **PR preview**: Automatic build checks on pull requests
- ✅ **Manual trigger**: Deploy anytime from GitHub Actions
- ✅ **Deployment summary**: Clear status for each deployment

### Documentation

- [Quick Setup Guide](./.github/SETUP.md)
- [Detailed Deployment Guide](./.github/DEPLOYMENT.md)

### Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Deploy all applications
pnpm run deploy

# Deploy only web app
pnpm run deploy:web

# Deploy only server app
pnpm run deploy:server
```

Pro 👉 https://www.easystarter.dev

## Join Discord

https://discord.gg/KZ6uwbHZG4
