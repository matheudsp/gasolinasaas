import { env } from "cloudflare:workers";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { account, session, user, verification } from "../db/schema/auth";
import { admin, openAPI } from "better-auth/plugins";
import { createDb } from "../db";
import { sendEmail } from "./email";
import { executionCtxStorage } from "./execution-context";
import { resolveTenantContext } from "./tenant";
import { renderEmailHtml } from "@/assets/email-template";

const authDb = drizzle(neon(env.DATABASE_URL || ""));

const DEFAULT_BRAND = "Gasolina Cloud";
// Scheme de deep link do app guarda-chuva (app.config.ts do mobile).
const UMBRELLA_SCHEME = "gasolina";

/**
 * Painel web — destino dos links enviados por e-mail. Derivado do primeiro
 * CORS_ORIGIN (produção: https://sistema.gasolina.cloud; dev:
 * http://localhost:15001), que é sempre o endereço do painel. Vazio, o link
 * de verificação cai no callbackURL padrão do Better Auth (o JSON da API).
 */
const frontendUrl = (env.CORS_ORIGIN?.split(",")[0] ?? "").trim();

/**
 * Resolve como assinar e para onde apontar os e-mails transacionais da rede
 * do request. O flag `tenant.hasDedicatedApp` decide TUDO:
 * - dedicado (binário próprio): `brand` = nome do tenant, `scheme` = slug do
 *   tenant (slug == scheme, por padronização);
 * - guarda-chuva (ou sem tenant — ex: login no painel da plataforma):
 *   `brand` = "Gasolina Cloud", `scheme` = "gasolina".
 *
 * `scheme` vai nos links como `?app=` para as páginas do painel reabrirem o
 * APP CERTO no botão "Abrir o app". Mesma resolução dos handlers oRPC
 * (header x-tenant-slug/x-tenant-id, subdomínio ou path).
 */
const resolveEmailTenant = async (
  request?: Request,
): Promise<{ brand: string; scheme: string }> => {
  if (!request) {
    return { brand: DEFAULT_BRAND, scheme: UMBRELLA_SCHEME };
  }

  try {
    const db = createDb(env.DATABASE_URL || "");
    const { tenant } = await resolveTenantContext({ request, db });
    if (tenant?.hasDedicatedApp) {
      return { brand: tenant.name, scheme: tenant.slug };
    }
    return { brand: DEFAULT_BRAND, scheme: UMBRELLA_SCHEME };
  } catch (err) {
    console.warn("[auth] Falha ao resolver tenant para branding de e-mail:", err);
    return { brand: DEFAULT_BRAND, scheme: UMBRELLA_SCHEME };
  }
};

// Sem generic explícito no betterAuth: fixar BetterAuthOptions mataria a
// inferência de user.additionalFields (o cpf sumiria do tipo da sessão).
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL || "",
  appName: "GasolinaAuth",
  user: {
    additionalFields: {
      // required: false de propósito — o Google OAuth não passa CPF; a
      // obrigatoriedade vive no cadastro multi-step e no gate pós-login.
      cpf: { type: "string", required: false, input: true },
    },
  },
  database: drizzleAdapter(authDb, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  trustedOrigins: [

    ...(env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? []),
    "gasolina://",
    "exp://",
    
    ...(env.NODE_ENV === "development" ? ["http://10.0.2.2:8081",
    "http://localhost:8081",
    "http://localhost:15001",] : []),
  ],
  emailAndPassword: {
    enabled: true,
    // Login só com e-mail verificado — sem isso, uma conta criada com
    // e-mail alheio receberia pushes e dados de fidelidade do dono real do
    // endereço. O cadastro envia o link (sendOnSignUp herda deste flag) e
    // tentativas de login não-verificadas reenviam (sendOnSignIn abaixo).
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,


    sendResetPassword: async ({ user, url }, request) => {
      // Resolução do tenant + envio ficam fora do caminho crítico da
      // resposta — tudo dentro do waitUntil.
      const emailPromise = (async () => {
        const { brand } = await resolveEmailTenant(request);
        await sendEmail({
          to: user.email,
          fromName: brand,
          subject: `Redefinir sua senha — ${brand}`,
          text: `Clique no link para redefinir sua senha: ${url}\n\nSe você não solicitou isso, ignore este e-mail.`,
          html: renderEmailHtml({
            brandName: brand,
            title: "Redefinir sua senha",
            bodyText:
              "Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha. Se você não solicitou isso, pode ignorar este e-mail com segurança.",
            buttonText: "Redefinir senha",
            buttonUrl: url,
            footerNote: "Este link expira em 1 hora por segurança.",
          }),
        });
      })().catch((err) => {
        console.error("[auth] Falha ao enviar e-mail de reset de senha:", err);
      });

      executionCtxStorage.getStore()?.waitUntil(emailPromise);
    },

    onPasswordReset: async ({ user }, request) => {
      console.log(`[auth] Senha redefinida para ${user.email}`);

      const emailPromise = (async () => {
        const { brand } = await resolveEmailTenant(request);
        await sendEmail({
          to: user.email,
          fromName: brand,
          subject: `Sua senha foi alterada — ${brand}`,
          text: "Sua senha foi redefinida com sucesso. Se você não fez essa alteração, entre em contato com o suporte imediatamente.",
          html: renderEmailHtml({
            brandName: brand,
            title: "Sua senha foi alterada",
            bodyText:
              "Sua senha foi redefinida com sucesso. Se você não fez essa alteração, entre em contato com o suporte imediatamente.",
            footerNote: "Este é um e-mail de segurança automático.",
          }),
        });
      })().catch((err) => {
        console.error("[auth] Falha ao enviar notificação de troca de senha:", err);
      });

      executionCtxStorage.getStore()?.waitUntil(emailPromise);
    },
  },

  emailVerification: {
    // Reenvia o link quando um usuário não-verificado tenta logar — o app
    // mostra "reenviamos o link" sem precisar de endpoint de reenvio.
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      const emailPromise = (async () => {
        const { brand, scheme } = await resolveEmailTenant(request);

        // O `url` do Better Auth carrega o callbackURL padrão ("/" do
        // BETTER_AUTH_URL) — o usuário cairia no JSON de health da API
        // depois de confirmar. Reconstruímos apontando pra página do painel
        // (admin: pages/VerifyEmail.tsx), com o scheme do app no callback
        // pra ela reabrir o app certo.
        const callbackUrl = `${frontendUrl}/verify-email?app=${encodeURIComponent(scheme)}`;
        const verifyUrl = frontendUrl
          ? `${env.BETTER_AUTH_URL}/api/auth/verify-email?token=${token}&callbackURL=${encodeURIComponent(callbackUrl)}`
          : url;

        await sendEmail({
          to: user.email,
          fromName: brand,
          subject: `Confirme seu e-mail — ${brand}`,
          text: `Clique no link para confirmar seu e-mail: ${verifyUrl}`,
          html: renderEmailHtml({
            brandName: brand,
            title: "Confirme seu e-mail",
            bodyText: `Clique no botão abaixo para confirmar seu endereço de e-mail e concluir seu cadastro${brand === DEFAULT_BRAND ? " na Gasolina Cloud" : ` no ${brand}`}.`,
            buttonText: "Confirmar e-mail",
            buttonUrl: verifyUrl,
          }),
        });
      })().catch((err) => {
        console.error("[auth] Falha ao enviar e-mail de verificação:", err);
      });

      executionCtxStorage.getStore()?.waitUntil(emailPromise);
    },
  },

  socialProviders: {
    google: {
      enabled: true,
      clientId: env.GOOGLE_CLIENT_ID || "",
      clientSecret: env.GOOGLE_CLIENT_SECRET || "",
      redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/google`,
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.BETTER_AUTH_URL?.startsWith("https") ?? false,
      httpOnly: !env.BETTER_AUTH_URL?.includes("localhost"),
      path: "/",
    },
    backgroundTasks: {
      handler: (p) =>
        executionCtxStorage
          .getStore()
          ?.waitUntil(p.catch((err) => console.warn("[auth] Background task falhou:", err))),
    },
  },
  plugins: [
    expo(),
    admin({
      defaultRole: "user",
      adminRole: ["admin"],
    }),
    ...(env.NODE_ENV === "development" ? [openAPI()] : []),
  ],
});