import { env } from "cloudflare:workers";
import { expo } from "@better-auth/expo";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { account, session, user, verification } from "../db/schema/auth";
import { openAPI } from "better-auth/plugins"

export const auth = betterAuth<BetterAuthOptions>({
  baseURL: env.BETTER_AUTH_URL || "",
  appName: "GasolinaAuth",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  // trustedOrigins: [process.env.CORS_ORIGIN || "", "mybettertapp://", "exp://"],
  trustedOrigins: [env.CORS_ORIGIN || "", "martinezapp://", "exp://","http://10.0.2.2:8081", ],
  emailAndPassword: {
    enabled: true,
  },
  // https://www.better-auth.com/docs/concepts/oauth
  socialProviders: {
  
    google: {
      enabled: true,
      clientId: env.GOOGLE_CLIENT_ID || "",
      clientSecret: env.GOOGLE_CLIENT_SECRET || "",
      redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/google`, // Server callback URL
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.BETTER_AUTH_URL?.startsWith("https") ?? false, // Auto-enable in production
      httpOnly: !env.BETTER_AUTH_URL?.includes("localhost"), // Disable in dev for debugging, enable in prod for security
      path: "/",
    },
  },
  plugins: env.NODE_ENV === "development" ? [expo(), openAPI()] : [expo()],
});
