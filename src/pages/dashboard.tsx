import { useEffect, useMemo, useState } from "react";
import { INVITE } from "../content";
import { Dash } from "../ui/Shell";
import { api, brl, dt, useApi, ApiError } from "../ui/api";
import { Async, Avatar, Badge, Empty, Kpi, Pager, TrendChart } from "../ui/kit";
import { Products } from "./products";

const botHref = (id: string, tab = "visao-geral") => `/dashboard/bots/${encodeURIComponent(id)}/${tab}`;

function NoBots() {
  return <div className="empty"><h2>Você ainda não possui nenhum bot.</h2>
    <p>Seus bots adquiridos aparecerão aqui. Para adquirir o ZyraSallers, acesse nosso servidor oficial.</p>
    <a className="btn solid" href={INVITE} target="_blank" rel="noreferrer">Adquirir ZyraSallers</a></div>;
}

function BotCard({ b }: { b: any }) {
  return <a className="card bot clickable" href={botHref(b.bot_id)}>
    <div className="row">{b.avatar_url ? <img src={b.avatar_url} alt="" className="bav" /> : <span className="bav ph">{(b.name ?? "?")[0]}</span>}
      <div><h3>{b.name}</h3><small>ID interno: {b.bot_id}</small></div></div>
    {b.owners && <p className="owners">Dono: {b.owners.length ? b.owners.map((o: any) => o.name).join(", ") : "sem dono vinculado"}</p>}
    <dl><dt>Adquirido em</dt><dd>{dt(b.acquired_at)}</dd><dt>Licença</dt><dd><Badge s={b.license_status} /></dd>
      <dt>Integração</dt><dd><Badge s={b.integration.status} /></dd></dl>
    <span className="btn solid">Gerenciar</span></a>;
}

export function DashboardHome() {
  const q = useApi<any>("/api/dashboard/summary");
  return <Dash><Async q={q}>{(d) => !d.bots.length ? <NoBots /> : <>
    <h1>Painel</h1>
    <div className="kpis"><Kpi label="Bots vinculados" value={d.bots.length} />
      <Kpi label="Integrações ativas" value={d.bots.filter((b: any) => b.integration.status === "ativa").length} hint={`de ${d.bots.length}`} /></div>
    {d.bots.length === 1 && <a className="btn solid" href={botHref(d.bots[0].bot_id)}>Abrir painel de {d.bots[0].name}</a>}
    {d.alerts.map((a: any, i: number) => <div key={i} className={`state ${a.level === "erro" ? "err" : ""}`}>{a.text.replace(" suspended", " suspensa").replace(" expired", " expirada")}</div>)}
    <h2>Seus bots</h2><div className="grid3">{d.bots.map((b: any) => <BotCard key={b.bot_id} b={b} />)}</div>
  </>}</Async></Dash>;
}

export function DashboardBots() {
  const me = useApi<any>("/api/me");
  const [all, setAll] = useState(false);
  const [term, setTerm] = useState("");
  const isAdm = !!me.data?.is_admin;
  const q = useApi<any>(all && isAdm ? "/api/bots?all=1" : "/api/bots");
  const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const match = (b: any) => { const t = norm(term.trim()); if (!t) return true;
    return norm(`${b.name ?? ""} ${b.bot_id} ${(b.owners ?? []).map((o: any) => `${o.name} ${o.discord_id}`).join(" ")}`).includes(t); };
  return <Dash><div className="row between"><div><h1>{all && isAdm ? "Todos os bots" : "Meus bots"}</h1>
      {all && isAdm && <p className="muted">Como administrador, você vê os bots de todos os clientes e pode abrir o painel de qualquer um. Alterações feitas neles ficam na auditoria.</p>}</div>
    {isAdm && <div className="seg" role="group" aria-label="Quais bots mostrar">
      <button className={!all ? "on" : ""} aria-pressed={!all} onClick={() => setAll(false)}>Meus bots</button>
      <button className={all ? "on" : ""} aria-pressed={all} onClick={() => setAll(true)}>Todos os bots</button></div>}</div>
    {all && isAdm && <input className="input" style={{ margin: "18px 0" }} aria-label="Buscar bots" placeholder="Buscar por nome do bot, ID ou dono" value={term} onChange={(e) => setTerm(e.target.value)} />}
    <Async q={q}>{(d) => { const list = d.bots.filter(match);
      return d.bots.length ? (list.length ? <div className="grid3" style={{ marginTop: all ? 0 : 20 }}>{list.map((b: any) => <BotCard key={b.bot_id} b={b} />)}</div> : <Empty>Nenhum bot encontrado para essa busca.</Empty>)
        : <NoBots />; }}</Async></Dash>;
}

// ---------- Painel de um bot ----------
const PERIODS: Record<string, number | null> = { "7": 7, "30": 30, "90": 90, all: null };

const DAY = 864e5;
const spDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD no fuso de Brasília
const addDays = (iso: string, n: number) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const R = (n: unknown) => brl(Number(n ?? 0));
const ago = (s?: string | null) => { if (!s) return null; const m = Math.round((Date.now() - Date.parse(s)) / 60000);
  if (m < 1) return "há instantes"; if (m < 60) return `há ${m} min`; const h = Math.round(m / 60); if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24); return d === 1 ? "ontem" : `há ${d} dias`; };

/** Completa os dias sem venda com zero: sem isso o gráfico escondia os dias parados e parecia ter mais vendas do que teve. */
function fillDays(daily: any[], per: number | null) {
  const map = new Map<string, any>(daily.map((d) => [String(d.day).slice(0, 10), d]));
  const today = spDay(new Date());
  let start = per ? addDays(today, -(per - 1)) : daily.length ? String(daily[0].day).slice(0, 10) : addDays(today, -29);
  if (start < addDays(today, -365)) start = addDays(today, -365);
  const out: { day: string; label: string; revenue: number; sales: number }[] = [];
  for (let d = start; d <= today && out.length < 400; d = addDays(d, 1)) {
    const r = map.get(d); out.push({ day: d, label: dm(d), revenue: Number(r?.revenue ?? 0), sales: Number(r?.sales ?? 0) });
  }
  return out;
}

function Delta({ cur, prev }: { cur: number; prev?: number }) {
  if (prev === undefined || (!cur && !prev)) return null;
  if (!prev) return <span className="delta up">Novo</span>;
  const p = ((cur - prev) / prev) * 100;
  if (Math.abs(p) < 0.5) return <span className="delta">Igual ao anterior</span>;
  return <span className={`delta ${p > 0 ? "up" : "down"}`}>{p > 0 ? "▲" : "▼"} {Math.abs(p).toLocaleString("pt-BR", { maximumFractionDigits: p > 99 ? 0 : 1 })}%</span>;
}

const STATUS_PARTS: [string, string, string][] = [["approved", "Aprovadas", "#4ade80"], ["pending", "Pendentes", "#fbbf24"], ["canceled", "Canceladas", "#f87171"], ["refunded", "Reembolsadas", "#71717a"]];

function Overview({ botId }: { botId: string }) {
  const [per, setPer] = useState("30");
  const [mode, setMode] = useState<"revenue" | "sales" | "acc">("revenue");
  const enc = encodeURIComponent(botId), n = PERIODS[per];
  // datas calculadas só quando o período muda (antes mudavam a cada render e a tela recarregava sem parar)
  const { curQ, prevQ } = useMemo(() => {
    const now = Date.now();
    return n ? { curQ: `?from=${encodeURIComponent(new Date(now - n * DAY).toISOString())}`,
      prevQ: `?from=${encodeURIComponent(new Date(now - 2 * n * DAY).toISOString())}&to=${encodeURIComponent(new Date(now - n * DAY).toISOString())}` } : { curQ: "", prevQ: null };
  }, [per]);
  const q = useApi<any>(`/api/bots/${enc}/stats${curQ}`);
  const pq = useApi<any>(prevQ === null ? null : `/api/bots/${enc}/stats${prevQ}`);
  const recent = useApi<any>(`/api/bots/${enc}/sales?page=1&pageSize=6`);
  const pv = prevQ === null ? undefined : pq.data; // período anterior (some quando "Tudo")
  const label = per === "all" ? "todo o período" : `últimos ${n} dias`;

  return <>
    <div className="row between"><div><h1>Visão geral</h1>
      <p className="muted">{q.data?.last_sale ? `Última venda ${ago(q.data.last_sale)}.` : "Resultado do bot por período."} Receita, ticket e clientes contam só vendas aprovadas.</p></div>
      <div className="seg" role="group" aria-label="Período">{[["7", "7 dias"], ["30", "30 dias"], ["90", "90 dias"], ["all", "Tudo"]].map(([k, l]) =>
        <button key={k} className={per === k ? "on" : ""} aria-pressed={per === k} onClick={() => setPer(k)}>{l}</button>)}</div></div>

    <Async q={q}>{(s) => {
      const days = fillDays(s.daily ?? [], n);
      let acc = 0;
      const series = days.map((d) => ({ label: d.label, full: new Date(d.day + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" }),
        value: mode === "sales" ? d.sales : mode === "acc" ? (acc += d.revenue) : d.revenue }));
      const total = mode === "sales" ? s.sales : s.revenue;
      const sc = s.status_counts ?? {}; const sTotal = STATUS_PARTS.reduce((t, [k]) => t + Number(sc[k] ?? 0), 0);
      const topP = Math.max(...(s.top_products ?? []).map((p: any) => Number(p.revenue ?? 0)), 1);
      const topC = Math.max(...(s.top_customers ?? []).map((c: any) => Number(c.revenue ?? 0)), 1);
      if (!Number(s.all?.sales) && !sTotal) return <div className="empty card"><h2>Ainda não há vendas neste bot</h2>
        <p>Assim que o Bot Manager enviar a primeira venda aprovada, o faturamento, os gráficos e os rankings aparecem aqui.</p>
        <a className="btn" href={botHref(botId, "configuracoes")}>Ver configurações do bot</a></div>;
      return <>
        <div className="kpis four">
          <Kpi label="Faturamento" value={R(s.revenue)} hint={s.gross != null ? `Bruto ${R(s.gross)}` : undefined} extra={<Delta cur={Number(s.revenue ?? 0)} prev={pv ? Number(pv.revenue ?? 0) : undefined} />} />
          <Kpi label="Vendas aprovadas" value={s.sales ?? 0} extra={<Delta cur={Number(s.sales ?? 0)} prev={pv ? Number(pv.sales ?? 0) : undefined} />} />
          <Kpi label="Ticket médio" value={R(s.avg_ticket)} extra={<Delta cur={Number(s.avg_ticket ?? 0)} prev={pv ? Number(pv.avg_ticket ?? 0) : undefined} />} />
          <Kpi label="Clientes únicos" value={s.unique_customers ?? 0} extra={<Delta cur={Number(s.unique_customers ?? 0)} prev={pv ? Number(pv.unique_customers ?? 0) : undefined} />} /></div>
        {per !== "all" && <p className="muted vs">As variações comparam com os {n} dias anteriores.</p>}

        <div className="ov-main">
          <div className="card">
            <div className="row between"><div><span className="cap">{mode === "sales" ? "Vendas" : mode === "acc" ? "Faturamento acumulado" : "Faturamento"} · {label}</span>
              <div className="bignum">{mode === "sales" ? (total ?? 0) : mode === "acc" ? R(acc) : R(total)}</div></div>
              <div className="seg sm" role="group" aria-label="Métrica do gráfico">{([["revenue", "Faturamento"], ["sales", "Vendas"], ["acc", "Acumulado"]] as const).map(([k, l]) =>
                <button key={k} className={mode === k ? "on" : ""} aria-pressed={mode === k} onClick={() => setMode(k)}>{l}</button>)}</div></div>
            <TrendChart data={series} fmt={mode === "sales" ? (v) => `${v} ${v === 1 ? "venda" : "vendas"}` : brl}
              yfmt={mode === "sales" ? undefined : (v) => `R$ ${v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : v}`} />
          </div>
          <div className="ov-side">
            <div className="card"><h3>Ritmo atual</h3>
              <ul className="plain">
                <li><span>Hoje</span><b>{R(s.today?.revenue)} <small>({s.today?.sales ?? 0})</small></b></li>
                <li><span>Últimos 7 dias</span><b>{R(s.last7?.revenue)} <small>({s.last7?.sales ?? 0})</small></b></li>
                <li><span>Últimos 30 dias</span><b>{R(s.last30?.revenue)} <small>({s.last30?.sales ?? 0})</small></b></li>
                <li><span>Desde o início</span><b>{R(s.all?.revenue)} <small>({s.all?.sales ?? 0})</small></b></li></ul></div>
            <div className="card"><h3>Status das vendas</h3>
              {sTotal ? <>
                <div className="statusbar" role="img" aria-label="Distribuição das vendas por status">{STATUS_PARTS.filter(([k]) => Number(sc[k])).map(([k, l, c]) => <i key={k} title={`${l}: ${sc[k]}`} style={{ flex: Number(sc[k]), background: c }} />)}</div>
                <ul className="legend">{STATUS_PARTS.map(([k, l, c]) => <li key={k}><i style={{ background: c }} /><span>{l}</span><b>{sc[k] ?? 0}</b>
                  <small>{sTotal ? Math.round((Number(sc[k] ?? 0) / sTotal) * 100) : 0}%</small></li>)}</ul></> : <Empty>Nenhuma venda no período.</Empty>}</div>
          </div></div>

        <div className="grid2">
          <div className="card"><h3>Produtos mais vendidos</h3>
            {s.top_products?.length ? <ul className="ranks">{s.top_products.map((p: any) => <li key={p.name}>
              <div><span>{p.name}</span><b>{R(p.revenue)}</b></div>
              <div className="rtrack"><i style={{ width: `${Math.max(4, (Number(p.revenue ?? 0) / topP) * 100)}%` }} /></div>
              <small>{p.sales} {p.sales === 1 ? "venda" : "vendas"}</small></li>)}</ul> : <Empty>Nenhum produto enviado pela integração.</Empty>}</div>
          <div className="card"><h3>Clientes que mais compraram</h3>
            {s.top_customers?.length ? <ul className="ranks">{s.top_customers.map((c: any) => <li key={c.discord_id}>
              <div><span className="whois"><Avatar src={c.icon} name={c.name} size={24} /> {c.name ?? c.discord_id}</span><b>{R(c.revenue)}</b></div>
              <div className="rtrack"><i style={{ width: `${Math.max(4, (Number(c.revenue ?? 0) / topC) * 100)}%` }} /></div>
              <small>{c.purchases} {c.purchases === 1 ? "compra" : "compras"}</small></li>)}</ul> : <Empty>Sem clientes identificados.</Empty>}</div></div>

        <div className="row between" style={{ marginTop: 32 }}><h2 style={{ margin: 0 }}>Vendas recentes</h2><a className="btn sm" href={botHref(botId, "vendas")}>Ver todas</a></div>
        {recent.data?.items?.length ? <div className="tablewrap"><table className="rt"><thead><tr><th>Data</th><th>Cliente</th><th>Produto</th><th className="num">Valor</th><th>Status</th></tr></thead>
          <tbody>{recent.data.items.map((x: any) => <tr key={x.sale_id}><td className="nowrap" data-label="Data">{dt(x.sold_at)}</td>
            <td data-label="Cliente"><span className="whois"><Avatar src={x.customer_icon} name={x.customer_name} size={24} /> {x.customer_name ?? "—"}</span></td>
            <td className="clip" data-label="Produto">{x.product_name ?? "—"}</td><td className="num" data-label="Valor">{brl(x.amount_net ?? x.amount_gross)}</td>
            <td data-label="Status"><Badge s={x.status} /></td></tr>)}</tbody></table></div>
          : <div style={{ marginTop: 14 }}><Empty>{recent.loading ? "Carregando vendas…" : "Nenhuma venda registrada ainda."}</Empty></div>}
      </>; }}</Async></>;
}

function Sales({ botId }: { botId: string }) {
  const init = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [f, setF] = useState({ q: init.get("q") ?? "", status: "", from: "", to: "", sort: "sold_at", dir: "desc", page: 1 });
  const [typed, setTyped] = useState(f.q);
  useEffect(() => { const t = setTimeout(() => setF((x) => (x.q === typed ? x : { ...x, q: typed, page: 1 })), 350); return () => clearTimeout(t); }, [typed]); // espera parar de digitar
  const qs = new URLSearchParams({ page: String(f.page), pageSize: "20", sort: f.sort, dir: f.dir });
  if (f.q) qs.set("q", f.q); if (f.status) qs.set("status", f.status);
  if (f.from) qs.set("from", new Date(f.from).toISOString()); if (f.to) qs.set("to", new Date(f.to + "T23:59:59").toISOString());
  const q = useApi<any>(`/api/bots/${encodeURIComponent(botId)}/sales?${qs}`);
  const sortBy = (k: string) => setF({ ...f, sort: k, dir: f.sort === k && f.dir === "desc" ? "asc" : "desc", page: 1 });
  const th = (k: string, l: string, num = false) => <th className={`sort${num ? " num" : ""}`} tabIndex={0} role="button" onClick={() => sortBy(k)}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sortBy(k); } }}
    aria-sort={f.sort === k ? (f.dir === "desc" ? "descending" : "ascending") : "none"}>{l}{f.sort === k ? (f.dir === "desc" ? " ↓" : " ↑") : ""}</th>;
  return <><h1>Vendas</h1>
    <div className="filters"><input className="input" aria-label="Buscar vendas" placeholder="Buscar por cliente, ID Discord, produto ou ID da venda" value={typed} onChange={(e) => setTyped(e.target.value)} />
      <select className="input" aria-label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })}>
        <option value="">Todos os status</option><option value="approved">Aprovadas</option><option value="pending">Pendentes</option><option value="canceled">Canceladas</option><option value="refunded">Reembolsadas</option></select>
      <input className="input" type="date" aria-label="De" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, page: 1 })} />
      <input className="input" type="date" aria-label="Até" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value, page: 1 })} /></div>
    <Async q={q}>{(d) => !d.items.length ? <Empty>Nenhuma venda encontrada.</Empty> : <>
      <div className="tablewrap"><table className="rt"><thead><tr>{th("sold_at", "Data e hora")}{th("customer_name", "Cliente")}<th>ID Discord</th><th>Produto</th><th>Pagamento</th>
        {th("amount_gross", "Bruto", true)}<th className="num">Taxas</th>{th("amount_net", "Líquido", true)}{th("status", "Status")}<th>ID da venda</th></tr></thead>
        <tbody>{d.items.map((s: any) => <tr key={s.sale_id}><td className="nowrap" data-label="Data">{dt(s.sold_at)}</td>
          <td data-label="Cliente"><span className="whois"><Avatar src={s.customer_icon} name={s.customer_name} size={24} /> {s.customer_name ?? "—"}</span></td>
          <td data-label="ID Discord">{s.customer_discord_id ?? "—"}</td><td data-label="Produto">{s.product_name ?? "—"}</td>
          <td data-label="Pagamento">{[s.payment_method, s.gateway].filter(Boolean).join(" · ") || "—"}</td>
          <td className="num" data-label="Bruto">{brl(s.amount_gross)}</td><td className="num" data-label="Taxas">{brl(s.fees)}</td><td className="num" data-label="Líquido">{brl(s.amount_net)}</td>
          <td data-label="Status"><Badge s={s.status} /></td><td data-label="ID da venda"><code>{s.sale_id}</code></td></tr>)}</tbody></table></div>
      <Pager page={d.page} pageSize={d.pageSize} total={d.total} onChange={(page) => setF({ ...f, page })} /></>}</Async></>;
}

function Clients({ botId }: { botId: string }) {
  const [q0, setQ] = useState(""); const [page, setPage] = useState(1);
  const q = useApi<any>(`/api/bots/${encodeURIComponent(botId)}/customers?page=${page}&pageSize=20&q=${encodeURIComponent(q0)}`);
  return <><h1>Meus Clientes</h1>
    <input className="input" style={{ margin: "18px 0" }} aria-label="Pesquisar clientes" placeholder="Pesquisar por nome ou ID Discord" value={q0} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
    <Async q={q}>{(d) => !d.items.length ? <Empty>Nenhum cliente encontrado.</Empty> : <>
      <div className="tablewrap"><table className="rt"><thead><tr><th>Cliente</th><th>ID Discord</th><th>Primeira compra</th><th>Última compra</th><th className="num">Compras</th><th className="num">Total gasto</th><th>Produtos</th><th /></tr></thead>
        <tbody>{d.items.map((c: any) => <tr key={c.k}><td data-label="Cliente"><span className="whois"><Avatar src={c.icon} name={c.name} size={24} /> {c.name ?? "—"}</span></td>
          <td data-label="ID Discord">{c.did ?? "—"}</td><td data-label="Primeira compra">{dt(c.first_at)}</td><td data-label="Última compra">{dt(c.last_at)}</td>
          <td className="num" data-label="Compras">{c.purchases}</td><td className="num" data-label="Total gasto">{brl(c.spent)}</td><td className="clip" data-label="Produtos">{c.products?.join(", ") || "—"}</td>
          <td className="act" data-label="Histórico">{c.did && <a href={`${botHref(botId, "vendas")}?q=${c.did}`}>Ver vendas</a>}</td></tr>)}</tbody></table></div>
      <Pager page={d.page} pageSize={d.pageSize} total={d.total} onChange={setPage} /></>}</Async></>;
}

const SHARD_ERR: Record<string, string> = {
  shard_not_configured: "A integração com a Shard Cloud ainda não foi configurada no servidor (SHARD_API_TOKEN).",
  shard_auth: "A Shard Cloud recusou o token do servidor. Gere outro em Settings > API Token e atualize a variável.",
  shard_not_found: "Esse app não foi encontrado na Shard Cloud.",
  shard_rejected: "A Shard Cloud recusou a operação.",
  shard_unavailable: "A Shard Cloud não respondeu. Tente de novo em instantes.",
  too_fast: "Aguarde alguns segundos antes de enviar outro comando.",
  license_inactive: "A licença deste bot não está ativa, então ele não pode ser iniciado.",
  not_shard_app: "Este bot não está vinculado a um app da Shard Cloud.",
  session_expired: "Sua sessão expirou. Entre novamente.",
};
const errText = (e: unknown) => { const x = e as any;
  return (SHARD_ERR[x?.code] ?? "Não foi possível concluir a ação.") + (x?.code === "shard_rejected" && x?.detail ? ` (${x.detail})` : ""); };
const STATUS: Record<string, [string, string]> = { running: ["Online", "approved"], stopped: ["Desligado", "canceled"], pending: ["Iniciando", "pending"], not_found: ["Não encontrado", "expired"] };
const uptime = (sec: number) => { const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}min` : `${m}min`; };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ShardPanel({ botId }: { botId: string }) {
  const enc = encodeURIComponent(botId);
  const q = useApi<any>(`/api/bots/${enc}/shard`);
  const [busy, setBusy] = useState<string | null>(null); const [msg, setMsg] = useState("");
  const act = async (action: "run" | "stop" | "restart", ask?: string) => {
    if (ask && !confirm(ask)) return;
    setBusy(action); setMsg("");
    try {
      await api(`/api/bots/${enc}/power`, { method: "POST", json: { action } });
      setMsg("Comando enviado. Atualizando o status…");
      for (let i = 0; i < 5; i++) { await sleep(3000); q.reload(); }
      setMsg("");
    } catch (e) { setMsg(errText(e)); } finally { setBusy(null); }
  };
  return <div className="card form">
    <div className="row between"><h3 style={{ margin: 0 }}>Bot na Shard Cloud</h3>
      {q.data?.linked && (() => { const [l, c] = STATUS[q.data.status] ?? [q.data.status, ""]; return <span className={`badge ${c}`}>{l}</span>; })()}</div>
    {q.loading && !q.data && <div className="state"><span className="spin" /> Consultando a Shard Cloud…</div>}
    {q.error && <div className="state err">{errText(q.error)} <button className="btn sm" onClick={q.reload}>Tentar de novo</button></div>}
    {q.data && !q.data.linked && <div className="state">Este bot não está vinculado a um app da Shard Cloud, por isso não há status nem controles.</div>}
    {q.data?.linked && <>
      <dl className="kv"><dt>Nome</dt><dd>{q.data.name ?? "—"}</dd><dt>ID do app</dt><dd><code>{q.data.id}</code></dd>
        <dt>Linguagem</dt><dd>{[q.data.language, q.data.version].filter(Boolean).join(" ") || "—"}</dd>
        <dt>Recursos</dt><dd>{q.data.ram ? `${q.data.ram} MB` : "—"} · {q.data.vcpu ?? "—"} vCPU</dd>
        <dt>Online há</dt><dd>{q.data.status === "running" ? uptime(q.data.uptime_seconds) : "—"}</dd></dl>
      {q.data.blocked_until && <div className="state err">App bloqueado{q.data.blocked_reason ? `: ${q.data.blocked_reason}` : ""}.</div>}
      <div className="row wrapx">
        <button className="btn solid" disabled={!!busy || q.data.status === "running" || q.data.status === "pending"} onClick={() => act("run")}>{busy === "run" ? "Iniciando…" : "Iniciar"}</button>
        <button className="btn" disabled={!!busy || q.data.status !== "running"} onClick={() => act("restart", "Reiniciar o bot agora?")}>{busy === "restart" ? "Reiniciando…" : "Reiniciar"}</button>
        <button className="btn" disabled={!!busy || q.data.status === "stopped"} onClick={() => act("stop", "Desligar o bot? Ele ficará offline até você iniciar de novo.")}>{busy === "stop" ? "Desligando…" : "Desligar"}</button>
      </div></>}
    {msg && <p className="muted" style={{ margin: 0 }}>{msg}</p>}
  </div>;
}

function Settings({ botId }: { botId: string }) {
  const q = useApi<any>(`/api/bots/${encodeURIComponent(botId)}`);
  const [f, setF] = useState<any>(null); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [saving, setSaving] = useState(false);
  return <><h1>Configurações</h1>
    <div className="grid2" style={{ alignItems: "start" }}>
      <ShardPanel botId={botId} />
      <Async q={q}>{(b) => { const v = f ?? { name: b.name, avatar_url: b.avatar_url ?? "" };
        return <div className="card form"><h3 style={{ margin: 0 }}>Identidade do bot</h3>
          <label>Nome<input className="input" value={v.name} maxLength={60} onChange={(e) => setF({ ...v, name: e.target.value })} />
            <small>Também é alterado na Shard Cloud.</small></label>
          <label>Ícone (URL https)<div className="row">{v.avatar_url ? <img src={v.avatar_url} alt="" className="bav" /> : <span className="bav ph">{(v.name ?? "?")[0]}</span>}
            <input className="input" placeholder="https://…" value={v.avatar_url} onChange={(e) => setF({ ...v, avatar_url: e.target.value })} /></div>
            <small>A Shard Cloud não tem ícone de app, então ele existe só aqui no site.</small></label>
          <button className="btn solid" disabled={saving} onClick={async () => { setSaving(true); setMsg(null);
            try { await api(`/api/bots/${encodeURIComponent(botId)}`, { method: "PATCH", json: { name: v.name, avatar_url: v.avatar_url || null } });
              setMsg({ ok: true, t: "Salvo." }); setF(null); q.reload(); }
            catch (e) { setMsg({ ok: false, t: (e as ApiError).status === 422 ? "Confira o nome (1 a 60 caracteres) e o ícone (URL https)." : errText(e) }); }
            finally { setSaving(false); } }}>{saving ? "Salvando…" : "Salvar"}</button>
          {msg && <p className={msg.ok ? "" : "muted"} style={{ margin: 0 }}>{msg.t}</p>}
          <small>Licença: <Badge s={b.license_status} /> · ID interno: {b.bot_id}</small></div>; }}</Async>
    </div></>;
}

function BetaTab({ title }: { title: string }) {
  return <><div className="row"><h1>{title}</h1><span className="betatag">Beta</span></div>
    <div className="empty card"><h2>Em breve</h2><p>Esta área está em fase beta e ainda não foi liberada. Avisaremos quando estiver disponível.</p></div></>;
}

export function BotPage({ botId, tab }: { botId: string; tab: "visao-geral" | "clientes" | "vendas" | "produtos" | "ticket" | "configuracoes" }) {
  const info = useApi<any>(`/api/bots/${encodeURIComponent(botId)}`);
  return <Dash bot={{ id: botId, name: info.data?.name }}>
    {info.data?.as_admin && <div className="state adm" role="status"><b>Você está vendo este painel como administrador.</b>{" "}
      Dono: {info.data.owners?.length ? info.data.owners.map((o: any) => o.name).join(", ") : "sem dono vinculado"}. Alterações feitas aqui ficam registradas na auditoria.</div>}
    {info.error?.status === 404 ? <div className="empty"><h2>Bot não encontrado</h2><p>Ele não existe ou não está vinculado à sua conta.</p><a className="btn" href="/dashboard/bots">Voltar</a></div> :
      tab === "visao-geral" ? <Overview botId={botId} /> : tab === "clientes" ? <Clients botId={botId} /> :
      tab === "vendas" ? <Sales botId={botId} /> :
      tab === "produtos" ? <Products botId={botId} /> : tab === "ticket" ? <BetaTab title="Ticket" /> : <Settings botId={botId} />}
  </Dash>;
}
