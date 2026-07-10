import { ORPCError } from "@orpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { fuel, priceHistory, station, stationFuel } from "../db/schema/station";
import { protectedProcedure, tenantOwnerProcedure } from "../lib/orpc";

const priceSchema = z
  .string()
  .regex(
    /^\d+(\.\d{1,3})?$/,
    "Price must be a positive number with up to 3 decimal places",
  );

export const fuelRouter = {
  /**
   * Catálogo global de combustíveis (compartilhado entre tenants).
   * Usado no painel para escolher qual combustível adicionar a um posto.
   */
  listCatalog: protectedProcedure.handler(async ({ context }) => {
    return context.db
      .select({ id: fuel.id, name: fuel.name, slug: fuel.slug })
      .from(fuel)
      .orderBy(asc(fuel.name));
  }),

  listPrices: protectedProcedure
    .input(
      z.object({
        stationId: z.string().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      if (!context.tenant) {
        throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
      }

      const conditions = [
        eq(station.tenantId, context.tenant.id),
        eq(station.isActive, true),
        eq(stationFuel.isAvailable, true),
      ];

      if (input.stationId) {
        conditions.push(eq(stationFuel.stationId, input.stationId));
      }

      return context.db
        .select({
          stationFuelId: stationFuel.id,
          stationId: station.id,
          stationName: station.name,
          fuelId: fuel.id,
          fuelName: fuel.name,
          fuelSlug: fuel.slug,
          currentPrice: stationFuel.currentPrice,
          isAvailable: stationFuel.isAvailable,
          updatedAt: stationFuel.updatedAt,
        })
        .from(stationFuel)
        .innerJoin(station, eq(stationFuel.stationId, station.id))
        .innerJoin(fuel, eq(stationFuel.fuelId, fuel.id))
        .where(and(...conditions));
    }),

  /**
   * Combustíveis que o tenant efetivamente vende (ao menos um posto ativo
   * com esse combustível disponível) — não a lista global de fuel, que é
   * compartilhada entre todos os tenants e pode incluir combustíveis que
   * esta rede específica não comercializa (ex: GNV).
   */
  listAvailable: protectedProcedure.handler(async ({ context }) => {
    if (!context.tenant) {
      throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
    }

    return context.db
      .selectDistinct({
        slug: fuel.slug,
        name: fuel.name,
      })
      .from(stationFuel)
      .innerJoin(station, eq(stationFuel.stationId, station.id))
      .innerJoin(fuel, eq(stationFuel.fuelId, fuel.id))
      .where(
        and(
          eq(station.tenantId, context.tenant.id),
          eq(station.isActive, true),
          eq(stationFuel.isAvailable, true),
        ),
      );
  }),

  /**
   * Adiciona um combustível do catálogo a um posto do tenant, com preço
   * inicial. Se o combustível já esteve no posto e foi removido
   * (isAvailable=false), reativa a linha existente com o novo preço —
   * a unique(stationId, fuelId) impede duplicar.
   */
  addToStation: tenantOwnerProcedure
    .input(
      z.object({
        stationId: z.string(),
        fuelId: z.string(),
        price: priceSchema,
      }),
    )
    .handler(async ({ context, input }) => {
      const stationRecord = await context.db
        .select({ id: station.id })
        .from(station)
        .where(
          and(
            eq(station.id, input.stationId),
            eq(station.tenantId, context.tenant.id),
          ),
        )
        .limit(1)
        .then((rows) => rows.at(0));

      if (!stationRecord) {
        throw new ORPCError("NOT_FOUND", { message: "Station not found" });
      }

      const fuelRecord = await context.db
        .select({ id: fuel.id })
        .from(fuel)
        .where(eq(fuel.id, input.fuelId))
        .limit(1)
        .then((rows) => rows.at(0));

      if (!fuelRecord) {
        throw new ORPCError("NOT_FOUND", { message: "Fuel not found" });
      }

      const existing = await context.db
        .select({
          id: stationFuel.id,
          isAvailable: stationFuel.isAvailable,
          currentPrice: stationFuel.currentPrice,
        })
        .from(stationFuel)
        .where(
          and(
            eq(stationFuel.stationId, input.stationId),
            eq(stationFuel.fuelId, input.fuelId),
          ),
        )
        .limit(1)
        .then((rows) => rows.at(0));

      if (existing?.isAvailable) {
        throw new ORPCError("CONFLICT", {
          message: "Este posto já tem esse combustível.",
        });
      }

      const now = new Date();

      return context.db.transaction(async (tx) => {
        let stationFuelId: string;
        let previousPrice: string | null = null;

        if (existing) {
          stationFuelId = existing.id;
          previousPrice = existing.currentPrice;
          await tx
            .update(stationFuel)
            .set({
              currentPrice: input.price,
              isAvailable: true,
              updatedAt: now,
            })
            .where(eq(stationFuel.id, existing.id));
        } else {
          stationFuelId = crypto.randomUUID();
          await tx.insert(stationFuel).values({
            id: stationFuelId,
            stationId: input.stationId,
            fuelId: input.fuelId,
            currentPrice: input.price,
            isAvailable: true,
            createdAt: now,
            updatedAt: now,
          });
        }

        await tx.insert(priceHistory).values({
          id: crypto.randomUUID(),
          stationFuelId,
          previousPrice,
          newPrice: input.price,
          changedAt: now,
          changedById: context.session!.user.id,
        });

        return { stationFuelId };
      });
    }),

  /**
   * Remove (desativa) um combustível de um posto. Soft-delete via
   * isAvailable para preservar o histórico de preços.
   */
  removeFromStation: tenantOwnerProcedure
    .input(z.object({ stationFuelId: z.string() }))
    .handler(async ({ context, input }) => {
      const existing = await context.db
        .select({ id: stationFuel.id, tenantId: station.tenantId })
        .from(stationFuel)
        .innerJoin(station, eq(stationFuel.stationId, station.id))
        .where(eq(stationFuel.id, input.stationFuelId))
        .limit(1)
        .then((rows) => rows.at(0));

      if (!existing || existing.tenantId !== context.tenant.id) {
        throw new ORPCError("NOT_FOUND");
      }

      await context.db
        .update(stationFuel)
        .set({ isAvailable: false, updatedAt: new Date() })
        .where(eq(stationFuel.id, input.stationFuelId));

      return { success: true };
    }),

  updatePrice: tenantOwnerProcedure
    .input(
      z.object({
        stationFuelId: z.string(),
        newPrice: priceSchema,
      }),
    )
    .handler(async ({ context, input }) => {
      const current = await context.db
        .select({
          currentPrice: stationFuel.currentPrice,
          tenantId: station.tenantId,
        })
        .from(stationFuel)
        .innerJoin(station, eq(stationFuel.stationId, station.id))
        .where(eq(stationFuel.id, input.stationFuelId))
        .limit(1)
        .then((rows) => rows.at(0));

      if (!current) {
        throw new ORPCError("NOT_FOUND");
      }

      if (current.tenantId !== context.tenant!.id) {
        throw new ORPCError("FORBIDDEN");
      }

      const now = new Date();

      await context.db.transaction(async (tx) => {
        await tx
          .update(stationFuel)
          .set({ currentPrice: input.newPrice, updatedAt: now })
          .where(eq(stationFuel.id, input.stationFuelId));

        await tx.insert(priceHistory).values({
          id: crypto.randomUUID(),
          stationFuelId: input.stationFuelId,
          previousPrice: current.currentPrice,
          newPrice: input.newPrice,
          changedAt: now,
          changedById: context.session!.user.id,
        });
      });

      return { success: true };
    }),
};