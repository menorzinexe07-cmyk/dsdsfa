import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db";

const prod = process.env.NODE_ENV === "production";
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const cookie = (n: string, v: string, maxAge: number) =>
  `${n}=${v}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${prod ? "; Secure" : ""}`;
const readCookie = (req: Request, n: string) =>
  req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(n + "="))?.slice(n.length + 1);

export function loginRedirect(): Response {
  const state = randomBytes(16).toString("hex");
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!, response_type: "code",
    redirect_uri: process.env.DISCORD_REDIRECT_URI!, scope: "identify", state, prompt: "none",
  }).toString();
  const h = new Headers({ Location: url.toString() });
  h.append("Set-Cookie", cookie("zy_state", state, 600));
  return new Response(null, { status: 302, headers: h });
}

export async function handleCallback(req: Request): Promise<Response> {
  const u = new URL(req.url);
  const code = u.searchParams.get("code"), state = u.searchParams.get("state");
  const saved = readCookie(req, "zy_state");
  const ok = !!(code && state && saved && state.length === saved.length &&
    timingSafeEqual(Buffer.from(state), Buffer.from(saved)));
  if (!ok) return new Response(null, { status: 302, headers: { Location: "/login?erro=state" } });

  const tok = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!, client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code", code: code!, redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    }),
  });
  if (!tok.ok) return new Response(null, { status: 302, headers: { Location: "/login?erro=token" } });
  const { access_token } = await tok.json();

  const me = await fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${access_token}` } });
  if (!me.ok) return new Response(null, { status: 302, headers: { Location: "/login?erro=discord" } });
  const user = await me.json(); // o access_token é descartado: não é armazenado

  await db.from("profiles").upsert({
    discord_id: String(user.id), username: user.username, global_name: user.global_name ?? null,
    avatar: user.avatar ?? null, last_seen_at: new Date().toISOString(),
  }, { onConflict: "discord_id" });

  const token = randomBytes(32).toString("base64url");
  const days = 7;
  await db.from("sessions").insert({
    token_hash: sha256(token), discord_id: String(user.id),
    expires_at: new Date(Date.now() + days * 864e5).toISOString(),
  });
  const h = new Headers({ Location: "/dashboard" });
  h.append("Set-Cookie", cookie("zy_session", token, days * 86400));
  h.append("Set-Cookie", cookie("zy_state", "", 0));
  return new Response(null, { status: 302, headers: h });
}

export async function logout(req: Request): Promise<Response> {
  const t = readCookie(req, "zy_session");
  if (t) await db.from("sessions").delete().eq("token_hash", sha256(t));
  return new Response(null, { status: 302, headers: { Location: "/", "Set-Cookie": cookie("zy_session", "", 0) } });
}

/** Identidade vem SEMPRE da sessão, nunca de ID enviado pelo navegador. */
export async function getSessionUser(req: Request): Promise<string | null> {
  const t = readCookie(req, "zy_session");
  if (!t) return null;
  const { data } = await db.from("sessions").select("discord_id,expires_at")
    .eq("token_hash", sha256(t)).gt("expires_at", new Date().toISOString()).maybeSingle();
  return data?.discord_id ?? null;
}

export async function getMyBots(discordId: string) {
  const { data } = await db.from("app_owners")
    .select("bot_id, acquired_at, apps(name, avatar_url, license_status)")
    .eq("discord_user_id", discordId).eq("active", true);
  return data ?? [];
}

/** Use em TODA rota /dashboard/bots/:botId e em toda API de dados do bot. */
export async function requireBotOwner(req: Request, botId: string) {
  const uid = await getSessionUser(req);
  if (!uid) return { status: 401 as const };
  const { data } = await db.from("app_owners").select("bot_id")
    .eq("bot_id", botId).eq("discord_user_id", uid).eq("active", true).maybeSingle();
  return data ? { status: 200 as const, uid } : { status: 404 as const }; // 404 não revela que o bot existe
}

export async function isAdmin(req: Request) {
  const uid = await getSessionUser(req);
  if (!uid) return false;
  const { data } = await db.from("platform_admins").select("discord_id").eq("discord_id", uid).maybeSingle();
  return !!data;
}

export const TEST_BOT_ID = "bot_teste";

export async function isAdminUid(uid: string) {
  const { data } = await db.from("platform_admins").select("discord_id").eq("discord_id", uid).maybeSingle();
  return !!data;
}

/** Admins sempre têm o "Bot Teste" vinculado, para abrir o dashboard mesmo sem compras reais. */
export async function ensureTestBot(uid: string) {
  if (!(await isAdminUid(uid))) return;
  await db.from("apps").upsert({ bot_id: TEST_BOT_ID, name: "Bot Teste" }, { onConflict: "bot_id", ignoreDuplicates: true });
  await db.from("app_owners").upsert({ bot_id: TEST_BOT_ID, discord_user_id: uid, active: true }, { onConflict: "bot_id,discord_user_id" });
}
