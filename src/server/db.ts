import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Service role: SOMENTE no servidor. Criado sob demanda para o app subir mesmo antes do .env estar completo. */
function get(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configurados");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
export const db = new Proxy({} as SupabaseClient, {
  get: (_t, p) => { const c = get() as any; const v = c[p]; return typeof v === "function" ? v.bind(c) : v; },
});
