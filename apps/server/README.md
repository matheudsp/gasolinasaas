# Server Structure

## 📁 Directory Structure

```
apps/server/src/
├── handlers/           # Request handlers
│   ├── api.ts         # OpenAPI handler configuration
│   ├── rpc.ts         # RPC handler configuration
│   └── index.ts       # Handler exports
├── middlewares/       # Reusable middleware
│   ├── cors.ts        # CORS configurations
│   ├── error.ts       # Global error handler
│   ├── session.ts     # Session authentication middleware
│   └── index.ts       # Middleware exports
├── utils/            # Utility functions
│   └── tenant.ts     # Multi-tenant request handling
├── lib/              # Core libraries
│   ├── auth.ts       # Better Auth configuration
│   └── context.ts    # Request context creator
├── routers/          # API route definitions
│   └── index.ts
├── db/               # Database configuration
└── index.ts          # Main application entry point
```

## 🎯 Key Benefits

### Before Refactoring
- ❌ 154 lines in main file
- ❌ All logic mixed together
- ❌ Hard to test individual middleware
- ❌ Difficult to maintain

### After Refactoring
- ✅ 89 lines in main file (42% reduction)
- ✅ Separated concerns
- ✅ Easy to test each module
- ✅ Clear, maintainable structure

## 📖 Usage Examples

### Adding New Middleware

```typescript
// 1. Create new middleware file
// src/middlewares/rate-limit.ts
import type { MiddlewareHandler } from "hono";

export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  // Your logic here
  await next();
};

// 2. Export from index
// src/middlewares/index.ts
export { rateLimitMiddleware } from "./rate-limit";

// 3. Use in main app
// src/index.ts
import { rateLimitMiddleware } from "./middlewares";
app.use("/api/*", rateLimitMiddleware);
```

### Adding New Handler

```typescript
// 1. Create handler file
// src/handlers/webhook.ts
export const webhookHandler = /* ... */;

// 2. Export and use
import { webhookHandler } from "./handlers/webhook";
```

## 🔧 Middleware Execution Order

1. **Error Handler** - Global error catching
2. **Logger** - Request logging
3. **Session** - Authentication (API/RPC routes only)
4. **CORS** - Cross-origin configuration
5. **Auth** - Better Auth endpoints
6. **API/RPC Handlers** - Business logic

## 📝 Notes

- All middleware is now testable in isolation
- Barrel files (`index.ts`) provide clean import paths
- Each module has a single responsibility
- Easy to add/remove features without touching main file
