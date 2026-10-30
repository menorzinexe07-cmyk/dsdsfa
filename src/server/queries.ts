import { db } from "./db";

const STATUSES = ["approved", "pending", "canceled", "refunded"];
const SORTS = ["sold_at", "amount_gross", "amount_net", "status", "customer_name"];
const clean = (s: string) => s.replace(/[,()%*\\"']/g, " ").trim().slice(0, 80);
const validDate = (s: string | null) => (s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : null);

export function paging(p: URLSearchParams) {
  const page = Math.max(1, parseInt(p.get("page") ?? "1") || 1);
  const size = Math.min(100, Math.max(1, parseInt(p.get("pageSize") ?? "20") || 20));
  return { page, size, from: (page - 1) * size, to: (page - 1) * size + size - 1 };
}

export async function getStats(botId: string, p: URLSearchParams) {
  const { data, error } = await db.rpc("bot_stats", {
    p_bot: botId,
    p_from: validDate(p.get("from")) ?? "1970-01-01T00:00:00Z",
    p_to: validDate(p.get("to")) ?? new Date(Date.now() + 864e5).toISOString(),
  });
  if (error) throw error;
  return data;
}

export async function listSales(botId: string, p: URLSearchParams) {
  const pg = paging(p);
  let qb = db.from("sales").select(
    "sale_id,customer_discord_id,customer_name,customer_icon,payment_method,gateway,product_id,product_name,amount_gross,fees,amount_net,amounts_source,currency,status,sold_at,received_at",
    { count: "exact" }).eq("bot_id", botId);
  const status = p.get("status");
  if (status && STATUSES.includes(status)) qb = qb.eq("status", status);
  const from = validDate(p.get("from")), to = validDate(p.get("to"));
  if (from) qb = qb.gte("sold_at", from);
  if (to) qb = qb.lte("sold_at", to);
  const q = clean(p.get("q") ?? "");
  if (q) qb = qb.or(`customer_name.ilike.%${q}%,customer_discord_id.eq.${q},sale_id.eq.${q},product_name.ilike.%${q}%`);
  const sort = SORTS.includes(p.get("sort") ?? "") ? p.get("sort")! : "sold_at";
  const { data, count, error } = await qb.order(sort, { ascending: p.get("dir") === "asc" }).range(pg.from, pg.to);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, page: pg.page, pageSize: pg.size };
}

export async function listCustomers(botId: string, p: URLSearchParams) {
  const pg = paging(p);
  const { data, error } = await db.rpc("bot_customers", {
    p_bot: botId, p_q: clean(p.get("q") ?? ""), p_limit: pg.size, p_offset: pg.from });
  if (error) throw error;
  return { items: data.rows, total: data.total, page: pg.page, pageSize: pg.size };
}
