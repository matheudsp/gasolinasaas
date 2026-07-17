/**
 * Validação de CPF (espelhada em apps/mobile/src/utils/cpf.ts — não há
 * packages/ compartilhado no monorepo; mantenha as duas em sincronia).
 */

/** Remove tudo que não é dígito ("123.456.789-09" → "12345678909"). */
export function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Valida os dígitos verificadores do CPF. Rejeita sequências de dígitos
 * iguais ("111.111.111-11"), que passam no algoritmo mas são inválidas.
 */
export function isValidCpf(raw: string): boolean {
  const cpf = normalizeCpf(raw);

  if (cpf.length !== 11) {
    return false;
  }
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digits = [...cpf].map(Number);

  for (const position of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < position; i++) {
      sum += digits[i] * (position + 1 - i);
    }
    const check = ((sum * 10) % 11) % 10;
    if (check !== digits[position]) {
      return false;
    }
  }

  return true;
}
