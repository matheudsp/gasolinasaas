import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { user } from "../db/schema/auth";
import { pushNotification, pushNotificationRecipient, pushToken } from "../db/schema/push";
import { ORPCError } from "@orpc/server";
import { protectedProcedure, tenantOwnerProcedure } from "../lib/orpc";
import { type ExpoPushMessage, type ExpoPushTicket, sendExpoPushBatch } from "../lib/push";

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const pushRouter = {
  /**
   * Registra (ou atualiza) o token de push do dispositivo do usuário autenticado
   * para o tenant atual. Chamado pelo app mobile após obter o Expo push token.
   */
  registerToken: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        platform: z.enum(["ios", "android", "web"]),
      }),
    )
    .handler(async ({ context, input }) => {
      if (!context.tenant) {
        throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
      }

      const now = new Date();
      await context.db
        .insert(pushToken)
        .values({
          id: crypto.randomUUID(),
          userId: context.session.user.id,
          tenantId: context.tenant.id,
          token: input.token,
          platform: input.platform,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [pushToken.tenantId, pushToken.token],
          set: {
            userId: context.session.user.id,
            platform: input.platform,
            updatedAt: now,
          },
        });

      return { success: true };
    }),

  /**
   * Remove o token de push do dispositivo do usuário autenticado dentro do tenant.
   */
  unregisterToken: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      if (!context.tenant) {
        throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
      }

      await context.db
        .delete(pushToken)
        .where(
          and(
            eq(pushToken.tenantId, context.tenant.id),
            eq(pushToken.userId, context.session.user.id),
            eq(pushToken.token, input.token),
          ),
        );

      return { success: true };
    }),

  /**
   * Lista todos os tokens ativos do tenant com informações básicas do usuário.
   * Apenas o owner do tenant pode chamar essa rota.
   */
  listTokens: tenantOwnerProcedure.handler(async ({ context }) => {
    return context.db
      .select({
        id: pushToken.id,
        token: pushToken.token,
        platform: pushToken.platform,
        createdAt: pushToken.createdAt,
        updatedAt: pushToken.updatedAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(pushToken)
      .innerJoin(user, eq(pushToken.userId, user.id))
      .where(eq(pushToken.tenantId, context.tenant.id))
      .orderBy(desc(pushToken.createdAt));
  }),

  /**
   * Envia uma notificação push para todos os usuários do tenant.
   * Processa em lotes de 100 (limite da Expo Push API).
   * Tokens inválidos (DeviceNotRegistered) são removidos automaticamente.
   *
   * Além do registro agregado em pushNotification, grava uma linha em
   * pushNotificationRecipient por USUÁRIO (não por token/dispositivo) —
   * um usuário com 2 aparelhos gera 1 único recipient, marcado como
   * entregue se pelo menos um dos aparelhos recebeu com sucesso.
   */
  send: tenantOwnerProcedure
    .input(
      z.object({
        title: z.string().min(1),
        body: z.string().min(1),
        // Destino do deep link ao tocar na notificação. União discriminada:
        // "promotion" abre um posto, "points" abre a tela de pontos. Sem
        // data = notificação genérica (abre a lista de notificações).
        data: z
          .discriminatedUnion("type", [
            z.object({
              type: z.literal("promotion"),
              stationId: z.string().min(1),
            }),
            z.object({ type: z.literal("points") }),
          ])
          .optional(),
        sound: z.enum(["default"]).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      // tenantSlug sempre no payload: o app descarta notificação de rede que
      // não é a ativa (uma notificação antiga na bandeja, de antes de uma
      // troca de rede, deep-linkaria pra um posto de outro tenant).
      const payload: Record<string, unknown> = {
        ...(input.data ?? {}),
        tenantSlug: context.tenant.slug,
      };

      const tokens = await context.db
        .select({ id: pushToken.id, token: pushToken.token, userId: pushToken.userId })
        .from(pushToken)
        .where(eq(pushToken.tenantId, context.tenant.id));

      const now = new Date();
      const notificationId = crypto.randomUUID();

      if (tokens.length === 0) {
        const [record] = await context.db
          .insert(pushNotification)
          .values({
            id: notificationId,
            tenantId: context.tenant.id,
            title: input.title,
            body: input.body,
            kind: "campaign",
            dataJson: JSON.stringify(payload),
            status: "sent",
            recipientCount: 0,
            successCount: 0,
            failureCount: 0,
            sentAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        return record;
      }

      // Monta as mensagens para a Expo Push API
      const messages: ExpoPushMessage[] = tokens.map((t) => ({
        to: t.token,
        title: input.title,
        body: input.body,
        data: payload,
        ...(input.sound ? { sound: input.sound } : {}),
        priority: "high",
      }));

      // Envia em lotes de 100
      const BATCH_SIZE = 100;
      const tickets: ExpoPushTicket[] = [];
      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE);
        const results = await sendExpoPushBatch(batch);
        tickets.push(...results);
      }

      // Uma passada só: agrega falhas de token, contagens e entrega POR USUÁRIO.
      // tickets está alinhado 1:1 com tokens (mesmo índice), pois messages
      // foi construído com tokens.map() na mesma ordem.
      const invalidTokenIds: string[] = [];
      let successCount = 0;
      let failureCount = 0;
      const userDeliveredMap = new Map<string, boolean>();

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const tokenRow = tokens[i];
        const wasSuccess = ticket.status === "ok";

        if (wasSuccess) {
          successCount++;
        } else {
          failureCount++;
          if (ticket.details?.error === "DeviceNotRegistered" && tokenRow) {
            invalidTokenIds.push(tokenRow.id);
          }
        }

        if (tokenRow) {
          // Um usuário conta como "entregue" se QUALQUER um dos seus
          // dispositivos recebeu com sucesso — não sobrescreve true com false.
          const alreadyDelivered = userDeliveredMap.get(tokenRow.userId) ?? false;
          userDeliveredMap.set(tokenRow.userId, alreadyDelivered || wasSuccess);
        }
      }

      // Remove tokens inválidos
      if (invalidTokenIds.length > 0) {
        await context.db
          .delete(pushToken)
          .where(inArray(pushToken.id, invalidTokenIds));
      }

      const status =
        failureCount === 0
          ? "sent"
          : successCount === 0
            ? "failed"
            : "partial";

      const [record] = await context.db
        .insert(pushNotification)
        .values({
          id: notificationId,
          tenantId: context.tenant.id,
          title: input.title,
          body: input.body,
          kind: "campaign",
          dataJson: JSON.stringify(payload),
          status,
          recipientCount: tokens.length,
          successCount,
          failureCount,
          sentAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Grava o destinatário por usuário — precisa vir DEPOIS do insert acima,
      // já que pushNotificationRecipient.notificationId referencia esta linha.
      // Best-effort: se essa gravação falhar, o envio em si já aconteceu com
      // sucesso e o registro agregado já existe, então não derrubamos a
      // resposta por causa de um problema no bookkeeping de leitura.
      if (userDeliveredMap.size > 0) {
        try {
          await context.db
            .insert(pushNotificationRecipient)
            .values(
              Array.from(userDeliveredMap.entries()).map(([userId, delivered]) => ({
                id: crypto.randomUUID(),
                notificationId,
                userId,
                deliveredAt: delivered ? now : null,
                readAt: null,
                createdAt: now,
                updatedAt: now,
              })),
            )
            .onConflictDoNothing({
              target: [pushNotificationRecipient.notificationId, pushNotificationRecipient.userId],
            });
        } catch (err) {
          console.error("Falha ao gravar pushNotificationRecipient:", err);
        }
      }

      return record;
    }),

  /**
   * Histórico de CAMPANHAS enviadas pelo tenant. Pushes transacionais
   * (crédito/resgate de fidelidade, um por evento) ficam de fora pra não
   * inundar a lista — eles aparecem só na caixa in-app de cada usuário.
   */
  listNotifications: tenantOwnerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .handler(async ({ context, input }) => {
      return context.db
        .select()
        .from(pushNotification)
        .where(
          and(
            eq(pushNotification.tenantId, context.tenant.id),
            eq(pushNotification.kind, "campaign"),
          ),
        )
        .orderBy(desc(pushNotification.createdAt))
        .limit(input.limit);
    }),
};