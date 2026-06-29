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

const requireTenantAccess = o.middleware(({ context, next }) => {
  if (!context.tenant) {
    throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
  }

  if (!context.tenantMembership) {
    throw new ORPCError("FORBIDDEN");
  }

  return next();
});

const requireOwnerAccess = o.middleware(({ context, next }) => {
  if (!context.tenant) {
    throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
  }

  if (!context.tenantMembership || context.tenantMembership.role !== "owner") {
    throw new ORPCError("FORBIDDEN");
  }

  return next({
    context: {
      db: context.db,
      tenant: context.tenant,
      tenantOwnerMembership: context.tenantMembership,
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
export const adminProcedure = protectedProcedure.use(requireAdmin);
