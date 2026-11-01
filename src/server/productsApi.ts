import { randomUUID } from "node:crypto";
import { db } from "./db";
import { authenticate, json } from "./api";
import { audit, owner, writeGuard, type Route } from "./dashboardApi";
import { MAX_PRODUCTS_PER_BOT, listProductsSchema, parseProductForm, signPayload } from "./productCore";

const BUCKET = "product-banners";
const COLS = "id,bot_id,external_id,name,description,delivery_type,banner_url,source,sync_status,sync_error,synced_at,created_at";
const MAX_ROWS_PER_BOT = 500; // teto total (site + bot) para a lista não crescer sem limite
const safeDir = (botId: string) => botId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80);

const createHits = new Map<string, number[]>(); // 10 criações por minuto por usuário
const tooFast = (uid: string) => {
  const now = Date.now(), arr = (createHits.get(uid) ?? []).filter((t) => now - t < 60_000);
  arr.push(now); createHits.set(uid, arr); return arr.length > 10;
};
const lastResend = new Map<string, number>();

type Push = { status: "pending" | "synced" | "failed"; error?: string; external_id?: string };

/** Envia o produto novo ao bot (webhook). O endereço vem do .env (BOT_WEBHOOK_URL, com {botId}), nunca do usuário. */
async function pushToBot(p: any): Promise<Push> {
  const tpl = process.env.BOT_WEBHOOK_URL;
  if (!tpl) return { status: "pending", error: "bot_webhook_not_configured" };
  let url: URL;
  try { url = new URL(tpl.replace("{botId}", encodeURIComponent(p.bot_id))); } catch { return { status: "failed", error: "bot_webhook_invalid" }; }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && process.env.NODE_ENV !== "production")) return { status: "failed", error: "bot_webhook_insecure" };
  const body = JSON.stringify({
    event: "product.created", bot_id: p.bot_id, sent_at: new Date().toISOString(),
    product: { id: p.id, name: p.name, description: p.description, delivery_type: p.delivery_type, banner_url: p.banner_url, created_at: p.created_at },
  });
  const ts = String(Math.floor(Date.now() / 1000));
  const headers: Record<string, string> = { "content-type": "application/json", "x-zyra-event": "product.created", "x-zyra-timestamp": ts };
  if (process.env.BOT_WEBHOOK_SECRET) headers["x-zyra-signature"] = signPayload(process.env.BOT_WEBHOOK_SECRET, ts, body);
  try {
    const r = await fetch(url, { method: "POST", headers, body, redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { status: "failed", error: `bot_http_${r.status}` };
    const j: any = await r.json().catch(() => null);
    const ext = j?.product_id ?? j?.external_id ?? j?.id;
    return { status: "synced", external_id: ext != null ? String(ext).slice(0, 100) : undefined };
  } catch (e) {
    return { status: "failed", error: (e as Error).name === "TimeoutError" ? "bot_timeout" : "bot_unreachable" };
  }
}

async function syncProduct(p: any) {
  const r = await pushToBot(p), now = new Date().toISOString();
  const patch: any = { sync_status: r.status, sync_error: r.error ?? null, updated_at: now, ...(r.status === "synced" ? { synced_at: now } : {}) };
  if (r.external_id) patch.external_id = r.external_id;
  let res = await db.from("products").update(patch).eq("id", p.id).select(COLS).single();
  if (res.error && patch.external_id) { delete patch.external_id; res = await db.from("products").update(patch).eq("id", p.id).select(COLS).single(); } // id do bot já em uso
  return res.data ?? { ...p, ...patch };
}

// ───────── painel (dono do bot ou admin) ─────────
export const productRoutes: Route[] = [
  ["GET", /^\/api\/bots\/([^/]+)\/products$/, async (req, m) => {
    const o = await owner(req, m[1]); if (o.err) return o.err;
    const { data, error } = await db.from("products").select(COLS).eq("bot_id", m[1]).order("created_at", { ascending: false }).limit(MAX_ROWS_PER_BOT);
    if (error) return json({ error: "internal_error" }, 500);
    return json({ items: data ?? [], bot_webhook_configured: !!process.env.BOT_WEBHOOK_URL });
  }],

  ["POST", /^\/api\/bots\/([^/]+)\/products$/, async (req, m) => {
    const g = writeGuard(req); if (g) return g;
    const o = await owner(req, m[1]); if (o.err) return o.err;
    if (tooFast(o.uid!)) return json({ error: "rate_limited" }, 429);
    const f = await parseProductForm(req);
    if (!f.ok) return json({ error: f.error, fields: f.fields }, f.status);
    const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("bot_id", m[1]);
    if ((count ?? 0) >= MAX_PRODUCTS_PER_BOT) return json({ error: "product_limit" }, 409);

    const path = `${safeDir(m[1])}/${randomUUID()}.${f.file.ext}`;
    const up = await db.storage.from(BUCKET).upload(path, f.file.bytes, { contentType: f.file.mime, upsert: false, cacheControl: "31536000" });
    if (up.error) { console.error("[products] upload", up.error.message); return json({ error: "storage_error" }, 502); }
    const banner_url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    const ins = await db.from("products").insert({
      bot_id: m[1], name: f.name, description: f.description, delivery_type: f.delivery_type,
      banner_url, banner_path: path, source: "site", sync_status: "pending", created_by: o.uid,
    }).select(COLS).single();
    if (ins.error || !ins.data) {
      await db.storage.from(BUCKET).remove([path]).catch(() => {}); // não deixa imagem órfã
      console.error("[products] insert", ins.error?.message);
      return json({ error: "internal_error" }, 500);
    }
    await audit(o.uid!, "product.create", m[1], { product_id: ins.data.id, name: f.name });
    return json({ product: await syncProduct(ins.data) }, 201);
  }],

  ["POST", /^\/api\/bots\/([^/]+)\/products\/([0-9a-f-]{36})\/resend$/, async (req, m) => {
    const g = writeGuard(req); if (g) return g;
    const o = await owner(req, m[1]); if (o.err) return o.err;
    const { data: p } = await db.from("products").select(COLS).eq("id", m[2]).eq("bot_id", m[1]).maybeSingle();
    if (!p) return json({ error: "not_found" }, 404);
    if (p.source !== "site" || p.sync_status === "synced") return json({ error: "nothing_to_send" }, 409);
    const now = Date.now();
    if (now - (lastResend.get(p.id) ?? 0) < 5000) return json({ error: "too_fast" }, 429);
    lastResend.set(p.id, now);
    return json({ product: await syncProduct(p) });
  }],
];

// ───────── API do bot (credencial Bearer zy_...) ─────────

/** POST /api/v1/apps/:botId/listproducts — o bot envia a lista dos produtos dele e o site grava/atualiza. */
export async function handleListProducts(req: Request, botId: string) {
  const a = await authenticate(req, botId); if (a.err) return a.err;
  if (Number(req.headers.get("content-length") ?? 0) > 1_000_000) return json({ error: "payload_too_large" }, 413);
  const parsed = listProductsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "validation_error", details: parsed.error.flatten() }, 422);
  const { data: app } = await db.from("apps").select("bot_id").eq("bot_id", botId).maybeSingle();
  if (!app) return json({ error: "bot_not_found" }, 404);

  const incoming = [...new Map(parsed.data.products.map((p) => [p.id, p])).values()]; // mesmo id duas vezes: vale o último
  const { data: rows } = await db.from("products").select("id,external_id,source,banner_path").eq("bot_id", botId);
  const existing = rows ?? [];
  const byExt = new Map(existing.filter((r) => r.external_id).map((r) => [r.external_id as string, r]));
  const byId = new Map(existing.map((r) => [r.id as string, r]));
  const now = new Date().toISOString();

  const inserts: any[] = [], updates: { id: string; patch: any }[] = [];
  for (const p of incoming) {
    const ex = byExt.get(p.id) ?? (p.site_id ? byId.get(p.site_id) : undefined);
    const common = { external_id: p.id, name: p.name, delivery_type: p.delivery_type, sync_status: "synced", sync_error: null, synced_at: now, updated_at: now };
    if (ex) updates.push({ id: ex.id, patch: { ...common, ...(p.description ? { description: p.description } : {}), ...(p.banner_url !== undefined ? { banner_url: p.banner_url } : {}) } });
    else inserts.push({ ...common, bot_id: botId, description: p.description || "Sem descrição", banner_url: p.banner_url ?? "", source: "bot" });
  }
  if (existing.length + inserts.length > MAX_ROWS_PER_BOT) return json({ error: "product_limit" }, 409);

  let failed = 0;
  if (inserts.length) {
    const r = await db.from("products").insert(inserts);
    if (r.error) { console.error("[listproducts] insert", r.error.message); return json({ error: "internal_error" }, 500); }
  }
  for (let i = 0; i < updates.length; i += 25) {
    const res = await Promise.all(updates.slice(i, i + 25).map((u) => db.from("products").update(u.patch).eq("id", u.id)));
    failed += res.filter((r) => r.error).length;
  }

  let removed = 0;
  if (parsed.data.replace) { // o que tem id do bot e sumiu da lista foi apagado no bot
    const keep = new Set(incoming.map((p) => p.id));
    const gone = existing.filter((r) => r.external_id && !keep.has(r.external_id));
    if (gone.length) {
      await db.from("products").delete().in("id", gone.map((r) => r.id));
      const paths = gone.map((r) => r.banner_path).filter(Boolean) as string[];
      if (paths.length) await db.storage.from(BUCKET).remove(paths).catch(() => {});
      removed = gone.length;
    }
  }
  return json({ result: "ok", received: incoming.length, created: inserts.length, updated: updates.length - failed, failed, removed });
}

/** GET /api/v1/apps/:botId/products[?pending=1] — o bot lê os produtos criados no site (ex.: quando o envio automático não está ligado). */
export async function handleGetProducts(req: Request, botId: string) {
  const a = await authenticate(req, botId); if (a.err) return a.err;
  let q = db.from("products").select(COLS).eq("bot_id", botId).order("created_at", { ascending: true }).limit(MAX_ROWS_PER_BOT);
  if (new URL(req.url).searchParams.get("pending")) q = q.eq("source", "site").neq("sync_status", "synced");
  const { data, error } = await q;
  if (error) return json({ error: "internal_error" }, 500);
  return json({ products: data ?? [] });
}
