/**
 * Traduz erros do Better Auth para português. O client expõe `code` (chave
 * estável, ex.: "INVALID_EMAIL_OR_PASSWORD") — mapeamos por ele, não pela
 * `message`, que vem em inglês cru. Espelho de apps/mobile/src/lib/authErrors.ts.
 */

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  INVALID_PASSWORD: "Senha incorreta.",
  USER_NOT_FOUND: "Não encontramos uma conta com esse e-mail.",
  EMAIL_NOT_VERIFIED:
    "Seu e-mail ainda não foi confirmado. Reenviamos o link de confirmação — confira sua caixa de entrada e conclua a verificação antes de entrar.",
  BANNED_USER: "Esta conta foi bloqueada. Entre em contato com o suporte.",
  CREDENTIAL_ACCOUNT_NOT_FOUND:
    "Esta conta usa outro método de login (ex.: Google).",
};

/**
 * Erro de auth que preserva o `code`/`status` do Better Auth através do
 * throw do AuthContext (Error comum perderia essa informação).
 */
export class AuthError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

/** true quando o login falhou por e-mail não verificado (status 403). */
export function isEmailNotVerified(err: unknown): boolean {
  return (
    err instanceof AuthError &&
    (err.code === "EMAIL_NOT_VERIFIED" || err.status === 403)
  );
}

/** Mensagem em PT para um erro de auth; `fallback` cobre códigos não mapeados. */
export function authErrorMessage(
  err: unknown,
  fallback = "Falha na autenticação. Tente novamente.",
): string {
  if (err instanceof AuthError) {
    if (err.status === 403 && !err.code) {
      return MESSAGES.EMAIL_NOT_VERIFIED;
    }
    return (err.code && MESSAGES[err.code]) || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}
