/**
 * Traduz erros do Better Auth para português. O client expõe `code` (chave
 * estável, ex.: "INVALID_EMAIL_OR_PASSWORD") — mapeamos por ele, e NÃO pela
 * `message`, que vem em inglês crua ("Invalid email or password").
 */

type AuthErrorLike = {
  code?: string | undefined
  message?: string | undefined
  status?: number | undefined
} | null

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  INVALID_PASSWORD: "Senha incorreta.",
  USER_NOT_FOUND: "Não encontramos uma conta com esse e-mail.",
  USER_ALREADY_EXISTS: "Já existe uma conta com esse e-mail.",
  EMAIL_NOT_VERIFIED:
    "Seu e-mail ainda não foi confirmado. Reenviamos o link de confirmação — confira sua caixa de entrada e tente de novo.",
  BANNED_USER: "Esta conta foi bloqueada. Entre em contato com o suporte.",
  CREDENTIAL_ACCOUNT_NOT_FOUND:
    "Esta conta usa outro método de login (ex.: Google).",
}

/**
 * Mensagem em PT para um erro de auth. `fallback` cobre códigos não mapeados
 * (mensagem genérica em vez do inglês do Better Auth).
 */
export function authErrorMessage(
  error: AuthErrorLike,
  fallback = "Não foi possível entrar. Tente novamente.",
): string {
  // O 403 do login não-verificado nem sempre traz code — trata pelo status.
  if (error?.status === 403 && !error.code) {
    return MESSAGES.EMAIL_NOT_VERIFIED
  }
  return (error?.code && MESSAGES[error.code]) || fallback
}
