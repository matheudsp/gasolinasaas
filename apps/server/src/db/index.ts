import { env } from "cloudflare:workers";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

// neon-http não suporta db.transaction() — use neon-serverless com Pool (WebSocket).
// Cloudflare Workers tem WebSocket nativo, não precisa de `ws` nem neonConfig.
const pool = new Pool({ connectionString: env.DATABASE_URL || "" });

export const db = drizzle({ client: pool });