import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

export type Db = ReturnType<typeof createDb>;

export function createDb(connectionString: string) {
  return drizzle({ client: new Pool({ connectionString }) });
}
