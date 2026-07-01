import { integer, pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
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

// Histórico de notificações push enviadas pelo tenant.
export const pushNotification = pgTable("push_notification", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenant.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  /** JSON serializado dos dados extras enviados junto à notificação. */
  dataJson: text("data_json"),
  /** "sent" | "partial" | "failed" */
  status: text("status").notNull().default("sent"),
  recipientCount: integer("recipient_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});