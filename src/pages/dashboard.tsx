import { useState } from "react";
import { INVITE } from "../content";
import { Dash } from "../ui/Shell";
import { api, brl, dt, useApi, ApiError } from "../ui/api";
import { Async, Badge, BarChart, Empty, Kpi, LineChart, Pager } from "../ui/kit";

const botHref = (id: string, tab = "visao-geral") => `/dashboard/bots/${encodeURIComponent(id)}/${tab}`;

function NoBots() {
  return <div className="empty"><h2>Você ainda não possui nenhum bot.</h2>
    <p>Seus bots adquiridos aparecerão aqui. Para adquirir o ZyraSallers, acesse nosso servidor oficial.</p>
    <a className="btn solid" href={INVITE} target="_blank" rel="noreferrer">Adquirir ZyraSallers</a></div>;
}

function BotCard({ b }: { b: any }) {
  return <div className="card bot">
    <div className="row">{b.avatar_url ? <img src={b.avatar_url} alt="" className="bav" /> : <span className="bav ph">{(b.name ?? "?")[0]}</span>}
      <div><h3>{b.name}</h3><small>ID interno: {b.bot_id}</small></div></div>
    <dl><dt>Adquirido em</dt><dd>{dt(b.acquired_at)}</dd><dt>Licença</dt><dd><Badge s={b.license_status} /></dd>
      <dt>Integração</dt><dd><Badge s={b.integration.status} /></dd></dl>
    <a className="btn solid" href={botHref(b.bot_id)}>Gerenciar</a></div>;
}

export function DashboardHome() {
  const q = useApi<any>("/api/dashboard/summary");
  return <Dash><Async q={q}>{(d) => !d.bots.length ? <NoBots /> : <>
    <h1>Painel</h1>
    <div className="kpis"><Kpi label="Bots vinculados" value={d.bots.length} />
      <Kpi label="Integrações ativas" value={d.bots.filter((b: any) => b.integration.status === "ativa").length} hint={`de ${d.bots.length}`} /></div>
    {d.bots.length === 1 && <a className="btn solid" href={botHref(d.bots[0].bot_id)}>Abrir painel de {d.bots[0].name}</a>}
    {d.alerts.map((a: any, i: number) => <div key={i} className={`state ${a.level === "erro" ? "err" : ""}`}>{a.text}</div>)}
    <h2>Seus bots</h2><div className="grid3">{d.bots.map((b: any) => <BotCard key={b.bot_id} b={b} />)}</div>
    <h2>Últimas vendas registradas</h2>
    {d.recent_sales.length ? <div className="tablewrap"><table><thead><tr><th>Data</th><th>Cliente</th><th>Produto</th><th>Bruto</th><th>Status</th></tr></thead>
      <tbody>{d.recent_sales.map((s: any) => <tr key={s.bot_id + s.sale_id}><td>{dt(s.sold_at)}</td><td>{s.customer_name ?? "—"}</td>
        <td>{s.product_name ?? "—"}</td><td>{brl(s.amount_gross)}</td><td><Badge s={s.status} /></td></tr>)}</tbody></table></div>
      : <Empty>Nenhuma venda registrada ainda.</Empty>}
    <h2>Atividade recente</h2>
    {d.activity.length ? <ul className="plain">{d.activity.map((e: any, i: number) =>
      <li key={i}>{dt(e.received_at)} — evento de {e.type === "sale" ? "venda" : "compra"} ({e.outcome === "error" ? "com erro" : "processado"})</li>)}</ul>
      : <Empty>Sem atividade recente.</Empty>}
  </>}</Async></Dash>;
}

export function DashboardBots() {
  const q = useApi<any>("/api/bots");
  return <Dash><h1>Meus bots</h1><Async q={q}>{(d) => d.bots.length
    ? <div className="grid3">{d.bots.map((b: any) => <BotCard key={b.bot_id} b={b} />)}</div> : <NoBots />}</Async></Dash>;
}

// ---------- Painel de um bot ----------
const PERIODS: Record<string, number | null> = { "7": 7, "30": 30, "90": 90, all: null };

function Overview({ botId }: { botId: string }) {
  const [per, setPer] = useState("30");
  const from = PERIODS[per] ? new Date(Date.now() - PERIODS[per]! * 864e5).toISOString() : "";
  const q = useApi<any>(`/api/bots/${encodeURIComponent(botId)}/stats${from ? `?from=${encodeURIComponent(from)}` : ""}`);
  return <>
    <div className="row between"><h1>Visão geral</h1>
      <select className="input w auto" value={per} onChange={(e) => setPer(e.target.value)}>
        <option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="all">Todo o período</option></select></div>
    <p className="muted">Receita, ticket médio e clientes consideram apenas vendas aprovadas.</p>
    <Async q={q}>{(s) => { const daily = s.daily.map((d: any) => ({ label: d.day.slice(5), gross: Number(d.gross ?? 0), sales: d.sales }));
      let acc = 0; const evo = daily.map((d: any) => ({ label: d.label, value: (acc += d.gross) }));
      const sc = s.status_counts ?? {};
      return <>
        <div className="kpis">
          <Kpi label="Faturamento bruto" value={brl(s.gross)} /><Kpi label="Total líquido informado" value={brl(s.net)} hint="Soma dos valores líquidos enviados" />
          <Kpi label="Vendas" value={s.sales} /><Kpi label="Ticket médio" value={brl(s.avg_ticket)} />
          <Kpi label="Clientes únicos" value={s.unique_customers} /><Kpi label="Última venda" value={dt(s.last_sale)} />
          <Kpi label="Hoje" value={`${s.today.sales} · ${brl(s.today.gross)}`} /><Kpi label="Últimos 7 dias" value={`${s.last7.sales} · ${brl(s.last7.gross)}`} />
          <Kpi label="Últimos 30 dias" value={`${s.last30.sales} · ${brl(s.last30.gross)}`} /><Kpi label="Todo o período" value={`${s.all.sales} · ${brl(s.all.gross)}`} /></div>
        <div className="grid2">
          <div className="card"><h3>Faturamento por dia</h3><BarChart data={daily.map((d: any) => ({ label: d.label, value: d.gross }))} fmt={brl} /></div>
          <div className="card"><h3>Vendas por dia</h3><BarChart data={daily.map((d: any) => ({ label: d.label, value: d.sales }))} /></div>
          <div className="card"><h3>Evolução do faturamento</h3><LineChart data={evo} fmt={brl} /></div>
          <div className="card"><h3>Status das vendas no período</h3>
            <ul className="plain"><li>Aprovadas: {sc.approved ?? 0}</li><li>Pendentes: {sc.pending ?? 0}</li><li>Canceladas: {sc.canceled ?? 0}</li><li>Reembolsadas: {sc.refunded ?? 0}</li></ul></div>
          <div className="card"><h3>Produtos mais vendidos</h3>{s.top_products.length ? <ul className="plain">{s.top_products.map((p: any) =>
            <li key={p.name}>{p.name} — {p.sales} vendas · {brl(p.gross)}</li>)}</ul> : <Empty>Nenhum produto enviado pela integração.</Empty>}</div>
          <div className="card"><h3>Clientes que mais compraram</h3>{s.top_customers.length ? <ul className="plain">{s.top_customers.map((c: any) =>
            <li key={c.discord_id}>{c.name ?? c.discord_id} — {c.purchases} compras · {brl(c.spent)}</li>)}</ul> : <Empty>Sem clientes identificados.</Empty>}</div>
        </div></>; }}</Async></>;
}

function Sales({ botId }: { botId: string }) {
  const init = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [f, setF] = useState({ q: init.get("q") ?? "", status: "", from: "", to: "", sort: "sold_at", dir: "desc", page: 1 });
  const qs = new URLSearchParams({ page: String(f.page), pageSize: "20", sort: f.sort, dir: f.dir });
  if (f.q) qs.set("q", f.q); if (f.status) qs.set("status", f.status);
  if (f.from) qs.set("from", new Date(f.from).toISOString()); if (f.to) qs.set("to", new Date(f.to + "T23:59:59").toISOString());
  const q = useApi<any>(`/api/bots/${encodeURIComponent(botId)}/sales?${qs}`);
  const th = (k: string, l: string) => <th className="sort" onClick={() => setF({ ...f, sort: k, dir: f.sort === k && f.dir === "desc" ? "asc" : "desc", page: 1 })}>{l}{f.sort === k ? (f.dir === "desc" ? " ↓" : " ↑") : ""}</th>;
  return <><h1>Vendas</h1>
    <div className="filters"><input className="input" placeholder="Cliente, ID Discord, produto ou ID da venda" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value, page: 1 })} />
      <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })}>
        <option value="">Todos os status</option><option value="approved">Aprovadas</option><option value="pending">Pendentes</option><option value="canceled">Canceladas</option><option value="refunded">Reembolsadas</option></select>
      <input className="input" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, page: 1 })} />
      <input className="input" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value, page: 1 })} /></div>
    <Async q={q}>{(d) => !d.items.length ? <Empty>Nenhuma venda encontrada.</Empty> : <>
      <div className="tablewrap"><table><thead><tr>{th("sold_at", "Data e hora")}{th("customer_name", "Cliente")}<th>ID Discord</th><th>Produto</th>
        {th("amount_gross", "Bruto")}<th>Taxas</th>{th("amount_net", "Líquido")}{th("status", "Status")}<th>ID da venda</th></tr></thead>
        <tbody>{d.items.map((s: any) => <tr key={s.sale_id}><td>{dt(s.sold_at)}</td><td>{s.customer_name ?? "—"}</td><td>{s.customer_discord_id ?? "—"}</td>
          <td>{s.product_name ?? "—"}</td><td>{brl(s.amount_gross)}</td><td>{brl(s.fees)}</td><td>{brl(s.amount_net)}</td><td><Badge s={s.status} /></td><td><code>{s.sale_id}</code></td></tr>)}</tbody></table></div>
      <Pager page={d.page} pageSize={d.pageSize} total={d.total} onChange={(page) => setF({ ...f, page })} /></>}</Async></>;
}

function Clients({ botId }: { botId: string }) {
  const [q0, setQ] = useState(""); const [page, setPage] = useState(1);
  const q = useApi<any>(`/api/bots/${encodeURIComponent(botId)}/customers?page=${page}&pageSize=20&q=${encodeURIComponent(q0)}`);
  return <><h1>Meus Clientes</h1>
    <input className="input" placeholder="Pesquisar por nome ou ID Discord" value={q0} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
    <Async q={q}>{(d) => !d.items.length ? <Empty>Nenhum cliente encontrado.</Empty> : <>
      <div className="tablewrap"><table><thead><tr><th>Cliente</th><th>ID Discord</th><th>Primeira compra</th><th>Última compra</th><th>Compras</th><th>Total gasto</th><th>Produtos</th><th /></tr></thead>
        <tbody>{d.items.map((c: any) => <tr key={c.k}><td>{c.name ?? "—"}</td><td>{c.did ?? "—"}</td><td>{dt(c.first_at)}</td><td>{dt(c.last_at)}</td>
          <td>{c.purchases}</td><td>{brl(c.spent)}</td><td>{c.products?.join(", ") || "—"}</td>
          <td>{c.did && <a href={`${botHref(botId, "vendas")}?q=${c.did}`}>Histórico</a>}</td></tr>)}</tbody></table></div>
      <Pager page={d.page} pageSize={d.pageSize} total={d.total} onChange={setPage} /></>}</Async></>;
}

const SAMPLE_SALE = `{
  "event_id": "evt_venda_001",
  "bot_id": "SEU_BOT_ID",
  "sale_id": "venda_001",
  "customer": { "discord_user_id": "123456789012345678", "name": "Cliente" },
  "product": { "id": "produto_001", "name": "Produto vendido" },
  "amount_gross": 20.00, "fees": 1.00, "amount_net": 19.00,
  "currency": "BRL", "status": "approved",
  "sold_at": "2026-10-29T12:30:00Z"
}`;

function Integration({ botId }: { botId: string }) {
  const q = useApi<any>(`/api/bots/${encodeURIComponent(botId)}/integration`);
  const [name, setName] = useState(""); const [secret, setSecret] = useState<string | null>(null); const [err, setErr] = useState("");
  const act = async (fn: () => Promise<any>) => { setErr(""); try { const r = await fn(); if (r?.secret) setSecret(r.secret); q.reload(); }
    catch (e) { setErr((e as ApiError).code === "credential_limit" ? "Limite de 5 credenciais ativas atingido." : "Não foi possível concluir a ação."); } };
  const base = `/api/bots/${encodeURIComponent(botId)}/credentials`;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return <><h1>API e integração</h1><Async q={q}>{(d) => <>
    <div className="kpis"><Kpi label="Status" value={<Badge s={d.status} />} /><Kpi label="Última requisição" value={dt(d.last_request_at)} />
      <Kpi label="Último evento" value={d.last_event_id ?? "—"} /><Kpi label="Vendas recebidas" value={d.sales_received} /><Kpi label="Eventos processados" value={d.events_processed} /></div>
    {d.status === "aguardando" && <div className="state">Configuração pendente: nenhum evento recebido ainda. A integração só aparece como ativa após o Bot Manager enviar um evento real.</div>}
    <h2>Erros recentes</h2>{d.recent_errors.length ? <ul className="plain">{d.recent_errors.map((e: any, i: number) => <li key={i}>{dt(e.received_at)} — {e.type}: {e.error}</li>)}</ul> : <Empty>Nenhum erro recente.</Empty>}
    <h2>Credenciais de API</h2>
    {secret && <div className="state ok"><b>Guarde agora, este segredo não será exibido novamente:</b><code className="secret">{secret}</code>
      <button className="btn sm" onClick={() => setSecret(null)}>Já guardei</button></div>}
    {err && <div className="state err">{err}</div>}
    <div className="filters"><input className="input" placeholder="Nome da credencial" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn solid" disabled={!name.trim()} onClick={() => act(async () => { const r = await api(base, { method: "POST", json: { name } }); setName(""); return r; })}>Criar credencial</button></div>
    <div className="tablewrap"><table><thead><tr><th>Nome</th><th>Prefixo</th><th>Criada</th><th>Último uso</th><th>Estado</th><th /></tr></thead><tbody>
      {d.credentials.map((c: any) => <tr key={c.id}><td>{c.name}</td><td><code>{c.key_prefix}…</code></td><td>{dt(c.created_at)}</td><td>{dt(c.last_used_at)}</td>
        <td>{c.revoked_at ? "Revogada" : "Ativa"}</td><td>{!c.revoked_at && <>
          <button className="btn sm" onClick={() => confirm("Gerar novo segredo e revogar o atual?") && act(() => api(`${base}/${c.id}/rotate`, { method: "POST" }))}>Rotacionar</button>{" "}
          <button className="btn sm" onClick={() => confirm("Revogar esta credencial?") && act(() => api(`${base}/${c.id}`, { method: "DELETE" }))}>Revogar</button></>}</td></tr>)}
      {!d.credentials.length && <tr><td colSpan={6}>Nenhuma credencial exclusiva deste bot.</td></tr>}</tbody></table></div>
    <h2>Como configurar o Bot Manager</h2>
    <p>Envie eventos com o cabeçalho <code>Authorization: Bearer SEU_SEGREDO</code>. Cada <code>event_id</code> deve ser único; reenviar o mesmo evento é seguro.</p>
    <ul className="plain"><li><code>POST {origin}/api/v1/apps/purchases</code> — registra compra/propriedade</li><li><code>POST {origin}/api/v1/apps/sales</code> — registra venda</li>
      <li><code>PATCH {origin}/api/v1/apps/sales/:saleId?bot_id=…</code> — atualiza status</li><li><code>GET {origin}/api/v1/apps/:botId/sales | stats | customers</code></li></ul>
    <pre>{SAMPLE_SALE.replace("SEU_BOT_ID", botId)}</pre></>}</Async></>;
}

function Settings({ botId }: { botId: string }) {
  const q = useApi<any>(`/api/bots/${encodeURIComponent(botId)}`);
  const [f, setF] = useState<any>(null); const [msg, setMsg] = useState("");
  return <><h1>Configurações</h1><Async q={q}>{(b) => { const v = f ?? { name: b.name, avatar_url: b.avatar_url ?? "" };
    return <div className="card form"><label>Nome de exibição<input className="input" value={v.name} onChange={(e) => setF({ ...v, name: e.target.value })} /></label>
      <label>URL do avatar (https)<input className="input" value={v.avatar_url} onChange={(e) => setF({ ...v, avatar_url: e.target.value })} /></label>
      <button className="btn solid" onClick={async () => { try { await api(`/api/bots/${encodeURIComponent(botId)}`, { method: "PATCH", json: { name: v.name, avatar_url: v.avatar_url || null } }); setMsg("Salvo."); q.reload(); }
        catch { setMsg("Não foi possível salvar. Verifique os campos."); } }}>Salvar</button>{msg && <p>{msg}</p>}
      <small>Licença: <Badge s={b.license_status} /> · ID interno: {b.bot_id}</small></div>; }}</Async></>;
}

export function BotPage({ botId, tab }: { botId: string; tab: "visao-geral" | "clientes" | "vendas" | "integracao" | "configuracoes" }) {
  const info = useApi<any>(`/api/bots/${encodeURIComponent(botId)}`);
  return <Dash bot={{ id: botId, name: info.data?.name }}>
    {info.error?.status === 404 ? <div className="empty"><h2>Bot não encontrado</h2><p>Ele não existe ou não está vinculado à sua conta.</p><a className="btn" href="/dashboard/bots">Voltar</a></div> :
      tab === "visao-geral" ? <Overview botId={botId} /> : tab === "clientes" ? <Clients botId={botId} /> :
      tab === "vendas" ? <Sales botId={botId} /> : tab === "integracao" ? <Integration botId={botId} /> : <Settings botId={botId} />}
  </Dash>;
}
