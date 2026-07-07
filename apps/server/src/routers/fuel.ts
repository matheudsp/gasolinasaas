import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { fuel, priceHistory, station, stationFuel } from "../db/schema/station";
import { protectedProcedure, tenantOwnerProcedure } from "../lib/orpc";

export const fuelRouter = {
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

  updatePrice: tenantOwnerProcedure
    .input(
      z.object({
        stationFuelId: z.string(),
        newPrice: z
          .string()
          .regex(
            /^\d+(\.\d{1,3})?$/,
            "Price must be a positive number with up to 3 decimal places",
          ),
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