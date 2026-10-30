import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as RPE, KeyboardEvent as RKE } from "react";
import { FAQ_DEFAULT, FEATURES, GATEWAYS, INVITE } from "../content";
import { Public } from "../ui/Shell";
import { cacheClear, useApi } from "../ui/api";

const useSettings = () => {
  const s = useApi<any>("/api/public/settings");
  return { price: s.data?.price?.label ?? "R$ 5,00 por mês", faq: (s.data?.faq as typeof FAQ_DEFAULT) ?? FAQ_DEFAULT,
    invite: s.data?.site?.invite ?? INVITE, title: s.data?.site?.hero_title, text: s.data?.site?.hero_text };
};

/* ---------- prévias demonstrativas: dados fictícios, sempre marcados como exemplo ---------- */
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Sale = { id: number; n: string; v: number; c: string; m: string; age: number };
const SALES = [
  { n: "Produto Exemplo", v: 20, c: "Marina", m: "Pix" },
  { n: "Plano Mensal", v: 38.5, c: "Lucas", m: "Pix" },
  { n: "Produto Pro", v: 59.9, c: "Ana", m: "Cartão" },
  { n: "Produto Exemplo", v: 20, c: "Rafael", m: "Pix" },
  { n: "Plano Mensal", v: 38.5, c: "Beatriz", m: "Boleto" },
  { n: "Produto Pro", v: 59.9, c: "Caio", m: "Pix" },
];
const ago = (a: number) => (a <= 0 ? "agora" : `há ${a} min`);
const mk = (k: number, age: number): Sale => ({ id: k, ...SALES[Math.abs(k) % SALES.length], age });

function useCountUp(target: number, ms = 800) {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setVal(target); from.current = target; return; }
    const a = from.current, t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      const x = a + (target - a) * e;
      setVal(x); from.current = x;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

/* notificação estilo iOS: toque expande, arrastar para a esquerda limpa */
function Notif({ s, open, onToggle, onClear, onOpenApp }: {
  s: Sale; open: boolean; onToggle: (id: number) => void; onClear: (id: number) => void; onOpenApp: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [out, setOut] = useState(false);
  const [col, setCol] = useState(false);
  const st = useRef({ x: 0, moved: false });

  const dismiss = () => {
    if (out) return;
    setDx(-420); setOut(true);
    setTimeout(() => setCol(true), 180);
    setTimeout(() => onClear(s.id), 480);
  };
  const down = (e: RPE<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    st.current = { x: e.clientX, moved: false };
    setDrag(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: RPE<HTMLDivElement>) => {
    if (!drag) return;
    const d = e.clientX - st.current.x;
    if (Math.abs(d) > 6) st.current.moved = true;
    setDx(d < 0 ? d : d * 0.25);
  };
  const up = () => {
    if (!drag) return;
    setDrag(false);
    if (dx < -90) dismiss();
    else { setDx(0); if (!st.current.moved) onToggle(s.id); }
  };
  const cancel = () => { setDrag(false); setDx(0); };
  const key = (e: RKE<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(s.id); }
    else if (e.key === "Delete" || e.key === "Backspace") dismiss();
  };

  return <div className={`nwrap${col ? " col" : ""}`}><div className="nin">
    <div className={`ncard${open ? " open" : ""}${drag ? " drag" : ""}${out ? " out" : ""}`}
      role="button" tabIndex={0} aria-expanded={open}
      aria-label={`Venda aprovada, ${s.n}, ${brl(s.v)}. Enter abre os detalhes, Delete limpa.`}
      style={{ transform: `translateX(${dx}px)` }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onKeyDown={key}>
      <div className="nhead"><span className="nico">Z</span>
        <div className="ntxt"><div className="ntop"><b>Venda aprovada</b><small>{ago(s.age)}</small></div>
          <p>{s.n} · {brl(s.v)}</p></div></div>
      <div className="nmore"><div>
        <dl className="ndl"><dt>Cliente</dt><dd>{s.c}</dd><dt>Pagamento</dt><dd>{s.m}</dd><dt>Pedido</dt><dd>#{1040 + s.id}</dd></dl>
        <div className="nbtns">
          <button type="button" className="nbtn p" tabIndex={open ? 0 : -1} onClick={onOpenApp}>Ver no painel</button>
          <button type="button" className="nbtn" tabIndex={open ? 0 : -1} onClick={dismiss}>Limpar</button>
        </div>
      </div></div>
    </div></div></div>;
}

function Phone() {
  const [view, setView] = useState<"lock" | "app">("lock");
  const [total, setTotal] = useState(1180);
  const [notifs, setNotifs] = useState<Sale[]>(() => [mk(-1, 3), mk(-2, 8)]);
  const [log, setLog] = useState<Sale[]>(() => [mk(-1, 3), mk(-2, 8)]);
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [torch, setTorch] = useState(false);
  const [shot, setShot] = useState(0);
  const [clock, setClock] = useState({ t: "9:41", d: "" });
  const hold = useRef(false);
  hold.current = open !== null; // enquanto uma notificação está aberta, não chega venda nova

  useEffect(() => {
    const f = () => {
      const n = new Date();
      setClock({
        t: n.toLocaleTimeString("pt-BR", { hour: "numeric", minute: "2-digit", hour12: false }),
        d: n.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }),
      });
    };
    f();
    const iv = setInterval(f, 20000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let k = 0;
    const push = () => {
      if (hold.current) return;
      const s = mk(++k, 0);
      const age = (l: Sale[]) => l.map((x) => ({ ...x, age: x.age + 1 }));
      setTick((t) => t + 1);
      setTotal((t) => t + s.v);
      setNotifs((l) => [s, ...age(l)].slice(0, 6));
      setLog((l) => [s, ...age(l)].slice(0, 4));
    };
    const first = setTimeout(push, 1200);
    const iv = setInterval(push, 4500);
    return () => { clearTimeout(first); clearInterval(iv); };
  }, []);

  const toggle = (id: number) => setOpen((o) => (o === id ? null : id));
  const clear = (id: number) => { setNotifs((l) => l.filter((x) => x.id !== id)); setOpen((o) => (o === id ? null : o)); };
  const clearAll = () => { setNotifs([]); setOpen(null); };
  const openApp = () => { setView("app"); setOpen(null); };
  const flip = () => { setView((v) => (v === "lock" ? "app" : "lock")); setOpen(null); };

  const last = log[0];
  const shown = useCountUp(total);
  const bars = [34, 48, 40, 62, 52, 76, 58];
  const lock = view === "lock";

  return <div className="phone-wrap">
    <div className={`phone${torch ? " torch" : ""}`} role="group" aria-label="Exemplo demonstrativo interativo de notificações no iPhone">
      <i className="pbtn pbtn-a" /><i className="pbtn pbtn-u" /><i className="pbtn pbtn-d" /><i className="pbtn pbtn-r" />
      <div className="phone-screen">

        <div className="phone-notch" key={`n${tick}`}>
          <span className="isl-in"><b className="isl-ico">Z</b><em>{brl(last.v)}</em></span>
        </div>

        <div className="ph-status" aria-hidden="true">
          <span>{lock ? "" : clock.t}</span>
          <span className="ph-icons">
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1.5 4a9.5 9.5 0 0 1 13 0" /><path d="M4 6.7a6 6 0 0 1 8 0" /><circle cx="8" cy="9.3" r="1" fill="currentColor" stroke="none" /></svg>
            <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x=".5" y=".5" width="22" height="11" rx="3.5" stroke="currentColor" opacity=".45" /><rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor" /><path d="M24 4v4c.8-.3 1.5-1.1 1.5-2S24.8 4.3 24 4Z" fill="currentColor" opacity=".5" /></svg>
          </span>
        </div>

        {/* ---------- tela de bloqueio ---------- */}
        <div className={`ph-lock${lock ? "" : " off"}`} aria-hidden={!lock}>
          <div className="ph-date">{clock.d}</div>
          <div className="ph-clock">{clock.t}</div>

          <div className="ph-notifs">
            <div className="nbar"><span>Central de notificações</span>
              {notifs.length > 1 && <button type="button" className="nclr" aria-label="Limpar todas as notificações" onClick={clearAll}>×</button>}</div>
            <div className="nlist">
              {notifs.map((s) => <Notif key={s.id} s={s} open={open === s.id} onToggle={toggle} onClear={clear} onOpenApp={openApp} />)}
              {!notifs.length && <p className="nempty">Nenhuma notificação por enquanto</p>}
            </div>
          </div>

          <button type="button" className={`ph-qa l${torch ? " on" : ""}`} aria-pressed={torch} aria-label="Lanterna" onClick={() => setTorch((t) => !t)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 2h8v4l-1.5 2v2h-5V8L8 6V2zm1.5 10h5v9a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-9z" /></svg>
          </button>
          <button type="button" className="ph-qa r" aria-label="Câmera" onClick={() => setShot((n) => n + 1)}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></svg>
          </button>
        </div>

        {/* ---------- painel (app) ---------- */}
        <div className={`ph-app${lock ? "" : " on"}`} aria-hidden={lock}>
          <div className="pa-head"><span className="nico">Z</span><h5>Painel</h5><small>Hoje</small></div>
          <div className="ph-wallet">
            <small>Faturamento do mês</small>
            <b>{brl(shown)}</b>
            <i key={`w${tick}`}>+ {brl(last.v)} agora</i>
          </div>
          <div className="pa-chart" aria-hidden="true">
            {bars.map((h, i) => <span key={i} style={{ ["--h" as any]: `${h}%` }} />)}
            <span key={`h${tick}`} className="hot" style={{ ["--h" as any]: `${40 + last.v}%` }} />
          </div>
          <h4>Últimas vendas</h4>
          <ul className="ph-list">{log.map((x) => <li key={x.id}>
            <span className="ph-dot">{x.n[0]}</span>
            <span><b>{x.n}</b><small>{x.c} · {ago(x.age)}</small></span><em>+ {brl(x.v)}</em></li>)}</ul>
        </div>

        {!lock && tick > 0 && <div className="ph-toast" key={`t${tick}`} role="status">
          <span className="nico">Z</span>
          <div><div className="ntop"><b>Venda aprovada</b><small>agora</small></div>
            <p>{last.n} · {brl(last.v)}</p></div>
        </div>}

        <div className="ph-tag">Exemplo demonstrativo</div>
        <button type="button" className="ph-home" aria-label={lock ? "Desbloquear e abrir o painel" : "Voltar à tela de bloqueio"} onClick={flip} />
        <div className="ph-glare" />
        {shot > 0 && <div className="ph-flash" key={shot} />}
      </div>
    </div>
    <small className="ph-hint">{lock
      ? "Toque nas notificações, arraste para o lado para limpar e use a barra de baixo para desbloquear."
      : "Toque na barra de baixo para voltar à tela de bloqueio."}</small>
  </div>;
}

type Msg = { title: string; text: string; btn?: string };
const MOCKS: { channel: string; lead: string; msgs: Msg[] }[] = [
  { channel: "loja", lead: "Do carrinho ao pagamento, sem sair do servidor.", msgs: [
    { title: "Produto Exemplo", text: "Valor à vista: R$ 20,00", btn: "Comprar" },
    { title: "Carrinho aberto", text: "Escolha a forma de pagamento para continuar." },
    { title: "Pagamento aprovado", text: "Pedido #1042 confirmado." }] },
  { channel: "ticket-0042", lead: "Receba pedidos de ajuda e responda sem perder nenhum.", msgs: [
    { title: "Ticket aberto", text: "Cliente pediu ajuda com um pedido.", btn: "Assumir" },
    { title: "Atendimento", text: "A equipe respondeu no canal do ticket." }] },
  { channel: "sorteios", lead: "Mantenha seus produtos e sua comunidade em movimento.", msgs: [
    { title: "Sorteio", text: "Prêmio: Produto Exemplo", btn: "Participar" },
    { title: "Mensagem automática", text: "Novidades do servidor publicadas no canal." }] },
  { channel: "seguranca", lead: "Controle quem entra e proteja seu servidor.", msgs: [
    { title: "Proteção anti-raid", text: "Entradas em massa monitoradas." },
    { title: "Verificação CAPTCHA", text: "Novo membro aguardando verificação." },
    { title: "Auto cargo", text: "Cargo aplicado ao novo membro." }] },
  { channel: "ferramentas", lead: "Ferramentas extras para o que o seu servidor precisa.", msgs: [
    { title: "Código 2FA", text: "Ferramenta disponível no bot." },
    { title: "Venda de Robux", text: "Ferramenta disponível no bot." }] },
];

function FeatureTabs() {
  const [i, setI] = useState(0);
  const g = FEATURES[i], m = MOCKS[i];
  return <div className="ftabs">
    <div className="ftab-list" role="tablist" aria-label="Categorias de funcionalidades">
      {FEATURES.map((f, k) => <button key={f.title} role="tab" id={`tab-${k}`} aria-selected={k === i} aria-controls="tabpanel"
        className={k === i ? "on" : ""} onClick={() => setI(k)}>{f.title}</button>)}
    </div>
    <div className="ftab-panel" id="tabpanel" role="tabpanel" aria-labelledby={`tab-${i}`}>
      <div className="ftab-info"><h3>{g.title}</h3><p>{m.lead}</p>
        <div className="chips">{g.items.map((it) => <span className="chip" key={it}>{it}</span>)}</div></div>
      <div className="mock" key={i}>
        <div className="mock-head"># {m.channel}<i>Exemplo demonstrativo</i></div>
        <div className="mock-body">{m.msgs.map((x, k) => <div className="mock-msg" key={k} style={{ ["--i" as any]: k }}>
          <div className="av">Z</div><div><b>ZyraSallers<span className="tag">BOT</span></b>
            <div className="embed"><strong>{x.title}</strong>{x.text}</div>{x.btn && <span className="mbtn">{x.btn}</span>}</div></div>)}</div>
      </div>
    </div>
  </div>;
}

function PanelMock() {
  const bars = [30, 44, 36, 58, 50, 74, 66, 88, 70, 94];
  return <div className="win" role="img" aria-label="Exemplo demonstrativo do painel de vendas">
    <div className="win-bar"><i /><i /><i /><span>zyra-apps.xyz/dashboard</span><em>Exemplo demonstrativo</em></div>
    <div className="win-body">
      <div className="win-kpis">
        <div><small>Faturamento</small><b>R$ 1.240,00</b></div><div><small>Vendas</small><b>62</b></div>
        <div><small>Ticket médio</small><b>R$ 20,00</b></div><div><small>Clientes</small><b>38</b></div></div>
      <div className="win-chart">{bars.map((h, k) => <span key={k} style={{ height: `${h}%` }} />)}</div>
      <ul className="win-list"><li><span className="cav ph">M</span>Marina<small>Produto Exemplo</small><em>R$ 20,00</em></li>
        <li><span className="cav ph">L</span>Lucas<small>Plano Mensal</small><em>R$ 38,50</em></li></ul>
    </div>
  </div>;
}

function Marquee() {
  const items = GATEWAYS.flatMap((g) => g.title === "Modo manual" ? ["Pagamento manual"] : g.items);
  const row = (hidden?: boolean) => items.map((i) => <span className="chip" key={i + (hidden ? "b" : "")} aria-hidden={hidden}>{i}</span>);
  return <div className="marquee" aria-label="Gateways de pagamento compatíveis"><div className="track">{row()}{row(true)}</div></div>;
}

const Chips = ({ items }: { items: string[] }) => <div className="chips">{items.map((i) => <span className="chip" key={i}>{i}</span>)}</div>;

const GSUB: Record<string, string> = { "Automáticos": "Confirmação automática do pagamento", "Integração via IMAP": "Leitura de e-mails de confirmação", "Modo manual": "Você confere cada pagamento" };
function Gateways() {
  return <div className="glist">{GATEWAYS.map((g) => <div className="grow" data-reveal key={g.title}>
    <div><h3>{g.title}</h3><small>{GSUB[g.title]}</small></div><Chips items={g.items} /></div>)}</div>;
}

function FaqList({ items, search }: { items: typeof FAQ_DEFAULT; search?: boolean }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => items.filter((i) => (i.q + i.a).toLowerCase().includes(q.toLowerCase())), [items, q]);
  return <div className="faqlist">
    {search && <input className="input" placeholder="Pesquisar nas perguntas" value={q} onChange={(e) => setQ(e.target.value)} />}
    {list.map((i, k) => <details key={i.q} className="faq"><summary><span><span className="fnum">{String(k + 1).padStart(2, "0")}</span>{i.q}</span></summary><p>{i.a}</p></details>)}
    {!list.length && <p className="muted">Nenhuma pergunta encontrada.</p>}
  </div>;
}

function PriceBox({ price, invite }: { price: string; invite: string }) {
  return <div className="pricebox" data-reveal>
    <div><h2>ZyraSallers</h2><div className="big">{price}</div><p style={{ marginTop: 14 }}>Preço informado do produto.</p></div>
    <div className="side"><a className="btn ink lg" href={invite} target="_blank" rel="noreferrer">Adquirir ZyraSallers</a>
      <a className="btn lg" style={{ color: "#000", borderColor: "#d4d4d8" }} href="/dashboard">Acessar meu dashboard</a></div>
  </div>;
}

const autoGateways = GATEWAYS[0].items.length, imapBanks = GATEWAYS[1].items.length;
function Stats({ price }: { price: string }) {
  return <div className="stats wrap" data-reveal>
    <div><b>{price.replace(" por mês", "")}</b><span>por mês</span></div>
    <div><b>{autoGateways}</b><span>gateways automáticos</span></div>
    <div><b>{imapBanks}</b><span>bancos via IMAP</span></div>
    <div><b>PT-BR</b><span>bot e painel em português</span></div>
  </div>;
}

export function Home() {
  const s = useSettings();
  return <Public>
    <section className="hero"><div className="wrap">
      <div><span className="pill"><i /> Bot brasileiro de vendas para Discord</span>
        <h1>{s.title ?? <>Automatize suas vendas <em>dentro do Discord.</em></>}</h1>
        <p className="lead">{s.text ?? "O ZyraSallers é um bot brasileiro desenvolvido pela Zyra Applications para automatizar vendas, gerenciar clientes e facilitar a administração do seu servidor Discord."}</p>
        <div className="actions"><a className="btn solid lg" href="/zyrasallers">Conhecer o ZyraSallers</a>
          <a className="btn lg" href="#recursos">Ver funcionalidades</a></div></div>
      <Phone /></div></section>

    <Stats price={s.price} />

    <section className="sec" id="recursos"><div className="wrap">
      <div className="sec-head" data-reveal><h2>O bot cuida do servidor inteiro</h2>
        <p>Cada aba mostra uma parte do que o ZyraSallers oferece dentro do seu servidor.</p></div>
      <FeatureTabs /></div></section>

    <section className="sec rule" id="pagamentos"><div className="wrap">
      <div className="sec-head" data-reveal><h2>Receba pelo método que você já usa</h2><p>Gateways automáticos, integração via IMAP e modo manual.</p></div></div>
      <Marquee /><div className="wrap" style={{ marginTop: 40 }}><Gateways /></div></section>

    <section className="sec rule"><div className="wrap two2">
      <div data-reveal><h2>Acompanhe tudo no seu painel</h2>
        <p className="lead2">Entre com o Discord e veja os bots vinculados à sua conta, com estatísticas, clientes e histórico de vendas de cada um.</p>
        <ol className="steps2">
          <li><b>Adquira o bot</b><span>A compra acontece no servidor oficial da Zyra Applications no Discord.</span></li>
          <li><b>Entre com o Discord</b><span>O site identifica os bots vinculados à sua conta.</span></li>
          <li><b>Acompanhe suas vendas</b><span>Estatísticas, clientes e histórico de cada bot, no computador ou no celular.</span></li></ol>
        <a className="btn solid" href="/login">Acessar painel</a></div>
      <div data-reveal><PanelMock /></div></div></section>

    <section className="sec tight"><div className="wrap"><PriceBox price={s.price} invite={s.invite} /></div></section>

    <section className="sec rule"><div className="wrap two2 top">
      <div data-reveal><h2>Antes de começar</h2><p className="lead2">Ficou com alguma pergunta que não está aqui? Fale com a gente no Discord.</p>
        <a className="btn" href={s.invite} target="_blank" rel="noreferrer">Entrar no Discord</a></div>
      <div><FaqList items={s.faq.slice(0, 6)} /><p style={{ marginTop: 22 }}><a href="/faq">Ver todas as perguntas</a></p></div></div></section>

    <section className="cta"><div className="wrap"><h2>Pronto para vender mais pelo Discord?</h2>
      <a className="btn solid lg" href={s.invite} target="_blank" rel="noreferrer">Adquirir ZyraSallers</a></div></section>
  </Public>;
}

export function Product() {
  const s = useSettings();
  return <Public>
    <section className="hero"><div className="wrap">
      <div><span className="pill"><i /> Zyra Applications</span><h1>ZyraSallers</h1>
        <p className="lead">Bot brasileiro desenvolvido pela Zyra Applications, focado em vendas automatizadas dentro do Discord. Possui ferramentas para gerenciar pedidos, pagamentos, clientes, divulgação de produtos e administração do servidor.</p>
        <div className="actions"><a className="btn solid lg" href={s.invite} target="_blank" rel="noreferrer">Adquirir ZyraSallers</a>
          <a className="btn lg" href="/dashboard">Acessar meu dashboard</a></div>
        <small className="muted" style={{ display: "block", marginTop: 22 }}>Preço informado: <b style={{ color: "#fff" }}>{s.price}</b></small></div>
      <Phone /></div></section>
    <Stats price={s.price} />
    <section className="sec" id="funcionalidades"><div className="wrap">
      <div className="sec-head" data-reveal><h2>Funcionalidades</h2>
        <p>Funcionalidades informadas do produto. A disponibilidade de cada uma depende da configuração real do seu bot.</p></div><FeatureTabs /></div></section>
    <section className="sec rule"><div className="wrap">
      <div className="sec-head" data-reveal><h2>Bancos e gateways de pagamento</h2></div><Gateways /></div></section>
    <section className="sec rule"><div className="wrap narrow"><div className="sec-head" data-reveal><h2>Perguntas frequentes</h2></div><FaqList items={s.faq} /></div></section>
  </Public>;
}

export function Pricing() {
  const s = useSettings();
  return <Public>
    <section className="pagehead"><div className="wrap"><h1>Preços</h1>
      <p>Este é o preço informado. Não há outros planos, taxas ou benefícios comerciais definidos nesta página.</p></div></section>
    <section className="sec tight"><div className="wrap"><PriceBox price={s.price} invite={s.invite} /></div></section>
  </Public>;
}

export function Faq() {
  const s = useSettings();
  return <Public>
    <section className="pagehead"><div className="wrap narrow"><h1>Perguntas frequentes</h1></div></section>
    <section className="sec tight"><div className="wrap narrow"><FaqList items={s.faq} search /></div></section>
  </Public>;
}

export function Login() {
  useEffect(() => { cacheClear(); }, []); // nunca mostrar dados em cache de outra conta
  const me = useApi<any>("/api/me");
  useEffect(() => { if (me.data?.discord_id) window.location.replace("/dashboard"); }, [me.data]); // já conectado: vai direto
  const p = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const erro = p.get("erro");
  const HINT: Record<string, string> = {
    state: "A verificação de segurança do login expirou. Tente entrar de novo.",
    token: "O Discord recusou o código de login. Confira o DISCORD_CLIENT_SECRET e o redirect cadastrado.",
    usuario: "Não foi possível ler seu perfil no Discord. Tente novamente.",
    banco: "Não foi possível salvar seu perfil. Confira SUPABASE_URL, a chave de serviço e as migrações do banco.",
    sessao: "Não foi possível criar sua sessão. Confira as migrações do banco.",
  };
  const msg = p.get("expirada") ? "Sua sessão expirou. Entre novamente."
    : erro ? `${HINT[erro] ?? "Não foi possível concluir o login com o Discord. Tente novamente."} (código: ${erro})` : null;
  return <Public><div className="wrap"><div className="loginbox"><h1 style={{ fontSize: "2.2rem" }}>Entrar</h1>
    <p style={{ margin: "14px 0 24px" }}>Use sua conta Discord para acessar o painel dos seus bots. Pedimos apenas a permissão de identificação: seu ID, nome e avatar.</p>
    {msg && <div className="state err">{msg}</div>}
    {me.data?.discord_id ? <div className="state">Você já está conectado. Abrindo o painel…</div>
      : <a className="btn solid lg" href="/api/auth/discord">Entrar com Discord</a>}
    <p className="muted" style={{ marginTop: 18, fontSize: ".88rem" }}>Neste aparelho você continua conectado por até 60 dias de uso.</p></div></div></Public>;
}

export function Legal({ kind }: { kind: "privacidade" | "termos" }) {
  return <Public><section className="sec tight"><div className="wrap narrow legal">
    <div className="state">Modelo inicial. Revise com assessoria jurídica antes de publicar.</div>
    {kind === "privacidade" ? <>
      <h1 style={{ fontSize: "2.6rem" }}>Política de Privacidade</h1>
      <h3>Dados que coletamos</h3><p>Ao entrar com Discord, guardamos seu ID, nome de usuário, nome global, avatar e as datas de primeiro e último acesso. Não guardamos tokens de acesso do Discord.</p>
      <p>Das vendas recebidas do Bot Manager guardamos apenas o necessário para gestão: ID, nome e ícone do cliente (quando enviados), produto, valores, método de pagamento, status e datas.</p>
      <h3>Como usamos</h3><p>Para autenticar você, identificar quais bots estão vinculados à sua conta e exibir estatísticas e histórico de vendas.</p>
      <h3>Seus direitos</h3><p>Você pode solicitar acesso, correção ou exclusão dos seus dados pelo servidor oficial no Discord, respeitadas as obrigações legais de guarda.</p>
    </> : <>
      <h1 style={{ fontSize: "2.6rem" }}>Termos de Uso</h1>
      <p style={{ marginTop: 20 }}>Ao usar o site você concorda em acessar apenas dados dos bots vinculados à sua conta Discord, em não tentar contornar controles de acesso e em manter sigilo das credenciais de API geradas.</p>
      <p>O acesso ao painel depende da propriedade do bot registrada pela integração oficial. Condições comerciais não descritas neste site devem ser tratadas no servidor oficial da Zyra Applications.</p>
    </>}
  </div></section></Public>;
}
