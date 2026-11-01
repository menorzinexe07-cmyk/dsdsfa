// Regras dos produtos que não dependem do banco: validação do formulário, imagem e assinatura do envio ao bot.
import { createHmac } from "node:crypto";
import { z } from "zod";

export const MAX_BANNER_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCTS_PER_BOT = 200;

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

export type FormResult =
  | { ok: true; name: string; description: string; delivery_type: "automatic" | "manual"; file: { bytes: Uint8Array; ext: string; mime: string } }
  | { ok: false; status: number; error: string; fields?: Record<string, string> };

export async function parseProductForm(req: Request): Promise<FormResult> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BANNER_BYTES + 256 * 1024) return { ok: false, status: 413, error: "file_too_large" };
  let form: FormData;
  try { form = await req.formData(); } catch { return { ok: false, status: 400, error: "invalid_form" }; }

  const p = z.object({ name: nameField, description: descField, delivery_type: deliveryField })
    .safeParse({ name: form.get("name"), description: form.get("description"), delivery_type: form.get("delivery_type") });
  const fields: Record<string, string> = {};
  if (!p.success) for (const i of p.error.issues) fields[String(i.path[0])] ??= "invalid";
  const f = form.get("banner");
  if (!f || typeof f === "string" || f.size === 0) fields.banner = "required";
  if (Object.keys(fields).length) return { ok: false, status: 422, error: "validation_error", fields };
  if (!p.success) return { ok: false, status: 422, error: "validation_error" }; // só para o TypeScript

  const file = f as File;
  if (file.size > MAX_BANNER_BYTES) return { ok: false, status: 413, error: "file_too_large" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > MAX_BANNER_BYTES) return { ok: false, status: 413, error: "file_too_large" };
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, status: 415, error: "unsupported_image" };
  return { ok: true, ...p.data, file: { bytes, ...kind } };
}

/** `null` vindo do bot vale como "não informado" (muitos bots mandam null em vez de omitir o campo). */
const orUndef = <T extends z.ZodTypeAny>(t: T) => z.preprocess((v) => (v === null ? undefined : v), t);

/** Produto como o bot manda no listproducts. Texto longo é cortado; banner_url inválido (não-https) é ignorado em vez de recusar o produto. */
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
});
export type BotProduct = z.infer<typeof botProduct>;

export type ListParse =
  | { ok: true; products: BotProduct[]; replace: boolean; rejected: { index: number; id?: string; errors: string[] }[] }
  | { ok: false; status: number; error: string; message: string; rejected?: { index: number; id?: string; errors: string[] }[] };

/** Valida o corpo do listproducts item a item: um produto ruim não derruba a lista inteira e o erro aponta o campo exato. */
export function parseListProducts(body: unknown): ListParse {
  const root = Array.isArray(body) ? { products: body } : body; // aceita também a lista "pelada": [ {...}, {...} ]
  if (!root || typeof root !== "object" || !Array.isArray((root as any).products))
    return { ok: false, status: 422, error: "validation_error", message: 'O corpo precisa ser {"products": [ ... ]} (products é uma lista).' };
  const { products, replace } = root as { products: unknown[]; replace?: unknown };
  if (replace !== undefined && replace !== null && typeof replace !== "boolean")
    return { ok: false, status: 422, error: "validation_error", message: "replace precisa ser true ou false." };
  if (products.length > MAX_PRODUCTS_PER_BOT)
    return { ok: false, status: 422, error: "validation_error", message: `Envie no máximo ${MAX_PRODUCTS_PER_BOT} produtos por vez (recebi ${products.length}).` };

  const ok: BotProduct[] = [], rejected: { index: number; id?: string; errors: string[] }[] = [];
  products.forEach((raw, index) => {
    const r = botProduct.safeParse(raw);
    if (r.success) return void ok.push(r.data);
    const id = raw && typeof raw === "object" && (typeof (raw as any).id === "string" || typeof (raw as any).id === "number") ? String((raw as any).id) : undefined;
    const errors = r.error.issues.map((i) => `${i.path.join(".") || "(item)"}: ${i.code === "invalid_union" || i.message === "Invalid input" ? "valor inválido (id precisa ser texto ou número)" : i.message}`);
    rejected.push({ index, id, errors: [...new Set(errors)] });
  });
  if (products.length && !ok.length)
    return { ok: false, status: 422, error: "validation_error", message: "Nenhum produto da lista é válido.", rejected: rejected.slice(0, 20) };
  return { ok: true, products: ok, replace: replace === true, rejected: rejected.slice(0, 20) };
}

/** Assinatura do envio ao bot: HMAC-SHA256 de "<timestamp>.<corpo>" com o segredo compartilhado. */
export const signPayload = (secret: string, ts: string, body: string) =>
  "sha256=" + createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
