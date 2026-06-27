import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { tenant, tenantMembership } from "../db/schema/tenant";

export type TenantRecord = typeof tenant.$inferSelect;
export type TenantMembershipRecord = typeof tenantMembership.$inferSelect;

export interface TenantResolutionOptions {
  request: Request;
  sessionUserId?: string;
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
}: TenantResolutionOptions): Promise<TenantResolution> => {
  const identifier = getTenantIdentifier(request);

  if (!identifier) {
    return {};
  }

  const tenantRecord = await findTenant(identifier);

  if (!tenantRecord) {
    return {};
  }

  if (!sessionUserId) {
    return { tenant: tenantRecord };
  }

  const tenantMembershipRecord = await findTenantMembership({
    tenantId: tenantRecord.id,
    userId: sessionUserId,
  });

  return {
    tenant: tenantRecord,
    tenantMembership: tenantMembershipRecord,
  };
};

type TenantIdentifier = { id?: string; slug?: string };

const getTenantIdentifier = (
  request: Request
): TenantIdentifier | undefined => {
  const idFromHeader = normalizeIdentifier(
    request.headers.get(TENANT_ID_HEADER)
  );
  const slugFromHeader = normalizeIdentifier(
    request.headers.get(TENANT_SLUG_HEADER)
  );

  if (idFromHeader) {
    return { id: idFromHeader };
  }

  if (slugFromHeader) {
    return { slug: slugFromHeader };
  }

  const hostname = new URL(request.url).hostname;
  const slugFromHost = extractSubdomainSlug(hostname);

  if (slugFromHost) {
    return { slug: slugFromHost };
  }

  const slugFromPath = extractPathSlug(new URL(request.url).pathname);

  if (slugFromPath) {
    return { slug: slugFromPath };
  }

  return undefined;
};

const normalizeIdentifier = (value: string | null): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.toLowerCase();
};

const extractSubdomainSlug = (hostname: string): string | undefined => {
  const safeHostname = hostname.toLowerCase();
  if (safeHostname === "localhost" || safeHostname.endsWith(".localhost")) {
    return undefined;
  }

  const segments = safeHostname.split(".");

  if (segments.length < 3) {
    return undefined;
  }

  const [candidate] = segments;

  if (candidate === "www") {
    return undefined;
  }

  return candidate;
};

const extractPathSlug = (pathname: string): string | undefined => {
  const segments = pathname.split("/").filter(Boolean);
  const [maybeTenant, firstRouteSegment] = segments;

  if (!maybeTenant || maybeTenant === "api" || maybeTenant === "rpc") {
    return undefined;
  }

  if (firstRouteSegment && firstRouteSegment === "api") {
    return undefined;
  }

  return maybeTenant.toLowerCase();
};

const findTenant = async (
  identifier: TenantIdentifier
): Promise<TenantRecord | undefined> => {
  if (identifier.id) {
    const rowsById = await db
      .select()
      .from(tenant)
      .where(eq(tenant.id, identifier.id))
      .limit(1);
    return rowsById.at(0);
  }

  if (identifier.slug) {
    const rowsBySlug = await db
      .select()
      .from(tenant)
      .where(eq(tenant.slug, identifier.slug))
      .limit(1);
    return rowsBySlug.at(0);
  }

  return undefined;
};

const findTenantMembership = async ({
  tenantId,
  userId,
}: {
  tenantId: string;
  userId: string;
}): Promise<TenantMembershipRecord | undefined> => {
  const rows = await db
    .select()
    .from(tenantMembership)
    .where(
      and(
        eq(tenantMembership.tenantId, tenantId),
        eq(tenantMembership.userId, userId)
      )
    )
    .limit(1);

  return rows.at(0);
};
