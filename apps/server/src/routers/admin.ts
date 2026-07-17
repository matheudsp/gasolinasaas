import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import { account, user } from "../db/schema/auth";
import { plan, subscription } from "../db/schema/subscription";
import { tenant, tenantMembership } from "../db/schema/tenant";
import { adminProcedure } from "../lib/orpc";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const priceSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Invalid price format");

export const adminRouter = {
  tenant: {
    list: adminProcedure.handler(async ({ context }) => {
      return context.db
        .select({
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          isActive: tenant.isActive,
          hasDedicatedApp: tenant.hasDedicatedApp,
          createdAt: tenant.createdAt,
        })
        .from(tenant)
        .orderBy(desc(tenant.createdAt));
    }),

    getById: adminProcedure
      .input(z.object({ id: z.string() }))
      .handler(async ({ context, input }) => {
        const [record] = await context.db
          .select()
          .from(tenant)
          .where(eq(tenant.id, input.id))
          .limit(1);

        if (!record) throw new ORPCError("NOT_FOUND");
        return record;
      }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          slug: z.string().min(1).optional(),
          planId: z.string().optional(),
          trialDays: z.number().int().min(0).default(14),
        }),
      )
      .handler(async ({ context, input }) => {
        const resolvedSlug = input.slug ?? slugify(input.name);

        const existing = await context.db
          .select({ id: tenant.id })
          .from(tenant)
          .where(eq(tenant.slug, resolvedSlug))
          .limit(1)
          .then((r) => r.at(0));

        if (existing) {
          throw new ORPCError("CONFLICT", { message: "Slug already in use." });
        }

        const now = new Date();

        const [newTenant] = await context.db
          .insert(tenant)
          .values({
            id: crypto.randomUUID(),
            name: input.name,
            slug: resolvedSlug,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (input.planId) {
          const planRecord = await context.db
            .select()
            .from(plan)
            .where(eq(plan.id, input.planId))
            .limit(1)
            .then((r) => r.at(0));

          if (planRecord) {
            const trialEndsAt =
              input.trialDays > 0
                ? new Date(now.getTime() + input.trialDays * 86_400_000)
                : undefined;

            await context.db.insert(subscription).values({
              id: crypto.randomUUID(),
              tenantId: newTenant.id,
              planId: planRecord.id,
              status: input.trialDays > 0 ? "trial" : "active",
              currentPeriodStart: now,
              currentPeriodEnd: addMonths(now, 1),
              trialEndsAt,
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        return newTenant;
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          isActive: z.boolean().optional(),
          hasDedicatedApp: z.boolean().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const { id, ...data } = input;
        const [updated] = await context.db
          .update(tenant)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(tenant.id, id))
          .returning();

        if (!updated) throw new ORPCError("NOT_FOUND");
        return updated;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .handler(async ({ context, input }) => {
        const [deleted] = await context.db
          .update(tenant)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(tenant.id, input.id))
          .returning();

        if (!deleted) throw new ORPCError("NOT_FOUND");
        return { success: true };
      }),

    /**
     * Donos de todas as redes — as contas que administram cada tenant.
     * Uma linha por (tenant, owner); tenants sem dono não aparecem aqui
     * (a UI cruza com tenant.list para detectá-los).
     */
    listOwners: adminProcedure.handler(async ({ context }) => {
      return context.db
        .select({
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          tenantActive: tenant.isActive,
          userId: user.id,
          name: user.name,
          email: user.email,
          banned: user.banned,
          createdAt: tenantMembership.createdAt,
        })
        .from(tenantMembership)
        .innerJoin(tenant, eq(tenantMembership.tenantId, tenant.id))
        .innerJoin(user, eq(tenantMembership.userId, user.id))
        .where(eq(tenantMembership.role, "owner"))
        .orderBy(tenant.name);
    }),

    /** Atribui um usuário (por e-mail) como dono de uma rede. */
    assignOwnerByEmail: adminProcedure
      .input(z.object({ tenantId: z.string(), email: z.string().email() }))
      .handler(async ({ context, input }) => {
        const [target] = await context.db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, input.email));

        if (!target) {
          throw new ORPCError("NOT_FOUND", {
            message: "Nenhum usuário com esse e-mail. Crie a conta primeiro.",
          });
        }

        const now = new Date();
        await context.db
          .insert(tenantMembership)
          .values({
            id: crypto.randomUUID(),
            tenantId: input.tenantId,
            userId: target.id,
            role: "owner",
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [tenantMembership.tenantId, tenantMembership.userId],
            set: { role: "owner", updatedAt: now },
          });

        return { success: true };
      }),
  },

  user: {
    list: adminProcedure
      .input(z.object({ tenantId: z.string().optional() }).optional())
      .handler(async ({ context, input }) => {
        if (input?.tenantId) {
          return context.db
            .select({
              membershipId: tenantMembership.id,
              membershipRole: tenantMembership.role,
              userId: user.id,
              name: user.name,
              email: user.email,
              banned: user.banned,
            })
            .from(tenantMembership)
            .innerJoin(user, eq(tenantMembership.userId, user.id))
            .where(eq(tenantMembership.tenantId, input.tenantId));
        }

        return context.db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            banned: user.banned,
            createdAt: user.createdAt,
          })
          .from(user)
          .orderBy(desc(user.createdAt))
          .limit(100);
      }),

    assignToTenant: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          tenantId: z.string(),
          role: z.enum(["owner"]).default("owner"),
        }),
      )
      .handler(async ({ context, input }) => {
        const existing = await context.db
          .select({ id: tenantMembership.id })
          .from(tenantMembership)
          .where(
            and(
              eq(tenantMembership.userId, input.userId),
              eq(tenantMembership.tenantId, input.tenantId),
            ),
          )
          .limit(1)
          .then((r) => r.at(0));

        if (existing) {
          throw new ORPCError("CONFLICT", {
            message: "User already belongs to this tenant.",
          });
        }

        const now = new Date();
        const [membership] = await context.db
          .insert(tenantMembership)
          .values({
            id: crypto.randomUUID(),
            userId: input.userId,
            tenantId: input.tenantId,
            role: input.role,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        return membership;
      }),

    removeFromTenant: adminProcedure
      .input(z.object({ userId: z.string(), tenantId: z.string() }))
      .handler(async ({ context, input }) => {
        await context.db
          .delete(tenantMembership)
          .where(
            and(
              eq(tenantMembership.userId, input.userId),
              eq(tenantMembership.tenantId, input.tenantId),
            ),
          );

        return { success: true };
      }),

    updateRole: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          tenantId: z.string(),
          role: z.enum(["owner"]),
        }),
      )
      .handler(async ({ context, input }) => {
        const [updated] = await context.db
          .update(tenantMembership)
          .set({ role: input.role, updatedAt: new Date() })
          .where(
            and(
              eq(tenantMembership.userId, input.userId),
              eq(tenantMembership.tenantId, input.tenantId),
            ),
          )
          .returning();

        if (!updated) throw new ORPCError("NOT_FOUND");
        return updated;
      }),

    ban: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          reason: z.string().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        await context.db
          .update(user)
          .set({
            banned: true,
            banReason: input.reason ?? null,
            updatedAt: new Date(),
          } as Partial<typeof user.$inferInsert>)
          .where(eq(user.id, input.userId));

        return { success: true };
      }),

    unban: adminProcedure
      .input(z.object({ userId: z.string() }))
      .handler(async ({ context, input }) => {
        await context.db
          .update(user)
          .set({
            banned: false,
            banReason: null,
            updatedAt: new Date(),
          } as Partial<typeof user.$inferInsert>)
          .where(eq(user.id, input.userId));

        return { success: true };
      }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          password: z.string().min(8),
          role: z.enum(["user", "admin"]).default("user"),
        }),
      )
      .handler(async ({ context, input }) => {
        const existing = await context.db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, input.email))
          .limit(1)
          .then((r) => r.at(0));

        if (existing) {
          throw new ORPCError("CONFLICT", {
            message: "E-mail já está em uso.",
          });
        }

        const now = new Date();
        const userId = crypto.randomUUID();

        const [newUser] = await context.db
          .insert(user)
          .values({
            id: userId,
            name: input.name,
            email: input.email,
            emailVerified: false,
            role: input.role,
            banned: false,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        const hashedPwd = await hashPassword(input.password);

        await context.db.insert(account).values({
          id: crypto.randomUUID(),
          accountId: input.email,
          providerId: "credential",
          userId,
          password: hashedPwd,
          createdAt: now,
          updatedAt: now,
        });

        return newUser;
      }),

    delete: adminProcedure
      .input(z.object({ userId: z.string() }))
      .handler(async ({ context, input }) => {
        const existing = await context.db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, input.userId))
          .limit(1)
          .then((r) => r.at(0));

        if (!existing) throw new ORPCError("NOT_FOUND");

        await context.db.delete(user).where(eq(user.id, input.userId));

        return { success: true };
      }),
  },

  plan: {
    list: adminProcedure.handler(async ({ context }) => {
      return context.db.select().from(plan).orderBy(plan.price);
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          slug: z.string().min(1).optional(),
          price: priceSchema,
          interval: z.enum(["monthly", "yearly"]).default("monthly"),
          description: z.string().optional(),
          maxStations: z.number().int().positive().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const now = new Date();
        const [created] = await context.db
          .insert(plan)
          .values({
            id: crypto.randomUUID(),
            name: input.name,
            slug: input.slug ?? slugify(input.name),
            price: input.price,
            interval: input.interval,
            description: input.description ?? null,
            maxStations: input.maxStations ?? null,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        return created;
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          price: priceSchema.optional(),
          description: z.string().optional(),
          maxStations: z.number().int().positive().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const { id, ...data } = input;
        const [updated] = await context.db
          .update(plan)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(plan.id, id))
          .returning();

        if (!updated) throw new ORPCError("NOT_FOUND");
        return updated;
      }),
  },

  // Assinaturas e pagamentos moraram aqui até serem promovidos ao router
  // dedicado em routers/subscription.ts (orpc.subscription.*).
};
