import { useState } from "react";
import { Dash } from "../ui/Shell";
import { api, brl, dt, useApi } from "../ui/api";
import { Async, Badge, Empty, Kpi, Pager } from "../ui/kit";
import { FAQ_DEFAULT } from "../content";

type Note = { ok: boolean; t: string } | null;
type Notify = (n: Note) => void;

const TABS = [["users", "Usuários"], ["bots", "Bots"], ["purchases", "Compras"], ["sales", "Vendas"], ["events", "Eventos da API"],
  ["credentials", "Credenciais"], ["audit", "Auditoria"], ["settings", "Site"]] as const;

// Colunas de cada lista: o painel mostra nomes legíveis em vez dos nomes do banco.
type Kind = "text" | "date" | "brl" | "badge" | "code" | "list" | "json";
type Col = { k: string; label: string; kind?: Kind; num?: boolean };
const COLS: Record<string, Col[]> = {
  users: [{ k: "username", label: "Usuário" }, { k: "global_name", label: "Nome" }, { k: "discord_id", label: "ID Discord", kind: "code" },
    { k: "first_seen_at", label: "Primeiro acesso", kind: "date" }, { k: "last_seen_at", label: "Último acesso", kind: "date" }],
  bots: [{ k: "name", label: "Bot" }, { k: "bot_id", label: "ID do bot", kind: "code" }, { k: "license_status", label: "Licença", kind: "badge" },
    { k: "created_at", label: "Criado em", kind: "date" }],
  purchases: [{ k: "purchased_at", label: "Data", kind: "date" }, { k: "bot_id", label: "Bot", kind: "code" }, { k: "discord_user_id", label: "Comprador (ID Discord)", kind: "code" },
    { k: "status", label: "Status", kind: "badge" }, { k: "purchase_id", label: "ID da compra", kind: "code" }],
  sales: [{ k: "sold_at", label: "Data da venda", kind: "date" }, { k: "bot_id", label: "Bot", kind: "code" }, { k: "customer_name", label: "Cliente" }, { k: "product_name", label: "Produto" },
    { k: "amount_gross", label: "Bruto", kind: "brl", num: true }, { k: "amount_net", label: "Líquido", kind: "brl", num: true }, { k: "status", label: "Status", kind: "badge" },
    { k: "sale_id", label: "ID da venda", kind: "code" }],
  events: [{ k: "received_at", label: "Recebido em", kind: "date" }, { k: "type", label: "Tipo" }, { k: "bot_id", label: "Bot", kind: "code" },
    { k: "outcome", label: "Resultado", kind: "badge" }, { k: "error", label: "Erro" }, { k: "event_id", label: "ID do evento", kind: "code" }],
  credentials: [{ k: "name", label: "Nome" }, { k: "key_prefix", label: "Prefixo", kind: "code" }, { k: "bot_ids", label: "Bots liberados", kind: "list" },
    { k: "created_at", label: "Criada em", kind: "date" }, { k: "last_used_at", label: "Último uso", kind: "date" }, { k: "revoked_at", label: "Situação", kind: "badge" }],
  audit: [{ k: "created_at", label: "Data", kind: "date" }, { k: "actor", label: "Quem", kind: "code" }, { k: "action", label: "Ação" }, { k: "target", label: "Alvo" }, { k: "meta", label: "Detalhes", kind: "json" }],
};
const TYPE_LABEL: Record<string, string> = { sale: "Venda", purchase: "Compra" };

function Cell({ c, r }: { c: Col; r: any }) {
  const v = r[c.k];
  if (c.k === "revoked_at") return <Badge s={v ? "revoked" : "active"} />;
  if (c.kind === "badge") return v ? <Badge s={String(v)} /> : <>—</>;
  if (v == null || v === "") return <>—</>;
  if (c.kind === "date") return <>{dt(v)}</>;
  if (c.kind === "brl") return <>{brl(v)}</>;
  if (c.kind === "code") return <code>{String(v)}</code>;
  if (c.kind === "list") return <>{Array.isArray(v) ? (v.includes("*") ? "Todos os bots" : v.join(", ")) : String(v)}</>;
  if (c.kind === "json") { const s = JSON.stringify(v); return <span title={s}>{s}</span>; }
  if (c.k === "type") return <>{TYPE_LABEL[v] ?? String(v)}</>;
  return <>{String(v)}</>;
}

function ListTab({ kind, notify }: { kind: string; notify: Notify }) {
  const [page, setPage] = useState(1);
  const q = useApi<any>(`/api/admin/list/${kind}?page=${page}&pageSize=25`);
  const cols = COLS[kind] ?? [];
  const act = async (fn: () => Promise<any>, ok: string) => {
    try { await fn(); notify({ ok: true, t: ok }); } catch { notify({ ok: false, t: "Não foi possível executar a ação. Tente de novo." }); }
    q.reload();
  };
  return <Async q={q}>{(d) => !d.items.length ? <Empty>Nenhum registro nesta lista ainda.</Empty> : <>
    <div className="tablewrap"><table className="rt"><thead><tr>
      {cols.map((c) => <th key={c.k} className={c.num ? "num" : ""}>{c.label}</th>)}
      {(kind === "credentials" || kind === "bots") && <th className="num">Ações</th>}</tr></thead>
      <tbody>{d.items.map((r: any, i: number) => <tr key={r.id ?? r.bot_id ?? r.sale_id ?? r.purchase_id ?? r.event_id ?? i}>
        {cols.map((c) => <td key={c.k} data-label={c.label}
          className={[c.num ? "num" : "", c.kind === "date" ? "nowrap" : "", c.kind === "json" || c.k === "error" ? "clip" : ""].join(" ").trim()}><Cell c={c} r={r} /></td>)}
        {kind === "credentials" && <td className="act">{!r.revoked_at && <button className="btn sm danger"
          onClick={() => confirm(`Revogar a credencial "${r.name}"? Quem usa essa chave perde o acesso na hora.`) && act(() => api(`/api/admin/credentials/${r.id}/revoke`, { method: "POST" }), "Credencial revogada.")}>Revogar</button>}</td>}
        {kind === "bots" && <td className="act"><select className="input auto" aria-label={`Licença de ${r.name}`} value={r.license_status}
          onChange={(e) => act(() => api(`/api/admin/bots/${encodeURIComponent(r.bot_id)}`, { method: "PATCH", json: { license_status: e.target.value } }), "Licença atualizada.")}>
          <option value="active">Ativa</option><option value="suspended">Suspensa</option><option value="expired">Expirada</option></select></td>}
      </tr>)}</tbody></table></div>
    <Pager page={d.page} pageSize={d.pageSize} total={d.total} onChange={setPage} /></>}</Async>;
}

function NewCredential({ notify }: { notify: Notify }) {
  const [name, setName] = useState(""); const [bots, setBots] = useState("*"); const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [copied, setCopied] = useState(false);
  const create = async () => {
    setBusy(true); notify(null);
    try {
      const ids = bots.split(",").map((s) => s.trim()).filter(Boolean);
      const r = await api("/api/admin/credentials", { method: "POST", json: { name: name.trim(), bot_ids: ids } });
      setSecret(r.secret); setName(""); setCopied(false);
    } catch { notify({ ok: false, t: "Confira o nome (até 60 caracteres) e os IDs dos bots." }); } finally { setBusy(false); }
  };
  return <div className="card form"><h3>Nova credencial</h3>
    <p className="muted">A credencial é a chave que o Bot Manager usa para enviar compras e vendas. Use <code>*</code> para liberar todos os bots.</p>
    <div className="filters" style={{ margin: 0 }}>
      <label>Nome<input className="input" placeholder="ex.: bot-manager" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
      <label>Bots liberados<input className="input" placeholder="IDs separados por vírgula, ou *" value={bots} onChange={(e) => setBots(e.target.value)} /></label>
    </div>
    <div><button className="btn solid" disabled={!name.trim() || !bots.trim() || busy} onClick={create}>{busy ? "Criando…" : "Criar credencial"}</button></div>
    {secret && <div className="state ok"><b>Guarde esta chave agora. Ela não será exibida novamente.</b>
      <code className="secret">{secret}</code>
      <div className="row"><button className="btn sm" onClick={() => { navigator.clipboard?.writeText(secret).then(() => setCopied(true)).catch(() => {}); }}>{copied ? "Copiada" : "Copiar"}</button>
        <button className="btn sm" onClick={() => setSecret(null)}>Já guardei</button></div></div>}</div>;
}

function SettingsTab({ notify }: { notify: Notify }) {
  const pub = useApi<any>("/api/public/settings");
  const [price, setPrice] = useState<any>(null), [faq, setFaq] = useState<any>(null), [site, setSite] = useState<any>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const save = async (key: string, value: unknown, label: string) => {
    setSaving(key); notify(null);
    try { await api(`/api/admin/settings/${key}`, { method: "PUT", json: value }); notify({ ok: true, t: `${label} salvo.` }); pub.reload(); }
    catch { notify({ ok: false, t: key === "site" ? "Confira o convite: ele precisa começar com https://discord.gg/." : "Os valores informados são inválidos." }); }
    finally { setSaving(null); }
  };
  return <Async q={pub}>{(s) => { const p = price ?? s.price ?? { amount: 5, currency: "BRL", label: "R$ 5,00 por mês" };
    const f = faq ?? (s.faq ?? FAQ_DEFAULT); const si = site ?? s.site ?? { invite: "https://discord.gg/4ucJwmSgPR" };
    return <div className="grid2" style={{ marginTop: 0, alignItems: "start" }}>
      <div className="card form"><h3>Preço exibido</h3>
        <label>Valor (número)<input className="input" type="number" step="0.01" min="0" value={p.amount} onChange={(e) => setPrice({ ...p, amount: Number(e.target.value) })} /></label>
        <label>Texto exibido<input className="input" value={p.label} maxLength={60} onChange={(e) => setPrice({ ...p, label: e.target.value })} /></label>
        <div><button className="btn solid" disabled={saving === "price"} onClick={() => save("price", p, "Preço")}>{saving === "price" ? "Salvando…" : "Salvar preço"}</button></div></div>
      <div className="card form"><h3>Conteúdo comercial</h3>
        <label>Convite do Discord<input className="input" value={si.invite} onChange={(e) => setSite({ ...si, invite: e.target.value })} /><small>Precisa começar com https://discord.gg/</small></label>
        <label>Título da home<input className="input" value={si.hero_title ?? ""} maxLength={120} onChange={(e) => setSite({ ...si, hero_title: e.target.value || undefined })} /></label>
        <label>Texto da home<textarea className="input" rows={3} value={si.hero_text ?? ""} maxLength={400} onChange={(e) => setSite({ ...si, hero_text: e.target.value || undefined })} /></label>
        <div><button className="btn solid" disabled={saving === "site"} onClick={() => save("site", si, "Conteúdo")}>{saving === "site" ? "Salvando…" : "Salvar conteúdo"}</button></div></div>
      <div className="card form span2"><h3>Perguntas frequentes</h3>
        {f.map((it: any, i: number) => <div key={i} className="faqedit">
          <input className="input" aria-label={`Pergunta ${i + 1}`} value={it.q} onChange={(e) => setFaq(f.map((x: any, j: number) => j === i ? { ...x, q: e.target.value } : x))} />
          <textarea className="input" aria-label={`Resposta ${i + 1}`} rows={2} value={it.a} onChange={(e) => setFaq(f.map((x: any, j: number) => j === i ? { ...x, a: e.target.value } : x))} />
          <button className="btn sm danger" onClick={() => setFaq(f.filter((_: any, j: number) => j !== i))}>Remover</button></div>)}
        <div className="row wrapx"><button className="btn sm" onClick={() => setFaq([...f, { q: "Nova pergunta", a: "Resposta" }])}>Adicionar pergunta</button>
          <button className="btn solid" disabled={saving === "faq"} onClick={() => save("faq", f, "FAQ")}>{saving === "faq" ? "Salvando…" : "Salvar FAQ"}</button></div></div>
    </div>; }}</Async>;
}

function SeedButton({ notify }: { notify: Notify }) {
  const [busy, setBusy] = useState(false);
  return <button className="btn" disabled={busy} onClick={async () => { setBusy(true); notify(null);
    try { const r = await api("/api/admin/test-sales", { method: "POST" }); notify({ ok: true, t: r.created ? `${r.created} vendas de exemplo criadas no Bot Teste.` : "O Bot Teste já tem as vendas de exemplo." }); }
    catch { notify({ ok: false, t: "Não foi possível gerar as vendas de exemplo." }); } finally { setBusy(false); } }}>
    {busy ? "Gerando…" : "Gerar vendas de exemplo"}</button>;
}

function NotAdmin() {
  const me = useApi<any>("/api/me");
  const id = me.data?.discord_id ?? "SEU_ID_DISCORD";
  return <div className="card form" style={{ maxWidth: 640 }}>
    <h2 style={{ margin: 0 }}>Esta conta ainda não é administradora</h2>
    <p className="muted">Para liberar o painel, rode este comando no SQL Editor do Supabase (as migrações 001 e 002 precisam ter sido aplicadas) e depois recarregue esta página.</p>
    <pre>{`insert into platform_admins (discord_id) values ('${id}');`}</pre>
    <small className="muted">Conta atual: {me.data ? `${me.data.global_name ?? me.data.username} (${id})` : "carregando…"}</small>
  </div>;
}

export function Admin() {
  const [tab, setTab] = useState<string>("overview");
  const [note, setNote] = useState<Note>(null);
  const ov = useApi<any>("/api/admin/overview"), st = useApi<any>("/api/admin/status");
  const go = (k: string) => { setTab(k); setNote(null); };
  return <Dash>
    {ov.error?.status === 404 ? <NotAdmin /> : <>
    <div className="row between"><div><h1>Administração</h1>
      {st.data && <p className="muted">Banco de dados <Badge s={st.data.database === "ok" ? "ativa" : "suspended"} /> {st.data.database_ms} ms · último evento da API: {dt(st.data.last_api_event_at)}</p>}</div>
      <div className="row wrapx"><SeedButton notify={setNote} /><a className="btn solid" href="/dashboard/bots/bot_teste/visao-geral">Abrir Bot Teste</a></div></div>
    <Async q={ov}>{(o) => <div className="kpis compact"><Kpi label="Usuários" value={o.users} /><Kpi label="Bots" value={o.bots} /><Kpi label="Compras" value={o.purchases} />
      <Kpi label="Vendas processadas" value={o.sales} /><Kpi label="Credenciais ativas" value={o.active_credentials} /><Kpi label="Erros da API (24h)" value={o.errors_24h} /></div>}</Async>
    <div className="tabs" role="tablist"><button role="tab" aria-selected={tab === "overview"} className={tab === "overview" ? "on" : ""} onClick={() => go("overview")}>Resumo</button>
      {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => go(k)}>{l}</button>)}</div>
    {note && <div className={`state ${note.ok ? "ok" : "err"}`} role="status">{note.t}</div>}
    {tab === "settings" ? <SettingsTab notify={setNote} /> : tab === "overview" ? <div className="card"><h3>Por onde começar</h3><ul className="plain">
        <li><span><b>Credenciais</b>: crie a chave que o Bot Manager usa para enviar compras e vendas.</span></li>
        <li><span><b>Bots</b> e <b>Compras</b>: confira quem já está vinculado a cada bot e ajuste a licença.</span></li>
        <li><span><b>Eventos da API</b>: veja o que o Manager enviou e se houve erro.</span></li>
        <li><span><b>Site</b>: preço, FAQ, convite e textos da home.</span></li></ul></div>
      : <>{tab === "credentials" && <NewCredential notify={setNote} />}<ListTab key={tab} kind={tab} notify={setNote} /></>}</>}
  </Dash>;
}
