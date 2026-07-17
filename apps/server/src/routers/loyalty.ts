import { ORPCError } from "@orpc/server";
import { and, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import { user } from "../db/schema/auth";
import {
  loyaltyScanCode,
  loyaltyTransaction,
  reward,
  rewardRedemption,
} from "../db/schema/loyalty";
import { tenant, tenantMembership } from "../db/schema/tenant";
import { executionCtxStorage } from "../lib/execution-context";
import { settleExpiredPoints } from "../lib/loyalty-points";
import {
  protectedProcedure,
  tenantOperatorProcedure,
  tenantOwnerProcedure,
} from "../lib/orpc";
import { sendTransactionalPush } from "../lib/push";

// Tempo de vida do código de identificação do cliente (QR). Curto de
// propósito: o crédito só é válido se o cliente gerou o QR há instantes,
// garantindo presença física no caixa.
const SCAN_CODE_TTL_MS = 90_000;
// Resgate dá mais folga que o crédito — o cliente precisa caminhar até o caixa.
const REDEMPTION_TTL_MS = 300_000;
// Janela em que o frentista pode estornar um crédito que ELE MESMO fez
// (corrigir o próprio erro de digitação). Owner e admin estornam sempre.
const REVERSAL_WINDOW_MS = 30 * 60_000;

const formatCentsBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const loyaltyRouter = {
  // ── Cliente ────────────────────────────────────────────────────────────────

  /**
   * Gera (ou renova) o código de identificação do cliente para o tenant atual.
   * O app exibe como QR; o frentista escaneia. Um código ativo por cliente.
   */
  issueScanCode: protectedProcedure.handler(async ({ context }) => {
    if (!context.tenant) {
      throw new ORPCError("BAD_REQUEST", { message: "Tenant é obrigatório" });
    }

    const now = new Date();
    const code = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + SCAN_CODE_TTL_MS);

    await context.db
      .insert(loyaltyScanCode)
      .values({
        id: crypto.randomUUID(),
        tenantId: context.tenant.id,
        userId: context.session.user.id,
        code,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [loyaltyScanCode.tenantId, loyaltyScanCode.userId],
        set: { code, expiresAt, updatedAt: now },
      });

    return { code, expiresAt };
  }),

  /**
   * Saldo de pontos do cliente no tenant atual. Roda o expire pass antes
   * (materializa créditos vencidos) e devolve também o que está perto de
   * vencer, para o app avisar o cliente.
   */
  myBalance: protectedProcedure.handler(async ({ context }) => {
    if (!context.tenant) {
      throw new ORPCError("BAD_REQUEST", { message: "Tenant é obrigatório" });
    }

    const snapshot = await settleExpiredPoints(
      context.db,
      context.tenant.id,
      context.session.user.id,
    );

    return { balance: snapshot.balance, expiringSoon: snapshot.expiringSoon };
  }),

  /** Extrato de pontos do cliente. */
  myTransactions: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .handler(async ({ context, input }) => {
      if (!context.tenant) {
        throw new ORPCError("BAD_REQUEST", { message: "Tenant é obrigatório" });
      }

      return context.db
        .select({
          id: loyaltyTransaction.id,
          points: loyaltyTransaction.points,
          amountCents: loyaltyTransaction.amountCents,
          expiresAt: loyaltyTransaction.expiresAt,
          // Rótulo da linha no extrato do app: crédito, resgate, expiração ou
          // estorno.
          type: sql<
            "credit" | "expiration" | "redemption" | "reversal"
          >`case when ${loyaltyTransaction.expiredTransactionId} is not null then 'expiration' when ${loyaltyTransaction.reversedTransactionId} is not null then 'reversal' when ${loyaltyTransaction.points} >= 0 then 'credit' else 'redemption' end`,
          createdAt: loyaltyTransaction.createdAt,
        })
        .from(loyaltyTransaction)
        .where(
          and(
            eq(loyaltyTransaction.tenantId, context.tenant.id),
            eq(loyaltyTransaction.userId, context.session.user.id),
          ),
        )
        .orderBy(desc(loyaltyTransaction.createdAt))
        .limit(input.limit);
    }),

  /**
   * Total gasto em abastecimentos pelo cliente na rede ativa, agregado do
   * ledger (amountCents dos créditos; estornos entram negativos e corrigem o
   * total). Não roda o expire pass — expiração de pontos não muda o valor
   * gasto em reais.
   */
  mySpending: protectedProcedure.handler(async ({ context }) => {
    if (!context.tenant) {
      throw new ORPCError("BAD_REQUEST", { message: "Tenant é obrigatório" });
    }

    const rows = await context.db
      .select({
        // "YYYY-MM" — chave estável do mês, formatação fica no client.
        month: sql<string>`to_char(date_trunc('month', ${loyaltyTransaction.createdAt}), 'YYYY-MM')`,
        totalCents: sql<number>`coalesce(sum(${loyaltyTransaction.amountCents}), 0)::int`,
        // Abastecimentos do mês; estornos descontam (netam) a contagem.
        count: sql<number>`(count(*) filter (where ${loyaltyTransaction.amountCents} > 0) - count(*) filter (where ${loyaltyTransaction.amountCents} < 0))::int`,
      })
      .from(loyaltyTransaction)
      .where(
        and(
          eq(loyaltyTransaction.tenantId, context.tenant.id),
          eq(loyaltyTransaction.userId, context.session.user.id),
          isNotNull(loyaltyTransaction.amountCents),
        ),
      )
      .groupBy(sql`date_trunc('month', ${loyaltyTransaction.createdAt})`)
      .orderBy(desc(sql`date_trunc('month', ${loyaltyTransaction.createdAt})`));

    const currentMonth = new Date().toISOString().slice(0, 7);

    return {
      totalCents: rows.reduce((sum, r) => sum + r.totalCents, 0),
      currentMonthCents:
        rows.find((r) => r.month === currentMonth)?.totalCents ?? 0,
      byMonth: rows.slice(0, 12),
    };
  }),

  /**
   * Papel do usuário logado no tenant atual — o app mobile usa para decidir se
   * exibe a tela de operador. Cliente comum não é membro e recebe role: null.
   */
  myRole: protectedProcedure.handler(async ({ context }) => {
    if (!context.tenant) {
      return { role: null as "owner" | "operator" | null };
    }

    const [membership] = await context.db
      .select({ role: tenantMembership.role })
      .from(tenantMembership)
      .where(
        and(
          eq(tenantMembership.tenantId, context.tenant.id),
          eq(tenantMembership.userId, context.session.user.id),
        ),
      );

    return { role: (membership?.role ?? null) as "owner" | "operator" | null };
  }),

  // ── Operador (frentista/owner) ──────────────────────────────────────────────

  /**
   * Credita pontos ao cliente identificado pelo código escaneado.
   * O valor vem SEMPRE do operador autenticado — nunca do app do cliente —,
   * e o código é consumido de forma atômica (uso único) para não ser reusado.
   */
  credit: tenantOperatorProcedure
    .input(
      z.object({
        code: z.string().min(1),
        amountCents: z.number().int().positive(),
      }),
    )
    .handler(async ({ context, input }) => {
      const now = new Date();

      // Teto por crédito (proteção contra typo do frentista) — checado ANTES
      // de consumir o código, para o cliente não precisar gerar outro QR.
      const maxCents = context.tenant.maxCreditAmountCents;
      if (maxCents !== null && input.amountCents > maxCents) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Valor acima do máximo permitido por crédito (${formatCentsBRL(maxCents)}). Confira o valor digitado.`,
        });
      }

      // Consome o código: só credita quem conseguir deletar a linha. Se dois
      // pedidos chegarem com o mesmo código, apenas um recebe a linha de volta.
      const [claimed] = await context.db
        .delete(loyaltyScanCode)
        .where(
          and(
            eq(loyaltyScanCode.tenantId, context.tenant.id),
            eq(loyaltyScanCode.code, input.code),
          ),
        )
        .returning({
          userId: loyaltyScanCode.userId,
          expiresAt: loyaltyScanCode.expiresAt,
        });

      if (!claimed) {
        throw new ORPCError("NOT_FOUND", {
          message: "Código inválido ou já utilizado",
        });
      }

      if (claimed.expiresAt.getTime() < now.getTime()) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Código expirado. Peça ao cliente para gerar um novo.",
        });
      }

      // pointsPerReal vem como string (coluna numeric). O valor final de
      // pontos é sempre inteiro (arredonda para baixo).
      const multiplier = Number(context.tenant.pointsPerReal);
      const points = Math.floor((input.amountCents * multiplier) / 100);

      // Validade estampada no momento do crédito: mudar a config depois não
      // altera pontos já ganhos.
      const validityDays = context.tenant.pointsValidityDays;
      const expiresAt = validityDays
        ? new Date(now.getTime() + validityDays * 86_400_000)
        : null;

      const [created] = await context.db
        .insert(loyaltyTransaction)
        .values({
          id: crypto.randomUUID(),
          tenantId: context.tenant.id,
          userId: claimed.userId,
          operatorUserId: context.session.user.id,
          points,
          amountCents: input.amountCents,
          expiresAt,
          createdAt: now,
        })
        .returning({ id: loyaltyTransaction.id });

      const [customer] = await context.db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, claimed.userId));

      // Avisa o cliente FORA do caminho crítico da resposta (waitUntil):
      // o caixa não pode esperar a Expo Push API, e falha no aviso jamais
      // desfaz o crédito. type "points" deep-linka pra tela de pontos.
      if (points > 0) {
        const pushPromise = sendTransactionalPush(context.db, {
          tenantId: context.tenant.id,
          tenantSlug: context.tenant.slug,
          userId: claimed.userId,
          title: "Pontos creditados!",
          body: `Você ganhou ${points} ${points === 1 ? "ponto" : "pontos"} no abastecimento de ${formatCentsBRL(input.amountCents)}.`,
          data: { type: "points" },
        }).catch((err) => {
          console.error("[loyalty] Falha ao notificar crédito:", err);
        });
        executionCtxStorage.getStore()?.waitUntil(pushPromise);
      }

      return {
        // A tela de sucesso usa o id para oferecer o estorno imediato.
        transactionId: created.id,
        points,
        amountCents: input.amountCents,
        customerName: customer?.name ?? null,
      };
    }),

  /**
   * Estorna um crédito lançado por engano. Débito manual ligado ao crédito de
   * origem (reversedTransactionId) no valor do que AINDA RESTA do lote — o
   * saldo do cliente nunca fica negativo: o que já virou brinde entregue ou
   * expirou a rede absorve. O unique no schema barra o segundo estorno.
   *
   * Permissão: o frentista estorna só os créditos que ele mesmo fez, em até
   * 30 minutos; owner (e admin da plataforma) estorna qualquer um, sempre.
   */
  reverseCredit: tenantOperatorProcedure
    .input(z.object({ transactionId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const tenantId = context.tenant.id;
      const callerId = context.session.user.id;
      const isPlatformAdmin =
        (context.session.user as { role?: string }).role === "admin";

      return context.db.transaction(async (tx) => {
        const now = new Date();

        const [original] = await tx
          .select({
            id: loyaltyTransaction.id,
            userId: loyaltyTransaction.userId,
            operatorUserId: loyaltyTransaction.operatorUserId,
            points: loyaltyTransaction.points,
            amountCents: loyaltyTransaction.amountCents,
            createdAt: loyaltyTransaction.createdAt,
          })
          .from(loyaltyTransaction)
          .where(
            and(
              eq(loyaltyTransaction.id, input.transactionId),
              eq(loyaltyTransaction.tenantId, tenantId),
              gt(loyaltyTransaction.points, 0),
              gt(loyaltyTransaction.amountCents, 0),
            ),
          );

        if (!original || original.amountCents === null) {
          throw new ORPCError("NOT_FOUND", {
            message: "Crédito não encontrado",
          });
        }

        // requireOperatorAccess não injeta a membership (admin da plataforma
        // não tem uma) — buscamos o papel aqui para diferenciar owner de
        // frentista.
        if (!isPlatformAdmin) {
          const [membership] = await tx
            .select({ role: tenantMembership.role })
            .from(tenantMembership)
            .where(
              and(
                eq(tenantMembership.tenantId, tenantId),
                eq(tenantMembership.userId, callerId),
              ),
            );

          if (membership?.role !== "owner") {
            if (original.operatorUserId !== callerId) {
              throw new ORPCError("FORBIDDEN", {
                message: "Você só pode estornar créditos feitos por você.",
              });
            }
            if (now.getTime() - original.createdAt.getTime() > REVERSAL_WINDOW_MS) {
              throw new ORPCError("FORBIDDEN", {
                message:
                  "O prazo de 30 minutos para estornar acabou. Peça ao dono da rede.",
              });
            }
          }
        }

        // Expire pass dentro da transação: um lote que venceu não pode ser
        // estornado (viraria saldo negativo). Os lotes voltam já ajustados.
        const snapshot = await settleExpiredPoints(
          tx,
          tenantId,
          original.userId,
          now,
        );

        const lot = snapshot.lots.find((l) => l.id === original.id);
        const remaining = lot?.remaining ?? 0;

        if (remaining <= 0) {
          throw new ORPCError("BAD_REQUEST", {
            message:
              "Nada a estornar — os pontos deste crédito já foram resgatados ou expiraram.",
          });
        }

        // Portão de uso único: o unique em reversedTransactionId garante no
        // máximo um estorno por crédito, mesmo sob concorrência.
        const [reversal] = await tx
          .insert(loyaltyTransaction)
          .values({
            id: crypto.randomUUID(),
            tenantId,
            userId: original.userId,
            // Quem estornou (trilha de auditoria) — não quem creditou.
            operatorUserId: callerId,
            points: -remaining,
            // Negativo de propósito: neta o crédito original nos totais de
            // auditoria e no total gasto do cliente.
            amountCents: -original.amountCents,
            reversedTransactionId: original.id,
            createdAt: now,
          })
          .onConflictDoNothing({
            target: [loyaltyTransaction.reversedTransactionId],
          })
          .returning({ id: loyaltyTransaction.id });

        if (!reversal) {
          throw new ORPCError("CONFLICT", {
            message: "Este crédito já foi estornado.",
          });
        }

        const [customer] = await tx
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, original.userId));

        return {
          reversedPoints: remaining,
          amountCents: original.amountCents,
          customerName: customer?.name ?? null,
        };
      });
    }),

  // ── Gestão de operadores (owner) ────────────────────────────────────────────

  /** Lista os operadores (frentistas) do tenant. */
  listOperators: tenantOwnerProcedure.handler(async ({ context }) => {
    return context.db
      .select({
        userId: tenantMembership.userId,
        name: user.name,
        email: user.email,
        createdAt: tenantMembership.createdAt,
      })
      .from(tenantMembership)
      .innerJoin(user, eq(tenantMembership.userId, user.id))
      .where(
        and(
          eq(tenantMembership.tenantId, context.tenant.id),
          eq(tenantMembership.role, "operator"),
        ),
      )
      .orderBy(desc(tenantMembership.createdAt));
  }),

  /**
   * Promove um usuário existente (por e-mail) a operador do tenant.
   * O usuário precisa já ter conta. Não rebaixa um owner.
   */
  grantOperator: tenantOwnerProcedure
    .input(z.object({ email: z.string().email() }))
    .handler(async ({ context, input }) => {
      const [target] = await context.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, input.email));

      if (!target) {
        throw new ORPCError("NOT_FOUND", {
          message: "Nenhum usuário com esse e-mail. Peça para criar a conta.",
        });
      }

      const [existing] = await context.db
        .select({ role: tenantMembership.role })
        .from(tenantMembership)
        .where(
          and(
            eq(tenantMembership.tenantId, context.tenant.id),
            eq(tenantMembership.userId, target.id),
          ),
        );

      if (existing?.role === "owner") {
        throw new ORPCError("CONFLICT", {
          message: "Esse usuário já é owner da rede.",
        });
      }

      const now = new Date();
      await context.db
        .insert(tenantMembership)
        .values({
          id: crypto.randomUUID(),
          tenantId: context.tenant.id,
          userId: target.id,
          role: "operator",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [tenantMembership.tenantId, tenantMembership.userId],
          set: { role: "operator", updatedAt: now },
        });

      return { success: true };
    }),

  /** Remove o papel de operador de um usuário. */
  revokeOperator: tenantOwnerProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await context.db
        .delete(tenantMembership)
        .where(
          and(
            eq(tenantMembership.tenantId, context.tenant.id),
            eq(tenantMembership.userId, input.userId),
            eq(tenantMembership.role, "operator"),
          ),
        );

      return { success: true };
    }),

  // ── Configuração do programa (owner) ────────────────────────────────────────

  /** Configuração de fidelidade do tenant (multiplicador, validade e teto). */
  getConfig: tenantOwnerProcedure.handler(({ context }) => {
    return {
      pointsPerReal: Number(context.tenant.pointsPerReal),
      pointsValidityDays: context.tenant.pointsValidityDays ?? null,
      maxCreditAmountCents: context.tenant.maxCreditAmountCents ?? null,
    };
  }),

  /**
   * Atualiza o multiplicador de pontos por real (aceita frações, ex.: 2,5) e
   * a validade dos pontos em dias (null = nunca expiram). A validade só vale
   * para créditos futuros — pontos já ganhos mantêm a validade de origem.
   */
  updateConfig: tenantOwnerProcedure
    .input(
      z.object({
        pointsPerReal: z.number().min(0).max(1000),
        pointsValidityDays: z.number().int().min(1).max(3650).nullable(),
        // Teto por crédito em centavos. Null = sem teto.
        maxCreditAmountCents: z.number().int().min(1).nullable(),
      }),
    )
    .handler(async ({ context, input }) => {
      // Arredonda para 2 casas — a coluna é numeric(6,2).
      const value = Math.round(input.pointsPerReal * 100) / 100;

      await context.db
        .update(tenant)
        .set({
          pointsPerReal: value.toString(),
          pointsValidityDays: input.pointsValidityDays,
          maxCreditAmountCents: input.maxCreditAmountCents,
          updatedAt: new Date(),
        })
        .where(eq(tenant.id, context.tenant.id));

      return {
        pointsPerReal: value,
        pointsValidityDays: input.pointsValidityDays,
        maxCreditAmountCents: input.maxCreditAmountCents,
      };
    }),

  // ── Auditoria (owner) ───────────────────────────────────────────────────────

  /** Totais do programa de fidelidade do tenant. */
  auditTotals: tenantOwnerProcedure.handler(async ({ context }) => {
    const [row] = await context.db
      .select({
        // Fluxo de crédito (caixa): amountCents preenchido — inclui os
        // estornos (amountCents negativo), que netam o total automaticamente.
        totalPoints: sql<number>`coalesce(sum(${loyaltyTransaction.points}) filter (where ${loyaltyTransaction.amountCents} is not null), 0)::int`,
        // Só créditos de verdade (> 0): estorno não conta como +1 crédito.
        credits: sql<number>`(count(*) filter (where ${loyaltyTransaction.amountCents} > 0))::int`,
        customers: sql<number>`count(distinct ${loyaltyTransaction.userId})::int`,
        // Pontos em circulação = a dívida da rede. SUM(points) sem filtro,
        // pelo invariante do ledger. Superestimado para clientes dormentes:
        // o expire pass é preguiçoso e só materializa expirações quando o
        // saldo deles é lido.
        outstandingPoints: sql<number>`coalesce(sum(${loyaltyTransaction.points}), 0)::int`,
        redeemedPoints: sql<number>`abs(coalesce(sum(${loyaltyTransaction.points}) filter (where ${loyaltyTransaction.redemptionId} is not null), 0))::int`,
        expiredPoints: sql<number>`abs(coalesce(sum(${loyaltyTransaction.points}) filter (where ${loyaltyTransaction.expiredTransactionId} is not null), 0))::int`,
      })
      .from(loyaltyTransaction)
      .where(eq(loyaltyTransaction.tenantId, context.tenant.id));

    return {
      totalPoints: row?.totalPoints ?? 0,
      credits: row?.credits ?? 0,
      customers: row?.customers ?? 0,
      outstandingPoints: row?.outstandingPoints ?? 0,
      redeemedPoints: row?.redeemedPoints ?? 0,
      expiredPoints: row?.expiredPoints ?? 0,
    };
  }),

  /** Ranking de clientes por saldo de pontos. */
  topCustomers: tenantOwnerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .handler(async ({ context, input }) => {
      return context.db
        .select({
          userId: loyaltyTransaction.userId,
          name: user.name,
          email: user.email,
          points: sql<number>`coalesce(sum(${loyaltyTransaction.points}), 0)::int`,
        })
        .from(loyaltyTransaction)
        .innerJoin(user, eq(loyaltyTransaction.userId, user.id))
        .where(eq(loyaltyTransaction.tenantId, context.tenant.id))
        .groupBy(loyaltyTransaction.userId, user.name, user.email)
        .orderBy(desc(sql`sum(${loyaltyTransaction.points})`))
        .limit(input.limit);
    }),

  /** Ranking de operadores por total de pontos creditados. */
  topOperators: tenantOwnerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .handler(async ({ context, input }) => {
      return context.db
        .select({
          userId: loyaltyTransaction.operatorUserId,
          name: user.name,
          email: user.email,
          points: sql<number>`coalesce(sum(${loyaltyTransaction.points}), 0)::int`,
          credits: sql<number>`count(*)::int`,
        })
        .from(loyaltyTransaction)
        .innerJoin(user, eq(loyaltyTransaction.operatorUserId, user.id))
        // Só transações de CRÉDITO (caixa): amountCents preenchido. Resgates
        // também gravam o operador (débito), mas não contam como crédito.
        .where(
          and(
            eq(loyaltyTransaction.tenantId, context.tenant.id),
            isNotNull(loyaltyTransaction.amountCents),
          ),
        )
        .groupBy(loyaltyTransaction.operatorUserId, user.name, user.email)
        .orderBy(desc(sql`sum(${loyaltyTransaction.points})`))
        .limit(input.limit);
    }),

  /**
   * Histórico de resgates concluídos — trilha de auditoria: quem resgatou,
   * qual recompensa, quantos pontos e qual operador confirmou a entrega.
   */
  listRedemptions: tenantOwnerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .handler(async ({ context, input }) => {
      const operator = alias(user, "operator");

      return context.db
        .select({
          id: rewardRedemption.id,
          rewardName: reward.name,
          costPoints: rewardRedemption.costPoints,
          customerName: user.name,
          customerEmail: user.email,
          operatorName: operator.name,
          operatorEmail: operator.email,
          fulfilledAt: rewardRedemption.fulfilledAt,
          createdAt: rewardRedemption.createdAt,
        })
        .from(rewardRedemption)
        .innerJoin(reward, eq(rewardRedemption.rewardId, reward.id))
        .innerJoin(user, eq(rewardRedemption.userId, user.id))
        .leftJoin(operator, eq(rewardRedemption.operatorUserId, operator.id))
        .where(
          and(
            eq(rewardRedemption.tenantId, context.tenant.id),
            eq(rewardRedemption.status, "fulfilled"),
          ),
        )
        .orderBy(desc(rewardRedemption.fulfilledAt))
        .limit(input.limit);
    }),

  /**
   * Transações de crédito feitas por um operador — o detalhe por trás do
   * ranking. Cada linha é um crédito no caixa: cliente beneficiado, valor e
   * pontos.
   */
  operatorTransactions: tenantOwnerProcedure
    .input(
      z.object({
        operatorUserId: z.string().min(1),
        limit: z.number().int().min(1).max(200).default(100),
      }),
    )
    .handler(async ({ context, input }) => {
      return context.db
        .select({
          id: loyaltyTransaction.id,
          points: loyaltyTransaction.points,
          amountCents: loyaltyTransaction.amountCents,
          createdAt: loyaltyTransaction.createdAt,
          customerName: user.name,
          customerEmail: user.email,
        })
        .from(loyaltyTransaction)
        .innerJoin(user, eq(loyaltyTransaction.userId, user.id))
        .where(
          and(
            eq(loyaltyTransaction.tenantId, context.tenant.id),
            eq(loyaltyTransaction.operatorUserId, input.operatorUserId),
            isNotNull(loyaltyTransaction.amountCents),
          ),
        )
        .orderBy(desc(loyaltyTransaction.createdAt))
        .limit(input.limit);
    }),

  // ── Recompensas: catálogo e resgate ─────────────────────────────────────────

  /** Catálogo de recompensas ativas (cliente). */
  listRewards: protectedProcedure.handler(async ({ context }) => {
    if (!context.tenant) {
      throw new ORPCError("BAD_REQUEST", { message: "Tenant é obrigatório" });
    }

    return context.db
      .select({
        id: reward.id,
        name: reward.name,
        description: reward.description,
        costPoints: reward.costPoints,
        imageUrl: reward.imageUrl,
        stock: reward.stock,
      })
      .from(reward)
      .where(
        and(eq(reward.tenantId, context.tenant.id), eq(reward.isActive, true)),
      )
      .orderBy(reward.costPoints);
  }),

  /**
   * Cria um pedido de resgate e devolve o código (QR) para o cliente mostrar
   * no caixa. NÃO debita pontos — o débito acontece na entrega. Faz uma
   * checagem prévia de saldo/estoque só para feedback imediato.
   */
  requestRedemption: protectedProcedure
    .input(z.object({ rewardId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      if (!context.tenant) {
        throw new ORPCError("BAD_REQUEST", { message: "Tenant é obrigatório" });
      }

      const [rw] = await context.db
        .select()
        .from(reward)
        .where(
          and(
            eq(reward.id, input.rewardId),
            eq(reward.tenantId, context.tenant.id),
            eq(reward.isActive, true),
          ),
        );

      if (!rw) {
        throw new ORPCError("NOT_FOUND", { message: "Recompensa indisponível" });
      }
      if (rw.stock !== null && rw.stock <= 0) {
        throw new ORPCError("BAD_REQUEST", { message: "Recompensa esgotada" });
      }

      // Expire pass antes da checagem: pontos vencidos não pagam resgate.
      const snapshot = await settleExpiredPoints(
        context.db,
        context.tenant.id,
        context.session.user.id,
      );

      if (snapshot.balance < rw.costPoints) {
        throw new ORPCError("BAD_REQUEST", { message: "Saldo insuficiente" });
      }

      const now = new Date();
      const code = crypto.randomUUID();
      const expiresAt = new Date(now.getTime() + REDEMPTION_TTL_MS);

      await context.db.insert(rewardRedemption).values({
        id: crypto.randomUUID(),
        tenantId: context.tenant.id,
        userId: context.session.user.id,
        rewardId: rw.id,
        costPoints: rw.costPoints,
        code,
        status: "pending",
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });

      return {
        code,
        expiresAt,
        reward: { name: rw.name, costPoints: rw.costPoints },
      };
    }),

  /**
   * Lê um resgate pelo código sem consumi-lo — o operador vê o que está sendo
   * resgatado (recompensa, custo, cliente) antes de confirmar a entrega.
   */
  peekRedemption: tenantOperatorProcedure
    .input(z.object({ code: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const [rd] = await context.db
        .select({
          costPoints: rewardRedemption.costPoints,
          rewardId: rewardRedemption.rewardId,
          userId: rewardRedemption.userId,
          status: rewardRedemption.status,
          expiresAt: rewardRedemption.expiresAt,
        })
        .from(rewardRedemption)
        .where(
          and(
            eq(rewardRedemption.tenantId, context.tenant.id),
            eq(rewardRedemption.code, input.code),
          ),
        );

      if (!rd || rd.status !== "pending" || rd.expiresAt.getTime() < Date.now()) {
        throw new ORPCError("NOT_FOUND", {
          message: "Código de resgate inválido, expirado ou já utilizado",
        });
      }

      const [rw] = await context.db
        .select({ name: reward.name })
        .from(reward)
        .where(eq(reward.id, rd.rewardId));
      const [customer] = await context.db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, rd.userId));

      return {
        rewardName: rw?.name ?? null,
        costPoints: rd.costPoints,
        customerName: customer?.name ?? null,
      };
    }),

  /**
   * Confirma a entrega de um resgate escaneado pelo operador. Numa transação:
   * consome o código (uso único), recheca o saldo, baixa o estoque e debita
   * os pontos. Qualquer falha desfaz tudo e o resgate volta a pending.
   */
  confirmRedemption: tenantOperatorProcedure
    .input(z.object({ code: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const tenantId = context.tenant.id;
      const operatorId = context.session.user.id;

      const result = await context.db.transaction(async (tx) => {
        const now = new Date();

        // Portão de uso único: só um pedido consegue sair de "pending".
        const [rd] = await tx
          .update(rewardRedemption)
          .set({
            status: "fulfilled",
            operatorUserId: operatorId,
            fulfilledAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(rewardRedemption.tenantId, tenantId),
              eq(rewardRedemption.code, input.code),
              eq(rewardRedemption.status, "pending"),
              gt(rewardRedemption.expiresAt, now),
            ),
          )
          .returning();

        if (!rd) {
          throw new ORPCError("NOT_FOUND", {
            message: "Código de resgate inválido, expirado ou já utilizado",
          });
        }

        // Recheca o saldo AGORA (pode ter mudado desde o pedido), já com o
        // expire pass dentro da transação: pontos vencidos não pagam resgate.
        const snapshot = await settleExpiredPoints(tx, tenantId, rd.userId, now);

        if (snapshot.balance < rd.costPoints) {
          throw new ORPCError("BAD_REQUEST", { message: "Saldo insuficiente" });
        }

        // Baixa o estoque, se limitado.
        const [rw] = await tx
          .select({ name: reward.name, stock: reward.stock })
          .from(reward)
          .where(eq(reward.id, rd.rewardId));

        if (rw?.stock !== null && rw?.stock !== undefined) {
          const [dec] = await tx
            .update(reward)
            .set({ stock: sql`${reward.stock} - 1`, updatedAt: now })
            .where(and(eq(reward.id, rd.rewardId), gt(reward.stock, 0)))
            .returning({ id: reward.id });

          if (!dec) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Recompensa esgotada",
            });
          }
        }

        // Debita: transação negativa ligada ao resgate.
        await tx.insert(loyaltyTransaction).values({
          id: crypto.randomUUID(),
          tenantId,
          userId: rd.userId,
          operatorUserId: operatorId,
          points: -rd.costPoints,
          redemptionId: rd.id,
          createdAt: now,
        });

        const [customer] = await tx
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, rd.userId));

        return {
          rewardName: rw?.name ?? null,
          points: rd.costPoints,
          customerName: customer?.name ?? null,
          customerUserId: rd.userId,
        };
      });

      // Push só DEPOIS do commit — um rollback não pode gerar aviso de
      // resgate concluído. Fora do caminho crítico (waitUntil) e
      // best-effort: falha no push não desfaz a entrega.
      const pushPromise = sendTransactionalPush(context.db, {
        tenantId,
        tenantSlug: context.tenant.slug,
        userId: result.customerUserId,
        title: "Resgate concluído!",
        body: result.rewardName
          ? `Você resgatou ${result.rewardName}. ${result.points} pontos foram debitados.`
          : `Resgate concluído. ${result.points} pontos foram debitados.`,
        data: { type: "points" },
      }).catch((err) => {
        console.error("[loyalty] Falha ao notificar resgate:", err);
      });
      executionCtxStorage.getStore()?.waitUntil(pushPromise);

      const { customerUserId: _customerUserId, ...response } = result;
      return response;
    }),

  // ── Recompensas: gestão (owner) ─────────────────────────────────────────────

  /** Lista todas as recompensas do tenant (ativas e arquivadas). */
  listRewardsAdmin: tenantOwnerProcedure.handler(async ({ context }) => {
    return context.db
      .select()
      .from(reward)
      .where(eq(reward.tenantId, context.tenant.id))
      .orderBy(desc(reward.createdAt));
  }),

  /** Cria uma recompensa. */
  createReward: tenantOwnerProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().nullish(),
        costPoints: z.number().int().min(1),
        imageUrl: z.string().url().nullish(),
        stock: z.number().int().min(0).nullish(),
      }),
    )
    .handler(async ({ context, input }) => {
      const now = new Date();
      const [created] = await context.db
        .insert(reward)
        .values({
          id: crypto.randomUUID(),
          tenantId: context.tenant.id,
          name: input.name,
          description: input.description ?? null,
          costPoints: input.costPoints,
          imageUrl: input.imageUrl ?? null,
          stock: input.stock ?? null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return created;
    }),

  /** Atualiza uma recompensa (inclui ativar/arquivar via isActive). */
  updateReward: tenantOwnerProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).optional(),
        description: z.string().nullish(),
        costPoints: z.number().int().min(1).optional(),
        imageUrl: z.string().url().nullish(),
        stock: z.number().int().min(0).nullish(),
        isActive: z.boolean().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const { id, ...fields } = input;
      const [updated] = await context.db
        .update(reward)
        .set({ ...fields, updatedAt: new Date() })
        .where(
          and(eq(reward.id, id), eq(reward.tenantId, context.tenant.id)),
        )
        .returning();

      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Recompensa não encontrada",
        });
      }
      return updated;
    }),

  /** Arquiva uma recompensa (soft delete — preserva o histórico de resgates). */
  deleteReward: tenantOwnerProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await context.db
        .update(reward)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(eq(reward.id, input.id), eq(reward.tenantId, context.tenant.id)),
        );
      return { success: true };
    }),
};
