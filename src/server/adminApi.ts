import { z } from "zod";
import { db } from "./db";
import { isAdmin, getSessionUser } from "./auth";
import { createCredential, json } from "./api";
import { audit, sameOrigin, type Route } from "./dashboardApi";
import { paging } from "./queries";

const LISTS: Record<string, { table: string; cols: string; order: string }> = {
  users: { table: "profiles", cols: "*", order: "last_seen_at" },
  bots: { table: "apps", cols: "*", order: "created_at" },
  purchases: { table: "app_purchases", cols: "*", order: "created_at" },
  sales: { table: "sales", cols: "bot_id,sale_id,customer_name,product_name,amount_gross,amount_net,status,sold_at,received_at", order: "received_at" },
  events: { table: "api_events", cols: "event_id,type,bot_id,outcome,error,received_at", order: "received_at" },
  credentials: { table: "api_credentials", cols: "id,name,key_prefix,bot_ids,created_at,last_used_at,revoked_at", order: "created_at" },
  audit: { table: "audit_logs", cols: "*", order: "created_at" },
};
const SETTINGS: Record<string, z.ZodTypeAny> = {
  price: z.object({ amount: z.number().nonnegative(), currency: z.literal("BRL"), label: z.string().max(60) }),
  faq: z.array(z.object({ q: z.string().min(1).max(200), a: z.string().min(1).max(2000) })).max(50),
  site: z.object({ invite: z.string().url().startsWith("https://discord.gg/"),
    hero_title: z.string().max(120).optional(), hero_text: z.string().max(400).optional() }),
};

const guarded = (h: (req: Request, m: RegExpExecArray, uid: string) => Promise<Response>) =>
  async (req: Request, m: RegExpExecArray) => {
    if (req.method !== "GET" && !sameOrigin(req)) return json({ error: "bad_origin" }, 403);
    const uid = await getSessionUser(req);
    if (!uid) return json({ error: "session_expired" }, 401);
    if (!(await isAdmin(req))) return json({ error: "not_found" }, 404);
    return h(req, m, uid);
  };

export const adminRoutes: Route[] = [
  ["GET", /^\/api\/admin\/overview$/, guarded(async () => {
    const c = (t: string, f?: (q: any) => any) => { let q = db.from(t).select("*", { count: "exact", head: true }); return (f ? f(q) : q).then((r: any) => r.count ?? 0); };
    const since = new Date(Date.now() - 864e5).toISOString();
    const [users, bots, purchases, sales, creds, errors24h] = await Promise.all([
      c("profiles"), c("apps"), c("app_purchases"), c("sales"),
      c("api_credentials", (q) => q.is("revoked_at", null)), c("api_events", (q) => q.eq("outcome", "error").gte("received_at", since)),
    ]);
    return json({ users, bots, purchases, sales, active_credentials: creds, errors_24h: errors24h });
  })],

  ["GET", /^\/api\/admin\/status$/, guarded(async () => {
    const t0 = Date.now();
    const ping = await db.from("platform_settings").select("key").limit(1);
    const last = await db.from("api_events").select("received_at").order("received_at", { ascending: false }).limit(1).maybeSingle();
    return json({ database: ping.error ? "erro" : "ok", database_ms: Date.now() - t0, last_api_event_at: last.data?.received_at ?? null });
  })],

  ["GET", /^\/api\/admin\/list\/(users|bots|purchases|sales|events|credentials|audit)$/, guarded(async (req, m) => {
    const l = LISTS[m[1]], pg = paging(new URL(req.url).searchParams);
    const { data, count, error } = await db.from(l.table).select(l.cols, { count: "exact" })
      .order(l.order, { ascending: false }).range(pg.from, pg.to);
    if (error) return json({ error: "internal_error" }, 500);
    return json({ items: data, total: count ?? 0, page: pg.page, pageSize: pg.size });
  })],

  ["POST", /^\/api\/admin\/credentials$/, guarded(async (req, _m, uid) => {
    const p = z.object({ name: z.string().trim().min(1).max(60), bot_ids: z.array(z.string().min(1).max(100)).min(1).max(50) })
      .safeParse(await req.json().catch(() => null));
    if (!p.success) return json({ error: "validation_error" }, 422);
    const secret = await createCredential(p.data.name, p.data.bot_ids);
    await audit(uid, "admin.credential.create", p.data.name, { bot_ids: p.data.bot_ids });
    return json({ secret, notice: "Guarde agora. Este segredo não será exibido novamente." }, 201);
  })],

  ["POST", /^\/api\/admin\/credentials\/([0-9a-f-]{36})\/revoke$/, guarded(async (_req, m, uid) => {
    await db.from("api_credentials").update({ revoked_at: new Date().toISOString() }).eq("id", m[1]);
    await audit(uid, "admin.credential.revoke", m[1]);
    return json({ ok: true });
  })],

  ["PATCH", /^\/api\/admin\/bots\/([^/]+)$/, guarded(async (req, m, uid) => {
    const p = z.object({ license_status: z.enum(["active", "suspended", "expired"]) }).safeParse(await req.json().catch(() => null));
    if (!p.success) return json({ error: "validation_error" }, 422);
    await db.from("apps").update(p.data).eq("bot_id", m[1]);
    await audit(uid, "admin.bot.license", m[1], p.data);
    return json({ ok: true });
  })],

  ["PUT", /^\/api\/admin\/settings\/(price|faq|site)$/, guarded(async (req, m, uid) => {
    const p = SETTINGS[m[1]].safeParse(await req.json().catch(() => null));
    if (!p.success) return json({ error: "validation_error" }, 422);
    await db.from("platform_settings").upsert({ key: m[1], value: p.data });
    await audit(uid, "admin.settings.update", m[1]);
    return json({ ok: true });
  })],
];
