import { db } from "./db";
import { authenticate, json } from "./api";
import { audit, owner, writeGuard, type Route } from "./dashboardApi";
import {
  MAX_PRODUCTS_PER_BOT, MAX_ROWS_PER_BOT, ackSchema, extractImageUrl, hashBotData, parseListProducts, parseProductEditForm, parseProductForm,
  parseSingleProduct, signPayload, toBotFormat, type Banner, type BotProduct,
} from "./productCore";

const COLS = "id,bot_id,external_id,name,description,delivery_type,banner_url,source,sync_status,sync_error,synced_at,created_at,updated_at";
const FULL = `${COLS},bot_data,deleted_at`;
const LEGACY_BUCKET = "product-banners"; // banners antigos (antes da API de imagens)
const TOMBSTONE_DAYS = 30;                // exclusão que o bot nunca confirmou some depois disso

/** Linha pronta para o painel/JSON: sem os dados internos do bot. */
const pub = (r: any) => { if (!r) return r; const { bot_data, deleted_at, bot_hash, banner_path, ...rest } = r; return rest; };
const dec = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

const hits = new Map<string, number[]>();
const tooFast = (key: string, max: number) => {
  const now = Date.now(), arr = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  arr.push(now); hits.set(key, arr); return arr.length > max;
};
const lastResend = new Map<string, number>();

// ───────── banner → API de imagens ─────────

/** Envia o banner para a API de imagens (multipart, campo "image") e devolve a URL https da imagem. */
async function uploadBanner(b: Banner): Promise<string> {
  const url = process.env.IMAGE_UPLOAD_URL || "https://zyra-uploads.lovable.app/api/v1/images";
  const fd = new FormData();
  fd.append("image", new Blob([b.bytes as BlobPart], { type: b.mime }), `banner.${b.ext}`);
  const headers: Record<string, string> = {};
  if (process.env.IMAGE_UPLOAD_KEY) headers.authorization = `Bearer ${process.env.IMAGE_UPLOAD_KEY}`;
  const r = await fetch(url, { method: "POST", body: fd, headers, redirect: "error", signal: AbortSignal.timeout(25_000) });
  if (!r.ok) throw new Error(`upload_http_${r.status}`);
  const u = extractImageUrl(await r.json().catch(() => null));
  if (!u) throw new Error("upload_no_url");
  return u;
}

// ───────── site → bot (webhook) ─────────

type Event = "product.created" | "product.updated" | "product.deleted";
type Push = { status: "pending" | "synced" | "failed"; error?: string; external_id?: string };

/** Avisa o bot (webhook). O endereço vem do .env (BOT_WEBHOOK_URL, com {botId}), nunca do usuário. */
async function pushToBot(p: any, event: Event): Promise<Push> {
  const tpl = process.env.BOT_WEBHOOK_URL;
  if (!tpl) return { status: "pending", error: "bot_webhook_not_configured" };
  let url: URL;
  try { url = new URL(tpl.replace("{botId}", encodeURIComponent(p.bot_id))); } catch { return { status: "failed", error: "bot_webhook_invalid" }; }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && process.env.NODE_ENV !== "production")) return { status: "failed", error: "bot_webhook_insecure" };
  const body = JSON.stringify({
    event, bot_id: p.bot_id, sent_at: new Date().toISOString(), deleted: event === "product.deleted",
    product: { id: p.id, external_id: p.external_id, name: p.name, description: p.description, delivery_type: p.delivery_type, banner_url: p.banner_url, created_at: p.created_at, updated_at: p.updated_at },
    data: toBotFormat([p]), // o mesmo produto no formato do banco do bot
  });
  const ts = String(Math.floor(Date.now() / 1000));
  const headers: Record<string, string> = { "content-type": "application/json", "x-zyra-event": event, "x-zyra-timestamp": ts };
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

/** Tenta avisar o bot e grava o resultado. Exclusão confirmada pelo bot (2xx) apaga a linha de vez. */
async function syncProduct(p: any, event: Event) {
  const r = await pushToBot(p, event), now = new Date().toISOString();
  if (event === "product.deleted" && r.status === "synced") { await db.from("products").delete().eq("id", p.id); return null; }
  const patch: any = { sync_status: r.status, sync_error: r.error ?? null, ...(r.status === "synced" ? { synced_at: now } : {}) };
  if (r.external_id && event !== "product.deleted") patch.external_id = r.external_id;
  let res = await db.from("products").update(patch).eq("id", p.id).select(FULL).single();
  if (res.error && patch.external_id) { delete patch.external_id; res = await db.from("products").update(patch).eq("id", p.id).select(FULL).single(); } // id do bot já em uso
  return res.data ?? { ...p, ...patch };
}

const failBanner = (e: unknown) => { console.error("[products] banner upload:", (e as Error).message); return json({ error: "upload_error" }, 502); };

// ───────── painel (dono do bot ou admin) ─────────
export const productRoutes: Route[] = [
  ["GET", /^\/api\/bots\/([^/]+)\/products$/, async (req, m) => {
    const o = await owner(req, m[1]); if (o.err) return o.err;
    const { data, error } = await db.from("products").select(COLS).eq("bot_id", m[1]).is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(MAX_ROWS_PER_BOT);
    if (error) return json({ error: "internal_error" }, 500);
    return json({ items: data ?? [], bot_webhook_configured: !!process.env.BOT_WEBHOOK_URL });
  }],

  // criar: nome, descrição e tipo de entrega obrigatórios; banner opcional
  ["POST", /^\/api\/bots\/([^/]+)\/products$/, async (req, m) => {
    const g = writeGuard(req); if (g) return g;
    const o = await owner(req, m[1]); if (o.err) return o.err;
    if (tooFast(`create:${o.uid}`, 10)) return json({ error: "rate_limited" }, 429);
    const f = await parseProductForm(req);
    if (!f.ok) return json({ error: f.error, fields: f.fields }, f.status);
    const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("bot_id", m[1]).is("deleted_at", null);
    if ((count ?? 0) >= MAX_PRODUCTS_PER_BOT) return json({ error: "product_limit" }, 409);

    let banner_url = "";
    if (f.banner) { try { banner_url = await uploadBanner(f.banner); } catch (e) { return failBanner(e); } }
    const ins = await db.from("products").insert({
      bot_id: m[1], name: f.name, description: f.description, delivery_type: f.delivery_type,
      banner_url, source: "site", sync_status: "pending", created_by: o.uid,
    }).select(FULL).single();
    if (ins.error || !ins.data) { console.error("[products] insert", ins.error?.message); return json({ error: "internal_error" }, 500); }
    await audit(o.uid!, "product.create", m[1], { product_id: ins.data.id, name: f.name });
    return json({ product: pub(await syncProduct(ins.data, "product.created")) }, 201);
  }],

  // editar: só os campos enviados mudam; o bot recebe a alteração (webhook ou busca ?pending=1)
  ["PATCH", /^\/api\/bots\/([^/]+)\/products\/([0-9a-f-]{36})$/, async (req, m) => {
    const g = writeGuard(req); if (g) return g;
    const o = await owner(req, m[1]); if (o.err) return o.err;
    if (tooFast(`edit:${o.uid}`, 30)) return json({ error: "rate_limited" }, 429);
    const { data: cur } = await db.from("products").select(FULL).eq("id", m[2]).eq("bot_id", m[1]).is("deleted_at", null).maybeSingle();
    if (!cur) return json({ error: "not_found" }, 404);
    const f = await parseProductEditForm(req);
    if (!f.ok) return json({ error: f.error, fields: f.fields }, f.status);

    const patch: any = { ...f.patch, sync_status: "pending", sync_error: null, updated_at: new Date().toISOString() };
    if (f.banner) { try { patch.banner_url = await uploadBanner(f.banner); } catch (e) { return failBanner(e); } }
    else if (f.removeBanner) patch.banner_url = "";
    const up = await db.from("products").update(patch).eq("id", cur.id).select(FULL).single();
    if (up.error || !up.data) { console.error("[products] update", up.error?.message); return json({ error: "internal_error" }, 500); }
    await audit(o.uid!, "product.update", m[1], { product_id: cur.id, fields: Object.keys(f.patch), banner: f.banner ? "new" : f.removeBanner ? "removed" : undefined });
    return json({ product: pub(await syncProduct(up.data, "product.updated")) });
  }],

  // excluir: some do painel na hora; o bot é avisado e confirma (ack)
  ["DELETE", /^\/api\/bots\/([^/]+)\/products\/([0-9a-f-]{36})$/, async (req, m) => {
    const g = writeGuard(req); if (g) return g;
    const o = await owner(req, m[1]); if (o.err) return o.err;
    if (tooFast(`edit:${o.uid}`, 30)) return json({ error: "rate_limited" }, 429);
    const { data: cur } = await db.from("products").select(FULL).eq("id", m[2]).eq("bot_id", m[1]).is("deleted_at", null).maybeSingle();
    if (!cur) return json({ error: "not_found" }, 404);
    const now = new Date().toISOString();
    const up = await db.from("products").update({ deleted_at: now, updated_at: now, sync_status: "pending", sync_error: null }).eq("id", cur.id).select(FULL).single();
    if (up.error || !up.data) return json({ error: "internal_error" }, 500);
    await audit(o.uid!, "product.delete", m[1], { product_id: cur.id, name: cur.name });
    await db.from("products").delete().eq("bot_id", m[1]).lt("deleted_at", new Date(Date.now() - TOMBSTONE_DAYS * 864e5).toISOString()); // limpeza de exclusões antigas
    await syncProduct(up.data, "product.deleted"); // com webhook, o bot confirma na hora; sem webhook, ele busca em ?pending=1 e dá ack
    return json({ ok: true });
  }],

  ["POST", /^\/api\/bots\/([^/]+)\/products\/([0-9a-f-]{36})\/resend$/, async (req, m) => {
    const g = writeGuard(req); if (g) return g;
    const o = await owner(req, m[1]); if (o.err) return o.err;
    const { data: p } = await db.from("products").select(FULL).eq("id", m[2]).eq("bot_id", m[1]).is("deleted_at", null).maybeSingle();
    if (!p) return json({ error: "not_found" }, 404);
    if (p.sync_status === "synced") return json({ error: "nothing_to_send" }, 409);
    const now = Date.now();
    if (now - (lastResend.get(p.id) ?? 0) < 5000) return json({ error: "too_fast" }, 429);
    lastResend.set(p.id, now);
    return json({ product: pub(await syncProduct(p, p.external_id ? "product.updated" : "product.created")) });
  }],
];

// ───────── API do bot (credencial Bearer zy_...) ─────────

/** Grava no site o que o bot mandou (lista inteira ou um produto). Compartilhado por listproducts e PUT /products/:key. */
async function applyFromBot(botId: string, list: BotProduct[], replace: boolean) {
  const incoming = [...new Map(list.map((p) => [p.id, p])).values()]; // mesmo id duas vezes: vale o último
  const { data: rows } = await db.from("products").select("id,external_id,source,banner_path,name,description,delivery_type,banner_url,sync_status,deleted_at,bot_hash").eq("bot_id", botId);
  const existing = rows ?? [];
  const byExt = new Map(existing.filter((r) => r.external_id).map((r) => [r.external_id as string, r]));
  const byId = new Map(existing.map((r) => [r.id as string, r]));
  const now = new Date().toISOString();

  const inserts: any[] = [], updates: { id: string; patch: any }[] = [];
  let unchanged = 0, held = 0, skippedDeleted = 0;
  for (const p of incoming) {
    const ex = byExt.get(p.id) ?? (p.site_id ? byId.get(p.site_id) : undefined);
    const hash = hashBotData(p.bot_data);
    if (!ex) {
      inserts.push({ bot_id: botId, external_id: p.id, name: p.name, description: p.description || "Sem descrição", delivery_type: p.delivery_type, banner_url: p.banner_url ?? "",
        source: "bot", sync_status: "synced", synced_at: now, bot_data: p.bot_data ?? null, bot_hash: hash });
      continue;
    }
    if (ex.deleted_at) { skippedDeleted++; continue; } // excluído no site: não ressuscita enquanto o bot não confirmar
    const same = ex.name === p.name && ex.delivery_type === p.delivery_type && (!p.description || ex.description === p.description)
      && (p.banner_url === undefined || (ex.banner_url || "") === p.banner_url);
    if (ex.sync_status !== "synced" && !same) { // há alteração do site que o bot ainda não aplicou: o site vence
      held++; if (ex.external_id !== p.id) updates.push({ id: ex.id, patch: { external_id: p.id } }); continue;
    }
    if (same && ex.sync_status === "synced" && ex.external_id === p.id && (ex.bot_hash ?? null) === hash) { unchanged++; continue; } // nada mudou: não grava
    updates.push({ id: ex.id, patch: {
      external_id: p.id, name: p.name, delivery_type: p.delivery_type, sync_status: "synced", sync_error: null, synced_at: now, ...(same ? {} : { updated_at: now }),
      ...(p.description ? { description: p.description } : {}), ...(p.banner_url !== undefined ? { banner_url: p.banner_url } : {}),
      ...(p.bot_data ? { bot_data: p.bot_data, bot_hash: hash } : {}),
    } });
  }
  if (existing.filter((r) => !r.deleted_at).length + inserts.length > MAX_ROWS_PER_BOT) return { error: "product_limit" as const };

  for (let i = 0; i < inserts.length; i += 100) {
    const r = await db.from("products").insert(inserts.slice(i, i + 100));
    if (r.error) { console.error("[products] bot insert", r.error.message); return { error: "internal_error" as const }; }
  }
  let failed = 0;
  for (let i = 0; i < updates.length; i += 25) {
    const res = await Promise.all(updates.slice(i, i + 25).map((u) => db.from("products").update(u.patch).eq("id", u.id)));
    failed += res.filter((r) => r.error).length;
  }

  let removed = 0;
  if (replace) { // o que tem id do bot e sumiu da lista foi apagado no bot (inclui exclusões do site que o bot aplicou)
    const keep = new Set(incoming.map((p) => p.id));
    const gone = existing.filter((r) => r.external_id && !keep.has(r.external_id));
    if (gone.length) {
      await db.from("products").delete().in("id", gone.map((r) => r.id));
      const paths = gone.map((r) => r.banner_path).filter(Boolean) as string[];
      if (paths.length) await db.storage.from(LEGACY_BUCKET).remove(paths).catch(() => {});
      removed = gone.length;
    }
  }
  return { received: incoming.length, created: inserts.length, updated: updates.length - failed, unchanged, held, skipped_deleted: skippedDeleted, failed, removed };
}

async function botGuard(req: Request, botId: string) {
  const a = await authenticate(req, botId); if (a.err) return a.err;
  const { data: app } = await db.from("apps").select("bot_id").eq("bot_id", botId).maybeSingle();
  return app ? null : json({ error: "bot_not_found" }, 404);
}

/** POST /api/v1/apps/:botId/listproducts — bot → site: o bot envia tudo que tem (3 formatos aceitos, veja a documentação). */
export async function handleListProducts(req: Request, botId: string) {
  const bad = await botGuard(req, botId); if (bad) return bad;
  if (Number(req.headers.get("content-length") ?? 0) > 5_000_000) return json({ error: "payload_too_large" }, 413);
  const parsed = parseListProducts(await req.json().catch(() => null), !!new URL(req.url).searchParams.get("replace"));
  if (!parsed.ok) return json({ error: parsed.error, message: parsed.message, rejected: parsed.rejected }, parsed.status);
  const r = await applyFromBot(botId, parsed.products, parsed.replace);
  if ("error" in r) return json({ error: r.error }, r.error === "product_limit" ? 409 : 500);
  return json({ result: "ok", format: parsed.format, ...r, rejected: parsed.rejected });
}

/** PUT /api/v1/apps/:botId/products/:key — bot → site: cria ou atualiza UM produto (key = id do produto no bot). */
export async function handlePutProduct(req: Request, botId: string, key: string) {
  const bad = await botGuard(req, botId); if (bad) return bad;
  if (Number(req.headers.get("content-length") ?? 0) > 1_000_000) return json({ error: "payload_too_large" }, 413);
  const one = parseSingleProduct(key, await req.json().catch(() => null));
  if (!one.ok) return json({ error: "validation_error", message: one.message, errors: one.errors }, 422);
  const r = await applyFromBot(botId, [one.product], false);
  if ("error" in r) return json({ error: r.error }, r.error === "product_limit" ? 409 : 500);
  return json({ result: "ok", ...r });
}

/** DELETE /api/v1/apps/:botId/products/:key — bot → site: o produto foi apagado no bot (key = id no bot ou site_id). */
export async function handleDeleteProduct(req: Request, botId: string, key: string) {
  const bad = await botGuard(req, botId); if (bad) return bad;
  const isUuid = /^[0-9a-f-]{36}$/i.test(key);
  const porExterno = await db.from("products").select("id,banner_path").eq("bot_id", botId).eq("external_id", key);
  const porId = isUuid ? await db.from("products").select("id,banner_path").eq("bot_id", botId).eq("id", key) : { data: [] as any[] };
  const data = [...new Map([...(porExterno.data ?? []), ...(porId.data ?? [])].map((r: any) => [r.id, r])).values()];
  if (!data?.length) return json({ error: "not_found" }, 404);
  await db.from("products").delete().in("id", data.map((r) => r.id));
  const paths = data.map((r) => r.banner_path).filter(Boolean) as string[];
  if (paths.length) await db.storage.from(LEGACY_BUCKET).remove(paths).catch(() => {});
  return json({ result: "ok", removed: data.length });
}

/** GET /api/v1/apps/:botId/products — site → bot: lista o que o site tem. ?format=bot | ?pending=1 | ?since=ISO | ?include_deleted=1 */
export async function handleGetProducts(req: Request, botId: string) {
  const a = await authenticate(req, botId); if (a.err) return a.err;
  const sp = new URL(req.url).searchParams;
  const pending = !!sp.get("pending"), withGone = pending || !!sp.get("include_deleted");
  let q = db.from("products").select(FULL).eq("bot_id", botId).order("created_at", { ascending: true }).limit(MAX_ROWS_PER_BOT);
  if (pending) q = q.or("sync_status.neq.synced,deleted_at.not.is.null"); // alterações do site que o bot ainda não confirmou
  else if (!withGone) q = q.is("deleted_at", null);
  const since = sp.get("since");
  if (since && !Number.isNaN(Date.parse(since))) q = q.gte("updated_at", new Date(since).toISOString());
  const { data, error } = await q;
  if (error) return json({ error: "internal_error" }, 500);
  const rows = data ?? [], active = rows.filter((r) => !r.deleted_at);
  const deleted = rows.filter((r) => r.deleted_at).map((r) => ({ site_id: r.id, external_id: r.external_id, name: r.name, deleted_at: r.deleted_at }));
  if (sp.get("format") === "bot") return json({ format: "bot", count: active.length, products: toBotFormat(active), deleted });
  return json({ format: "json", count: active.length, products: active.map(pub), deleted });
}

/** POST /api/v1/apps/:botId/products/ack — bot → site: "apliquei essas alterações do site" (edição, criação ou exclusão). */
export async function handleAckProducts(req: Request, botId: string) {
  const bad = await botGuard(req, botId); if (bad) return bad;
  const parsed = ackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "validation_error", message: 'Envie {"site_ids": ["<uuid>"]} ou {"acks": [{"site_id": "<uuid>", "external_id": "...", "ok": true}]}.' }, 422);
  const items = [...(parsed.data.site_ids ?? []).map((site_id) => ({ site_id })), ...(parsed.data.acks ?? [])] as { site_id: string; external_id?: string; ok?: boolean; error?: string }[];
  if (!items.length) return json({ error: "validation_error", message: "Nada para confirmar." }, 422);
  const { data: rows } = await db.from("products").select("id,deleted_at").eq("bot_id", botId).in("id", items.map((i) => i.site_id));
  const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));
  const now = new Date().toISOString();
  let confirmed = 0, removed = 0, failed = 0, unknown = 0;
  for (const it of items) {
    const row = byId.get(it.site_id);
    if (!row) { unknown++; continue; }
    if (it.ok === false) {
      await db.from("products").update({ sync_status: "failed", sync_error: `bot_error:${(it.error ?? "").slice(0, 100)}` }).eq("id", row.id); failed++; continue;
    }
    if (row.deleted_at) { await db.from("products").delete().eq("id", row.id); removed++; continue; }
    let r = await db.from("products").update({ sync_status: "synced", sync_error: null, synced_at: now, ...(it.external_id ? { external_id: it.external_id } : {}) }).eq("id", row.id);
    if (r.error && it.external_id) r = await db.from("products").update({ sync_status: "synced", sync_error: null, synced_at: now }).eq("id", row.id); // id do bot já em uso
    if (r.error) failed++; else confirmed++;
  }
  return json({ result: "ok", confirmed, removed, failed, unknown });
}
