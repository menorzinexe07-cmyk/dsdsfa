import { useCallback, useEffect, useState } from "react";

// Cache de leituras (só no navegador, por aba): mostra o último resultado na hora e atualiza em seguida.
const TTL = 5 * 60_000;
const memory = new Map<string, { t: number; data: unknown }>();
const store = () => { try { return window.sessionStorage; } catch { return null; } };
function cacheGet(path: string): unknown | undefined {
  const m = memory.get(path); if (m && Date.now() - m.t < TTL) return m.data;
  try { const raw = store()?.getItem("zy:" + path); if (raw) { const v = JSON.parse(raw); if (Date.now() - v.t < TTL) { memory.set(path, v); return v.data; } } } catch { /* ignora */ }
}
function cacheSet(path: string, data: unknown) {
  const v = { t: Date.now(), data }; memory.set(path, v);
  try { store()?.setItem("zy:" + path, JSON.stringify(v)); } catch { /* cota cheia: tudo bem */ }
}
export function cacheClear() {
  memory.clear();
  try { const s = store(); if (s) Object.keys(s).filter((k) => k.startsWith("zy:")).forEach((k) => s.removeItem(k)); } catch { /* ignora */ }
}

export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export async function api<T = any>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  if (init?.method && init.method !== "GET") cacheClear(); // qualquer alteração invalida o cache
  let r: Response;
  try {
    r = await fetch(path, { credentials: "same-origin", ...init,
      headers: { ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }), ...init?.headers }, // com arquivo, o navegador define o content-type (boundary)
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body });
  } catch { throw new ApiError(0, "network"); }
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new ApiError(r.status, body?.error ?? "erro");
  return body as T;
}

export function useApi<T = any>(path: string | null) {
  const [s, set] = useState<{ data?: T; error?: ApiError; loading: boolean }>({ loading: !!path });
  const load = useCallback(() => {
    if (!path) return;
    set((x) => ({ ...x, loading: true, error: undefined }));
    api<T>(path).then((data) => { cacheSet(path, data); set({ data, loading: false }); })
      .catch((error) => set({ error, loading: false }));
  }, [path]);
  useEffect(() => { // depois de montar (evita divergir do HTML do servidor): mostra o cache enquanto atualiza
    if (!path) return;
    const hit = cacheGet(path) as T | undefined;
    if (hit !== undefined) set((x) => (x.data === undefined ? { ...x, data: hit } : x));
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { ...s, reload: load };
}

export const errMsg = (e: ApiError) =>
  e.status === 0 ? "Falha de comunicação com o servidor. Verifique sua conexão e tente novamente."
  : e.status === 401 ? "Sua sessão expirou. Entre novamente."
  : e.status === 404 ? "Bot não encontrado ou sem permissão de acesso."
  : e.status === 429 ? "Muitas requisições. Aguarde um instante."
  : "Algo deu errado. Tente novamente em instantes.";

export const brl = (n: number | null | undefined) =>
  n == null ? "—" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dt = (s?: string | null) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
export const avatarUrl = (id: string, hash?: string | null) =>
  hash ? `https://cdn.discordapp.com/avatars/${id}/${hash}.png?size=64` : "https://cdn.discordapp.com/embed/avatars/0.png";
