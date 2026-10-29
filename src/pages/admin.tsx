import { useState } from "react";
import { Dash } from "../ui/Shell";
import { api, dt, useApi } from "../ui/api";
import { Async, Badge, Empty, Kpi, Pager } from "../ui/kit";
import { FAQ_DEFAULT } from "../content";

const TABS = [["users", "Usuários"], ["bots", "Bots"], ["purchases", "Compras"], ["sales", "Vendas"], ["events", "Eventos da API"],
  ["credentials", "Credenciais"], ["audit", "Auditoria"], ["settings", "Configurações do site"]] as const;

function ListTab({ kind }: { kind: string }) {
  const [page, setPage] = useState(1);
  const q = useApi<any>(`/api/admin/list/${kind}?page=${page}&pageSize=25`);
  const act = async (fn: () => Promise<any>) => { await fn().catch(() => alert("Falha ao executar a ação.")); q.reload(); };
  return <Async q={q}>{(d) => !d.items.length ? <Empty>Nenhum registro.</Empty> : <>
    <div className="tablewrap"><table><thead><tr>{Object.keys(d.items[0]).filter((k) => k !== "payload").map((k) => <th key={k}>{k}</th>)}
      {(kind === "credentials" || kind === "bots") && <th />}</tr></thead>
      <tbody>{d.items.map((r: any, i: number) => <tr key={i}>
        {Object.entries(r).filter(([k]) => k !== "payload").map(([k, v]) => <td key={k}>
          {k.endsWith("_at") ? dt(v as string) : Array.isArray(v) ? (v as string[]).join(", ") : typeof v === "object" && v ? JSON.stringify(v) : String(v ?? "—")}</td>)}
        {kind === "credentials" && <td>{!r.revoked_at && <button className="btn sm" onClick={() => confirm("Revogar credencial?") && act(() => api(`/api/admin/credentials/${r.id}/revoke`, { method: "POST" }))}>Revogar</button>}</td>}
        {kind === "bots" && <td><select className="input auto" value={r.license_status} onChange={(e) => act(() => api(`/api/admin/bots/${encodeURIComponent(r.bot_id)}`, { method: "PATCH", json: { license_status: e.target.value } }))}>
          <option value="active">Ativa</option><option value="suspended">Suspensa</option><option value="expired">Expirada</option></select></td>}
      </tr>)}</tbody></table></div>
    <Pager page={d.page} pageSize={d.pageSize} total={d.total} onChange={setPage} /></>}</Async>;
}

function NewCredential() {
  const [name, setName] = useState(""); const [bots, setBots] = useState("*"); const [secret, setSecret] = useState<string | null>(null);
  return <div className="card"><h3>Nova credencial</h3>
    <div className="filters"><input className="input" placeholder="Nome (ex.: bot-manager)" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder="IDs dos bots separados por vírgula, ou *" value={bots} onChange={(e) => setBots(e.target.value)} />
      <button className="btn solid" disabled={!name.trim()} onClick={async () => { try { const r = await api("/api/admin/credentials", { method: "POST", json: { name, bot_ids: bots.split(",").map((s) => s.trim()).filter(Boolean) } }); setSecret(r.secret); setName(""); } catch { alert("Dados inválidos."); } }}>Criar</button></div>
    {secret && <div className="state ok"><b>Guarde agora, não será exibido novamente:</b><code className="secret">{secret}</code><button className="btn sm" onClick={() => setSecret(null)}>Já guardei</button></div>}</div>;
}

function SettingsTab() {
  const pub = useApi<any>("/api/public/settings");
  const [msg, setMsg] = useState("");
  const [price, setPrice] = useState<any>(null), [faq, setFaq] = useState<any>(null), [site, setSite] = useState<any>(null);
  const save = async (key: string, value: unknown) => { try { await api(`/api/admin/settings/${key}`, { method: "PUT", json: value }); setMsg("Salvo."); pub.reload(); } catch { setMsg("Valores inválidos."); } };
  return <Async q={pub}>{(s) => { const p = price ?? s.price ?? { amount: 5, currency: "BRL", label: "R$ 5,00 por mês" };
    const f = faq ?? (s.faq ?? FAQ_DEFAULT); const si = site ?? s.site ?? { invite: "https://discord.gg/4ucJwmSgPR" };
    return <div className="grid2">
      <div className="card form"><h3>Preço exibido</h3>
        <label>Valor (número)<input className="input" type="number" step="0.01" value={p.amount} onChange={(e) => setPrice({ ...p, amount: Number(e.target.value) })} /></label>
        <label>Texto exibido<input className="input" value={p.label} onChange={(e) => setPrice({ ...p, label: e.target.value })} /></label>
        <button className="btn solid" onClick={() => save("price", p)}>Salvar preço</button></div>
      <div className="card form"><h3>Conteúdo comercial</h3>
        <label>Convite do Discord<input className="input" value={si.invite} onChange={(e) => setSite({ ...si, invite: e.target.value })} /></label>
        <label>Título da home<input className="input" value={si.hero_title ?? ""} onChange={(e) => setSite({ ...si, hero_title: e.target.value || undefined })} /></label>
        <label>Texto da home<textarea className="input" rows={3} value={si.hero_text ?? ""} onChange={(e) => setSite({ ...si, hero_text: e.target.value || undefined })} /></label>
        <button className="btn solid" onClick={() => save("site", si)}>Salvar conteúdo</button></div>
      <div className="card form span2"><h3>FAQ</h3>
        {f.map((it: any, i: number) => <div key={i} className="faqedit">
          <input className="input" value={it.q} onChange={(e) => setFaq(f.map((x: any, j: number) => j === i ? { ...x, q: e.target.value } : x))} />
          <textarea className="input" rows={2} value={it.a} onChange={(e) => setFaq(f.map((x: any, j: number) => j === i ? { ...x, a: e.target.value } : x))} />
          <button className="btn sm" onClick={() => setFaq(f.filter((_: any, j: number) => j !== i))}>Remover</button></div>)}
        <div className="row"><button className="btn sm" onClick={() => setFaq([...f, { q: "Nova pergunta", a: "Resposta" }])}>Adicionar</button>
          <button className="btn solid" onClick={() => save("faq", f)}>Salvar FAQ</button></div></div>
      {msg && <p>{msg}</p>}</div>; }}</Async>;
}

function NotAdmin() {
  const me = useApi<any>("/api/me");
  const id = me.data?.discord_id ?? "SEU_ID_DISCORD";
  return <div className="card form" style={{ maxWidth: 640 }}>
    <h2 style={{ margin: 0 }}>Esta conta ainda não é administradora</h2>
    <p className="muted">Para liberar o painel, rode este comando no SQL Editor do Supabase (as migrações 001 e 002 precisam ter sido aplicadas) e depois recarregue esta página.</p>
    <pre>{`insert into platform_admins (discord_id) values ('${id}');`}</pre>
    <small>Conta atual: {me.data ? `${me.data.global_name ?? me.data.username} (${id})` : "carregando…"}</small>
  </div>;
}

export function Admin() {
  const [tab, setTab] = useState<string>("overview");
  const ov = useApi<any>("/api/admin/overview"), st = useApi<any>("/api/admin/status");
  return <Dash>
    {ov.error?.status === 404 ? <NotAdmin /> : <>
    <h1>Administração</h1>
    <Async q={ov}>{(o) => <div className="kpis"><Kpi label="Usuários" value={o.users} /><Kpi label="Bots" value={o.bots} /><Kpi label="Compras" value={o.purchases} />
      <Kpi label="Vendas processadas" value={o.sales} /><Kpi label="Credenciais ativas" value={o.active_credentials} /><Kpi label="Erros da API (24h)" value={o.errors_24h} /></div>}</Async>
    {st.data && <p className="muted">Banco de dados: <Badge s={st.data.database === "ok" ? "ativa" : "suspended"} /> ({st.data.database_ms} ms) · Último evento da API: {dt(st.data.last_api_event_at)}</p>}
    <div className="tabs"><button className={tab === "overview" ? "on" : ""} onClick={() => setTab("overview")}>Resumo</button>
      {TABS.map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === "settings" ? <SettingsTab /> : tab === "overview" ? <div className="card"><h3>Por onde começar</h3><ul className="plain"><li>Credenciais: crie a chave que o Bot Manager usa para enviar compras e vendas.</li><li>Bots e Compras: confira quem já está vinculado a cada bot.</li><li>Eventos da API: veja o que o Manager enviou e se houve erro.</li><li>Configurações do site: preço, FAQ, convite e textos da home.</li></ul></div>
      : <>{tab === "credentials" && <NewCredential />}<ListTab key={tab} kind={tab} /></>}</>}
  </Dash>;
}