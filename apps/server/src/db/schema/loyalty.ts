import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { tenant } from "./tenant";

/**
 * Código efêmero que identifica o cliente no caixa. O app do cliente exibe
 * como QR; o frentista escaneia para creditar os pontos.
 *
 * É de uso único: consumido (deletado) no momento do crédito, o que evita
 * reaproveitar o mesmo QR. Há no máximo um código ativo por cliente dentro do
 * tenant — cada refresh do QR sobrescreve o anterior.
 */
export const loyaltyScanCode = pgTable(
  "loyalty_scan_code",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => [unique("unique_scan_code_per_customer").on(t.tenantId, t.userId)]
);

/**
 * Ledger de pontos de fidelidade. O saldo do cliente é SUM(points); nunca
 * mantemos um saldo mutável solto. Crédito por abastecimento é positivo;
 * resgates futuros entram como valores negativos.
 */
export const loyaltyTransaction = pgTable(
  "loyalty_transaction",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Operador (frentista/owner) que registrou o crédito. Null em resgates ou
    // ajustes automáticos futuros.
    operatorUserId: text("operator_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    points: integer("points").notNull(),
    // Valor do abastecimento em centavos que originou o crédito.
    amountCents: integer("amount_cents"),
    // Preenchido quando a transação é um resgate (débito) de recompensa.
    redemptionId: text("redemption_id").references(() => rewardRedemption.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull(),
  },
  (t) => [index("loyalty_transaction_user_idx").on(t.tenantId, t.userId)]
);

/**
 * Catálogo de recompensas do tenant. costPoints é o custo em pontos.
 * imageUrl aponta pra foto do produto (Fase 2 migra para chave no R2).
 * stock null = ilimitado.
 */
export const reward = pgTable("reward", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenant.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  costPoints: integer("cost_points").notNull(),
  imageUrl: text("image_url"),
  stock: integer("stock"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

/**
 * Pedido de resgate. O débito só acontece na entrega (confirmRedemption pelo
 * operador). code é o QR de uso único que o cliente exibe no caixa.
 * status: "pending" | "fulfilled" | "expired".
 */
export const rewardRedemption = pgTable(
  "reward_redemption",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rewardId: text("reward_id")
      .notNull()
      .references(() => reward.id, { onDelete: "cascade" }),
    // Custo em pontos "congelado" no momento do pedido.
    costPoints: integer("cost_points").notNull(),
    code: text("code").notNull().unique(),
    status: text("status").notNull().default("pending"),
    operatorUserId: text("operator_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at").notNull(),
    fulfilledAt: timestamp("fulfilled_at"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => [index("reward_redemption_user_idx").on(t.tenantId, t.userId)]
);
