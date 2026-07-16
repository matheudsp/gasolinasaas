import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { pushNotification, pushNotificationRecipient } from "../db/schema/push";
import { protectedProcedure } from "../lib/orpc";

export const userRouter = {
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