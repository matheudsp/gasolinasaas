/**
 * Formats a raw numeric-string price (e.g. "5.490", as returned by the
 * Postgres `numeric` column) into Brazilian currency notation.
 *
 * Preserves up to 3 decimal places since fuel prices in Brazil are
 * commonly quoted to the sub-centavo (e.g. "5,499"), matching the
 * backend's own validation: /^\d+(\.\d{1,3})?$/
 */
export function formatPriceBRL(raw: string): string {
  const value = Number(raw)
  if (!isFinite(value)) return raw

  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}
