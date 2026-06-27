import { pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { tenant } from "./tenant";

export const pushPlatform = pgEnum("push_platform", ["ios", "android", "web"]);

export const pushToken = pgTable(
  "push_token",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    platform: pushPlatform("platform").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => [
    // Um mesmo token de dispositivo não pode estar duplicado dentro do mesmo tenant.
    // A unicidade é (tenantId, token) — não token globalmente, porque projetos
    // FCM/APNs distintos podem gerar tokens com o mesmo valor.
    unique("unique_push_token_per_tenant").on(t.tenantId, t.token),
  ]
);