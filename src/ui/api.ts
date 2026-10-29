import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export async function api<T = any>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path, { credentials: "same-origin", ...init,
      headers: { "content-type": "application/json", ...init?.headers },
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
    api<T>(path).then((data) => set({ data, loading: false })).catch((error) => set({ error, loading: false }));
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
