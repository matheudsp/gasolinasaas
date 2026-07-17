import { and, asc, gt, isNotNull, lte, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { Db } from "../db";
import { loyaltyTransaction } from "../db/schema/loyalty";
import { settleExpiredPoints } from "../lib/loyalty-points";

/**
 * Quantos clientes processar por execução. O plano da Cloudflare limita
 * subrequests por invocação (50 no free) e cada settle custa 1 select +
 * até 1 insert no Neon — 20 clientes ≈ 41 subrequests no pior caso.
 * O cron roda de hora em hora, então a capacidade é ~480 clientes/dia;
 * o backlog drena em poucas execuções e o regime é poucos por hora.
 */
const BATCH_LIMIT = 20;

/**
 * Expire pass em LOTE — complemento do expire pass preguiçoso.
 *
 * O preguiçoso só roda quando o saldo do cliente é lido/usado; cliente
 * dormente ficava com créditos vencidos sem materializar, superestimando o
 * passivo (auditTotals.outstandingPoints) e os rankings do painel. Este job
 * acha os clientes com crédito vencido AINDA SEM linha de expiração e roda
 * o mesmo settleExpiredPoints neles.
 *
 * Convergência: o settle materializa expiração pra TODO lote vencido,
 * inclusive com remaining 0 (linha de 0 pontos = marcador de "settled"),
 * então cada crédito vencido sai da query de candidatos após uma passada.
 * Idempotência: o unique em expiredTransactionId + onConflictDoNothing —
 * corrida com o expire pass preguiçoso é inofensiva.
 */
export async function runExpirePointsJob(db: Db, now = new Date()) {
  const settled = alias(loyaltyTransaction, "settled");

  // Clientes (por tenant) com crédito vencido sem expiração materializada,
  // os vencimentos mais antigos primeiro.
  const candidates = await db
    .select({
      tenantId: loyaltyTransaction.tenantId,
      userId: loyaltyTransaction.userId,
    })
    .from(loyaltyTransaction)
    .where(
      and(
        gt(loyaltyTransaction.points, 0),
        isNotNull(loyaltyTransaction.expiresAt),
        lte(loyaltyTransaction.expiresAt, now),
        notExists(
          db
            .select({ one: sql`1` })
            .from(settled)
            .where(sql`${settled.expiredTransactionId} = ${loyaltyTransaction.id}`),
        ),
      ),
    )
    .groupBy(loyaltyTransaction.tenantId, loyaltyTransaction.userId)
    .orderBy(asc(sql`min(${loyaltyTransaction.expiresAt})`))
    .limit(BATCH_LIMIT);

  if (candidates.length === 0) {
    return { processed: 0, failed: 0, expiredPoints: 0 };
  }

  // Settles em paralelo — são clientes independentes e o Neon HTTP driver
  // não segura conexão. Falha individual não derruba o lote.
  const results = await Promise.allSettled(
    candidates.map((c) => settleExpiredPoints(db, c.tenantId, c.userId, now)),
  );

  let processed = 0;
  let failed = 0;
  let expiredPoints = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      processed++;
      expiredPoints += result.value.expiredNow;
    } else {
      failed++;
      console.error("[expire-points] settle falhou:", result.reason);
    }
  }

  return { processed, failed, expiredPoints };
}
