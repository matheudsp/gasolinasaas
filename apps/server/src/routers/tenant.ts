import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "../db/schema/auth";
import { tenant, tenantMembership } from "../db/schema/tenant";
import { protectedProcedure, tenantOwnerProcedure } from "../lib/orpc";

export const tenantRouter = {
  /**
   * Descobre o tenant do usuário autenticado.
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

  /**
   * Deleta permanentemente a conta do usuário autenticado.
   * O cascade no banco remove sessões, memberships e push tokens automaticamente.
   */
  deleteAccount: protectedProcedure.handler(async ({ context }) => {
    await context.db
      .delete(user)
      .where(eq(user.id, context.session.user.id));
    return { success: true };
  }),
};
