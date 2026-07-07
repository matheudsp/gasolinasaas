import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { fuel, station, stationFuel } from "../db/schema/station";
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

  /**
   * Lista postos próximos com filtro real por combustível, preço e
   * distância
   *
   * Distância via Haversine direto na query (o schema não usa PostGIS,
   * latitude/longitude são doublePrecision simples). Quando latitude/
   * longitude não são informados, distanceKm vem null para cada posto
   * e qualquer filtro/ordenação por distância é ignorado.
   *
   */
  listNearby: protectedProcedure
    .input(
      z.object({
        fuelSlug: z.string().min(1),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        sortBy: z
          .enum(["distance-asc", "distance-desc", "price-asc", "price-desc"])
          .default("distance-asc"),
        maxDistanceKm: z.number().positive().optional(),
        minPrice: z.coerce.number().nonnegative().optional(),
        maxPrice: z.coerce.number().nonnegative().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .handler(async ({ context, input }) => {
      if (!context.tenant) {
        throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
      }

      const hasCoords =
        input.latitude !== undefined && input.longitude !== undefined;
      const lat = input.latitude ?? null;
      const lng = input.longitude ?? null;

      // CASE WHEN explícito é necessário aqui: least()/greatest() do Postgres
      // IGNORAM null entre os argumentos em vez de propagar — sem o guard,
      // "sem coordenadas" calcularia acos(-1) e retornaria ~20015km em vez
      // de null.
      const distanceKmExpr = sql<number | null>`(
        CASE WHEN ${lat}::double precision IS NULL THEN NULL
        ELSE 6371 * acos(
          least(1, greatest(-1,
            cos(radians(${lat})) * cos(radians(${station.latitude})) *
            cos(radians(${station.longitude}) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(${station.latitude}))
          ))
        ) END
      )`;

      const conditions = [
        eq(station.tenantId, context.tenant.id),
        eq(station.isActive, true),
        eq(stationFuel.isAvailable, true),
        eq(fuel.slug, input.fuelSlug),
      ];

      if (hasCoords && input.maxDistanceKm !== undefined) {
        conditions.push(sql`${distanceKmExpr} <= ${input.maxDistanceKm}`);
      }
      if (input.minPrice !== undefined) {
        conditions.push(gte(stationFuel.currentPrice, input.minPrice.toString()));
      }
      if (input.maxPrice !== undefined) {
        conditions.push(lte(stationFuel.currentPrice, input.maxPrice.toString()));
      }

      // Sem coordenadas, ordenar por distância não faz sentido (tudo null)
      // — cai para ordem alfabética como default previsível.
      const orderByClause = (() => {
        switch (input.sortBy) {
          case "distance-asc":
            return hasCoords ? sql`${distanceKmExpr} ASC NULLS LAST` : asc(station.name);
          case "distance-desc":
            return hasCoords ? sql`${distanceKmExpr} DESC NULLS LAST` : asc(station.name);
          case "price-asc":
            return asc(stationFuel.currentPrice);
          case "price-desc":
            return desc(stationFuel.currentPrice);
        }
      })();

      return context.db
        .select({
          id: station.id,
          name: station.name,
          address: station.address,
          city: station.city,
          latitude: station.latitude,
          longitude: station.longitude,
          price: stationFuel.currentPrice,
          fuelName: fuel.name,
          distanceKm: distanceKmExpr,
        })
        .from(station)
        .innerJoin(stationFuel, eq(stationFuel.stationId, station.id))
        .innerJoin(fuel, eq(stationFuel.fuelId, fuel.id))
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(input.limit);
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

  /**
   * Retorna um posto pelo ID com todos os preços de combustíveis disponíveis.
   * Usado pela tela de detalhes do app mobile.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      if (!context.tenant) {
        throw new ORPCError("BAD_REQUEST", { message: "Tenant is required" });
      }

      const row = await context.db
        .select()
        .from(station)
        .where(
          and(
            eq(station.id, input.id),
            eq(station.tenantId, context.tenant.id),
            eq(station.isActive, true),
          ),
        )
        .limit(1)
        .then((rows) => rows.at(0));

      if (!row) {
        throw new ORPCError("NOT_FOUND");
      }

      const prices = await context.db
        .select({
          id: stationFuel.id,
          fuelId: fuel.id,
          fuelName: fuel.name,
          fuelSlug: fuel.slug,
          currentPrice: stationFuel.currentPrice,
          isAvailable: stationFuel.isAvailable,
          updatedAt: stationFuel.updatedAt,
        })
        .from(stationFuel)
        .innerJoin(fuel, eq(stationFuel.fuelId, fuel.id))
        .where(
          and(
            eq(stationFuel.stationId, input.id),
            eq(stationFuel.isAvailable, true),
          ),
        );

      return { ...row, prices };
    }),
};