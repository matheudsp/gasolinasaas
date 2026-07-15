import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "../db/schema/auth";
import { tenant, tenantMembership } from "../db/schema/tenant";
import {
  protectedProcedure,
  publicProcedure,
  tenantOwnerProcedure,
} from "../lib/orpc";

// Hex #RGB ou #RRGGBB — evita gravar lixo que quebraria o tema do app.
const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor inválida (use #RRGGBB)");

export const tenantRouter = {
  /**
   * Branding white-label do tenant (logo e cores do tema). Público — as telas
   * de boas-vindas/login precisam dele antes de o usuário autenticar. O tenant
   * é resolvido pelo header `x-tenant-slug` que o app manda em toda requisição.
   */
  branding: publicProcedure.handler(({ context }) => {
    if (!context.tenant) {
      throw new ORPCError("NOT_FOUND", {
        message: "Tenant não encontrado",
      });
    }

    return {
      name: context.tenant.name,
      slug: context.tenant.slug,
      // Caminho relativo — o cliente prefixa com a própria base de API.
      logoUrl: context.tenant.logoUrl,
      colors: {
        primary: context.tenant.brandPrimaryColor,
      },
    };
  }),

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
        // null limpa a cor (volta ao tema padrão do app).
        brandPrimaryColor: hexColorSchema.nullable().optional(),
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
