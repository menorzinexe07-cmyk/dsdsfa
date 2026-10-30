import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { isShardId, syncShardName } from "./shard";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });

// Rate limit simples em memória (por credencial). Em produção com várias instâncias, use Redis/Upstash.
const hits = new Map<string, number[]>();
function limited(key: string, max = 120, windowMs = 60_000) {
  const now = Date.now(), arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(key, arr);
  return arr.length > max;
}

/** Cria credencial. Retorne `secret` UMA vez e nunca mais. */
export async function createCredential(name: string, botIds: string[]) {
  const secret = "zy_" + randomBytes(32).toString("base64url");
  await db.from("api_credentials").insert({
    name, key_prefix: secret.slice(0, 8), key_hash: sha256(secret), bot_ids: botIds,
  });
  return secret;
}

export async function authenticate(req: Request, botId?: string) {
  const m = /^Bearer (zy_[A-Za-z0-9_-]{20,})$/.exec(req.headers.get("authorization") ?? "");
  if (!m) return { err: json({ error: "unauthorized" }, 401) };
  const { data: cred } = await db.from("api_credentials").select("id,bot_ids")
    .eq("key_hash", sha256(m[1])).is("revoked_at", null).maybeSingle();
  if (!cred) return { err: json({ error: "unauthorized" }, 401) };
  if (limited(cred.id)) return { err: json({ error: "rate_limited" }, 429) };
  if (botId && !cred.bot_ids.includes("*") && !cred.bot_ids.includes(botId))
    return { err: json({ error: "forbidden" }, 403) };
  await db.from("api_credentials").update({ last_used_at: new Date().toISOString() }).eq("id", cred.id);
  return { cred };
}

const snowflake = z.string().regex(/^\d{17,20}$/);
const id = z.string().min(1).max(100);
const money = z.number().nonnegative().max(1_000_000_000).nullable().optional();
const iso = z.string().datetime();

const purchaseSchema = z.object({
  event_id: id, bot_id: id, discord_user_id: snowflake, bot_name: z.string().max(100).optional(),
  purchase_id: id, status: z.enum(["confirmed", "pending", "canceled", "refunded"]), purchased_at: iso,
});
const saleSchema = z.object({
  event_id: id, bot_id: id, sale_id: id,
  customer: z.object({ discord_user_id: snowflake.optional(), name: z.string().max(100).optional(),
    icon: z.string().url().startsWith("https://").max(500).optional() }).default({}),
  product: z.object({ id: id.optional(), name: z.string().max(200).optional() }).default({}),
  amount_gross: money, fees: money, amount_net: money,
  currency: z.string().regex(/^[A-Z]{3}$/).default("BRL"),
  payment_method: z.string().max(40).optional(), gateway: z.string().max(40).optional(),
  status: z.enum(["approved", "pending", "canceled", "refunded"]), sold_at: iso,
});

async function ingest(req: Request, schema: z.ZodTypeAny, fn: "ingest_purchase" | "ingest_sale") {
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: "validation_error", details: parsed.error.flatten() }, 422);
  const p = parsed.data as any;
  const a = await authenticate(req, p.bot_id);
  if (a.err) return a.err;
  const { data, error } = await db.rpc(fn, { p, p_cred: a.cred!.id });
  if (error) {
    const known = error.message.includes("bot_not_found");
    await db.from("api_events").insert({ event_id: `${p.event_id}:err:${Date.now()}`, credential_id: a.cred!.id,
      type: fn, bot_id: p.bot_id, outcome: "error", error: error.message.slice(0, 300) });
    return json({ error: known ? "bot_not_found" : "internal_error" }, known ? 404 : 500);
  }
  const dup = String(data).startsWith("duplicate");
  return json({ result: data, duplicate: dup }, dup ? 200 : 201); // reenvio é seguro
}

export async function handlePurchase(req: Request) {
  const copy = req.clone();
  const res = await ingest(req, purchaseSchema, "ingest_purchase");
  if (res.ok) { // compra aceita: busca o nome real do app na Shard Cloud (melhor esforço)
    const botId = (await copy.json().catch(() => null))?.bot_id;
    if (typeof botId === "string" && isShardId(botId)) await syncShardName(botId);
  }
  return res;
}
export const handleSale = (req: Request) => ingest(req, saleSchema, "ingest_sale");

export async function handleSaleStatus(req: Request, botId: string, saleId: string) {
  const a = await authenticate(req, botId);
  if (a.err) return a.err;
  const parsed = z.object({ status: z.enum(["approved", "pending", "canceled", "refunded"]) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "validation_error" }, 422);
  const { data, error } = await db.rpc("update_sale_status",
    { p_bot: botId, p_sale: saleId, p_status: parsed.data.status, p_cred: a.cred!.id });
  if (error) return json({ error: "internal_error" }, 500);
  return data === "not_found" ? json({ error: "not_found" }, 404) : json({ result: data });
}

export const handleHealth = () => json({ ok: true, ts: new Date().toISOString() });

// ---------- POST /venda/:botId/salles  (formato simples em português) ----------
const vendaSchema = z.object({
  id_venda: id.optional(),                       // recomendado: evita duplicar se reenviar
  valor_liquido: z.number().nonnegative().max(1_000_000_000),
  valor_bruto: money, taxas: money,
  cliente: z.object({
    id: snowflake,
    nome: z.string().trim().min(1).max(100),
    icone: z.string().url().startsWith("https://").max(500).optional(),
  }),
  produto: z.object({ id: id.optional(), nome: z.string().trim().min(1).max(200) }),
  metodo_pagamento: z.string().max(40).optional(),
  gateway: z.string().max(40).optional(),
  status: z.enum(["approved", "pending", "canceled", "refunded"]).default("approved"),
  vendido_em: iso.optional(),
});

export async function handleVenda(req: Request, botId: string) {
  const a = await authenticate(req, botId);
  if (a.err) return a.err;
  const parsed = vendaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "validation_error", details: parsed.error.flatten() }, 422);
  const v = parsed.data;
  const saleId = v.id_venda ?? `auto_${randomUUID()}`;
  const p = {
    event_id: `venda:${botId}:${saleId}`, bot_id: botId, sale_id: saleId,
    customer: { discord_user_id: v.cliente.id, name: v.cliente.nome, icon: v.cliente.icone },
    product: { id: v.produto.id, name: v.produto.nome },
    amount_gross: v.valor_bruto ?? null, fees: v.taxas ?? null, amount_net: v.valor_liquido,
    currency: "BRL", status: v.status, sold_at: v.vendido_em ?? new Date().toISOString(),
    payment_method: v.metodo_pagamento, gateway: v.gateway,
  };
  const { data, error } = await db.rpc("ingest_sale", { p, p_cred: a.cred!.id });
  if (error) {
    const nf = error.message.includes("bot_not_found");
    await db.from("api_events").insert({ event_id: `${p.event_id}:err:${Date.now()}`, credential_id: a.cred!.id,
      type: "sale", bot_id: botId, outcome: "error", error: error.message.slice(0, 300) });
    return json({ error: nf ? "bot_not_found" : "internal_error" }, nf ? 404 : 500);
  }
  const dup = String(data).startsWith("duplicate");
  return json({ result: data, id_venda: saleId, duplicate: dup, idempotente: !!v.id_venda }, dup ? 200 : 201);
}
