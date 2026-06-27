import {db} from "@/db";
import { auth } from "../lib/auth";
import {
 
  fuel,
  
  station,
  stationFuel,
  priceHistory,
} from "@/db/schema/station";
import { tenant,
  tenantMembership} from "@/db/schema/tenant";
  import {user} from "@/db/schema/auth";
import { eq } from "drizzle-orm";

// ── Config ─────────────────────────────────────────────────────────
const ADMIN_EMAIL = "admin@martinezposto.com";
const ADMIN_PASSWORD = "Admin@12345";
const ADMIN_NAME = "Admin Martinez";

const ADMIN2_EMAIL = "admin@redenordeste.com";
const ADMIN2_PASSWORD = "Admin@12345";
const ADMIN2_NAME = "Admin Rede Nordeste";

const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  NODE_ENV: process.env.NODE_ENV || "development",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
};


const now = new Date();
const uid = () => crypto.randomUUID();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

// ── Admin ──────────────────────────────────────────────────────────
async function seedAdmin(): Promise<string> {
  console.log("👤 Seeding admin user...");

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, ADMIN_EMAIL));

  if (existing) {
    console.log("ℹ️  Admin already exists, skipping");
    return existing.id;
  }

  const result = await auth.api.signUpEmail({
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
    },
  });

  const newUser = (result as any)?.user;
  if (!newUser?.id) throw new Error("Failed to create admin user");

  console.log(`✅ Admin criado: ${ADMIN_EMAIL}`);
  console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
  return newUser.id;
}

// ── Fuels ──────────────────────────────────────────────────────────
async function seedFuels(): Promise<Record<string, { id: string }>> {
  console.log("⛽ Seeding fuels...");

  await db
    .insert(fuel)
    .values([
      { id: uid(), name: "Gasolina Comum",     slug: "gasolina-comum",     createdAt: now, updatedAt: now },
      { id: uid(), name: "Gasolina Aditivada", slug: "gasolina-aditivada", createdAt: now, updatedAt: now },
      { id: uid(), name: "Etanol",             slug: "etanol",             createdAt: now, updatedAt: now },
      { id: uid(), name: "Diesel S-10",        slug: "diesel-s10",         createdAt: now, updatedAt: now },
      { id: uid(), name: "Diesel S-500",       slug: "diesel-s500",        createdAt: now, updatedAt: now },
      { id: uid(), name: "GNV",                slug: "gnv",                createdAt: now, updatedAt: now },
    ])
    .onConflictDoNothing();

  // Busca os IDs reais (podem já existir pelo slug único)
  const rows = await db.select().from(fuel);
  const bySlug = Object.fromEntries(rows.map((f) => [f.slug, f]));

  console.log(`✅ ${rows.length} combustíveis`);
  return bySlug;
}

// ── Tenants ────────────────────────────────────────────────────────
async function seedTenants(
  adminId: string
): Promise<Record<string, { id: string }>> {
  console.log("🏢 Seeding tenants...");

  await db
    .insert(tenant)
    .values([
      {
        id: uid(),
        slug: "grupo-martinez",
        name: "Grupo Martinez",
        createdAt: daysAgo(85),
        updatedAt: daysAgo(85),
      },
      {
        id: uid(),
        slug: "rede-nordeste",
        name: "Rede Nordeste Combustíveis",
        createdAt: daysAgo(55),
        updatedAt: daysAgo(55),
      },
    ])
    .onConflictDoNothing();

  const rows = await db.select().from(tenant);
  const bySlug = Object.fromEntries(rows.map((t) => [t.slug, t]));

  // Admin é owner de todos os tenants (para demo/dev)
  await db
    .insert(tenantMembership)
    .values(
      rows.map((t) => ({
        id: uid(),
        tenantId: t.id,
        userId: adminId,
        role: "owner" as const,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }))
    )
    .onConflictDoNothing();

  console.log(`✅ ${rows.length} tenants`);
  return bySlug;
}

// ── Stations ───────────────────────────────────────────────────────
async function seedStations(
  tenantsBySlug: Record<string, { id: string }>
): Promise<Record<string, { id: string }>> {
  console.log("🏪 Seeding stations...");

  const martinezId = tenantsBySlug["grupo-martinez"].id;
  const nordesteId = tenantsBySlug["rede-nordeste"].id;

  const stationsData = [
    {
      name: "Posto Martinez - Centro",
      tenantId: martinezId,
      address: "Av. Frei Serafim, 1234",
      city: "Teresina",
      latitude: -5.0919,
      longitude: -42.8034,
      isActive: true,
      wifi: true,
      accessibility: true,
      convenienceStore: true,
      restaurant: false,
      electricCharging: false,
      carWash: true,
      open24h: true,
      tirePressure: true,
      bathroom: true,
      createdAt: daysAgo(70),
      updatedAt: daysAgo(3),
    },
    {
      name: "Posto Martinez - Floriano",
      tenantId: martinezId,
      address: "Rua Desembargador Freitas, 567",
      city: "Floriano",
      latitude: -6.7672,
      longitude: -43.0236,
      isActive: true,
      wifi: false,
      accessibility: true,
      convenienceStore: true,
      restaurant: true,
      electricCharging: false,
      carWash: false,
      open24h: false,
      tirePressure: true,
      bathroom: true,
      createdAt: daysAgo(65),
      updatedAt: daysAgo(8),
    },
    {
      name: "Posto Martinez - Picos",
      tenantId: martinezId,
      address: "Av. Joca Vieira, 890",
      city: "Picos",
      latitude: -7.0769,
      longitude: -41.4672,
      isActive: true,
      wifi: true,
      accessibility: false,
      convenienceStore: true,
      restaurant: false,
      electricCharging: true,
      carWash: true,
      open24h: false,
      tirePressure: true,
      bathroom: true,
      createdAt: daysAgo(55),
      updatedAt: daysAgo(1),
    },
    {
      name: "Nordeste - Parnaíba",
      tenantId: nordesteId,
      address: "Av. São Sebastião, 2100",
      city: "Parnaíba",
      latitude: -2.9054,
      longitude: -41.7769,
      isActive: true,
      wifi: true,
      accessibility: true,
      convenienceStore: false,
      restaurant: false,
      electricCharging: false,
      carWash: false,
      open24h: true,
      tirePressure: true,
      bathroom: true,
      createdAt: daysAgo(45),
      updatedAt: daysAgo(2),
    },
    {
      // Posto inativo — útil pra testar filtros na API
      name: "Nordeste - Teresina Leste",
      tenantId: nordesteId,
      address: "Av. João XXIII, 3300",
      city: "Teresina",
      latitude: -5.0819,
      longitude: -42.78,
      isActive: false,
      wifi: false,
      accessibility: false,
      convenienceStore: false,
      restaurant: false,
      electricCharging: false,
      carWash: false,
      open24h: false,
      tirePressure: false,
      bathroom: false,
      createdAt: daysAgo(40),
      updatedAt: daysAgo(15),
    },
  ];

  for (const s of stationsData) {
    const [existing] = await db
      .select({ id: station.id })
      .from(station)
      .where(eq(station.name, s.name));

    if (!existing) {
      await db.insert(station).values({ id: uid(), ...s });
    }
  }

  const rows = await db.select().from(station);
  const byName = Object.fromEntries(rows.map((s) => [s.name, s]));

  console.log(`✅ ${rows.length} postos`);
  return byName;
}

// ── Station Fuels + Price History ──────────────────────────────────
async function seedStationFuels(
  stationsByName: Record<string, { id: string }>,
  fuelsBySlug: Record<string, { id: string }>,
  adminId: string
) {
  console.log("💰 Seeding station fuels...");

  type Pricing = {
    stationName: string;
    fuelSlug: string;
    currentPrice: string;
    isAvailable: boolean;
    previousPrice?: string;
  };

  const pricings: Pricing[] = [
    // ── Posto Martinez - Centro (todos os combustíveis)
    { stationName: "Posto Martinez - Centro", fuelSlug: "gasolina-comum",     currentPrice: "6.490", isAvailable: true,  previousPrice: "6.350" },
    { stationName: "Posto Martinez - Centro", fuelSlug: "gasolina-aditivada", currentPrice: "6.790", isAvailable: true,  previousPrice: "6.650" },
    { stationName: "Posto Martinez - Centro", fuelSlug: "etanol",             currentPrice: "4.290", isAvailable: true,  previousPrice: "4.190" },
    { stationName: "Posto Martinez - Centro", fuelSlug: "diesel-s10",         currentPrice: "6.190", isAvailable: true,  previousPrice: "6.050" },
    { stationName: "Posto Martinez - Centro", fuelSlug: "gnv",                currentPrice: "4.990", isAvailable: true },

    // ── Posto Martinez - Floriano (sem GNV; etanol sem estoque)
    { stationName: "Posto Martinez - Floriano", fuelSlug: "gasolina-comum",     currentPrice: "6.550", isAvailable: true,  previousPrice: "6.450" },
    { stationName: "Posto Martinez - Floriano", fuelSlug: "gasolina-aditivada", currentPrice: "6.850", isAvailable: true },
    { stationName: "Posto Martinez - Floriano", fuelSlug: "etanol",             currentPrice: "4.350", isAvailable: false },
    { stationName: "Posto Martinez - Floriano", fuelSlug: "diesel-s10",         currentPrice: "6.250", isAvailable: true,  previousPrice: "6.100" },

    // ── Posto Martinez - Picos
    { stationName: "Posto Martinez - Picos", fuelSlug: "gasolina-comum",     currentPrice: "6.520", isAvailable: true },
    { stationName: "Posto Martinez - Picos", fuelSlug: "gasolina-aditivada", currentPrice: "6.820", isAvailable: true, previousPrice: "6.700" },
    { stationName: "Posto Martinez - Picos", fuelSlug: "etanol",             currentPrice: "4.310", isAvailable: true },
    { stationName: "Posto Martinez - Picos", fuelSlug: "diesel-s10",         currentPrice: "6.220", isAvailable: true },
    { stationName: "Posto Martinez - Picos", fuelSlug: "gnv",                currentPrice: "5.050", isAvailable: true, previousPrice: "4.950" },

    // ── Nordeste - Parnaíba
    { stationName: "Nordeste - Parnaíba", fuelSlug: "gasolina-comum",  currentPrice: "6.480", isAvailable: true, previousPrice: "6.380" },
    { stationName: "Nordeste - Parnaíba", fuelSlug: "etanol",          currentPrice: "4.270", isAvailable: true },
    { stationName: "Nordeste - Parnaíba", fuelSlug: "diesel-s10",      currentPrice: "6.180", isAvailable: true },

    // ── Nordeste - Teresina Leste (inativo — tudo indisponível)
    { stationName: "Nordeste - Teresina Leste", fuelSlug: "gasolina-comum", currentPrice: "6.400", isAvailable: false },
    { stationName: "Nordeste - Teresina Leste", fuelSlug: "etanol",         currentPrice: "4.200", isAvailable: false },
  ];

  let inserted = 0;

  for (const p of pricings) {
    const st = stationsByName[p.stationName];
    const f = fuelsBySlug[p.fuelSlug];

    if (!st || !f) {
      console.warn(`⚠️  Skip: "${p.stationName}" / "${p.fuelSlug}" não encontrado`);
      continue;
    }

    // Retorna vazio se já existe (unique_station_fuel), sem lançar erro
    const rows = await db
      .insert(stationFuel)
      .values({
        id: uid(),
        stationId: st.id,
        fuelId: f.id,
        currentPrice: p.currentPrice,
        isAvailable: p.isAvailable,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: stationFuel.id });

    // Só cria histórico se o stationFuel acabou de ser inserido
    if (!rows.length) continue;

    inserted++;
    const sfId = rows[0].id;

    if (p.previousPrice) {
      await db.insert(priceHistory).values([
        {
          id: uid(),
          stationFuelId: sfId,
          previousPrice: null,
          newPrice: p.previousPrice,
          changedAt: daysAgo(30),
          changedById: adminId,
        },
        {
          id: uid(),
          stationFuelId: sfId,
          previousPrice: p.previousPrice,
          newPrice: p.currentPrice,
          changedAt: daysAgo(5),
          changedById: adminId,
        },
      ]);
    } else {
      await db.insert(priceHistory).values({
        id: uid(),
        stationFuelId: sfId,
        previousPrice: null,
        newPrice: p.currentPrice,
        changedAt: daysAgo(30),
        changedById: adminId,
      });
    }
  }

  console.log(`✅ ${inserted} preços inseridos (${pricings.length - inserted} já existiam)`);
}


async function seed() {
  console.log("🌱 Seeding database...\n");

  const adminId = await seedAdmin();
  const fuels = await seedFuels();
  const tenants = await seedTenants(adminId);
  const stations = await seedStations(tenants);
  await seedStationFuels(stations, fuels, adminId);

  console.log("\n🎉 Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});