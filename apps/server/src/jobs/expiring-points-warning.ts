import { and, asc, eq, gt, gte, isNotNull, lt, sql } from "drizzle-orm";

import type { Db } from "../db";
import { loyaltyTransaction } from "../db/schema/loyalty";
import { tenant } from "../db/schema/tenant";
import { settleExpiredPoints } from "../lib/loyalty-points";
import { sendTransactionalPush } from "../lib/push";

const DAY_MS = 86_400_000;
/** Quantos dias antes do vencimento o cliente é avisado. */
const WARN_DAYS = 7;

/**
 * Teto por execução. Este job roda num Cron Trigger PRÓPRIO (não junto do
 * expire pass) justamente para ter o orçamento de subrequests só dele: cada
 * cliente custa 1 select do settle + 1 fetch pro Expo + 2 inserts.
 */
const BATCH_LIMIT = 10;

/**
 * Avisa quem tem pontos vencendo em ~7 dias.
 *
 * A janela é de 24h (`[now+7d, now+8d)`) e o cron roda 1x/dia: assim cada
 * crédito entra na janela uma única vez e o cliente não recebe o mesmo aviso
 * repetido — sem precisar de coluna de "já avisado" no schema.
 */
export async function runExpiringPointsWarningJob(db: Db, now = new Date()) {
  const windowStart = new Date(now.getTime() + WARN_DAYS * DAY_MS);
  const windowEnd = new Date(windowStart.getTime() + DAY_MS);

  // Candidatos: clientes com crédito vencendo dentro da janela.
  const candidates = await db
    .select({
      tenantId: loyaltyTransaction.tenantId,
      tenantSlug: tenant.slug,
      userId: loyaltyTransaction.userId,
    })
    .from(loyaltyTransaction)
    .innerJoin(tenant, eq(loyaltyTransaction.tenantId, tenant.id))
    .where(
      and(
        gt(loyaltyTransaction.points, 0),
        isNotNull(loyaltyTransaction.expiresAt),
        gte(loyaltyTransaction.expiresAt, windowStart),
        lt(loyaltyTransaction.expiresAt, windowEnd),
      ),
    )
    .groupBy(loyaltyTransaction.tenantId, tenant.slug, loyaltyTransaction.userId)
    .orderBy(asc(sql`min(${loyaltyTransaction.expiresAt})`))
    .limit(BATCH_LIMIT);

  if (candidates.length === 0) {
    return { notified: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    candidates.map(async ({ tenantId, tenantSlug, userId }) => {
      // O settle devolve os lotes já ajustados — só assim sabemos quantos
      // pontos AINDA restam naquele crédito (o cliente pode ter resgatado
      // parte dele desde então).
      const snapshot = await settleExpiredPoints(db, tenantId, userId, now);

      const expiring = snapshot.lots.reduce((sum, lot) => {
        if (
          lot.remaining > 0 &&
          lot.expiresAt !== null &&
          lot.expiresAt >= windowStart &&
          lot.expiresAt < windowEnd
        ) {
          return sum + lot.remaining;
        }
        return sum;
      }, 0);

      if (expiring === 0) {
        return false;
      }

      await sendTransactionalPush(db, {
        tenantId,
        tenantSlug,
        userId,
        title: "Seus pontos estão vencendo",
        body: `${expiring} ${expiring === 1 ? "ponto vence" : "pontos vencem"} em ${WARN_DAYS} dias. Resgate antes de perder!`,
        data: { type: "points" },
      });
      return true;
    }),
  );

  let notified = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value) {
        notified++;
      }
    } else {
      failed++;
      console.error("[expiring-points] aviso falhou:", result.reason);
    }
  }

  return { notified, failed };
}
