// Regras dos produtos que não dependem do banco: formulário do painel, imagem, formato do bot e assinatura.
import { createHash, createHmac } from "node:crypto";
import { z } from "zod";

export const MAX_BANNER_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCTS_PER_BOT = 200;       // criar pelo painel / itens por envio
export const MAX_ROWS_PER_BOT = 500;           // teto total por bot
export const MAX_BOT_DATA_BYTES = 200_000;     // Campos + Cupom + extras de um produto

const noControl = (v: string) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v); // aceita quebra de linha e tab
const nameField = z.string().trim().min(1).max(80).refine((v) => !/[\u0000-\u001f\u007f]/.test(v));
const descField = z.string().trim().min(1).max(1000).refine(noControl);
export const deliveryField = z.enum(["automatic", "manual"]);

/** Descobre o tipo real da imagem pelos primeiros bytes (o tipo informado pelo navegador não é confiável). */
export function sniffImage(b: Uint8Array): { ext: string; mime: string } | null {
  const is = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  if (is(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { ext: "png", mime: "image/png" };
  if (is(0xff, 0xd8, 0xff)) return { ext: "jpg", mime: "image/jpeg" };
  if (is(0x47, 0x49, 0x46, 0x38) && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return { ext: "gif", mime: "image/gif" };
  if (is(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: "webp", mime: "image/webp" };
  return null;
}

// ───────────────────────── formulário do painel ─────────────────────────

export type Banner = { bytes: Uint8Array; ext: string; mime: string };
type Fail = { ok: false; status: number; error: string; fields?: Record<string, string> };

async function readForm(req: Request): Promise<{ form: FormData } | Fail> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BANNER_BYTES + 256 * 1024) return { ok: false, status: 413, error: "file_too_large" };
  try { return { form: await req.formData() }; } catch { return { ok: false, status: 400, error: "invalid_form" }; }
}

/** Banner é opcional: sem arquivo (ou arquivo vazio) volta `banner: undefined`. Com arquivo, confere tamanho e tipo real. */
async function readBanner(form: FormData): Promise<{ banner?: Banner } | Fail> {
  const f = form.get("banner");
  if (!f || typeof f === "string" || f.size === 0) return {};
  if (f.size > MAX_BANNER_BYTES) return { ok: false, status: 413, error: "file_too_large" };
  const bytes = new Uint8Array(await (f as File).arrayBuffer());
  if (bytes.length > MAX_BANNER_BYTES) return { ok: false, status: 413, error: "file_too_large" };
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, status: 415, error: "unsupported_image" };
  return { banner: { bytes, ...kind } };
}

export type CreateForm = { ok: true; name: string; description: string; delivery_type: "automatic" | "manual"; banner?: Banner } | Fail;

export async function parseProductForm(req: Request): Promise<CreateForm> {
  const r = await readForm(req); if ("ok" in r) return r;
  const p = z.object({ name: nameField, description: descField, delivery_type: deliveryField })
    .safeParse({ name: r.form.get("name"), description: r.form.get("description"), delivery_type: r.form.get("delivery_type") });
  if (!p.success) {
    const fields: Record<string, string> = {};
    for (const i of p.error.issues) fields[String(i.path[0])] ??= "invalid";
    return { ok: false, status: 422, error: "validation_error", fields };
  }
  const b = await readBanner(r.form); if ("ok" in b) return b;
  return { ok: true, ...p.data, banner: b.banner };
}

export type EditForm = { ok: true; patch: { name?: string; description?: string; delivery_type?: "automatic" | "manual" }; banner?: Banner; removeBanner: boolean } | Fail;

/** Edição: todos os campos são opcionais; só o que vier é alterado. */
export async function parseProductEditForm(req: Request): Promise<EditForm> {
  const r = await readForm(req); if ("ok" in r) return r;
  const patch: Record<string, string> = {}, fields: Record<string, string> = {};
  const rules = { name: nameField, description: descField, delivery_type: deliveryField } as const;
  for (const k of Object.keys(rules) as (keyof typeof rules)[]) {
    const v = r.form.get(k);
    if (v === null) continue;
    const p = rules[k].safeParse(v);
    if (p.success) patch[k] = p.data; else fields[k] = "invalid";
  }
  if (Object.keys(fields).length) return { ok: false, status: 422, error: "validation_error", fields };
  const b = await readBanner(r.form); if ("ok" in b) return b;
  const removeBanner = ["1", "true"].includes(String(r.form.get("remove_banner") ?? ""));
  if (!Object.keys(patch).length && !b.banner && !removeBanner) return { ok: false, status: 422, error: "nothing_to_update" };
  return { ok: true, patch: patch as any, banner: b.banner, removeBanner: removeBanner && !b.banner };
}

/** Acha a URL da imagem na resposta da API de upload: {images:[{url}]}, {url}, {data:{url}}, ["https://..."]... */
export function extractImageUrl(body: unknown): string | null {
  const KEYS = ["url", "image_url", "imageUrl", "src", "link", "href", "location"];
  const ok = (s: unknown): s is string => { if (typeof s !== "string" || s.length > 500) return false; try { return new URL(s).protocol === "https:"; } catch { return false; } };
  const walk = (v: unknown, depth: number): string | null => {
    if (depth > 4 || v == null) return null;
    if (ok(v)) return v;
    if (Array.isArray(v)) { for (const x of v) { const r = walk(x, depth + 1); if (r) return r; } return null; }
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      for (const k of KEYS) if (ok(o[k])) return o[k] as string;
      for (const k of ["images", "files", "data", "result", "image"]) { const r = walk(o[k], depth + 1); if (r) return r; }
    }
    return null;
  };
  return walk(body, 0);
}

// ───────────────────────── formato do bot ─────────────────────────
// O bot guarda os produtos assim: { "Nome": { Config: { name, desc, entrega: "Sim"|"Não", icon, banner, dataCriacao }, Campos: [], Cupom: [] } }

export const entregaToType = (e: unknown): "automatic" | "manual" =>
  ["sim", "s", "true", "1", "auto", "automatic", "automatico", "automático"].includes(String(e ?? "").trim().toLowerCase()) ? "automatic" : "manual";
export const typeToEntrega = (t: string) => (t === "automatic" ? "Sim" : "Não");

const botData = z.object({
  config: z.record(z.string(), z.unknown()),
  campos: z.array(z.unknown()),
  cupom: z.array(z.unknown()),
});
export type BotData = z.infer<typeof botData>;

/** `null` vindo do bot vale como "não informado" (muitos bots mandam null em vez de omitir o campo). */
const orUndef = <T extends z.ZodTypeAny>(t: T) => z.preprocess((v) => (v === null ? undefined : v), t);

/** Produto como o bot manda. Texto longo é cortado; banner que não for https é ignorado em vez de recusar o produto. */
const botProduct = z.object({
  id: z.union([z.string(), z.number()]).transform(String).pipe(z.string().trim().min(1, "id vazio").max(100, "id com mais de 100 caracteres")),
  site_id: orUndef(z.string().uuid("site_id precisa ser um UUID").optional()),
  name: z.string({ error: "name é obrigatório (texto)" }).trim().min(1, "name vazio").transform((x) => x.slice(0, 80)),
  description: orUndef(z.string().trim().optional().default("")).transform((x) => x.slice(0, 1000)),
  delivery_type: orUndef(z.enum(["automatic", "manual", "automatico", "automático"]).optional().default("automatic"))
    .transform((v): "automatic" | "manual" => (v === "manual" ? "manual" : "automatic")),
  banner_url: orUndef(z.string().optional()).transform((u) => {
    if (u === undefined) return undefined;
    try { const x = new URL(u); return x.protocol === "https:" && u.length <= 500 ? u : ""; } catch { return ""; }
  }),
  bot_data: botData.optional(),
});
export type BotProduct = z.infer<typeof botProduct>;
type Rejected = { index: number; id?: string; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const dataSize = (d: unknown) => JSON.stringify(d).length;
export const hashBotData = (d?: BotData) => (d ? createHash("sha1").update(JSON.stringify(d)).digest("hex") : null);

/** Converte uma entrada no formato do bot ({Config, Campos, Cupom}) para o formato interno. */
function fromBotEntry(key: string, entry: unknown): Record<string, unknown> {
  const e = isObj(entry) ? entry : {};
  const cfg = isObj(e.Config) ? e.Config : {};
  const { name, desc, description, entrega, banner, site_id, ...extras } = cfg;
  return {
    id: key, site_id: site_id ?? undefined, name: name ?? key, description: desc ?? description, delivery_type: entregaToType(entrega) === "manual" ? "manual" : "automatic",
    banner_url: banner === "" ? "" : banner,
    bot_data: { config: extras, campos: Array.isArray(e.Campos) ? e.Campos : [], cupom: Array.isArray(e.Cupom) ? e.Cupom : [] },
  };
}
/** Itens no formato "lista" também podem trazer icon/campos/cupom. */
function fromListItem(raw: unknown): unknown {
  if (!isObj(raw) || !("campos" in raw || "cupom" in raw || "icon" in raw)) return raw;
  const { campos, cupom, icon, ...rest } = raw;
  return { ...rest, bot_data: { config: icon ? { icon } : {}, campos: Array.isArray(campos) ? campos : [], cupom: Array.isArray(cupom) ? cupom : [] } };
}

function validateOne(raw: unknown, index: number): { ok: BotProduct } | { bad: Rejected } {
  const r = botProduct.safeParse(raw);
  if (r.success) {
    if (r.data.bot_data && dataSize(r.data.bot_data) > MAX_BOT_DATA_BYTES)
      return { bad: { index, id: r.data.id, errors: [`Campos/Cupom: dados passam de ${MAX_BOT_DATA_BYTES / 1000} KB`] } };
    return { ok: r.data };
  }
  const id = isObj(raw) && (typeof raw.id === "string" || typeof raw.id === "number") ? String(raw.id) : undefined;
  const errors = r.error.issues.map((i) => `${i.path.join(".") || "(item)"}: ${i.code === "invalid_union" || i.message === "Invalid input" ? "valor inválido (id precisa ser texto ou número)" : i.message}`);
  return { bad: { index, id, errors: [...new Set(errors)] } };
}

export type ListParse =
  | { ok: true; format: "list" | "bot"; products: BotProduct[]; replace: boolean; rejected: Rejected[] }
  | { ok: false; status: number; error: string; message: string; rejected?: Rejected[] };

/**
 * Valida o que o bot manda. Aceita 3 formatos:
 *   1. {"products": [ {id, name, ...} ]}  ou a lista direta [ {...} ]
 *   2. {"products": { "Nome": {Config, Campos, Cupom} }}
 *   3. o banco do bot direto: { "Nome": {Config, Campos, Cupom} }
 * Cada produto é validado separado: um ruim não derruba a lista e o erro aponta o campo exato.
 */
export function parseListProducts(body: unknown, replaceFromQuery = false): ListParse {
  const root = Array.isArray(body) ? { products: body } : body;
  if (!isObj(root)) return { ok: false, status: 422, error: "validation_error", message: 'O corpo precisa ser {"products": [...]} ou o objeto de produtos do bot ({"Nome": {"Config": {...}}}).' };
  let format: "list" | "bot" = "list", entries: unknown[];
  if (Array.isArray(root.products)) entries = root.products.map(fromListItem);
  else if (isObj(root.products)) { format = "bot"; entries = Object.entries(root.products).map(([k, v]) => fromBotEntry(k, v)); }
  else if ("products" in root) return { ok: false, status: 422, error: "validation_error", message: "products precisa ser uma lista ou um objeto de produtos." };
  else {
    const vals = Object.entries(root).filter(([k]) => k !== "replace");
    if (vals.some(([, v]) => !isObj(v) || !isObj(v.Config))) return { ok: false, status: 422, error: "validation_error", message: 'Não reconheci o formato. Use {"products": [...]} ou {"Nome": {"Config": {...}, "Campos": [], "Cupom": []}}.' };
    format = "bot"; entries = vals.map(([k, v]) => fromBotEntry(k, v));
  }
  const replace = root.replace;
  if (replace !== undefined && replace !== null && typeof replace !== "boolean") return { ok: false, status: 422, error: "validation_error", message: "replace precisa ser true ou false." };
  if (entries.length > MAX_PRODUCTS_PER_BOT) return { ok: false, status: 422, error: "validation_error", message: `Envie no máximo ${MAX_PRODUCTS_PER_BOT} produtos por vez (recebi ${entries.length}).` };

  const ok: BotProduct[] = [], rejected: Rejected[] = [];
  entries.forEach((raw, i) => { const r = validateOne(raw, i); if ("ok" in r) ok.push(r.ok); else rejected.push(r.bad); });
  if (entries.length && !ok.length) return { ok: false, status: 422, error: "validation_error", message: "Nenhum produto da lista é válido.", rejected: rejected.slice(0, 20) };
  return { ok: true, format, products: ok, replace: replace === true || replaceFromQuery, rejected: rejected.slice(0, 20) };
}

/** Um produto só (PUT /products/:key): aceita {Config, Campos, Cupom} ou o formato de lista sem o id. */
export function parseSingleProduct(key: string, body: unknown): { ok: true; product: BotProduct } | { ok: false; message: string; errors: string[] } {
  if (!isObj(body)) return { ok: false, message: "O corpo precisa ser um objeto.", errors: [] };
  const raw = isObj(body.Config) ? fromBotEntry(key, body) : fromListItem({ ...body, id: key });
  const r = validateOne(raw, 0);
  return "ok" in r ? { ok: true, product: r.ok } : { ok: false, message: "Produto inválido.", errors: r.bad.errors };
}

export const ackSchema = z.object({
  site_ids: z.array(z.string().uuid()).max(MAX_PRODUCTS_PER_BOT).optional(),
  acks: z.array(z.object({ site_id: z.string().uuid(), external_id: z.union([z.string(), z.number()]).transform(String).pipe(z.string().min(1).max(100)).optional(),
    ok: z.boolean().optional(), error: z.string().max(200).optional() })).max(MAX_PRODUCTS_PER_BOT).optional(),
});

// ───────────────────────── saída: banco → formato do bot ─────────────────────────

export type BotEntry = { Config: Record<string, unknown>; Campos: unknown[]; Cupom: unknown[] };

export function toBotEntry(row: any): BotEntry {
  const d: Partial<BotData> = row.bot_data ?? {};
  const extra = d.config ?? {};
  return {
    Config: {
      ...extra,
      name: row.name, desc: row.description, entrega: typeToEntrega(row.delivery_type),
      icon: typeof extra.icon === "string" ? extra.icon : "", banner: row.banner_url || "",
      dataCriacao: typeof extra.dataCriacao === "number" ? extra.dataCriacao : Date.parse(row.created_at) || Date.now(),
      site_id: row.id,
    },
    Campos: d.campos ?? [], Cupom: d.cupom ?? [],
  };
}

/** Objeto no formato do bot. A chave é o id que o bot já usa (external_id) ou, se ainda não tem, o nome; repetida ganha [sufixo]. */
export function toBotFormat(rows: any[]): Record<string, BotEntry> {
  const out: Record<string, BotEntry> = {};
  for (const r of rows) {
    let key = String(r.external_id ?? r.name);
    if (key in out) key = `${key} [${String(r.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}]`;
    out[key] = toBotEntry(r);
  }
  return out;
}

/** Assinatura do envio ao bot: HMAC-SHA256 de "<timestamp>.<corpo>" com o segredo compartilhado. */
export const signPayload = (secret: string, ts: string, body: string) =>
  "sha256=" + createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
