import { env } from "cloudflare:workers";
import { expo } from "@better-auth/expo";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { account, session, user, verification } from "../db/schema/auth";
import { admin, openAPI } from "better-auth/plugins";

const authDb = drizzle(neon(env.DATABASE_URL || ""));

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
    env.CORS_ORIGIN || "",
    "martinezapp://",
    "exp://",
    "http://10.0.2.2:8081",
    "http://localhost:5173",
  ],
  emailAndPassword: {
    enabled: true,
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
