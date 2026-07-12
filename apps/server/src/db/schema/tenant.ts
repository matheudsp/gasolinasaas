import {
  boolean,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// "owner": dono da rede. "operator": frentista/caixa que credita pontos de
// fidelidade, sem acesso aos dados administrativos do tenant.
export const tenantRole = pgEnum("tenant_role", ["owner", "operator"]);

export const tenant = pgTable("tenant", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  // Multiplicador de fidelidade: pontos que o cliente ganha por real gasto.
  // numeric para aceitar frações (ex.: 2,5 pontos por real).
  pointsPerReal: numeric("points_per_real", { precision: 6, scale: 2 })
    .notNull()
    .default("1"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const tenantMembership = pgTable(
  "tenant_membership",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: tenantRole("role").notNull().default("owner"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    tenantMembershipTenantUserIdx: uniqueIndex(
      "tenant_membership_tenant_id_user_id_idx",
    ).on(table.tenantId, table.userId),
  }),
);
