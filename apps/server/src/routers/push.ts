import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { user } from "../db/schema/auth";
import { pushNotification, pushToken } from "../db/schema/push";
import { ORPCError } from "@orpc/server";
import { protectedProcedure, tenantOwnerProcedure } from "../lib/orpc";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos internos do Expo Push API
// ─────────────────────────────────────────────────────────────────────────────

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
};

type ExpoPushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

type ExpoPushResponse = {
  data: ExpoPushTicket[];
};

async function sendExpoPushBatch(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: `Expo Push API error: ${response.status}`,
    });
  }

  const json = (await response.json()) as ExpoPushResponse;
  return json.data;
}

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
   */
  send: tenantOwnerProcedure
    .input(
      z.object({
        title: z.string().min(1),
        body: z.string().min(1),
        data: z.record(z.string(), z.unknown()).optional(),
        sound: z.enum(["default"]).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const tokens = await context.db
        .select({ id: pushToken.id, token: pushToken.token })
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
            dataJson: input.data ? JSON.stringify(input.data) : null,
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
        ...(input.data ? { data: input.data as Record<string, unknown> } : {}),
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

      // Identifica tokens inválidos para remover
      const invalidTokenIds: string[] = [];
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === "ok") {
          successCount++;
        } else {
          failureCount++;
          if (ticket.details?.error === "DeviceNotRegistered") {
            const tokenRow = tokens[i];
            if (tokenRow) {
              invalidTokenIds.push(tokenRow.id);
            }
          }
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
          dataJson: input.data ? JSON.stringify(input.data) : null,
          status,
          recipientCount: tokens.length,
          successCount,
          failureCount,
          sentAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return record;
    }),

  /**
   * Lista o histórico de notificações push enviadas pelo tenant.
   */
  listNotifications: tenantOwnerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .handler(async ({ context, input }) => {
      return context.db
        .select()
        .from(pushNotification)
        .where(eq(pushNotification.tenantId, context.tenant.id))
        .orderBy(desc(pushNotification.createdAt))
        .limit(input.limit);
    }),
};
