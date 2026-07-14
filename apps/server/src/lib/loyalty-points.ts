import { and, asc, eq } from "drizzle-orm";

import type { Db } from "../db";
import { loyaltyTransaction } from "../db/schema/loyalty";

/**
 * Expiração de pontos — modelo "validade por crédito" (FIFO).
 *
 * Cada crédito pode nascer com um expiresAt (tenant.pointsValidityDays).
 * Resgates consomem os créditos VÁLIDOS mais antigos primeiro. Quando um
 * crédito vence com saldo restante, o expire pass materializa uma transação
 * negativa no ledger (expiredTransactionId aponta pro crédito) — assim o
 * invariante "saldo = SUM(points)" continua valendo em todo o sistema.
 *
 * O expire pass é preguiçoso: roda quando o saldo do cliente é lido ou usado
 * (myBalance, requestRedemption, confirmRedemption). Não há cron; um cliente
 * dormente pode ficar com expirações pendentes de materializar, mas qualquer
 * leitura/uso do saldo dele acerta o ledger antes de decidir qualquer coisa.
 */

// Janela do aviso "seus pontos estão perto de expirar" exibido no app.
const EXPIRING_SOON_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

// Aceita tanto o client raiz quanto uma transação drizzle (mesma interface).
type DbLike = Pick<Db, "select" | "insert">;

export type LedgerRow = {
  id: string;
  points: number;
  createdAt: Date;
  expiresAt: Date | null;
  expiredTransactionId: string | null;
};

type CreditLot = {
  /** id da transação de crédito que originou o lote */
  id: string;
  /** pontos ainda não consumidos por resgates/expirações */
  remaining: number;
  expiresAt: Date | null;
};

/**
 * Reconstrói os lotes de crédito do cliente reproduzindo o histórico em ordem:
 * - crédito abre um lote;
 * - expiração já materializada debita o próprio lote de origem;
 * - resgate consome os lotes mais antigos que ainda eram válidos na data.
 *
 * Sobra de débito sem lote válido (dados anteriores à feature ou corrida rara)
 * consome qualquer lote restante, para a soma dos lotes nunca divergir do
 * SUM(points) do ledger.
 */
export function computeCreditLots(rows: LedgerRow[]): CreditLot[] {
  const lots: CreditLot[] = [];

  for (const row of rows) {
    if (row.points > 0) {
      lots.push({ id: row.id, remaining: row.points, expiresAt: row.expiresAt });
      continue;
    }

    let debit = -row.points;

    if (row.expiredTransactionId) {
      const lot = lots.find((l) => l.id === row.expiredTransactionId);
      if (lot) {
        lot.remaining = Math.max(0, lot.remaining - debit);
      }
      continue;
    }

    for (const lot of lots) {
      if (debit === 0) {
        break;
      }
      const validAtDebit =
        !lot.expiresAt || lot.expiresAt.getTime() > row.createdAt.getTime();
      if (lot.remaining === 0 || !validAtDebit) {
        continue;
      }
      const used = Math.min(lot.remaining, debit);
      lot.remaining -= used;
      debit -= used;
    }

    for (const lot of lots) {
      if (debit === 0) {
        break;
      }
      const used = Math.min(lot.remaining, debit);
      lot.remaining -= used;
      debit -= used;
    }
  }

  return lots;
}

export type LoyaltySnapshot = {
  /** Saldo disponível (já descontando o que expirou agora). */
  balance: number;
  /** Pontos que venceram e foram materializados NESTA chamada. */
  expiredNow: number;
  /** Lotes que vencem nos próximos 30 dias, do mais próximo pro mais distante. */
  expiringSoon: { points: number; expiresAt: Date }[];
};

/**
 * Expire pass + fotografia do saldo, numa passada só.
 *
 * Materializa como transação negativa todo crédito vencido com saldo restante
 * (idempotente: o unique em expiredTransactionId descarta duplicatas em caso
 * de corrida) e devolve o saldo disponível + o que está perto de vencer.
 */
export async function settleExpiredPoints(
  db: DbLike,
  tenantId: string,
  userId: string,
  now = new Date()
): Promise<LoyaltySnapshot> {
  const rows = await db
    .select({
      id: loyaltyTransaction.id,
      points: loyaltyTransaction.points,
      createdAt: loyaltyTransaction.createdAt,
      expiresAt: loyaltyTransaction.expiresAt,
      expiredTransactionId: loyaltyTransaction.expiredTransactionId,
    })
    .from(loyaltyTransaction)
    .where(
      and(
        eq(loyaltyTransaction.tenantId, tenantId),
        eq(loyaltyTransaction.userId, userId)
      )
    )
    .orderBy(asc(loyaltyTransaction.createdAt), asc(loyaltyTransaction.id));

  const lots = computeCreditLots(rows);

  const due = lots.filter(
    (lot) =>
      lot.remaining > 0 &&
      lot.expiresAt !== null &&
      lot.expiresAt.getTime() <= now.getTime()
  );

  if (due.length > 0) {
    await db
      .insert(loyaltyTransaction)
      .values(
        due.map((lot) => ({
          id: crypto.randomUUID(),
          tenantId,
          userId,
          points: -lot.remaining,
          expiredTransactionId: lot.id,
          createdAt: now,
        }))
      )
      .onConflictDoNothing({
        target: [loyaltyTransaction.expiredTransactionId],
      });
  }

  const expiredNow = due.reduce((sum, lot) => sum + lot.remaining, 0);

  const windowEnd = now.getTime() + EXPIRING_SOON_WINDOW_DAYS * DAY_MS;
  const expiringSoon = lots
    .flatMap((lot) => {
      if (
        lot.remaining > 0 &&
        lot.expiresAt !== null &&
        lot.expiresAt.getTime() > now.getTime() &&
        lot.expiresAt.getTime() <= windowEnd
      ) {
        return [{ points: lot.remaining, expiresAt: lot.expiresAt }];
      }
      return [];
    })
    .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());

  const balance = lots.reduce(
    (sum, lot) => (due.includes(lot) ? sum : sum + lot.remaining),
    0
  );

  return { balance, expiredNow, expiringSoon };
}
