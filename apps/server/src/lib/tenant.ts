import { and, eq } from "drizzle-orm";
import type { Db } from "../db";
import { tenant, tenantMembership } from "../db/schema/tenant";

export type TenantRecord = typeof tenant.$inferSelect;
export type TenantMembershipRecord = typeof tenantMembership.$inferSelect;

export interface TenantResolutionOptions {
  request: Request;
  sessionUserId?: string;
  db: Db;
}

export interface TenantResolution {
  tenant?: TenantRecord;
  tenantMembership?: TenantMembershipRecord;
}

const TENANT_ID_HEADER = "x-tenant-id";
const TENANT_SLUG_HEADER = "x-tenant-slug";

export const resolveTenantContext = async ({
  request,
  sessionUserId,
  db,
}: TenantResolutionOptions): Promise<TenantResolution> => {
  const identifier = getTenantIdentifier(request);

  if (!identifier) {
    return {};
  }

  const tenantRecord = await findTenant(identifier, db);

  if (!tenantRecord) {
    return {};
  }

  if (!sessionUserId) {
    return { tenant: tenantRecord };
  }

  const tenantMembershipRecord = await findTenantMembership({
    tenantId: tenantRecord.id,
    userId: sessionUserId,
    db,
  });

  return {
    tenant: tenantRecord,
    tenantMembership: tenantMembershipRecord,
  };
};

type TenantIdentifier = { id?: string; slug?: string };

const getTenantIdentifier = (
  request: Request,
): TenantIdentifier | undefined => {
  const idFromHeader = normalizeIdentifier(
    request.headers.get(TENANT_ID_HEADER),
  );
  const slugFromHeader = normalizeIdentifier(
    request.headers.get(TENANT_SLUG_HEADER),
  );

  if (idFromHeader) return { id: idFromHeader };
  if (slugFromHeader) return { slug: slugFromHeader };

  const hostname = new URL(request.url).hostname;
  const slugFromHost = extractSubdomainSlug(hostname);
  if (slugFromHost) return { slug: slugFromHost };

  const slugFromPath = extractPathSlug(new URL(request.url).pathname);
  if (slugFromPath) return { slug: slugFromPath };

  return undefined;
};

const normalizeIdentifier = (value: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
};

const extractSubdomainSlug = (hostname: string): string | undefined => {
  const safe = hostname.toLowerCase();
  if (safe === "localhost" || safe.endsWith(".localhost")) return undefined;
  const segments = safe.split(".");
  if (segments.length < 3) return undefined;
  const [candidate] = segments;
  return candidate === "www" ? undefined : candidate;
};

const extractPathSlug = (pathname: string): string | undefined => {
  const segments = pathname.split("/").filter(Boolean);
  const [maybeTenant, firstRouteSegment] = segments;
  if (!maybeTenant || maybeTenant === "api" || maybeTenant === "rpc")
    return undefined;
  if (firstRouteSegment && firstRouteSegment === "api") return undefined;
  return maybeTenant.toLowerCase();
};

const findTenant = async (
  identifier: TenantIdentifier,
  db: Db,
): Promise<TenantRecord | undefined> => {
  if (identifier.id) {
    return db
      .select()
      .from(tenant)
      .where(eq(tenant.id, identifier.id))
      .limit(1)
      .then((rows) => rows.at(0));
  }

  if (identifier.slug) {
    return db
      .select()
      .from(tenant)
      .where(eq(tenant.slug, identifier.slug))
      .limit(1)
      .then((rows) => rows.at(0));
  }

  return undefined;
};

const findTenantMembership = async ({
  tenantId,
  userId,
  db,
}: {
  tenantId: string;
  userId: string;
  db: Db;
}): Promise<TenantMembershipRecord | undefined> => {
  return db
    .select()
    .from(tenantMembership)
    .where(
      and(
        eq(tenantMembership.tenantId, tenantId),
        eq(tenantMembership.userId, userId),
      ),
    )
    .limit(1)
    .then((rows) => rows.at(0));
};
