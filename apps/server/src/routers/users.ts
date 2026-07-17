import { and, desc, eq, isNull, lt, ne } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { user } from "../db/schema/auth";
import { pushNotification, pushNotificationRecipient } from "../db/schema/push";
import { isValidCpf, normalizeCpf } from "../lib/cpf";
import { protectedProcedure, publicProcedure } from "../lib/orpc";

export const userRouter = {
  /**
   * Verifica se um CPF está disponível para cadastro. Público de propósito:
   * o SignUp multi-step consulta ANTES de criar a conta, para dar um erro
   * amigável no step do CPF em vez de uma violação de unique no final.
   */
  checkCpf: publicProcedure
    .input(z.object({ cpf: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const cpf = normalizeCpf(input.cpf);

      if (!isValidCpf(cpf)) {
        throw new ORPCError("BAD_REQUEST", { message: "CPF inválido" });
      }

      const [existing] = await context.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.cpf, cpf));

      return { available: !existing };
    }),

  /**
   * Grava o CPF do usuário logado — o caminho do gate pós-login (base legada
   * e contas criadas via Google, que não têm CPF).
   */
  setCpf: protectedProcedure
    .input(z.object({ cpf: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const cpf = normalizeCpf(input.cpf);

      if (!isValidCpf(cpf)) {
        throw new ORPCError("BAD_REQUEST", { message: "CPF inválido" });
      }

      const [taken] = await context.db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.cpf, cpf), ne(user.id, context.session.user.id)));

      if (taken) {
        throw new ORPCError("CONFLICT", {
          message: "Este CPF já está cadastrado em outra conta.",
        });
      }

      try {
        await context.db
          .update(user)
          .set({ cpf, updatedAt: new Date() })
          .where(eq(user.id, context.session.user.id));
      } catch {
        // Corrida residual: dois cadastros simultâneos com o mesmo CPF — o
        // unique do banco pega o segundo.
        throw new ORPCError("CONFLICT", {
          message: "Este CPF já está cadastrado em outra conta.",
        });
      }

      return { success: true };
    }),

  /**
   * Lista as notificações efetivamente destinadas ao usuário autenticado,
   * com status de entrega/leitura reais — via pushNotificationRecipient,
   * não mais inferidas a partir dos tenants do pushToken.
   */
  listNotifications: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
        /** ISO date da última notificação recebida na página anterior */
        cursor: z.string().datetime().nullish(),
      }),
    )
    .handler(async ({ context, input }) => {
      // Com o app guarda-chuva a mesma conta recebe push de várias redes —
      // sem o filtro de tenant a lista misturaria notificações de todas.
      if (!context.tenant) {
        throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
      }

      const whereClause = and(
        eq(pushNotificationRecipient.userId, context.session.user.id),
        eq(pushNotification.tenantId, context.tenant.id),
        ...(input.cursor
          ? [lt(pushNotification.createdAt, new Date(input.cursor))]
          : []),
      );

      const rows = await context.db
        .select({
          id: pushNotification.id,
          title: pushNotification.title,
          body: pushNotification.body,
          dataJson: pushNotification.dataJson,
          sentAt: pushNotification.sentAt,
          createdAt: pushNotification.createdAt,
          deliveredAt: pushNotificationRecipient.deliveredAt,
          readAt: pushNotificationRecipient.readAt,
        })
        .from(pushNotificationRecipient)
        .innerJoin(
          pushNotification,
          eq(pushNotificationRecipient.notificationId, pushNotification.id),
        )
        .where(whereClause)
        .orderBy(desc(pushNotification.createdAt))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const page = hasMore ? rows.slice(0, input.limit) : rows;

      return {
        notifications: page.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          data: parseDataJson(n.dataJson),
          sentAt: n.sentAt,
          createdAt: n.createdAt,
          deliveredAt: n.deliveredAt,
          isRead: n.readAt !== null,
          readAt: n.readAt,
        })),
        nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
      };
    }),

  /**
   * Marca uma notificação como lida para o usuário autenticado.
   * Falha com NOT_FOUND se a notificação não existir ou não pertencer
   * a este usuário (evita que um usuário marque notificações de outro).
   */
  markNotificationAsRead: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .handler(async ({ context, input }) => {
      const [updated] = await context.db
        .update(pushNotificationRecipient)
        .set({ readAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(pushNotificationRecipient.notificationId, input.notificationId),
            eq(pushNotificationRecipient.userId, context.session.user.id),
          ),
        )
        .returning({
          id: pushNotificationRecipient.id,
          readAt: pushNotificationRecipient.readAt,
        });

      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Notificação não encontrada para este usuário",
        });
      }

      return updated;
    }),

  /**
   * Contagem de notificações não lidas — para badge/indicador no app.
   */
  getUnreadNotificationCount: protectedProcedure.handler(async ({ context }) => {
    // Mesma razão do listNotifications: o badge é da rede ativa, não global.
    if (!context.tenant) {
      throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
    }

    const rows = await context.db
      .select({ id: pushNotificationRecipient.id })
      .from(pushNotificationRecipient)
      .innerJoin(
        pushNotification,
        eq(pushNotificationRecipient.notificationId, pushNotification.id),
      )
      .where(
        and(
          eq(pushNotificationRecipient.userId, context.session.user.id),
          eq(pushNotification.tenantId, context.tenant.id),
          isNull(pushNotificationRecipient.readAt),
        ),
      );

    return { count: rows.length };
  }),
};

function parseDataJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}