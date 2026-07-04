import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
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

// Histórico de campanhas de notificação enviadas pelo tenant (agregado).
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

/**
 * Registro individual de entrega/leitura de uma notificação por usuário.
 *
 * pushNotification é o registro agregado da campanha (quantos no total,
 * quantos com sucesso/falha); esta tabela é o detalhe por destinatário —
 * permite responder "este usuário recebeu esta notificação?" e "ele já
 * leu?", o que o agregado sozinho não permite.
 *
 * IMPORTANTE — acoplamento operacional: o serviço que efetivamente dispara
 * os pushes via FCM/APNs deve inserir uma linha aqui para cada usuário-alvo
 * no momento do envio (deliveredAt = now() em caso de sucesso na entrega
 * àquele token, null em caso de falha). Sem isso, a listagem de
 * notificações do usuário em users.ts sempre retorna vazio.
 */
export const pushNotificationRecipient = pgTable(
  "push_notification_recipient",
  {
    id: text("id").primaryKey(),
    notificationId: text("notification_id")
      .notNull()
      .references(() => pushNotification.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deliveredAt: timestamp("delivered_at"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => [
    // Evita duplicar o mesmo destinatário para a mesma notificação
    // (ex: reenvio acidental, múltiplos tokens do mesmo usuário).
    unique("unique_notification_recipient").on(t.notificationId, t.userId),
    index("push_notification_recipient_user_idx").on(t.userId),
  ]
);