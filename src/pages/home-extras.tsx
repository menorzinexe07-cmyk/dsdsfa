// Peças visuais da página inicial. Tudo aqui é demonstrativo: nomes, valores e vendas são FICTÍCIOS e aparecem marcados como "Exemplo".
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { COMANDOS, FEATURES, GATEWAYS, TOTAL_MENUS, TOTAL_SLASH } from "../content";
import { brl } from "../ui/api";

const reduzido = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const vars = (o: Record<string, string | number>) => o as CSSProperties;

/** true depois que o elemento aparece na tela (uma vez só). */
function useVisto<T extends Element>(ref: React.RefObject<T | null>) {
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisto(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisto(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el); return () => io.disconnect();
  }, [ref]);
  return visto;
}

/** Número que conta de 0 até o valor quando aparece na tela. Sem JS ou com "reduzir movimento", mostra o valor final. */
export function ContarAoVer({ to, ms = 1300 }: { to: number; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visto = useVisto(ref);
  const [v, setV] = useState(to);
  useEffect(() => { if (!reduzido()) setV(0); }, []);
  useEffect(() => {
    if (!visto || reduzido()) return;
    let raf = 0, t0 = 0;
    const passo = (ts: number) => { if (!t0) t0 = ts; const k = Math.min(1, (ts - t0) / ms); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(passo); };
    raf = requestAnimationFrame(passo); return () => cancelAnimationFrame(raf);
  }, [visto, to, ms]);
  return <span ref={ref}>{v}</span>;
}

// ───────────────────────── ícones ─────────────────────────
const Ico = ({ children }: { children: ReactNode }) =>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>;
const I = {
  escudo: <Ico><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></Ico>,
  ticket: <Ico><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2M13 17v2M13 11v2" /></Ico>,
  presente: <Ico><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></Ico>,
  raio: <Ico><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></Ico>,
  sino: <Ico><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Ico>,
  carrinho: <Ico><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></Ico>,
  check: <Ico><path d="m5 12.5 4.5 4.5L19 7.5" /></Ico>,
  grafico: <Ico><path d="M3 3v18h18" /><path d="m7 15 4-5 3 3 5-7" /></Ico>,
};

// ───────────────────────── cena do topo ─────────────────────────

const VENDAS = [
  { n: "Marina", p: "Plano Mensal" }, { n: "Lucas", p: "Clone de servidor" }, { n: "Ana", p: "Plano Mensal" },
  { n: "Rafael", p: "Plano Mensal" }, { n: "Bia", p: "Clone de servidor" }, { n: "Caio", p: "Plano Mensal" },
];

/** Vendas de exemplo chegando uma a uma. */
function Notificacoes() {
  const [tick, setTick] = useState(3);
  useEffect(() => { if (reduzido()) return; const iv = setInterval(() => setTick((t) => t + 1), 2800); return () => clearInterval(iv); }, []);
  const n = VENDAS.length;
  const itens = [0, 1, 2].map((r) => ({ id: tick - r, r, ...VENDAS[(((tick - r) % n) + n) % n] }));
  return <div className="hx-card hx-notif" role="img" aria-label="Exemplo demonstrativo de vendas chegando ao vivo">
    <div className="hx-card-h"><i className="hx-live" /><b>Vendas ao vivo</b><span>Exemplo</span></div>
    <ul>{itens.map((v) => <li key={v.id} style={vars({ "--r": v.r })}>
      <span className="hx-av">{v.n[0]}</span><div><b>{v.n}</b><small>{v.p}</small></div><em>+{brl(5)}</em></li>)}</ul>
  </div>;
}

const BARRAS = [34, 48, 40, 64, 54, 80, 72, 94];
function GraficoCard() {
  return <div className="hx-card hx-grafico" role="img" aria-label="Exemplo demonstrativo do faturamento">
    <div className="hx-card-h"><b>Faturamento</b><span>Exemplo</span></div>
    <div className="hx-grafico-n"><strong>R$ 1.240,00</strong><em>▲ 12%</em></div>
    <div className="hx-bars">{BARRAS.map((h, i) => <i key={i} style={vars({ "--h": `${h}%`, "--i": i })} />)}</div>
  </div>;
}

/** QR de enfeite: não é um QR válido e não paga nada. */
function QrMini() {
  const mapa = useMemo(() => { let s = 7; const g: boolean[] = []; for (let i = 0; i < 49; i++) { s = (s * 48271) % 2147483647; g.push(s % 3 !== 0); } return g; }, []);
  const canto = (x: number, y: number) => (x < 3 && y < 3) || (x > 3 && y < 3) || (x < 3 && y > 3);
  return <svg viewBox="0 0 7 7" className="hx-qr" aria-hidden="true">{mapa.map((on, i) => { const x = i % 7, y = Math.floor(i / 7); return (canto(x, y) || on) ? <rect key={i} x={x} y={y} width="0.92" height="0.92" rx="0.18" /> : null; })}</svg>;
}
function PixChip() {
  return <div className="hx-card hx-pix" role="img" aria-label="Exemplo demonstrativo de pagamento Pix">
    <QrMini />
    <div><b>Pix copia e cola</b><small>Exemplo · não paga nada</small>
      <span className="hx-cp"><span className="a">Copiar</span><span className="b">{I.check} Copiado</span></span></div>
  </div>;
}

function Moeda() {
  return <div className="hx-coin" aria-hidden="true"><div className="hx-coin-in"><span className="f">R$</span><span className="b">{I.check}</span></div></div>;
}
function Confirmado() {
  return <div className="hx-ok" role="img" aria-label="Exemplo demonstrativo de pagamento confirmado"><span className="hx-ok-i">{I.check}</span><div><b>Pagamento confirmado</b><small>Pedido #1042 · entrega enviada</small></div></div>;
}

const SATELITES: [ReactNode, string][] = [[I.escudo, "Segurança"], [I.ticket, "Tickets"], [I.presente, "Sorteios"], [I.raio, "Automático"], [I.sino, "Avisos"]];
function Orbita() {
  return <div className="hx-orbit" aria-hidden="true">
    <div className="hx-ring r1">{SATELITES.map(([ico], i) => <div className="hx-sat" key={i} style={vars({ "--a": `${i * (360 / SATELITES.length)}deg` })}><i>{ico}</i></div>)}</div>
    <div className="hx-ring r2" />
  </div>;
}

/** Composição de objetos flutuantes. Eles se mexem com o mouse (cada um com uma profundidade) e flutuam sozinhos. */
export function CenaTopo({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current, host = el?.closest(".hx-hero") as HTMLElement | null;
    if (!el || !host || reduzido() || !matchMedia("(pointer: fine)").matches) return;
    let raf = 0, nx = 0, ny = 0;
    const aplicar = () => { raf = 0; el.style.setProperty("--px", nx.toFixed(3)); el.style.setProperty("--py", ny.toFixed(3)); };
    const mexer = (e: PointerEvent) => { const r = host.getBoundingClientRect(); nx = ((e.clientX - r.left) / r.width - 0.5) * 2; ny = ((e.clientY - r.top) / r.height - 0.5) * 2; if (!raf) raf = requestAnimationFrame(aplicar); };
    const sair = () => { nx = 0; ny = 0; if (!raf) raf = requestAnimationFrame(aplicar); };
    host.addEventListener("pointermove", mexer); host.addEventListener("pointerleave", sair);
    return () => { host.removeEventListener("pointermove", mexer); host.removeEventListener("pointerleave", sair); cancelAnimationFrame(raf); };
  }, []);
  return <div className="hx-scene" ref={ref}>
    <Orbita />
    <div className="hx-obj hx-main" style={vars({ "--k": 5 })}>{children}</div>
    <div className="hx-obj hx-o1" style={vars({ "--k": -20 })}><div className="hx-fl" style={vars({ "--t": "7s" })}><Notificacoes /></div></div>
    <div className="hx-obj hx-o2" style={vars({ "--k": 26 })}><div className="hx-fl" style={vars({ "--t": "8s", "--dl": "-2s" })}><GraficoCard /></div></div>
    <div className="hx-obj hx-o3" style={vars({ "--k": -32 })}><div className="hx-fl" style={vars({ "--t": "9s", "--dl": "-4s" })}><PixChip /></div></div>
    <div className="hx-obj hx-o4" style={vars({ "--k": 38 })}><div className="hx-fl" style={vars({ "--t": "6s", "--dl": "-1s" })}><Moeda /></div></div>
    <div className="hx-obj hx-o5" style={vars({ "--k": 14 })}><div className="hx-fl" style={vars({ "--t": "8.5s", "--dl": "-3s" })}><Confirmado /></div></div>
  </div>;
}

/** Palavra que troca sozinha: "Cuida de pedidos / pagamentos / clientes…" */
const ROTATIVAS = ["pedidos", "pagamentos", "clientes", "tickets", "sorteios", "entregas"];
export function Rotativo() {
  const [i, setI] = useState(0);
  useEffect(() => { if (reduzido()) return; const t = setInterval(() => setI((x) => (x + 1) % ROTATIVAS.length), 2200); return () => clearInterval(t); }, []);
  return <p className="hx-rot-line">Cuida de <span className="hx-rot" aria-hidden="true"><span key={i} className="hx-rot-w">{ROTATIVAS[i]}</span></span><span className="sr-only">pedidos, pagamentos, clientes, tickets, sorteios e entregas</span></p>;
}

// ───────────────────────── faixas e números ─────────────────────────

/** Texto gigante que corre pela tela, só de enfeite. */
export function Faixa() {
  const a = ["Vendas", "Pix", "Tickets", "Sorteios", "Automático", "Discord", "Painel"];
  const linha = (tipo: "a" | "b") => <div className={`hx-faixa-t ${tipo}`}>{[0, 1].map((c) => <span key={c}>{a.map((p) => <span key={p}>{p}<i aria-hidden="true">✦</i></span>)}</span>)}</div>;
  return <div className="hx-faixa" aria-hidden="true">{linha("a")}{linha("b")}</div>;
}

export function Numeros({ price }: { price: string }) {
  const recursos = useMemo(() => FEATURES.reduce((a, f) => a + f.items.length, 0), []);
  const integr = useMemo(() => GATEWAYS.slice(0, 2).reduce((a, g) => a + g.items.length, 0), []);
  const itens: { n: ReactNode; t: string; d: string }[] = [
    { n: <><ContarAoVer to={recursos} /></>, t: "recursos", d: "para vender, atender e administrar" },
    { n: <><ContarAoVer to={integr} /></>, t: "integrações de pagamento", d: "automáticas ou via leitura de e-mail" },
    { n: <><ContarAoVer to={TOTAL_SLASH} /></>, t: "comandos slash", d: `e ${TOTAL_MENUS} menus de contexto` },
    { n: <span className="hx-preco">{price.replace(/\s*por mês/i, "")}</span>, t: "por mês", d: "preço informado do bot" },
  ];
  return <div className="hx-nums">{itens.map((x, i) => <div key={x.t} className="hx-num" data-reveal style={vars({ "--i": i })}>
    <b>{x.n}</b><strong>{x.t}</strong><small>{x.d}</small></div>)}</div>;
}

// ───────────────────────── demonstração com abas ─────────────────────────

const Av = ({ bot, children }: { bot?: boolean; children: ReactNode }) => <span className={`hx-dav${bot ? " bot" : ""}`}>{children}</span>;
const Falso = ({ children }: { children: ReactNode }) => <span className="hx-fakebtn">{children}</span>;

function CenaVendas() {
  return <div className="hx-dc"><div className="hx-dc-h"><Av bot>ZS</Av><b>ZyraSallers</b><em>BOT</em><small>Hoje às 14:02</small></div>
    <div className="hx-embed"><small>Plano Mensal</small><h4>Pedido #1042</h4>
      <p>Escolha como pagar. O QR Code e o copia e cola chegam neste canal.</p>
      <ul className="hx-kv"><li><span>Valor</span><b>R$ 5,00</b></li><li><span>Pagamento</span><b>Pix</b></li><li><span>Entrega</span><b>Automática</b></li></ul>
      <div className="hx-btns"><Falso>{I.carrinho} Comprar</Falso><Falso>Carrinho</Falso></div></div></div>;
}
function CenaTickets() {
  return <div className="hx-dc">
    <div className="hx-dc-h"><Av>M</Av><b>Marina</b><small>Hoje às 14:10</small></div><p className="hx-msg">Oi! Meu pedido #1042 ainda não chegou.</p>
    <div className="hx-dc-h" style={{ marginTop: 14 }}><Av bot>ZS</Av><b>ZyraSallers</b><em>BOT</em><small>agora</small></div>
    <div className="hx-embed"><small>Atendimento</small><h4>Ticket #204 aberto</h4><p>Um canal privado foi criado para você. A equipe responde por lá.</p>
      <div className="hx-btns"><Falso>{I.ticket} Ver ticket</Falso><Falso>Fechar</Falso></div></div></div>;
}
function CenaSorteio() {
  const [t, setT] = useState(8049), [p, setP] = useState(128);
  useEffect(() => { if (reduzido()) return; const iv = setInterval(() => { setT((x) => (x > 0 ? x - 1 : 8049)); setP((x) => x + (Math.random() < 0.6 ? 1 : 0)); }, 1000); return () => clearInterval(iv); }, []);
  const f = (n: number) => String(n).padStart(2, "0"), hh = Math.floor(t / 3600), mm = Math.floor((t % 3600) / 60), ss = t % 60;
  return <div className="hx-dc"><div className="hx-dc-h"><Av bot>ZS</Av><b>ZyraSallers</b><em>BOT</em><small>Hoje às 14:20</small></div>
    <div className="hx-embed"><small>Sorteio</small><h4>Plano Mensal grátis</h4><p>Clique no botão para entrar. O sorteio é encerrado e o ganhador é avisado automaticamente.</p>
      <ul className="hx-kv"><li><span>Termina em</span><b className="hx-mono">{f(hh)}:{f(mm)}:{f(ss)}</b></li><li><span>Participantes</span><b className="hx-mono">{p}</b></li></ul>
      <div className="hx-btns"><Falso>{I.presente} Participar</Falso></div></div></div>;
}
function CenaSeguranca() {
  const L = [["CAPTCHA", "Novo membro verificado", "14:31"], ["Anti-raid", "Entradas em massa bloqueadas", "14:32"], ["Moderação", "Mensagem de spam removida", "14:35"]];
  return <div className="hx-dc"><div className="hx-dc-h"><Av bot>{I.escudo}</Av><b>Registro de segurança</b><small>Exemplo</small></div>
    <ul className="hx-log">{L.map(([a, b, h]) => <li key={a}><i /><div><b>{a}</b><span>{b}</span></div><small>{h}</small></li>)}</ul></div>;
}
function CenaPainel() {
  return <div className="hx-dc hx-pn"><div className="hx-dc-h"><Av bot>{I.grafico}</Av><b>Visão geral</b><small>Exemplo</small></div>
    <div className="hx-kpi3"><div><span>Faturamento</span><b>R$ 1.240</b></div><div><span>Vendas</span><b>62</b></div><div><span>Clientes</span><b>48</b></div></div>
    <div className="hx-bars big">{BARRAS.map((h, i) => <i key={i} style={vars({ "--h": `${h}%`, "--i": i })} />)}</div></div>;
}

const CENAS = [
  { id: "vendas", rotulo: "Vendas", ico: I.carrinho, titulo: "Do pedido ao Pix, sem sair do canal", texto: "O cliente escolhe, paga e recebe. Carrinho, saldo e vários gateways de pagamento.", itens: FEATURES[0]?.items.slice(0, 3) ?? [], cena: <CenaVendas /> },
  { id: "tickets", rotulo: "Tickets", ico: I.ticket, titulo: "Atendimento organizado em tickets", texto: "Cada conversa vira um canal próprio, e nenhum pedido se perde no meio do chat.", itens: FEATURES[1]?.items ?? [], cena: <CenaTickets /> },
  { id: "sorteios", rotulo: "Sorteios", ico: I.presente, titulo: "Sorteios que mantêm a comunidade ativa", texto: "Crie sorteios, divulgue produtos automaticamente e mantenha o servidor em movimento.", itens: ["Sorteios", "Repostagem automática de produtos", "Mensagens automáticas"], cena: <CenaSorteio /> },
  { id: "seguranca", rotulo: "Segurança", ico: I.escudo, titulo: "Servidor protegido o tempo todo", texto: "Moderação, proteção contra raid e verificação por CAPTCHA para quem entra.", itens: ["Moderação avançada", "Proteção anti-raid", "Proteção via CAPTCHA"], cena: <CenaSeguranca /> },
  { id: "painel", rotulo: "Painel", ico: I.grafico, titulo: "Seu resultado em um painel", texto: "Entre com o Discord e veja faturamento, clientes e histórico de cada bot.", itens: ["Faturamento e vendas", "Clientes e pedidos", "Um painel por bot"], cena: <CenaPainel /> },
];

/** Abas que mostram o bot em ação. Troca sozinha a cada 7 s (pausa com o mouse) e também por clique ou teclado. */
export function Demonstracao() {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const ativa = CENAS[i];
  const ir = (n: number) => { setI(((n % CENAS.length) + CENAS.length) % CENAS.length); };
  const tecla = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); setAuto(false); ir(i + 1); }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); setAuto(false); ir(i - 1); }
  };
  return <div className="hx-demo">
    <div className="hx-tabs" role="tablist" aria-label="Recursos do bot" onKeyDown={tecla}>
      {CENAS.map((c, n) => <button key={c.id} role="tab" id={`tab-${c.id}`} aria-selected={n === i} aria-controls="hx-painel" tabIndex={n === i ? 0 : -1}
        className={n === i ? "on" : ""} onClick={() => { setAuto(false); ir(n); }}>
        <span className="hx-tab-i">{c.ico}</span>
        <span className="hx-tab-t"><b>{c.rotulo}</b>{n === i && <small>{c.titulo}</small>}</span>
        {n === i && auto && <i key={`p${i}`} className="hx-prog" onAnimationEnd={() => ir(i + 1)} />}
      </button>)}
    </div>
    <div className="hx-stage" id="hx-painel" role="tabpanel" aria-labelledby={`tab-${ativa.id}`}>
      <div className="hx-stage-copy" key={`c${ativa.id}`}>
        <h3>{ativa.titulo}</h3><p>{ativa.texto}</p>
        <div className="chips">{ativa.itens.map((x) => <span className="chip" key={x}>{x}</span>)}</div>
      </div>
      <div className="hx-stage-view" key={`v${ativa.id}`}>{ativa.cena}<span className="hx-exemplo">Exemplo com dados fictícios</span></div>
    </div>
  </div>;
}

// ───────────────────────── passos, rodapé e brilho ─────────────────────────

export function Linha({ passos }: { passos: { t: string; d: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const visto = useVisto(ref);
  return <div className={`hx-tl${visto ? " in" : ""}`} ref={ref}>
    <div className="hx-tl-trilho" aria-hidden="true"><i /></div>
    {passos.map((p, n) => <div key={p.t} className="hx-tl-p" style={vars({ "--i": n })}>
      <span className="hx-tl-n" aria-hidden="true">0{n + 1}</span>
      <div className="hx-tl-c"><h3>{p.t}</h3><p>{p.d}</p></div>
    </div>)}
  </div>;
}

/** Anéis e partículas atrás do convite final. */
export function AnelCta() {
  return <div className="hx-cta-fx" aria-hidden="true"><i className="r1" /><i className="r2" /><i className="r3" />
    {SATELITES.map(([ico], n) => <span key={n} style={vars({ "--n": n })}>{ico}</span>)}</div>;
}

/** Brilho que segue o mouse dentro dos cartões (bento). */
export function useSpotlight(seletor: string) {
  useEffect(() => {
    const host = document.querySelector<HTMLElement>(seletor);
    if (!host || reduzido() || !matchMedia("(pointer: fine)").matches) return;
    const mexer = (e: PointerEvent) => {
      const cell = (e.target as HTMLElement).closest<HTMLElement>(".cell"); if (!cell) return;
      const r = cell.getBoundingClientRect(); cell.style.setProperty("--mx", `${e.clientX - r.left}px`); cell.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    host.addEventListener("pointermove", mexer); return () => host.removeEventListener("pointermove", mexer);
  }, [seletor]);
}

// ───────────────────────── comandos do bot ─────────────────────────

const semAcento = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const rotuloCmd = (c: { nome: string; menu?: boolean }) => (c.menu ? c.nome : `/${c.nome}`);

/** Simula alguém digitando um comando no Discord e a lista de sugestões aparecendo. Só enfeite (a lista de verdade fica logo abaixo). */
function DigitandoComando() {
  const roteiro = useMemo(() => ["panel", "gerar_pix", "ban", "zyrabank", "post", "clima"].map((nome) => {
    const g = COMANDOS.find((x) => x.itens.some((c) => c.nome === nome))!;
    const i = g.itens.findIndex((c) => c.nome === nome);
    return { nome, sugestoes: [g.itens[i], ...g.itens.filter((_, k) => k !== i)].slice(0, 4) };
  }), []);
  const [passo, setPasso] = useState(0), [n, setN] = useState(reduzido() ? 99 : 0);
  const atual = roteiro[passo % roteiro.length];
  useEffect(() => {
    if (reduzido()) return;
    const t = setTimeout(() => {
      if (n < atual.nome.length) setN(n + 1);
      else if (n === atual.nome.length) setN(n + 1);          // pausa com o comando completo
      else { setPasso((x) => x + 1); setN(0); }
    }, n < atual.nome.length ? 85 : 1700);
    return () => clearTimeout(t);
  }, [n, atual]);
  const digitado = atual.nome.slice(0, n);
  const lista = atual.sugestoes.filter((c) => c.nome.startsWith(digitado.slice(0, 2)) || n >= atual.nome.length || digitado === "");
  return <div className="hx-tipo" aria-hidden="true">
    <ul className="hx-tipo-sug">{(lista.length ? lista : atual.sugestoes).slice(0, 4).map((c, i) => <li key={`${passo}-${c.nome}`} className={i === 0 ? "on" : ""}>
      <b>/{c.nome}</b><span>{c.desc}</span></li>)}</ul>
    <div className="hx-tipo-in"><i className="av" /><span>/{digitado}<em /></span></div>
  </div>;
}

/** Todos os comandos do bot, com busca, filtro por categoria e clique para copiar. */
export function Comandos({ compacto = false }: { compacto?: boolean }) {
  const [grupo, setGrupo] = useState("todos"), [q, setQ] = useState(""), [tudo, setTudo] = useState(false), [copiado, setCopiado] = useState<string | null>(null);
  const todos = useMemo(() => COMANDOS.flatMap((g) => g.itens.map((c) => ({ ...c, g: g.id, gt: g.curto }))), []);
  const lista = useMemo(() => { const t = semAcento(q.trim());
    return todos.filter((c) => (grupo === "todos" || c.g === grupo) && (!t || semAcento(`${c.nome} ${c.desc} ${c.gt}`).includes(t))); }, [todos, grupo, q]);
  const limite = grupo === "todos" && !q.trim() && !tudo ? 12 : Infinity;
  const vistos = lista.slice(0, limite);
  const copiar = async (c: { nome: string; menu?: boolean }) => {
    const txt = rotuloCmd(c);
    try { await navigator.clipboard.writeText(txt); } catch { /* sem permissão: só mostra o aviso */ }
    setCopiado(c.nome); setTimeout(() => setCopiado((x) => (x === c.nome ? null : x)), 1500);
  };
  return <div className={`hx-cmds${compacto ? " compacto" : ""}`}>
    <DigitandoComando />
    <div className="hx-cmds-bar">
      <label className="hx-busca"><span className="sr-only">Buscar comando</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar comando: ban, pix, música…" autoComplete="off" spellCheck={false} />
        {q && <button type="button" onClick={() => setQ("")} aria-label="Limpar busca">×</button>}</label>
      <div className="hx-cats" role="group" aria-label="Categorias de comandos">
        <button type="button" className={grupo === "todos" ? "on" : ""} aria-pressed={grupo === "todos"} onClick={() => setGrupo("todos")}>Todos <b>{todos.length}</b></button>
        {COMANDOS.map((g) => <button type="button" key={g.id} className={grupo === g.id ? "on" : ""} aria-pressed={grupo === g.id} onClick={() => { setGrupo(g.id); setTudo(false); }}>{g.curto} <b>{g.itens.length}</b></button>)}
      </div>
    </div>
    {vistos.length ? <ul className="hx-cmd-grid">{vistos.map((c) => <li key={`${c.g}-${c.nome}`}>
      <button type="button" className={`hx-cmd${c.menu ? " menu" : ""}`} onClick={() => void copiar(c)} aria-label={`${rotuloCmd(c)}: ${c.desc} (clique para copiar)`}>
        <span className="hx-cmd-top"><code>{c.menu ? <><i aria-hidden="true">↖</i>{c.nome}</> : <><i>/</i>{c.nome}</>}</code>
          {copiado === c.nome ? <em className="ok">{I.check} Copiado</em> : <em>{c.menu ? "Menu" : c.gt}</em>}</span>
        <span className="hx-cmd-d">{c.desc}</span>
      </button></li>)}</ul>
      : <p className="hx-vazio">Nenhum comando encontrado para “{q}”.</p>}
    {lista.length > vistos.length && <div className="hx-mais"><button type="button" className="btn" onClick={() => setTudo(true)}>Mostrar os {lista.length} comandos</button></div>}
    <p className="hx-cmd-nota">Os menus de contexto aparecem ao clicar com o botão direito em uma mensagem; não começam com “/”.</p>
  </div>;
}
