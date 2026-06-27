import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { fuel, priceHistory, station, stationFuel } from "../db/schema/station";
import { protectedProcedure, tenantOwnerProcedure } from "../lib/orpc";

// ─── Router ───────────────────────────────────────────────────────────────────

export const fuelRouter = {
  /**
   * List available fuel prices for the resolved tenant's active stations.
   * Optionally scoped to a single station via stationId.
   */
  listPrices: protectedProcedure
    .input(
      z.object({
        stationId: z.string().optional(),
      })
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

      return db
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
   * Update the price of a fuel at a specific station.
   *
   * Two things happen inside a transaction:
   * 1. stationFuel.currentPrice is updated.
   * 2. A priceHistory record is inserted with the previous price.
   *
   * A cross-tenant ownership check is done explicitly:
   * tenantOwnerProcedure validates the user is an owner, but it does not
   * validate that the stationFuel being updated belongs to their tenant.
   * That check is done manually before the transaction.
   */
  updatePrice: tenantOwnerProcedure
    .input(
      z.object({
        stationFuelId: z.string(),
        newPrice: z
          .string()
          .regex(
            /^\d+(\.\d{1,3})?$/,
            "Price must be a positive number with up to 3 decimal places"
          ),
      })
    )
    .handler(async ({ context, input }) => {
      // Fetch current price and verify tenant ownership in one query.
      const current = await db
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

      // Defense in depth: confirm the station belongs to the authenticated tenant.
      if (current.tenantId !== context.tenant!.id) {
        throw new ORPCError("FORBIDDEN");
      }

      const now = new Date();

      await db.transaction(async (tx) => {
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
          // session is guaranteed non-null by tenantOwnerProcedure → requireAuth
          changedById: context.session!.user.id,
        });
      });

      return { success: true };
    }),
};