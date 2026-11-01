import { authenticate, handleHealth, handlePurchase, handleSale, handleSaleStatus, handleVenda, json } from "./api";
import { adminRoutes } from "./adminApi";
import { handleGetProducts, handleListProducts, productRoutes } from "./productsApi";
import { loginRedirect, logout, logoutEverywhere } from "./auth";
import { sameOrigin, userRoutes, type Route } from "./dashboardApi";
import { getStats, listCustomers, listSales } from "./queries";
import { db } from "./db";

// API privada (Bot Manager): autenticação por credencial, nunca por sessão.
const m2m: Route[] = [
  ["GET", /^\/api\/v1\/health$/, () => handleHealth()],
  ["POST", /^\/api\/v1\/apps\/purchases$/, (req) => handlePurchase(req)],
  ["POST", /^\/api\/v1\/apps\/sales$/, (req) => handleSale(req)],
  // bot_id vai na query: PATCH /api/v1/apps/sales/:saleId?bot_id=...
  ["PATCH", /^\/api\/v1\/apps\/sales\/([^/]+)$/, (req, m) => {
    const botId = new URL(req.url).searchParams.get("bot_id");
    return botId ? handleSaleStatus(req, botId, decodeURIComponent(m[1])) : json({ error: "bot_id_required" }, 422);
  }],
  ["GET", /^\/api\/v1\/apps\/users\/(\d{17,20})\/bots$/, async (req, m) => {
    const a = await authenticate(req);
    if (!a.cred) return a.err!;
    const { data } = await db.from("app_owners").select("bot_id,acquired_at,apps(name,license_status)")
      .eq("discord_user_id", m[1]).eq("active", true);
    const all = a.cred.bot_ids.includes("*");
    return json({ bots: (data ?? []).filter((b) => all || a.cred!.bot_ids.includes(b.bot_id)) });
  }],
  ["GET", /^\/api\/v1\/apps\/([^/]+)\/sales$/, async (req, m) => {
    const a = await authenticate(req, m[1]); if (a.err) return a.err;
    return json(await listSales(m[1], new URL(req.url).searchParams));
  }],
  // produtos: o bot envia a lista dele (listproducts) e lê o que foi criado no site
  ["POST", /^\/api\/v1\/apps\/([^/]+)\/listproducts$/, (req, m) => handleListProducts(req, decodeURIComponent(m[1]))],
  ["GET", /^\/api\/v1\/apps\/([^/]+)\/products$/, (req, m) => handleGetProducts(req, decodeURIComponent(m[1]))],
  ["GET", /^\/api\/v1\/apps\/([^/]+)\/stats$/, async (req, m) => {
    const a = await authenticate(req, m[1]); if (a.err) return a.err;
    return json(await getStats(m[1], new URL(req.url).searchParams));
  }],
  ["GET", /^\/api\/v1\/apps\/([^/]+)\/customers$/, async (req, m) => {
    const a = await authenticate(req, m[1]); if (a.err) return a.err;
    return json(await listCustomers(m[1], new URL(req.url).searchParams));
  }],
];

// API simples de vendas: https://SEU_DOMINIO/venda/{botId}/salles
const venda: Route[] = [
  ["POST", /^\/venda\/([^/]+)\/(?:salles|sales)$/, (req, m) => handleVenda(req, decodeURIComponent(m[1]))],
  ["GET", /^\/venda\/([^/]+)\/(?:salles|sales)$/, async (req, m) => {
    const botId = decodeURIComponent(m[1]);
    const a = await authenticate(req, botId); if (a.err) return a.err;
    return json(await listSales(botId, new URL(req.url).searchParams));
  }],
];

const auth: Route[] = [
  ["GET", /^\/api\/auth\/discord$/, () => loginRedirect()],
  ["POST", /^\/api\/auth\/logout-all$/, (req) => (sameOrigin(req) ? logoutEverywhere(req) : json({ error: "bad_origin" }, 403))],
  ["POST", /^\/api\/auth\/logout$/, (req) => (sameOrigin(req) ? logout(req) : json({ error: "bad_origin" }, 403))],
];

const routes = [...m2m, ...venda, ...auth, ...userRoutes, ...productRoutes, ...adminRoutes];

/** Monte em um único catch-all: src/routes/api.$.ts */
export async function handleApi(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  for (const [method, re, h] of routes) {
    if (req.method !== method) continue;
    const m = re.exec(pathname);
    if (!m) continue;
    try { return await h(req, m); }
    catch (e) { console.error("[api]", pathname, (e as Error).message); return json({ error: "internal_error" }, 500); }
  }
  return json({ error: "not_found" }, 404);
}
