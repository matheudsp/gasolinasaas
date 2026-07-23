import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  numeric,
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
 * mantemos um saldo mutável solto. Quatro tipos de linha:
 * - crédito (caixa): points > 0, amountCents > 0;
 * - resgate: points < 0, redemptionId preenchido;
 * - expiração: points < 0, expiredTransactionId preenchido (materializada
 *   pelo expire pass em lib/loyalty-points.ts — mantém SUM(points) correto);
 * - estorno: points < 0, reversedTransactionId preenchido, amountCents < 0
 *   (neta o crédito original em auditorias e no total gasto do cliente).
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
    // Validade deste crédito (createdAt + tenant.pointsValidityDays no momento
    // do crédito). Null = não expira. Sempre null em débitos.
    expiresAt: timestamp("expires_at"),
    // Preenchido quando a transação é a EXPIRAÇÃO (débito automático) do
    // saldo restante de um crédito vencido — aponta para o crédito de origem.
    // O unique abaixo garante no máximo uma expiração por crédito, o que torna
    // o expire pass idempotente mesmo sob concorrência.
    expiredTransactionId: text("expired_transaction_id").references(
      (): AnyPgColumn => loyaltyTransaction.id,
      { onDelete: "cascade" }
    ),
    // Preenchido quando a transação é o ESTORNO (débito manual do operador)
    // de um crédito lançado por engano — aponta para o crédito de origem.
    // O unique abaixo garante no máximo um estorno por crédito (portão de
    // uso único, mesmo truque da expiração). O valor do estorno é SEMPRE o
    // remaining do lote (nunca -points), então saldo nunca fica negativo.
    reversedTransactionId: text("reversed_transaction_id").references(
      (): AnyPgColumn => loyaltyTransaction.id,
      { onDelete: "cascade" }
    ),
    createdAt: timestamp("created_at").notNull(),
  },
  (t) => [
    index("loyalty_transaction_user_idx").on(t.tenantId, t.userId),
    unique("loyalty_expiration_per_credit").on(t.expiredTransactionId),
    unique("loyalty_reversal_per_credit").on(t.reversedTransactionId),
  ]
);

/**
 * Campanha temporária que MULTIPLICA os pontos ganhos no crédito (ex.: pontos
 * em dobro no fim de semana). O `credit` procura a campanha ativa na data e
 * aplica `multiplier` SOBRE o `pointsPerReal` do tenant.
 *
 * Tabela (e não campos no tenant) para permitir agendar com antecedência,
 * manter histórico e ter mais de uma no tempo. A que vale é a única com
 * `isActive` e `now` dentro de [startsAt, endsAt].
 */
export const loyaltyCampaign = pgTable(
  "loyalty_campaign",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // numeric pra aceitar 1.5x, 2x, 3x... Aplicado sobre pointsPerReal.
    multiplier: numeric("multiplier", { precision: 4, scale: 2 }).notNull(),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    // Interruptor manual — o dono pode desligar antes do fim sem apagar.
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => [index("loyalty_campaign_tenant_idx").on(t.tenantId)]
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
