import { ORPCError, os } from "@orpc/server";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      db: context.db,
      session: context.session,
    },
  });
});

// Operador da plataforma (plugin admin do Better Auth) — eixo de
// autorização independente do tenant_membership. Admins gerenciam
// qualquer tenant sem precisar de membership: basta o tenant estar
// resolvido (header x-tenant-id/x-tenant-slug).
const isPlatformAdmin = (context: Context): boolean =>
  (context.session?.user as { role?: string } | undefined)?.role === "admin";

const requireTenantAccess = o.middleware(({ context, next }) => {
  if (!context.tenant) {
    throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
  }

  if (!context.tenantMembership && !isPlatformAdmin(context)) {
    throw new ORPCError("FORBIDDEN");
  }

  return next();
});

const requireOwnerAccess = o.middleware(({ context, next }) => {
  if (!context.tenant) {
    throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
  }

  const isOwner = context.tenantMembership?.role === "owner";

  if (!isOwner && !isPlatformAdmin(context)) {
    throw new ORPCError("FORBIDDEN");
  }

  return next({
    context: {
      db: context.db,
      tenant: context.tenant,
      // undefined quando quem acessa é o admin da plataforma.
      tenantOwnerMembership: context.tenantMembership,
    },
  });
});

// Operador do tenant: owner OU operator (frentista). Padrão para o fluxo de
// crédito de pontos no caixa — o owner também consegue operar.
const requireOperatorAccess = o.middleware(({ context, next }) => {
  if (!context.tenant) {
    throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
  }

  const role = context.tenantMembership?.role;
  const isOperator = role === "owner" || role === "operator";

  if (!isOperator && !isPlatformAdmin(context)) {
    throw new ORPCError("FORBIDDEN");
  }

  return next({
    context: {
      db: context.db,
      tenant: context.tenant,
    },
  });
});

const requireAdmin = o.middleware(({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  const role = (context.session.user as { role?: string }).role;

  if (role !== "admin") {
    throw new ORPCError("FORBIDDEN");
  }

  return next({
    context: {
      db: context.db,
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);
export const tenantProcedure = protectedProcedure.use(requireTenantAccess);
export const tenantOwnerProcedure = protectedProcedure.use(requireOwnerAccess);
export const tenantOperatorProcedure =
  protectedProcedure.use(requireOperatorAccess);
export const adminProcedure = protectedProcedure.use(requireAdmin);
