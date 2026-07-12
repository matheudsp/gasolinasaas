import { ORPCError } from "@orpc/server";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";

import { user } from "../db/schema/auth";
import {
  loyaltyScanCode,
  loyaltyTransaction,
  reward,
  rewardRedemption,
} from "../db/schema/loyalty";
import { tenant, tenantMembership } from "../db/schema/tenant";
import {
  protectedProcedure,
  tenantOperatorProcedure,
  tenantOwnerProcedure,
} from "../lib/orpc";

// Tempo de vida do código de identificação do cliente (QR). Curto de
// propósito: o crédito só é válido se o cliente gerou o QR há instantes,
// garantindo presença física no caixa.
const SCAN_CODE_TTL_MS = 90_000;
// Resgate dá mais folga que o crédito — o cliente precisa caminhar até o caixa.
const REDEMPTION_TTL_MS = 300_000;

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

  /** Saldo de pontos do cliente no tenant atual. */
  myBalance: protectedProcedure.handler(async ({ context }) => {
    if (!context.tenant) {
      throw new ORPCError("BAD_REQUEST", { message: "Tenant é obrigatório" });
    }

    const [row] = await context.db
      .select({
        balance: sql<number>`coalesce(sum(${loyaltyTransaction.points}), 0)::int`,
      })
      .from(loyaltyTransaction)
      .where(
        and(
          eq(loyaltyTransaction.tenantId, context.tenant.id),
          eq(loyaltyTransaction.userId, context.session.user.id),
        ),
      );

    return { balance: row?.balance ?? 0 };
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

      await context.db.insert(loyaltyTransaction).values({
        id: crypto.randomUUID(),
        tenantId: context.tenant.id,
        userId: claimed.userId,
        operatorUserId: context.session.user.id,
        points,
        amountCents: input.amountCents,
        createdAt: now,
      });

      const [customer] = await context.db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, claimed.userId));

      return {
        points,
        amountCents: input.amountCents,
        customerName: customer?.name ?? null,
      };
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

  /** Configuração de fidelidade do tenant (pontos por real gasto). */
  getConfig: tenantOwnerProcedure.handler(({ context }) => {
    return { pointsPerReal: Number(context.tenant.pointsPerReal) };
  }),

  /** Atualiza o multiplicador de pontos por real (aceita frações, ex.: 2,5). */
  updateConfig: tenantOwnerProcedure
    .input(z.object({ pointsPerReal: z.number().min(0).max(1000) }))
    .handler(async ({ context, input }) => {
      // Arredonda para 2 casas — a coluna é numeric(6,2).
      const value = Math.round(input.pointsPerReal * 100) / 100;

      await context.db
        .update(tenant)
        .set({ pointsPerReal: value.toString(), updatedAt: new Date() })
        .where(eq(tenant.id, context.tenant.id));

      return { pointsPerReal: value };
    }),

  // ── Auditoria (owner) ───────────────────────────────────────────────────────

  /** Totais do programa de fidelidade do tenant. */
  auditTotals: tenantOwnerProcedure.handler(async ({ context }) => {
    const [row] = await context.db
      .select({
        totalPoints: sql<number>`coalesce(sum(case when ${loyaltyTransaction.points} > 0 then ${loyaltyTransaction.points} else 0 end), 0)::int`,
        credits: sql<number>`count(*)::int`,
        customers: sql<number>`count(distinct ${loyaltyTransaction.userId})::int`,
      })
      .from(loyaltyTransaction)
      .where(eq(loyaltyTransaction.tenantId, context.tenant.id));

    return {
      totalPoints: row?.totalPoints ?? 0,
      credits: row?.credits ?? 0,
      customers: row?.customers ?? 0,
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
        // innerJoin em operatorUserId já descarta linhas sem operador (resgates).
        .innerJoin(user, eq(loyaltyTransaction.operatorUserId, user.id))
        .where(eq(loyaltyTransaction.tenantId, context.tenant.id))
        .groupBy(loyaltyTransaction.operatorUserId, user.name, user.email)
        .orderBy(desc(sql`sum(${loyaltyTransaction.points})`))
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

      const [bal] = await context.db
        .select({
          balance: sql<number>`coalesce(sum(${loyaltyTransaction.points}), 0)::int`,
        })
        .from(loyaltyTransaction)
        .where(
          and(
            eq(loyaltyTransaction.tenantId, context.tenant.id),
            eq(loyaltyTransaction.userId, context.session.user.id),
          ),
        );

      if ((bal?.balance ?? 0) < rw.costPoints) {
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

      return context.db.transaction(async (tx) => {
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

        // Recheca o saldo AGORA (pode ter mudado desde o pedido).
        const [bal] = await tx
          .select({
            balance: sql<number>`coalesce(sum(${loyaltyTransaction.points}), 0)::int`,
          })
          .from(loyaltyTransaction)
          .where(
            and(
              eq(loyaltyTransaction.tenantId, tenantId),
              eq(loyaltyTransaction.userId, rd.userId),
            ),
          );

        if ((bal?.balance ?? 0) < rd.costPoints) {
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
        };
      });
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
