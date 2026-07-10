import { env } from "cloudflare:workers";
import { AwsClient } from "aws4fetch";

/**
 * Envio de e-mail via AWS SES (API v2, JSON) usando aws4fetch — não o
 * @aws-sdk/client-ses oficial, que depende de node:fs internamente e
 * quebra em Cloudflare Workers mesmo com nodejs_compat habilitado.
 *
 * Env vars necessárias: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 * AWS_REGION (default sa-east-1), EMAIL_FROM.
 */

const FROM_EMAIL = "nao-responda@gasolina.cloud";
const DEFAULT_FROM_NAME = "Gasolina Cloud";
const SES_ENDPOINT = `https://email.sa-east-1.amazonaws.com/v2/email/outbound-emails`;


const sesClient =
  env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? new AwsClient({
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        // sessionToken: env.AWS_SESSION_TOKEN || undefined,
        region: "sa-east-1",
        service: "ses",
        // retries: 10 (default) — aws4fetch já tenta de novo sozinho com
        // backoff exponencial + full jitter em caso de falha transitória.
      })
    : null;

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /**
   * Nome de exibição do remetente (ex: o nome da rede/tenant). O endereço
   * é sempre o mesmo domínio verificado no SES — só o nome muda.
   */
  fromName?: string;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  fromName,
}: SendEmailParams) {
  if (!sesClient) {
    console.error(
      "[email] AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY ausentes — e-mail não enviado",
    );
    return;
  }

  // Aspas e quebras de linha no nome quebrariam o header From do SES.
  const safeName = (fromName ?? DEFAULT_FROM_NAME).replace(/["\r\n]/g, "").trim();

  const body = {
    FromEmailAddress: `${safeName || DEFAULT_FROM_NAME} <${FROM_EMAIL}>`,
    Destination: {
      ToAddresses: [to],
    },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: text, Charset: "UTF-8" },
          ...(html ? { Html: { Data: html, Charset: "UTF-8" } } : {}),
        },
      },
    },
  };

  try {
    const res = await sesClient.fetch(SES_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[email] SES falhou (${res.status}):`, errBody);
    }
  } catch (err) {
    console.error("[email] Erro ao chamar SES:", err);
  }
}