import { ORPCError } from "@orpc/server";
import { and, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { station } from "../db/schema/station";
import { protectedProcedure, tenantOwnerProcedure } from "../lib/orpc";

const amenitiesSchema = z.object({
  wifi: z.boolean().optional(),
  accessibility: z.boolean().optional(),
  convenienceStore: z.boolean().optional(),
  restaurant: z.boolean().optional(),
  electricCharging: z.boolean().optional(),
  carWash: z.boolean().optional(),
  open24h: z.boolean().optional(),
  tirePressure: z.boolean().optional(),
  bathroom: z.boolean().optional(),
});

const stationBaseSchema = z
  .object({
    name: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
  })
  .merge(amenitiesSchema);

export const stationRouter = {
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        city: z.string().optional(),
        amenities: amenitiesSchema.optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      if (!context.tenant) {
        throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
      }

      const conditions = [
        eq(station.tenantId, context.tenant.id),
        eq(station.isActive, true),
      ];

      if (input.query) {
        const textSearch = or(
          ilike(station.name, `%${input.query}%`),
          ilike(station.address, `%${input.query}%`),
        );
        if (textSearch) conditions.push(textSearch);
      }

      if (input.city) {
        conditions.push(ilike(station.city, `%${input.city}%`));
      }

      const { amenities } = input;
      if (amenities) {
        if (amenities.wifi) conditions.push(eq(station.wifi, true));
        if (amenities.accessibility)
          conditions.push(eq(station.accessibility, true));
        if (amenities.convenienceStore)
          conditions.push(eq(station.convenienceStore, true));
        if (amenities.restaurant) conditions.push(eq(station.restaurant, true));
        if (amenities.electricCharging)
          conditions.push(eq(station.electricCharging, true));
        if (amenities.carWash) conditions.push(eq(station.carWash, true));
        if (amenities.open24h) conditions.push(eq(station.open24h, true));
        if (amenities.tirePressure)
          conditions.push(eq(station.tirePressure, true));
        if (amenities.bathroom) conditions.push(eq(station.bathroom, true));
      }

      return context.db
        .select()
        .from(station)
        .where(and(...conditions));
    }),

  create: tenantOwnerProcedure
    .input(stationBaseSchema)
    .handler(async ({ context, input }) => {
      const now = new Date();

      const [created] = await context.db
        .insert(station)
        .values({
          id: crypto.randomUUID(),
          tenantId: context.tenant!.id,
          ...input,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return created;
    }),

  update: tenantOwnerProcedure
    .input(
      z.object({
        id: z.string(),
        data: stationBaseSchema
          .partial()
          .extend({ isActive: z.boolean().optional() }),
      }),
    )
    .handler(async ({ context, input }) => {
      const existing = await context.db
        .select({ id: station.id })
        .from(station)
        .where(
          and(
            eq(station.id, input.id),
            eq(station.tenantId, context.tenant!.id),
          ),
        )
        .limit(1)
        .then((rows) => rows.at(0));

      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      const [updated] = await context.db
        .update(station)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(station.id, input.id))
        .returning();

      return updated;
    }),

  remove: tenantOwnerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      const existing = await context.db
        .select({ id: station.id })
        .from(station)
        .where(
          and(
            eq(station.id, input.id),
            eq(station.tenantId, context.tenant!.id),
          ),
        )
        .limit(1)
        .then((rows) => rows.at(0));

      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      await context.db
        .update(station)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(station.id, input.id));

      return { success: true };
    }),
};
