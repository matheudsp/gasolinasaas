/**
 * Template HTML compartilhado para os e-mails transacionais do Martinez.
 *
 * Decisões de compatibilidade (e-mail HTML não é o mesmo que HTML de
 * navegador — muitos clientes, principalmente Outlook desktop, ignoram
 * <style>, flexbox e grid):
 *   - Layout inteiro em <table>, nunca <div> com flex/grid
 *   - Todo estilo inline via style="", nada em <head>
 *   - Fontes web-safe (Arial/Helvetica) — sem @font-face
 *   - Botão é uma <a> com padding/background inline, não um <button>
 *
 * Cores batem com a paleta de marca já usada no app (navy extraído do
 * logo, neutros frios).
 */
interface EmailTemplateParams {
  title: string;
  bodyText: string;
  /** Se omitido, nenhum botão/link de fallback é renderizado. */
  buttonText?: string;
  buttonUrl?: string;
  footerNote?: string;
  /**
   * Nome exibido no cabeçalho do e-mail. Em fluxos multi-tenant é o nome
   * da rede (tenant); sem tenant resolvido, cai no padrão da plataforma.
   */
  brandName?: string;
}

// Único valor interpolado que vem do banco (nome do tenant) — os demais
// são strings estáticas do código.
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const NAVY = "#22396D";
const TEXT_DARK = "#161A24";
const TEXT_DIM = "#4E5159";
const TEXT_FAINT = "#7D7F84";
const BORDER = "#D5D6D8";
const BG = "#F5F5F5";

export function renderEmailHtml({
  title,
  bodyText,
  buttonText,
  buttonUrl,
  footerNote,
  brandName = "Gasolina Cloud",
}: EmailTemplateParams): string {
  const buttonBlock =
    buttonText && buttonUrl
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
          <tr>
            <td style="border-radius:8px; background-color:${NAVY};">
              <a href="${buttonUrl}" style="display:inline-block; padding:14px 28px; font-size:15px; font-weight:bold; color:#FFFFFF; text-decoration:none; border-radius:8px; font-family:Arial, Helvetica, sans-serif;">
                ${buttonText}
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 4px; font-size:12px; color:${TEXT_FAINT}; font-family:Arial, Helvetica, sans-serif;">
          Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
        </p>
        <p style="margin:0 0 24px; font-size:12px; word-break:break-all; font-family:Arial, Helvetica, sans-serif;">
          <a href="${buttonUrl}" style="color:${NAVY};">${buttonUrl}</a>
        </p>`
      : "";

      
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0; padding:0; background-color:${BG}; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG}; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px; background-color:#FFFFFF; border-radius:12px; overflow:hidden; border:1px solid ${BORDER};">
            <tr>
              <td style="background-color:${NAVY}; padding:24px 32px; text-align:center;">
                <span style="color:#FFFFFF; font-size:20px; font-weight:bold; letter-spacing:0.5px; font-family:Arial, Helvetica, sans-serif;">
                  ${escapeHtml(brandName)}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px; font-size:20px; color:${TEXT_DARK}; font-family:Arial, Helvetica, sans-serif;">
                  ${title}
                </h1>
                <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:${TEXT_DIM}; font-family:Arial, Helvetica, sans-serif;">
                  ${bodyText}
                </p>
                ${buttonBlock}
              </td>
            </tr>
            ${
              footerNote
                ? `
            <tr>
              <td style="padding:20px 32px; background-color:${BG}; border-top:1px solid ${BORDER};">
                <p style="margin:0; font-size:11px; color:${TEXT_FAINT}; text-align:center; font-family:Arial, Helvetica, sans-serif;">
                  ${footerNote}
                </p>
              </td>
            </tr>`
                : ""
            }
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}