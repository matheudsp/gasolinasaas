import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";

import type { Db } from "../db";
import { paymentHistory, plan, subscription } from "../db/schema/subscription";
import { tenant } from "../db/schema/tenant";
import { adminProcedure, tenantOwnerProcedure } from "../lib/orpc";

/**
 * Gestão manual de assinaturas e pagamentos (sem gateway).
 *
 * O modelo é de "carnê": cada pagamento registrado como pago compra um
 * ciclo do plano (mensal ou anual). O status persiste apenas o estado
 * administrativo (trial/active/suspended/cancelled); atraso é derivado
 * de currentPeriodEnd — nunca gravado — para não exigir cron.
 */

const priceSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Formato de valor inválido (use 99.90)");

const paymentStatusSchema = z.enum(["paid", "failed", "refunded"]);

/** Avança uma data em um ciclo do plano. */
function addInterval(date: Date, interval: string): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + (interval === "yearly" ? 12 : 1));
  return d;
}

/**
 * Próximo período após um ciclo pago/renovado:
 * - em dia (ou adiantado): o novo ciclo emenda no fim do atual;
 * - vencida: o novo ciclo começa agora (dias em atraso não são cobrados).
 */
function nextPeriod(currentEnd: Date, interval: string, now: Date) {
  const start = currentEnd > now ? currentEnd : now;
  return { start, end: addInterval(start, interval) };
}

/**
 * Detalhe completo de uma assinatura (tenant + plano + pagamentos +
 * isOverdue derivado). Compartilhado pelo getById do admin e pelo
 * getMine do owner.
 */
async function loadSubscriptionDetail(db: Db, subscriptionId: string) {
  const record = await db
    .select({
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEndsAt: subscription.trialEndsAt,
      cancelledAt: subscription.cancelledAt,
      createdAt: subscription.createdAt,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      planId: plan.id,
      planName: plan.name,
      planPrice: plan.price,
      planInterval: plan.interval,
      planDescription: plan.description,
      planMaxStations: plan.maxStations,
    })
    .from(subscription)
    .innerJoin(tenant, eq(subscription.tenantId, tenant.id))
    .innerJoin(plan, eq(subscription.planId, plan.id))
    .where(eq(subscription.id, subscriptionId))
    .limit(1)
    .then((rows) => rows.at(0));

  if (!record) return null;

  const payments = await db
    .select()
    .from(paymentHistory)
    .where(eq(paymentHistory.subscriptionId, record.id))
    .orderBy(desc(paymentHistory.createdAt));

  const now = new Date();
  const lastPaidAt = payments
    .filter((p) => p.status === "paid" && p.paidAt)
    .reduce<Date | null>(
      (latest, p) => (!latest || (p.paidAt && p.paidAt > latest) ? p.paidAt : latest),
      null,
    );

  return {
    ...record,
    lastPaidAt,
    isOverdue:
      (record.status === "active" || record.status === "trial") &&
      record.currentPeriodEnd < now,
    payments,
  };
}

async function findSubscriptionWithPlan(db: Db, subscriptionId: string) {
  const record = await db
    .select({
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      planPrice: plan.price,
      planInterval: plan.interval,
    })
    .from(subscription)
    .innerJoin(plan, eq(subscription.planId, plan.id))
    .where(eq(subscription.id, subscriptionId))
    .limit(1)
    .then((rows) => rows.at(0));

  if (!record) {
    throw new ORPCError("NOT_FOUND", { message: "Assinatura não encontrada." });
  }
  return record;
}

export const subscriptionRouter = {
  /**
   * Lista assinaturas com tenant, plano, último pagamento e flag de
   * vencimento (isOverdue) calculada na hora.
   */
  list: adminProcedure
    .input(z.object({ tenantId: z.string().optional() }).optional())
    .handler(async ({ context, input }) => {
      const conditions = input?.tenantId
        ? [eq(subscription.tenantId, input.tenantId)]
        : [];

      const rows = await context.db
        .select({
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          trialEndsAt: subscription.trialEndsAt,
          cancelledAt: subscription.cancelledAt,
          tenantId: tenant.id,
          tenantName: tenant.name,
          planId: plan.id,
          planName: plan.name,
          planPrice: plan.price,
          planInterval: plan.interval,
        })
        .from(subscription)
        .innerJoin(tenant, eq(subscription.tenantId, tenant.id))
        .innerJoin(plan, eq(subscription.planId, plan.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(subscription.createdAt));

      const ids = rows.map((r) => r.id);
      const lastPayments = ids.length
        ? await context.db
            .select({
              subscriptionId: paymentHistory.subscriptionId,
              lastPaidAt: sql<string | null>`max(${paymentHistory.paidAt})`,
            })
            .from(paymentHistory)
            .where(
              and(
                inArray(paymentHistory.subscriptionId, ids),
                eq(paymentHistory.status, "paid"),
              ),
            )
            .groupBy(paymentHistory.subscriptionId)
        : [];

      const lastPaidBySubscription = new Map(
        lastPayments.map((p) => [p.subscriptionId, p.lastPaidAt]),
      );

      const now = new Date();
      return rows.map((row) => ({
        ...row,
        lastPaidAt: lastPaidBySubscription.get(row.id) ?? null,
        // Vencida = deveria estar pagando e o período acabou.
        isOverdue:
          (row.status === "active" || row.status === "trial") &&
          row.currentPeriodEnd < now,
      }));
    }),

  /** Detalhe completo para a página assinaturas/{id} do admin. */
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      const detail = await loadSubscriptionDetail(context.db, input.id);
      if (!detail) {
        throw new ORPCError("NOT_FOUND", {
          message: "Assinatura não encontrada.",
        });
      }
      return detail;
    }),

  /**
   * Assinatura do tenant do próprio owner (página "Minha Assinatura").
   * Retorna a mais recente — inclusive cancelada, para o owner entender
   * a própria situação — ou null se a rede nunca teve assinatura.
   */
  getMine: tenantOwnerProcedure.handler(async ({ context }) => {
    const latest = await context.db
      .select({ id: subscription.id })
      .from(subscription)
      .where(eq(subscription.tenantId, context.tenant.id))
      .orderBy(desc(subscription.createdAt))
      .limit(1)
      .then((rows) => rows.at(0));

    if (!latest) return null;
    return loadSubscriptionDetail(context.db, latest.id);
  }),

  /**
   * Ajuste manual do período vigente (correções administrativas —
   * ex: acerto de data combinado com o cliente).
   */
  updatePeriod: adminProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        currentPeriodStart: z.coerce.date(),
        currentPeriodEnd: z.coerce.date(),
      }),
    )
    .handler(async ({ context, input }) => {
      if (input.currentPeriodEnd <= input.currentPeriodStart) {
        throw new ORPCError("BAD_REQUEST", {
          message: "O fim do período precisa ser depois do início.",
        });
      }

      const [updated] = await context.db
        .update(subscription)
        .set({
          currentPeriodStart: input.currentPeriodStart,
          currentPeriodEnd: input.currentPeriodEnd,
          updatedAt: new Date(),
        })
        .where(eq(subscription.id, input.subscriptionId))
        .returning();

      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Assinatura não encontrada.",
        });
      }
      return updated;
    }),

  create: adminProcedure
    .input(
      z.object({
        tenantId: z.string(),
        planId: z.string(),
        status: z.enum(["trial", "active"]).default("active"),
        trialDays: z.number().int().min(0).default(0),
      }),
    )
    .handler(async ({ context, input }) => {
      const tenantRecord = await context.db
        .select({ id: tenant.id })
        .from(tenant)
        .where(eq(tenant.id, input.tenantId))
        .limit(1)
        .then((r) => r.at(0));

      if (!tenantRecord) {
        throw new ORPCError("NOT_FOUND", { message: "Domínio não encontrado." });
      }

      const planRecord = await context.db
        .select({ id: plan.id, interval: plan.interval, isActive: plan.isActive })
        .from(plan)
        .where(eq(plan.id, input.planId))
        .limit(1)
        .then((r) => r.at(0));

      if (!planRecord) {
        throw new ORPCError("NOT_FOUND", { message: "Plano não encontrado." });
      }
      if (!planRecord.isActive) {
        throw new ORPCError("BAD_REQUEST", { message: "Plano inativo." });
      }

      // Um tenant só carrega uma assinatura vigente por vez; as canceladas
      // ficam como histórico.
      const existing = await context.db
        .select({ id: subscription.id })
        .from(subscription)
        .where(
          and(
            eq(subscription.tenantId, input.tenantId),
            ne(subscription.status, "cancelled"),
          ),
        )
        .limit(1)
        .then((r) => r.at(0));

      if (existing) {
        throw new ORPCError("CONFLICT", {
          message:
            "Este domínio já tem uma assinatura vigente. Cancele-a antes de criar outra.",
        });
      }

      const now = new Date();
      const trialEndsAt =
        input.trialDays > 0
          ? new Date(now.getTime() + input.trialDays * 86_400_000)
          : undefined;

      const [created] = await context.db
        .insert(subscription)
        .values({
          id: crypto.randomUUID(),
          tenantId: input.tenantId,
          planId: input.planId,
          status: input.status,
          currentPeriodStart: now,
          // Trial: o primeiro "período" é o próprio trial; depois o
          // primeiro pagamento abre o ciclo normal.
          currentPeriodEnd:
            input.status === "trial" && trialEndsAt
              ? trialEndsAt
              : addInterval(now, planRecord.interval),
          trialEndsAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return created;
    }),

  changePlan: adminProcedure
    .input(z.object({ subscriptionId: z.string(), planId: z.string() }))
    .handler(async ({ context, input }) => {
      const planRecord = await context.db
        .select({ id: plan.id, isActive: plan.isActive })
        .from(plan)
        .where(eq(plan.id, input.planId))
        .limit(1)
        .then((r) => r.at(0));

      if (!planRecord) {
        throw new ORPCError("NOT_FOUND", { message: "Plano não encontrado." });
      }
      if (!planRecord.isActive) {
        throw new ORPCError("BAD_REQUEST", { message: "Plano inativo." });
      }

      // O período vigente não muda: o novo plano vale a partir do
      // próximo ciclo (próximo pagamento já usa o novo preço/intervalo).
      const [updated] = await context.db
        .update(subscription)
        .set({ planId: input.planId, updatedAt: new Date() })
        .where(eq(subscription.id, input.subscriptionId))
        .returning();

      if (!updated) throw new ORPCError("NOT_FOUND");
      return updated;
    }),

  /**
   * Registra um pagamento manual (transferência, pix, dinheiro...).
   * Pagamento "paid" compra um ciclo: estende o período respeitando o
   * intervalo do plano e reativa a assinatura (inclusive suspensa).
   */
  recordPayment: adminProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        // Sem valor explícito, assume o preço atual do plano.
        amount: priceSchema.optional(),
        status: paymentStatusSchema,
        notes: z.string().optional(),
        externalId: z.string().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const sub = await findSubscriptionWithPlan(
        context.db,
        input.subscriptionId,
      );

      if (sub.status === "cancelled" && input.status === "paid") {
        throw new ORPCError("CONFLICT", {
          message:
            "Assinatura cancelada — renove ou crie uma nova antes de registrar pagamento.",
        });
      }

      const now = new Date();

      return context.db.transaction(async (tx) => {
        const [record] = await tx
          .insert(paymentHistory)
          .values({
            id: crypto.randomUUID(),
            subscriptionId: input.subscriptionId,
            amount: input.amount ?? sub.planPrice,
            status: input.status,
            paidAt: input.status === "paid" ? now : null,
            notes: input.notes ?? null,
            externalId: input.externalId ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (input.status === "paid") {
          const period = nextPeriod(sub.currentPeriodEnd, sub.planInterval, now);
          await tx
            .update(subscription)
            .set({
              status: "active",
              currentPeriodStart: period.start,
              currentPeriodEnd: period.end,
              updatedAt: now,
            })
            .where(eq(subscription.id, input.subscriptionId));
        }

        return record;
      });
    }),

  /**
   * Renovação manual sem pagamento (cortesia/ajuste). Mesmo cálculo de
   * ciclo do pagamento pago; também reativa canceladas e suspensas.
   */
  renew: adminProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .handler(async ({ context, input }) => {
      const sub = await findSubscriptionWithPlan(
        context.db,
        input.subscriptionId,
      );

      const now = new Date();
      const period = nextPeriod(sub.currentPeriodEnd, sub.planInterval, now);

      const [updated] = await context.db
        .update(subscription)
        .set({
          status: "active",
          currentPeriodStart: period.start,
          currentPeriodEnd: period.end,
          cancelledAt: null,
          updatedAt: now,
        })
        .where(eq(subscription.id, input.subscriptionId))
        .returning();

      if (!updated) throw new ORPCError("NOT_FOUND");
      return updated;
    }),

  /** Suspende por inadimplência (ou qualquer motivo administrativo). */
  suspend: adminProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .handler(async ({ context, input }) => {
      const sub = await findSubscriptionWithPlan(
        context.db,
        input.subscriptionId,
      );

      if (sub.status === "cancelled") {
        throw new ORPCError("CONFLICT", {
          message: "Assinatura cancelada não pode ser suspensa.",
        });
      }

      const [updated] = await context.db
        .update(subscription)
        .set({ status: "suspended", updatedAt: new Date() })
        .where(eq(subscription.id, input.subscriptionId))
        .returning();

      if (!updated) throw new ORPCError("NOT_FOUND");
      return updated;
    }),

  cancel: adminProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .handler(async ({ context, input }) => {
      const now = new Date();
      const [updated] = await context.db
        .update(subscription)
        .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
        .where(eq(subscription.id, input.subscriptionId))
        .returning();

      if (!updated) throw new ORPCError("NOT_FOUND");
      return updated;
    }),

  /** Histórico de pagamentos de uma assinatura, mais recente primeiro. */
  payments: adminProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .handler(async ({ context, input }) => {
      return context.db
        .select()
        .from(paymentHistory)
        .where(eq(paymentHistory.subscriptionId, input.subscriptionId))
        .orderBy(desc(paymentHistory.createdAt));
    }),
};
