/**
 * Validação e máscara de CPF (espelhada em apps/server/src/lib/cpf.ts — não
 * há packages/ compartilhado no monorepo; mantenha as duas em sincronia).
 */

/** Remove tudo que não é dígito ("123.456.789-09" → "12345678909"). */
export function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, "")
}

/** Aplica a máscara 000.000.000-00 conforme o usuário digita. */
export function formatCpf(raw: string): string {
  const digits = normalizeCpf(raw).slice(0, 11)
  const parts: string[] = []
  if (digits.length > 0) parts.push(digits.slice(0, 3))
  if (digits.length > 3) parts.push(digits.slice(3, 6))
  if (digits.length > 6) parts.push(digits.slice(6, 9))
  const base = parts.join(".")
  if (digits.length > 9) return `${base}-${digits.slice(9)}`
  return base
}

/**
 * Valida os dígitos verificadores do CPF. Rejeita sequências de dígitos
 * iguais ("111.111.111-11"), que passam no algoritmo mas são inválidas.
 */
export function isValidCpf(raw: string): boolean {
  const cpf = normalizeCpf(raw)

  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const digits = [...cpf].map(Number)

  for (const position of [9, 10]) {
    let sum = 0
    for (let i = 0; i < position; i++) {
      sum += digits[i] * (position + 1 - i)
    }
    const check = ((sum * 10) % 11) % 10
    if (check !== digits[position]) return false
  }

  return true
}
