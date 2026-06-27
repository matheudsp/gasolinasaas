import {
  boolean,
  doublePrecision,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { tenant } from "./tenant";

export const fuel = pgTable("fuel", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const station = pgTable("station", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenant.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  wifi: boolean("wifi").notNull().default(false),
  accessibility: boolean("accessibility").notNull().default(false),
  convenienceStore: boolean("convenience_store").notNull().default(false),
  restaurant: boolean("restaurant").notNull().default(false),
  electricCharging: boolean("electric_charging").notNull().default(false),
  carWash: boolean("car_wash").notNull().default(false),
  open24h: boolean("open24h").notNull().default(false),
  tirePressure: boolean("tire_pressure").notNull().default(false),
  bathroom: boolean("bathroom").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const stationFuel = pgTable(
  "station_fuel",
  {
    id: text("id").primaryKey(),
    stationId: text("station_id")
      .notNull()
      .references(() => station.id, { onDelete: "cascade" }),
    fuelId: text("fuel_id")
      .notNull()
      .references(() => fuel.id, { onDelete: "cascade" }),
    currentPrice: numeric("current_price", {
      precision: 10,
      scale: 3,
    }).notNull(),
    isAvailable: boolean("is_available").notNull().default(true),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => [unique("unique_station_fuel").on(t.stationId, t.fuelId)]
);

export const priceHistory = pgTable("price_history", {
  id: text("id").primaryKey(),
  stationFuelId: text("station_fuel_id")
    .notNull()
    .references(() => stationFuel.id, { onDelete: "cascade" }),
  previousPrice: numeric("previous_price", { precision: 10, scale: 3 }),
  newPrice: numeric("new_price", { precision: 10, scale: 3 }).notNull(),
  changedAt: timestamp("changed_at").notNull(),
  changedById: text("changed_by_id")
    .notNull()
    .references(() => user.id),
});