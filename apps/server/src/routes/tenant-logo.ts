import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { tenant, tenantMembership } from "../db/schema/tenant";
import type { AppEnv } from "../lib/hono-env";

const MAX_IMAGE_BYTES = 2_000_000;

export const tenantLogoRoutes = new Hono<AppEnv>();

/**
 * Upload do logo do tenant (owner ou admin da plataforma). Grava no R2 —
 * mesmo bucket das fotos de recompensa, sob o prefixo `tenant-logos/` — e
 * aponta tenant.logoUrl para a rota pública de serviço. Um logo por tenant
 * (chave determinística) — reenvio sobrescreve.
 */
tenantLogoRoutes.post("/api/tenants/:tenantId/logo", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Não autenticado" }, 401);
  }

  const tenantId = c.req.param("tenantId");
  const db = createDb(c.env.DATABASE_URL);

  const [tn] = await db.select().from(tenant).where(eq(tenant.id, tenantId));
  if (!tn) {
    return c.json({ error: "Tenant não encontrado" }, 404);
  }

  // Autorização: owner do tenant (ou admin da plataforma).
  const isAdmin = (user as { role?: string }).role === "admin";
  if (!isAdmin) {
    const [membership] = await db
      .select({ role: tenantMembership.role })
      .from(tenantMembership)
      .where(
        and(
          eq(tenantMembership.tenantId, tn.id),
          eq(tenantMembership.userId, user.id)
        )
      );
    if (membership?.role !== "owner") {
      return c.json({ error: "Sem permissão" }, 403);
    }
  }

  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return c.json({ error: "Envie um arquivo de imagem" }, 400);
  }

  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0) {
    return c.json({ error: "Arquivo vazio" }, 400);
  }
  if (body.byteLength > MAX_IMAGE_BYTES) {
    return c.json({ error: "Imagem acima de 2 MB" }, 413);
  }

  const key = `tenant-logos/${tn.id}`;
  await c.env.REWARD_IMAGES.put(key, body, {
    httpMetadata: { contentType },
  });

  // Caminho relativo (não o host da requisição — que no `wrangler dev` vem como
  // o domínio de produção). Cada cliente monta a URL com a própria base de API.
  // ?v= força o cache a buscar a versão nova quando o logo é trocado.
  const logoUrl = `/images/${key}?v=${Date.now()}`;
  await db
    .update(tenant)
    .set({ logoUrl, updatedAt: new Date() })
    .where(eq(tenant.id, tn.id));

  return c.json({ logoUrl });
});

/** Serve o logo do R2. Público e cacheável — logo da rede não é sensível. */
tenantLogoRoutes.get("/images/tenant-logos/:tenantId", async (c) => {
  const key = `tenant-logos/${c.req.param("tenantId")}`;
  const object = await c.env.REWARD_IMAGES.get(key);
  if (!object) {
    return c.notFound();
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
});
