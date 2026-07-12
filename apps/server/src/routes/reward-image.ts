import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { reward } from "../db/schema/loyalty";
import { tenantMembership } from "../db/schema/tenant";
import type { AppEnv } from "../lib/hono-env";

const MAX_IMAGE_BYTES = 2_000_000;

export const rewardImageRoutes = new Hono<AppEnv>();

/**
 * Upload da foto de uma recompensa (owner). Grava no R2 e aponta
 * reward.imageUrl para a rota pública de serviço. Uma foto por recompensa
 * (chave determinística) — reenvio sobrescreve.
 */
rewardImageRoutes.post("/api/rewards/:rewardId/image", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Não autenticado" }, 401);
  }

  const rewardId = c.req.param("rewardId");
  const db = createDb(c.env.DATABASE_URL);

  const [rw] = await db.select().from(reward).where(eq(reward.id, rewardId));
  if (!rw) {
    return c.json({ error: "Recompensa não encontrada" }, 404);
  }

  // Autorização: owner do tenant da recompensa (ou admin da plataforma).
  const isAdmin = (user as { role?: string }).role === "admin";
  if (!isAdmin) {
    const [membership] = await db
      .select({ role: tenantMembership.role })
      .from(tenantMembership)
      .where(
        and(
          eq(tenantMembership.tenantId, rw.tenantId),
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

  const key = `rewards/${rw.tenantId}/${rw.id}`;
  await c.env.REWARD_IMAGES.put(key, body, {
    httpMetadata: { contentType },
  });

  // Caminho relativo (não o host da requisição — que no `wrangler dev` vem como
  // o domínio de produção). Cada cliente monta a URL com a própria base de API.
  // ?v= força o cache a buscar a versão nova quando a foto é trocada.
  const imageUrl = `/images/${key}?v=${Date.now()}`;
  await db
    .update(reward)
    .set({ imageUrl, updatedAt: new Date() })
    .where(eq(reward.id, rw.id));

  return c.json({ imageUrl });
});

/** Serve a foto do R2. Pública e cacheável — foto de produto não é sensível. */
rewardImageRoutes.get("/images/rewards/:tenantId/:rewardId", async (c) => {
  const key = `rewards/${c.req.param("tenantId")}/${c.req.param("rewardId")}`;
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
