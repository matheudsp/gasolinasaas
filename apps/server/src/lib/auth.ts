import { env } from "cloudflare:workers";
import { expo } from "@better-auth/expo";
import { type BetterAuthOptions, betterAuth } from "better-auth";
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

/**
 * Resolve o nome da rede (tenant) para brandear e-mails transacionais.
 * Usa a mesma resolução dos handlers oRPC (header x-tenant-slug/x-tenant-id,
 * subdomínio ou path); requests sem tenant — ex: login no painel admin da
 * plataforma — caem no branding padrão da Gasolina Cloud.
 */
const resolveEmailBrand = async (request?: Request): Promise<string> => {
  if (!request) {
    return DEFAULT_BRAND;
  }

  try {
    const db = createDb(env.DATABASE_URL || "");
    const { tenant } = await resolveTenantContext({ request, db });
    return tenant?.name ?? DEFAULT_BRAND;
  } catch (err) {
    console.warn("[auth] Falha ao resolver tenant para branding de e-mail:", err);
    return DEFAULT_BRAND;
  }
};

export const auth = betterAuth<BetterAuthOptions>({
  baseURL: env.BETTER_AUTH_URL || "",
  appName: "GasolinaAuth",
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
    // CORS_ORIGIN pode listar múltiplas origins separadas por vírgula
    // (mesmo formato dos middlewares de CORS).
    ...(env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? []),
    "martinezapp://",
    "exp://",
    
    ...(env.NODE_ENV === "development" ? ["http://10.0.2.2:8081",
    "http://localhost:8081",
    "http://localhost:15001",] : []),
  ],
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,


    sendResetPassword: async ({ user, url }, request) => {
      // Resolução do tenant + envio ficam fora do caminho crítico da
      // resposta — tudo dentro do waitUntil.
      const emailPromise = (async () => {
        const brand = await resolveEmailBrand(request);
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
        const brand = await resolveEmailBrand(request);
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
    sendVerificationEmail: async ({ user, url }, request) => {
      const emailPromise = (async () => {
        const brand = await resolveEmailBrand(request);
        await sendEmail({
          to: user.email,
          fromName: brand,
          subject: `Confirme seu e-mail — ${brand}`,
          text: `Clique no link para confirmar seu e-mail: ${url}`,
          html: renderEmailHtml({
            brandName: brand,
            title: "Confirme seu e-mail",
            bodyText: `Clique no botão abaixo para confirmar seu endereço de e-mail e concluir seu cadastro${brand === DEFAULT_BRAND ? " na Gasolina Cloud" : ` no ${brand}`}.`,
            buttonText: "Confirmar e-mail",
            buttonUrl: url,
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