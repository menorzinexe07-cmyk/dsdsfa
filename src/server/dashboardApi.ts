import { z } from "zod";
import { db } from "./db";
import { ensureTestBot, getMyBots, getSessionUser, isAdmin, requireBotOwner } from "./auth";
import { createCredential, json } from "./api";
import { getStats, listCustomers, listSales } from "./queries";
import { ShardError, getShardApp, getShardStatus, isShardId, renameShardApp, setShardPower, syncShardName } from "./shard";

export type Handler = (req: Request, m: RegExpExecArray) => Promise<Response> | Response;
export type Route = [method: string, re: RegExp, h: Handler];

export function sameOrigin(req: Request) {
  const o = req.headers.get("origin");
  try { return !!o && new URL(o).host === new URL(process.env.APP_URL!).host; } catch { return false; }
}
export async function audit(actor: string, action: string, target?: string, meta?: unknown) {
  await db.from("audit_logs").insert({ actor, action, target, meta });
}
const integrationStatus = (i: any) =>
  !i?.last_request_at ? "aguardando" : Date.now() - Date.parse(i.last_request_at) < 7 * 864e5 ? "ativa" : "sem_eventos_recentes";

async function owner(req: Request, botId: string) {
  const r = await requireBotOwner(req, botId);
  if (r.status === 401) return { err: json({ error: "session_expired" }, 401) };
  if (r.status === 404) return { err: json({ error: "bot_not_found" }, 404) };
  return { uid: r.uid };
}
const SHARD_HTTP: Record<string, number> = { not_configured: 503, auth: 502, not_found: 404, rejected: 502, unavailable: 502 };
function shardFail(e: unknown) {
  if (e instanceof ShardError) {
    const body: any = { error: `shard_${e.code}` };
    if (e.code === "rejected" && e.detail) body.detail = e.detail;
    return json(body, SHARD_HTTP[e.code] ?? 502);
  }
  throw e;
}
const lastPower = new Map<string, number>();

const writeGuard = (req: Request) => (sameOrigin(req) ? null : json({ error: "bad_origin" }, 403));

export const userRoutes: Route[] = [
  ["GET", /^\/api\/me$/, async (req) => {
    const uid = await getSessionUser(req);
    if (!uid) return json({ error: "session_expired" }, 401);
    const { data } = await db.from("profiles").select("discord_id,username,global_name,avatar").eq("discord_id", uid).single();
    return json({ ...data, is_admin: await isAdmin(req) });
  }],

  ["GET", /^\/api\/public\/settings$/, async () => {
    const { data } = await db.from("platform_settings").select("key,value").in("key", ["price", "faq", "site"]);
    return new Response(JSON.stringify(Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))), {
      headers: { "content-type": "application/json", "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
  }],

  ["GET", /^\/api\/dashboard\/summary$/, async (req) => {
    const uid = await getSessionUser(req);
    if (!uid) return json({ error: "session_expired" }, 401);
    await ensureTestBot(uid);
    const mine = await getMyBots(uid);
    const ids = mine.map((b) => b.bot_id);
    if (!ids.length) return json({ bots: [], recent_sales: [], activity: [], alerts: [] });
    const [ints, sales, events] = await Promise.all([
      db.from("app_integrations").select("*").in("bot_id", ids),
      db.from("sales").select("bot_id,sale_id,customer_name,product_name,amount_gross,amount_net,status,sold_at")
        .in("bot_id", ids).order("sold_at", { ascending: false }).limit(10),
      db.from("api_events").select("bot_id,type,outcome,received_at").in("bot_id", ids)
        .order("received_at", { ascending: false }).limit(10),
    ]);
    const bots = mine.map((b: any) => {
      const i = (ints.data ?? []).find((x) => x.bot_id === b.bot_id);
      return { bot_id: b.bot_id, name: b.apps?.name, avatar_url: b.apps?.avatar_url, license_status: b.apps?.license_status,
        acquired_at: b.acquired_at, integration: { status: integrationStatus(i), last_request_at: i?.last_request_at ?? null } };
    });
    const alerts: { level: string; text: string }[] = [];
    for (const b of bots) {
      if (b.license_status !== "active") alerts.push({ level: "erro", text: `A licença de ${b.name} está ${b.license_status}.` });
      if (b.integration.status === "aguardando") alerts.push({ level: "info", text: `A integração de ${b.name} ainda não recebeu eventos do Bot Manager.` });
      if (b.integration.status === "sem_eventos_recentes") alerts.push({ level: "aviso", text: `${b.name} está sem eventos há mais de 7 dias.` });
    }
    return json({ bots, recent_sales: sales.data ?? [], activity: events.data ?? [], alerts });
  }],

  ["GET", /^\/api\/bots$/, async (req) => {
    const uid = await getSessionUser(req);
    if (!uid) return json({ error: "session_expired" }, 401);
    await ensureTestBot(uid);
    const mine = await getMyBots(uid);
    const { data: ints } = await db.from("app_integrations").select("*").in("bot_id", mine.map((b) => b.bot_id));
    return json({ bots: mine.map((b: any) => {
      const i = (ints ?? []).find((x) => x.bot_id === b.bot_id);
      return { bot_id: b.bot_id, name: b.apps?.name, avatar_url: b.apps?.avatar_url, license_status: b.apps?.license_status,
        acquired_at: b.acquired_at, integration: { status: integrationStatus(i), last_request_at: i?.last_request_at ?? null } };
    }) });
  }],

  ["GET", /^\/api\/bots\/([^/]+)$/, async (req, m) => {
    const o = await owner(req, m[1]); if (o.err) return o.err;
    const { data } = await db.from("apps").select("bot_id,name,avatar_url,license_status,created_at").eq("bot_id", m[1]).single();
    return json(data);
  }],

  ["PATCH", /^\/api\/bots\/([^/]+)$/, async (req, m) => {
    const g = writeGuard(req); if (g) return g;
    const o = await owner(req, m[1]); if (o.err) return o.err;
    const p = z.object({
      name: z.string().trim().min(1).max(60).regex(/^[^\u0000-\u001f\u007f]+$/).optional(),
      avatar_url: z.string().url().startsWith("https://").max(300).nullable().optional(),
    }).safeParse(await req.json().catch(() => null));
    if (!p.success) return json({ error: "validation_error" }, 422);
    const { data: cur } = await db.from("apps").select("name").eq("bot_id", m[1]).single();
    if (p.data.name && p.data.name !== cur?.name && isShardId(m[1])) {
      try { await renameShardApp(m[1], p.data.name); } catch (e) { return shardFail(e); } // só salva aqui se a Shard aceitou
    }
    await db.from("apps").update(p.data).eq("bot_id", m[1]);
    await audit(o.uid!, "bot.update", m[1], p.data);
    return json({ ok: true });
  }],

  // Detalhes do app direto da Shard Cloud (nome, id, linguagem, recursos, status).
  ["GET", /^\/api\/bots\/([^/]+)\/shard$/, async (req, m) => {
    const o = await owner(req, m[1]); if (o.err) return o.err;
    if (!isShardId(m[1])) return json({ linked: false });
    try {
      const [app, st] = await Promise.all([getShardApp(m[1]), getShardStatus(m[1])]);
      if (app?.name) await syncShardName(m[1], app.name);
      return json({
        linked: true, id: app?.id ?? m[1], name: app?.name, language: app?.language, version: app?.version,
        ram: app?.ram, vcpu: app?.vcpu, created_at: app?.created_at ?? null,
        blocked_until: app?.blocked_until ?? null, blocked_reason: app?.blocked_reason ?? null,
        status: st?.status ?? "not_found", uptime_seconds: st?.container_uptime_seconds ?? 0,
      });
    } catch (e) { return shardFail(e); }
  }],

  // Iniciar / reiniciar / desligar
  ["POST", /^\/api\/bots\/([^/]+)\/power$/, async (req, m) => {
    const g = writeGuard(req); if (g) return g;
    const o = await owner(req, m[1]); if (o.err) return o.err;
    const p = z.object({ action: z.enum(["run", "stop", "restart"]) }).safeParse(await req.json().catch(() => null));
    if (!p.success) return json({ error: "validation_error" }, 422);
    if (!isShardId(m[1])) return json({ error: "not_shard_app" }, 422);
    const { data: app } = await db.from("apps").select("license_status").eq("bot_id", m[1]).single();
    if (app?.license_status !== "active" && p.data.action !== "stop") return json({ error: "license_inactive" }, 403);
    const now = Date.now();
    if (now - (lastPower.get(m[1]) ?? 0) < 8000) return json({ error: "too_fast" }, 429);
    lastPower.set(m[1], now);
    try { await setShardPower(m[1], p.data.action); } catch (e) { return shardFail(e); }
    await audit(o.uid!, `bot.power.${p.data.action}`, m[1]);
    return json({ ok: true });
  }],

  ["GET", /^\/api\/bots\/([^/]+)\/stats$/, async (req, m) => {
    const o = await owner(req, m[1]); if (o.err) return o.err;
    return json(await getStats(m[1], new URL(req.url).searchParams));
  }],
  ["GET", /^\/api\/bots\/([^/]+)\/sales$/, async (req, m) => {
    const o = await owner(req, m[1]); if (o.err) return o.err;
    return json(await listSales(m[1], new URL(req.url).searchParams));
  }],
  ["GET", /^\/api\/bots\/([^/]+)\/customers$/, async (req, m) => {
    const o = await owner(req, m[1]); if (o.err) return o.err;
    return json(await listCustomers(m[1], new URL(req.url).searchParams));
  }],

  ["GET", /^\/api\/bots\/([^/]+)\/integration$/, async (req, m) => {
    const o = await owner(req, m[1]); if (o.err) return o.err;
    const [i, errs, creds, sales] = await Promise.all([
      db.from("app_integrations").select("*").eq("bot_id", m[1]).maybeSingle(),
      db.from("api_events").select("type,error,received_at").eq("bot_id", m[1]).eq("outcome", "error")
        .order("received_at", { ascending: false }).limit(5),
      db.from("api_credentials").select("id,name,key_prefix,bot_ids,created_at,last_used_at,revoked_at").contains("bot_ids", [m[1]]),
      db.from("sales").select("sale_id", { count: "exact", head: true }).eq("bot_id", m[1]),
    ]);
    return json({
      status: integrationStatus(i.data), last_request_at: i.data?.last_request_at ?? null,
      last_event_id: i.data?.last_event_id ?? null, events_processed: i.data?.events_processed ?? 0,
      sales_received: sales.count ?? 0, recent_errors: errs.data ?? [],
      // só credenciais exclusivas deste bot podem ser geridas pelo dono
      credentials: (creds.data ?? []).filter((c) => c.bot_ids.length === 1 && !c.bot_ids.includes("*")),
    });
  }],

  ["POST", /^\/api\/bots\/([^/]+)\/credentials$/, async (req, m) => {
    const g = writeGuard(req); if (g) return g;
    const o = await owner(req, m[1]); if (o.err) return o.err;
    const p = z.object({ name: z.string().trim().min(1).max(60) }).safeParse(await req.json().catch(() => null));
    if (!p.success) return json({ error: "validation_error" }, 422);
    const { count } = await db.from("api_credentials").select("id", { count: "exact", head: true })
      .contains("bot_ids", [m[1]]).is("revoked_at", null);
    if ((count ?? 0) >= 5) return json({ error: "credential_limit" }, 409);
    const secret = await createCredential(p.data.name, [m[1]]);
    await audit(o.uid!, "credential.create", m[1], { name: p.data.name });
    return json({ secret, notice: "Guarde agora. Este segredo não será exibido novamente." }, 201);
  }],

  ["POST", /^\/api\/bots\/([^/]+)\/credentials\/([0-9a-f-]{36})\/rotate$/, async (req, m) => {
    const g = writeGuard(req); if (g) return g;
    const o = await owner(req, m[1]); if (o.err) return o.err;
    const { data: c } = await db.from("api_credentials").select("id,name,bot_ids,revoked_at").eq("id", m[2]).maybeSingle();
    if (!c || c.revoked_at || c.bot_ids.length !== 1 || c.bot_ids[0] !== m[1]) return json({ error: "not_found" }, 404);
    await db.from("api_credentials").update({ revoked_at: new Date().toISOString() }).eq("id", c.id);
    const secret = await createCredential(c.name, [m[1]]);
    await audit(o.uid!, "credential.rotate", m[1], { id: c.id });
    return json({ secret, notice: "Guarde agora. Este segredo não será exibido novamente." }, 201);
  }],

  ["DELETE", /^\/api\/bots\/([^/]+)\/credentials\/([0-9a-f-]{36})$/, async (req, m) => {
    const g = writeGuard(req); if (g) return g;
    const o = await owner(req, m[1]); if (o.err) return o.err;
    const { data: c } = await db.from("api_credentials").select("id,bot_ids").eq("id", m[2]).maybeSingle();
    if (!c || c.bot_ids.length !== 1 || c.bot_ids[0] !== m[1]) return json({ error: "not_found" }, 404);
    await db.from("api_credentials").update({ revoked_at: new Date().toISOString() }).eq("id", c.id);
    await audit(o.uid!, "credential.revoke", m[1], { id: c.id });
    return json({ ok: true });
  }],
];
