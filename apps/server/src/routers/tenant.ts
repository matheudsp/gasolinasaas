import { eq } from "drizzle-orm";
import { z } from "zod";

import { tenant, tenantMembership } from "../db/schema/tenant";
import { protectedProcedure, tenantOwnerProcedure } from "../lib/orpc";

export const tenantRouter = {
  /**
   * Descobre o tenant do usuário autenticado.
   * Usa protectedProcedure — context.session.user já está disponível,
   * mas context.tenant ainda não (é o que estamos buscando).
   */
  getMyMembership: protectedProcedure.handler(async ({ context }) => {
    const [result] = await context.db
      .select({
        id: tenantMembership.id,
        role: tenantMembership.role,
        tenantId: tenantMembership.tenantId,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      })
      .from(tenantMembership)
      .innerJoin(tenant, eq(tenantMembership.tenantId, tenant.id))
      .where(eq(tenantMembership.userId, context.session.user.id))
      .limit(1);

    return result ?? null;
  }),

  /**
   * Update administrative settings for the authenticated tenant.
   * tenantId comes from the validated context — never from input.
   */
  updateSettings: tenantOwnerProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const [updated] = await context.db
        .update(tenant)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(tenant.id, context.tenant!.id))
        .returning();
      return updated;
    }),
};
