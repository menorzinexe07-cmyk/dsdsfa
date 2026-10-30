import { db } from "./db";

/**
 * Cliente da API da Shard Cloud. Usa UM token (o seu, em SHARD_API_TOKEN) só no servidor.
 * O cliente final nunca vê o token: o site só expõe 3 operações, sempre depois de
 * confirmar que o bot pertence ao usuário logado.
 */
const BASE = process.env.SHARD_API_BASE ?? "https://shardcloud.app/api";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Só IDs no formato de UUID viram chamadas à Shard (evita montar URLs com texto livre). */
export const isShardId = (id: string) => UUID.test(id);

export type ShardCode = "not_configured" | "auth" | "not_found" | "rejected" | "unavailable";
export class ShardError extends Error {
  constructor(public code: ShardCode, public status?: number, public detail?: string) { super(code); }
}

async function call(method: string, path: string, body?: unknown, timeoutMs = 8000): Promise<any> {
  const token = process.env.SHARD_API_TOKEN;
  if (!token) throw new ShardError("not_configured");
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method, signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    console.error("[shard]", method, path, "rede:", (e as Error).message);
    throw new ShardError("unavailable");
  }
  const data = await res.json().catch(() => null);
  if (res.ok) return data;
  const detail = String(data?.error ?? data?.message ?? "").slice(0, 160) || undefined;
  console.error("[shard]", method, path, "HTTP", res.status, detail ?? "");
  if (res.status === 401) throw new ShardError("auth", 401, detail);
  if (res.status === 404) throw new ShardError("not_found", 404, detail);
  throw new ShardError("rejected", res.status, detail);
}

export async function getShardApp(id: string, timeoutMs?: number) {
  const d = await call("GET", `/apps/${id}?q=1`, undefined, timeoutMs); // q=1: sem métricas, mais rápido
  return d?.app ?? d;
}
export const getShardStatus = (id: string) => call("GET", `/apps/${id}/status`);
export const setShardPower = (id: string, status: "run" | "stop" | "restart") => call("POST", `/apps/${id}/status`, { status });
/** Envia SOMENTE o nome: nada de RAM, subdomínio ou comando. */
export const renameShardApp = (id: string, name: string) => call("PUT", `/apps/${id}/resources`, { name });

/** Copia o nome real da Shard para o nosso banco. Melhor esforço: nunca derruba quem chamou. */
export async function syncShardName(botId: string, name?: string) {
  try {
    const n = name ?? (await getShardApp(botId, 4000))?.name;
    if (typeof n === "string" && n.trim()) await db.from("apps").update({ name: n.trim() }).eq("bot_id", botId);
  } catch { /* ignora */ }
}
