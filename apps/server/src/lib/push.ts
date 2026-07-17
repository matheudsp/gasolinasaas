import { and, eq, inArray } from "drizzle-orm";

import type { Db } from "../db";
import {
  pushNotification,
  pushNotificationRecipient,
  pushToken,
} from "../db/schema/push";

// ─────────────────────────────────────────────────────────────────────────────
// Expo Push API — tipos e envio em lote (compartilhado entre a campanha do
// painel em routers/push.ts e os pushes transacionais de fidelidade)
// ─────────────────────────────────────────────────────────────────────────────

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
};

export type ExpoPushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

type ExpoPushResponse = {
  data: ExpoPushTicket[];
};

export async function sendExpoPushBatch(
  messages: ExpoPushMessage[],
): Promise<ExpoPushTicket[]> {
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
    throw new Error(`Expo Push API error: ${response.status}`);
  }

  const json = (await response.json()) as ExpoPushResponse;
  return json.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Push transacional — notificação automática por evento, para UM usuário
// ─────────────────────────────────────────────────────────────────────────────

type TransactionalPushInput = {
  tenantId: string;
  /** Vai no payload — o mobile descarta notificação de rede não-ativa. */
  tenantSlug: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

/**
 * Envia um push para todos os dispositivos de UM usuário no tenant e grava
 * o par agregado + destinatário (kind "transactional", fora do histórico de
 * campanhas do painel). O registro é gravado MESMO sem token registrado —
 * assim o evento aparece na lista de notificações in-app de quem desativou
 * o push. Tokens inválidos (DeviceNotRegistered) são removidos.
 *
 * Chame via waitUntil e com .catch: é trabalho pós-resposta best-effort —
 * falha aqui nunca pode derrubar o evento de negócio que a originou.
 */
export async function sendTransactionalPush(
  db: Db,
  input: TransactionalPushInput,
): Promise<void> {
  const now = new Date();
  const payload: Record<string, unknown> = {
    ...(input.data ?? {}),
    tenantSlug: input.tenantSlug,
  };

  const tokens = await db
    .select({ id: pushToken.id, token: pushToken.token })
    .from(pushToken)
    .where(
      and(
        eq(pushToken.tenantId, input.tenantId),
        eq(pushToken.userId, input.userId),
      ),
    );

  let successCount = 0;
  let failureCount = 0;

  if (tokens.length > 0) {
    const tickets = await sendExpoPushBatch(
      tokens.map((t) => ({
        to: t.token,
        title: input.title,
        body: input.body,
        data: payload,
        sound: "default" as const,
        priority: "high" as const,
      })),
    );

    const invalidTokenIds: string[] = [];
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === "ok") {
        successCount++;
      } else {
        failureCount++;
        const tokenRow = tokens[i];
        if (ticket.details?.error === "DeviceNotRegistered" && tokenRow) {
          invalidTokenIds.push(tokenRow.id);
        }
      }
    }

    if (invalidTokenIds.length > 0) {
      await db
        .delete(pushToken)
        .where(inArray(pushToken.id, invalidTokenIds));
    }
  }

  const notificationId = crypto.randomUUID();

  await db.insert(pushNotification).values({
    id: notificationId,
    tenantId: input.tenantId,
    kind: "transactional",
    title: input.title,
    body: input.body,
    dataJson: JSON.stringify(payload),
    status:
      failureCount === 0 ? "sent" : successCount === 0 ? "failed" : "partial",
    recipientCount: tokens.length,
    successCount,
    failureCount,
    sentAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await db
    .insert(pushNotificationRecipient)
    .values({
      id: crypto.randomUUID(),
      notificationId,
      userId: input.userId,
      deliveredAt: successCount > 0 ? now : null,
      readAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [
        pushNotificationRecipient.notificationId,
        pushNotificationRecipient.userId,
      ],
    });
}
