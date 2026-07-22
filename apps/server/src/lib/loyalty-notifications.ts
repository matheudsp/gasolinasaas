import { and, asc, eq, gt, isNull, or } from "drizzle-orm";

import type { Db } from "../db";
import { reward } from "../db/schema/loyalty";
import { settleExpiredPoints } from "./loyalty-points";
import { sendTransactionalPush } from "./push";

/**
 * Notificações automáticas do programa de fidelidade que dependem do SALDO,
 * não de um evento isolado. Todas são best-effort e rodam fora do caminho
 * crítico (waitUntil ou cron).
 */

type RewardUnlockedInput = {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  /** Pontos que acabaram de entrar — usados para detectar o CRUZAMENTO. */
  creditedPoints: number;
};

/**
 * Avisa quando o saldo passa a dar para a recompensa mais barata disponível.
 *
 * Só dispara no CRUZAMENTO (antes não dava, agora dá) — sem isso o cliente
 * receberia o mesmo aviso a cada abastecimento depois de atingir o valor, e o
 * push viraria ruído que ele desliga.
 */
export async function notifyRewardUnlocked(
  db: Db,
  { tenantId, tenantSlug, userId, creditedPoints }: RewardUnlockedInput,
): Promise<void> {
  if (creditedPoints <= 0) {
    return;
  }

  // Recompensa mais barata que o cliente realmente consegue pedir: ativa e
  // com estoque (null = ilimitado).
  const [cheapest] = await db
    .select({ name: reward.name, costPoints: reward.costPoints })
    .from(reward)
    .where(
      and(
        eq(reward.tenantId, tenantId),
        eq(reward.isActive, true),
        or(isNull(reward.stock), gt(reward.stock, 0)),
      ),
    )
    .orderBy(asc(reward.costPoints))
    .limit(1);

  if (!cheapest) {
    return;
  }

  // Saldo com expire pass: o número tem que ser o mesmo que o app mostra.
  const snapshot = await settleExpiredPoints(db, tenantId, userId);
  const balance = snapshot.balance;
  const previous = balance - creditedPoints;

  const crossed = previous < cheapest.costPoints && balance >= cheapest.costPoints;
  if (!crossed) {
    return;
  }

  await sendTransactionalPush(db, {
    tenantId,
    tenantSlug,
    userId,
    title: "Você já pode resgatar!",
    body: `Seu saldo chegou a ${balance} pontos — dá para trocar por ${cheapest.name}.`,
    data: { type: "rewards" },
  });
}
