import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { FAQ_DEFAULT, FEATURES, GATEWAYS, INVITE } from "../content";
import { Public } from "../ui/Shell";
import { useApi } from "../ui/api";

// ───────────────────────── tipos e helpers ─────────────────────────

type FaqItem = (typeof FAQ_DEFAULT)[number];

interface PublicSettings {
  price?: { label?: string };
  faq?: unknown;
  site?: { invite?: string; hero_title?: string; hero_text?: string };
}

/** Variáveis CSS customizadas tipadas (substitui o `["--i" as any]` espalhado). */
const vars = (v: Record<`--${string}`, string | number>) => v as CSSProperties;

/** Dá título à aba por página. Remova se o <Public> já cuida disso. */
function usePageTitle(title?: string) {
  useEffect(() => {
    if (title) document.title = `${title} | ZyraSallers`;
  }, [title]);
}

/** Remove acentos e caixa, pra "configuracao" achar "configuração". */
const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const PRECO_PADRAO = "R$ 5,00 por mês";

const useSettings = () => {
  const { data } = useApi<PublicSettings>("/api/public/settings");
  return useMemo(() => {
    const faq = data?.faq;
    return {
      price: data?.price?.label || PRECO_PADRAO,
      // se a API devolver algo que não é lista, cai no padrão em vez de quebrar o .slice()
      faq: Array.isArray(faq) && faq.length ? (faq as FaqItem[]) : FAQ_DEFAULT,
      invite: data?.site?.invite || INVITE,
      title: data?.site?.hero_title || undefined,
      text: data?.site?.hero_text || undefined,
    };
  }, [data]);
};

function ExternalLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

// ───────────────────────── prévia do hero ─────────────────────────
// O lado direito do hero é o painel interativo (DemoPainel, definido mais abaixo).

function HeroStage() {
  return <div className="zs-stage"><DemoPainel /></div>;
}

// ───────────────────────── funcionalidades ─────────────────────────

const icone = (d: ReactNode) => <svg viewBox="0 0 24 24" focusable="false">{d}</svg>;

/** Ordem igual à de FEATURES em ../content. Tudo de um card num lugar só. */
const FEATURE_META: { icon: ReactNode; span: string; blurb: string }[] = [
  { span: "s4", blurb: "Do carrinho ao pagamento, sem sair do servidor.",
    icon: icone(<><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></>) },
  { span: "s2", blurb: "Responda clientes sem perder nenhum pedido.",
    icon: icone(<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5Z" />) },
  { span: "s2", blurb: "Mantenha seus produtos e sua comunidade em movimento.",
    icon: icone(<><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>) },
  { span: "s4", blurb: "Controle quem entra e proteja seu servidor.",
    icon: icone(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />) },
  { span: "s6", blurb: "Ferramentas extras para o que o seu servidor precisa.",
    icon: icone(<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z" />) },
];
const META_PADRAO = { icon: null, span: "s2", blurb: "" };

const Chips = ({ items }: { items: string[] }) =>
  <div className="chips">{items.map((i) => <span className="chip" key={i}>{i}</span>)}</div>;

function Features() {
  return <div className="bento">
    {FEATURES.map((g, i) => {
      const m = FEATURE_META[i] ?? META_PADRAO;
      return <div key={g.title} data-reveal className={`cell spot ${m.span}`}>
        <div className="ico" aria-hidden="true">{m.icon}</div>
        <h3>{g.title}</h3>
        {m.blurb && <p>{m.blurb}</p>}
        <Chips items={g.items} />
      </div>;
    })}
  </div>;
}

function Marquee() {
  const items = useMemo(() => FEATURES.flatMap((f) => f.items).slice(0, 18), []);
  // a 2ª cópia existe só pro loop da animação: some dos leitores de tela
  const row = (copia: "a" | "b") => items.map((i) =>
    <span className="chip" key={`${copia}-${i}`} aria-hidden={copia === "b" || undefined}>{i}</span>);
  return <div className="marquee" role="group" aria-label="Algumas funcionalidades do ZyraSallers">
    <div className="track">{row("a")}{row("b")}</div>
  </div>;
}

// ───────────────────────── pagamentos ─────────────────────────

const GATEWAY_SUB: Record<string, string> = {
  "Automáticos": "Confirmação automática do pagamento",
  "Integração via IMAP": "Leitura de e-mails de confirmação",
  "Modo manual": "Você confere cada pagamento",
};

function Gateways() {
  return <div className="glist">
    {GATEWAYS.map((g) => <div className="grow" data-reveal key={g.title}>
      <div><h3>{g.title}</h3>{GATEWAY_SUB[g.title] && <small>{GATEWAY_SUB[g.title]}</small>}</div>
      <Chips items={g.items} />
    </div>)}
  </div>;
}

// ───────────────────────── painel de produto demonstrativo ─────────────────────────
// Imita uma mensagem do bot no Discord. Tudo é fictício: o PIX e o QR Code gerados
// NÃO são válidos e nenhum pagamento acontece. O CSS vai junto (prefixo .zs-).

interface Plano { id: string; nome: string; desc: string; preco: number }

const PRODUTO_DEMO = "Cl0nar servidores";
const PLANO_DEMO: Plano = { id: "clone", nome: "Clone de servidor", desc: "Estrutura completa, pronta em poucos minutos", preco: 5 };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const TEMPO_PIX = 10 * 60; // segundos

type Etapa =
  | { t: "painel" }
  | { t: "carrinho"; plano: Plano }
  | { t: "gerando"; plano: Plano }
  | { t: "pix"; plano: Plano; pedido: number; expira: number }
  | { t: "expirado"; plano: Plano }
  | { t: "pago"; plano: Plano; pedido: number };

const novoPedido = () => 1000 + Math.floor(Math.random() * 9000);
const codigoFalso = (pedido: number) => `DEMO.ZYRASALLERS.PEDIDO${pedido}.EXEMPLO.NAO.PAGAVEL`;

// QR Code de exemplo (visual, não escaneável)

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const QR_N = 29; // equivale a um QR "versão 3"

function QrExemplo({ seed }: { seed: number }) {
  const caminho = useMemo(() => {
    const N = QR_N;
    const rnd = mulberry32(seed);
    const zonaFinder = (x: number, y: number) => (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
    const zonaAlinh = (x: number, y: number) => x >= 20 && x <= 24 && y >= 20 && y <= 24;
    const finder = (r: number, c: number) => r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);

    let d = "";
    const ponto = (x: number, y: number) => { d += `M${x} ${y}h1v1h-1z`; };

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let escuro: boolean;
        if (zonaFinder(x, y)) {
          const ox = x >= N - 8 ? N - 7 : 0;
          const oy = y >= N - 8 ? N - 7 : 0;
          const r = y - oy, c = x - ox;
          escuro = r >= 0 && r <= 6 && c >= 0 && c <= 6 && finder(r, c);
        } else if (zonaAlinh(x, y)) {
          const r = y - 20, c = x - 20;
          escuro = r === 0 || r === 4 || c === 0 || c === 4 || (r === 2 && c === 2);
        } else if (y === 6) escuro = x % 2 === 0;
        else if (x === 6) escuro = y % 2 === 0;
        else escuro = rnd() > 0.52;
        if (escuro) ponto(x, y);
      }
    }
    return d;
  }, [seed]);

  return (
    <svg className="zs-qr" viewBox={`-2 -2 ${QR_N + 4} ${QR_N + 4}`} role="img" shapeRendering="crispEdges"
      aria-label="QR Code de exemplo, não é válido para pagamento">
      <rect x="-2" y="-2" width={QR_N + 4} height={QR_N + 4} fill="#fff" />
      <path d={caminho} fill="#111" />
    </svg>
  );
}

// peças de mensagem

function Mensagem({ children, efemera, onDispensar }: { children: ReactNode; efemera?: boolean; onDispensar?: () => void }) {
  return (
    <div className="zs-msg">
      <div className="zs-av" aria-hidden="true">Z</div>
      <div className="zs-msg-corpo">
        <div className="zs-msg-topo">
          <b>ZyraSallers</b><span className="zs-tag">BOT</span>
          <time>Hoje às 06:16</time>
        </div>
        {children}
        {efemera && (
          <p className="zs-efemera">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
            Somente você pode ver isso.{" "}
            <button type="button" onClick={onDispensar}>Dispensar mensagem</button>
          </p>
        )}
      </div>
    </div>
  );
}

const Embed = ({ cor = "#fff", titulo, children }: { cor?: string; titulo: string; children: ReactNode }) => (
  <div className="zs-embed" style={vars({ "--bar": cor })}>
    <h4>{titulo}</h4>
    {children}
  </div>
);

const Campo = ({ nome, valor }: { nome: string; valor: ReactNode }) => (
  <div className="zs-campo"><span>{nome}</span><b>{valor}</b></div>
);

function Contagem({ expira, aoExpirar }: { expira: number; aoExpirar: () => void }) {
  const [resta, setResta] = useState(() => Math.max(0, Math.ceil((expira - Date.now()) / 1000)));
  useEffect(() => {
    const iv = setInterval(() => {
      const r = Math.max(0, Math.ceil((expira - Date.now()) / 1000));
      setResta(r);
      if (r === 0) { clearInterval(iv); aoExpirar(); }
    }, 1000);
    return () => clearInterval(iv);
  }, [expira, aoExpirar]);
  const mm = String(Math.floor(resta / 60)).padStart(2, "0");
  const ss = String(resta % 60).padStart(2, "0");
  return <>{mm}:{ss}</>;
}

function DemoPainel() {
  const [etapa, setEtapa] = useState<Etapa>({ t: "painel" });
  const [copiado, setCopiado] = useState<null | "ok" | "erro">(null);

  // "gerando" -> "pix" depois de um instante, como o bot faria
  useEffect(() => {
    if (etapa.t !== "gerando") return;
    const plano = etapa.plano;
    const tm = setTimeout(() => setEtapa({ t: "pix", plano, pedido: novoPedido(), expira: Date.now() + TEMPO_PIX * 1000 }), 900);
    return () => clearTimeout(tm);
  }, [etapa]);

  useEffect(() => {
    if (!copiado) return;
    const tm = setTimeout(() => setCopiado(null), 2200);
    return () => clearTimeout(tm);
  }, [copiado]);

  const reiniciar = () => { setEtapa({ t: "painel" }); setCopiado(null); };

  const copiar = async (texto: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiado("ok"); } catch { setCopiado("erro"); }
  };

  const expirar = useMemo(
    () => () => setEtapa((e) => (e.t === "pix" ? { t: "expirado", plano: e.plano } : e)),
    [],
  );

  return (
    <>
      <style>{DEMO_CSS}</style>
          <div className="zs-janela">
            <div className="zs-janela-topo">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" /></svg>
              <b>loja</b><i>Exemplo demonstrativo</i>
            </div>

            <div className="zs-chat">
              {/* mensagem fixa do painel, igual ao bot no Discord */}
              <Mensagem>
                <div className="zs-embed zs-produto" style={vars({ "--bar": "#fff" })}>
                  <p className="zs-eyebrow">Clonar</p>
                  <h4 className="zs-titulo">{PRODUTO_DEMO}</h4>
                  <p className="zs-sub">Estrutura idêntica ao original, pronta em poucos minutos.</p>

                  <blockquote className="zs-cit">
                    Clone qualquer servidor e tenha uma organização <b>idêntica ao original</b>, sem precisar configurar tudo do zero. Praticidade, rapidez e uma estrutura pronta para usar.
                  </blockquote>

                  <p className="zs-incluso">O que está incluído:</p>
                  <ul className="zs-lista">
                    <li><span aria-hidden="true">📂</span><span><u>Estrutura completa</u> do servidor</span></li>
                    <li><span aria-hidden="true">🔧</span><span><b>Canais &amp; Categorias</b>, <b>permissões</b>, <b>cargos</b> e <b>emojis &amp; stickers</b></span></li>
                    <li><span aria-hidden="true">⚡</span><span>Clonagem <u>rápida</u> e sem complicação</span></li>
                    <li><span aria-hidden="true">💎</span><span>Alta qualidade e agilidade na entrega</span></li>
                  </ul>
                  <p className="zs-carteira" aria-hidden="true">👛</p>

                  <hr />
                  <div className="zs-rod">
                    <p className="zs-preco">{brl(PLANO_DEMO.preco)}</p>
                    <button type="button" className="zs-comprar" disabled={etapa.t === "gerando"}
                      onClick={() => { setCopiado(null); setEtapa({ t: "carrinho", plano: PLANO_DEMO }); }}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.76L20 8H6.2" /><circle cx="9.5" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /></svg>
                      Comprar
                    </button>
                  </div>
                </div>
              </Mensagem>

              {/* fluxo de compra: aparece como mensagem só sua, igual no Discord */}
              <div aria-live="polite">
                {etapa.t === "carrinho" && (
                  <Mensagem efemera onDispensar={reiniciar}>
                    <Embed titulo="Carrinho aberto">
                      <Campo nome="Produto" valor={PRODUTO_DEMO} />
                      <Campo nome="Item" valor={etapa.plano.nome} />
                      <Campo nome="Valor" valor={brl(etapa.plano.preco)} />
                      <div className="zs-acoes">
                        <button type="button" className="zs-b verde" onClick={() => setEtapa({ t: "gerando", plano: etapa.plano })}>Comprar com PIX</button>
                        <button type="button" className="zs-b cinza" onClick={reiniciar}>Cancelar</button>
                      </div>
                    </Embed>
                  </Mensagem>
                )}

                {etapa.t === "gerando" && (
                  <Mensagem efemera onDispensar={reiniciar}>
                    <Embed cor="#5865f2" titulo="Gerando pagamento">
                      <p className="zs-gerando" role="status">Criando seu PIX<span className="zs-pts" aria-hidden="true"><i /><i /><i /></span></p>
                    </Embed>
                  </Mensagem>
                )}

                {etapa.t === "pix" && (
                  <Mensagem efemera onDispensar={reiniciar}>
                    <Embed cor="#5865f2" titulo="Pague com PIX">
                      <div className="zs-pix">
                        <QrExemplo seed={etapa.pedido} />
                        <div className="zs-pix-info">
                          <Campo nome="Valor" valor={brl(etapa.plano.preco)} />
                          <Campo nome="Pedido" valor={`#${etapa.pedido}`} />
                          <Campo nome="Expira em" valor={<Contagem expira={etapa.expira} aoExpirar={expirar} />} />
                        </div>
                      </div>
                      <label className="zs-copia">
                        <span>PIX copia e cola (exemplo)</span>
                        <input readOnly value={codigoFalso(etapa.pedido)} onFocus={(e) => e.currentTarget.select()} />
                      </label>
                      <div className="zs-acoes">
                        <button type="button" className="zs-b cinza" onClick={() => copiar(codigoFalso(etapa.pedido))}>
                          {copiado === "ok" ? "Código copiado" : copiado === "erro" ? "Selecione e copie" : "Copiar código"}
                        </button>
                        <button type="button" className="zs-b azul" onClick={() => setEtapa({ t: "pago", plano: etapa.plano, pedido: etapa.pedido })}>Simular pagamento</button>
                      </div>
                      <p className="zs-rodape">Exemplo: este QR Code não é válido.</p>
                    </Embed>
                  </Mensagem>
                )}

                {etapa.t === "expirado" && (
                  <Mensagem efemera onDispensar={reiniciar}>
                    <Embed cor="#f0b232" titulo="Pagamento expirado">
                      <p className="zs-texto">O tempo para pagar acabou. Gere um novo PIX para continuar.</p>
                      <div className="zs-acoes">
                        <button type="button" className="zs-b verde" onClick={() => setEtapa({ t: "gerando", plano: etapa.plano })}>Gerar novo PIX</button>
                      </div>
                    </Embed>
                  </Mensagem>
                )}

                {etapa.t === "pago" && (
                  <>
                    <Mensagem>
                      <Embed cor="#23a559" titulo="Pagamento aprovado">
                        <p className="zs-texto">Pedido <b>#{etapa.pedido}</b> confirmado. {PRODUTO_DEMO}, {brl(etapa.plano.preco)}.</p>
                      </Embed>
                    </Mensagem>
                    <Mensagem efemera onDispensar={reiniciar}>
                      <Embed cor="#23a559" titulo="Entrega realizada">
                        <p className="zs-texto">O produto foi enviado para você por mensagem direta.</p>
                        <div className="zs-acoes">
                          <button type="button" className="zs-b cinza" onClick={reiniciar}>Refazer demonstração</button>
                        </div>
                      </Embed>
                    </Mensagem>
                  </>
                )}
              </div>
            </div>

            <div className="zs-janela-rodape">Dados fictícios, apenas para demonstração.</div>
          </div>
    </>
  );
}

const DEMO_CSS = `

.zs-stage{width:100%;max-width:580px;justify-self:center}
.zs-janela{--bg:#0f0f11;--bg2:#0b0b0d;--bg3:#1a1b1e;--tx:#dbdee1;--mut:#9a9da6;--linha:#2a2b30;
  background:var(--bg);color:var(--tx);border:1px solid #232428;border-radius:16px;overflow:hidden;
  box-shadow:0 30px 80px -30px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.02) inset;
  font-family:'gg sans','Segoe UI',system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.4;text-align:left}
.zs-janela *{box-sizing:border-box}
.zs-janela h4,.zs-janela p{margin:0}
.zs-janela-topo{display:flex;align-items:center;gap:8px;padding:12px 16px;background:var(--bg);border-bottom:1px solid #1c1d20}
.zs-janela-topo svg{width:20px;height:20px;stroke:var(--mut);fill:none;stroke-width:2;stroke-linecap:round}
.zs-janela-topo b{font-weight:600;color:#f2f3f5}
.zs-janela-topo i{margin-left:auto;font-style:normal;font-size:12px;color:var(--mut)}
.zs-chat{padding:18px 16px 8px;display:grid;gap:4px}
.zs-janela-rodape{padding:10px 16px 14px;font-size:12px;color:var(--mut)}

.zs-msg{display:grid;grid-template-columns:40px minmax(0,1fr);gap:14px;padding:6px 0 10px}
.zs-av{width:40px;height:40px;border-radius:50%;background:#fff;color:#000;display:grid;place-items:center;font-weight:800}
.zs-msg-topo{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.zs-msg-topo b{color:#fff;font-weight:600}
.zs-msg-topo time{font-size:12px;color:var(--mut);margin-left:4px}
.zs-tag{background:#5865f2;color:#fff;font-size:10px;font-weight:600;padding:1px 5px;border-radius:4px;line-height:1.4}

.zs-embed{position:relative;background:var(--bg2);border:1px solid var(--linha);border-left:5px solid var(--bar,#fff);border-radius:8px;padding:14px 16px 16px;max-width:520px;display:grid;gap:10px}
.zs-embed h4{font-size:15px;font-weight:700;color:#fff}
.zs-embed hr{border:0;border-top:1px solid var(--linha);margin:4px 0 2px}
.zs-texto{display:grid;gap:6px;font-size:14px}

/* painel do produto (igual à foto) */
.zs-produto{gap:8px}
.zs-eyebrow{font-size:13px;font-weight:700;color:#e6e7ea}
.zs-titulo{font-size:19px!important;font-weight:700;letter-spacing:-.01em}
.zs-sub{font-size:13px;font-style:italic;color:var(--mut)}
.zs-cit{margin:6px 0 4px;padding:12px 14px 12px 14px;border-left:4px solid #3a3b40;background:rgba(255,255,255,.015);border-radius:0 6px 6px 0;font-size:13px;line-height:1.55;color:#c4c7ce}
.zs-cit b{color:#fff}
.zs-incluso{font-size:12.5px;font-weight:700;color:#e6e7ea;margin-top:4px}
.zs-lista{list-style:none;margin:0;padding:0;display:grid;gap:7px;font-size:13px;color:#c4c7ce}
.zs-lista li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:6px;align-items:center}
.zs-lista li>span:first-child{font-size:16px;line-height:1;text-align:center}
.zs-lista b{color:#fff}
.zs-lista u{text-decoration-color:rgba(255,255,255,.35);text-underline-offset:2px}
.zs-carteira{font-size:15px;line-height:1;margin-top:2px}
.zs-rod{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:6px}
.zs-preco{font-weight:700;color:#fff;font-size:15px}
.zs-comprar{display:inline-flex;align-items:center;gap:8px;font:inherit;font-size:14px;font-weight:600;color:#fff;background:#16171a;border:1px solid #34353b;border-radius:10px;padding:9px 18px;cursor:pointer;transition:background .15s,border-color .15s,transform .1s}
.zs-comprar svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.zs-comprar:hover:not(:disabled){background:#202125;border-color:#4a4b52}
.zs-comprar:active:not(:disabled){transform:scale(.97)}
.zs-comprar:disabled{opacity:.55;cursor:default}

.zs-campo{display:flex;justify-content:space-between;gap:16px;font-size:14px}
.zs-campo span{color:var(--mut)}
.zs-campo b{color:#fff;font-variant-numeric:tabular-nums}
.zs-acoes{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.zs-b{font:inherit;font-size:14px;font-weight:600;color:#fff;border:0;border-radius:6px;padding:8px 16px;cursor:pointer;transition:filter .12s}
.zs-b:hover{filter:brightness(1.12)}
.zs-b.verde{background:#248046}.zs-b.cinza{background:#3b3c42}.zs-b.azul{background:#5865f2}
.zs-comprar:focus-visible,.zs-b:focus-visible,.zs-efemera button:focus-visible,.zs-copia input:focus-visible{outline:2px solid #00a8fc;outline-offset:2px}

.zs-efemera{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:6px;font-size:12px;color:var(--mut)}
.zs-efemera svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2}
.zs-efemera button{background:none;border:0;padding:0;font:inherit;color:#00a8fc;cursor:pointer}
.zs-efemera button:hover{text-decoration:underline}

.zs-pix{display:grid;grid-template-columns:132px minmax(0,1fr);gap:16px;align-items:center}
.zs-qr{width:132px;height:132px;border-radius:8px;display:block}
.zs-pix-info{display:grid;gap:8px}
.zs-copia{display:grid;gap:5px;font-size:12px;color:var(--mut)}
.zs-copia input{width:100%;background:var(--bg3);color:var(--tx);border:1px solid var(--linha);border-radius:6px;padding:8px 10px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace}
.zs-rodape{font-size:12px;color:var(--mut)}

.zs-gerando{display:flex;align-items:center;gap:6px;font-size:14px}
.zs-pts{display:inline-flex;gap:4px}
.zs-pts i{width:6px;height:6px;border-radius:50%;background:var(--mut);animation:zs-pt 1s infinite ease-in-out}
.zs-pts i:nth-child(2){animation-delay:.15s}.zs-pts i:nth-child(3){animation-delay:.3s}
@keyframes zs-pt{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
@media (prefers-reduced-motion:reduce){.zs-pts i{animation:none;opacity:.7}.zs-comprar{transition:none}}

@media (max-width:480px){.zs-msg{grid-template-columns:32px minmax(0,1fr);gap:10px}.zs-av{width:32px;height:32px}
  .zs-pix{grid-template-columns:1fr;justify-items:center}.zs-pix-info{width:100%}.zs-chat{padding-inline:10px}}
`;

// ───────────────────────── FAQ ─────────────────────────

function FaqList({ items, search, numbered }: { items: FaqItem[]; search?: boolean; numbered?: boolean }) {
  const [q, setQ] = useState("");
  const indexado = useMemo(() => items.map((item) => ({ item, texto: normalizar(`${item.q} ${item.a}`) })), [items]);
  const lista = useMemo(() => {
    const termo = normalizar(q.trim());
    return termo ? indexado.filter((x) => x.texto.includes(termo)) : indexado;
  }, [indexado, q]);

  return <div className="faqlist">
    {search && <input className="input" type="search" placeholder="Pesquisar nas perguntas" aria-label="Pesquisar nas perguntas"
      value={q} onChange={(e) => setQ(e.target.value)} />}
    {lista.map(({ item }, i) => <details key={item.q} className="faq"><summary><span>{numbered && <em className="n">{String(i + 1).padStart(2, "0")}</em>}{item.q}</span></summary><p>{item.a}</p></details>)}
    {!lista.length && <p className="muted" role="status">Nenhuma pergunta encontrada.</p>}
  </div>;
}

// ───────────────────────── blocos compartilhados ─────────────────────────

const BTN_SOBRE_CLARO: CSSProperties = { color: "#000", borderColor: "#d4d4d8" };

function PriceBox({ price, invite }: { price: string; invite: string }) {
  return <div className="pricebox" data-reveal>
    <div>
      <h2>ZyraSallers</h2>
      <div className="big">{price}</div>
      <p style={{ marginTop: 14 }}>Preço informado do produto.</p>
    </div>
    <div className="side">
      <ExternalLink className="btn ink lg" href={invite}>Adquirir ZyraSallers</ExternalLink>
      <a className="btn lg" style={BTN_SOBRE_CLARO} href="/dashboard">Acessar meu dashboard</a>
    </div>
  </div>;
}

function Hero({ pill, title, lead, actions, note }: {
  pill: string; title: ReactNode; lead: ReactNode; actions: ReactNode; note: ReactNode;
}) {
  return <section className="hero"><div className="wrap">
    <div>
      <span className="pill"><i aria-hidden="true" /> {pill}</span>
      <h1>{title}</h1>
      <p className="lead">{lead}</p>
      <div className="actions">{actions}</div>
      <small>{note}</small>
    </div>
    <HeroStage />
  </div></section>;
}

const PageHead = ({ title, children, narrow }: { title: string; children?: ReactNode; narrow?: boolean }) =>
  <section className="pagehead"><div className={narrow ? "wrap narrow" : "wrap"}><h1>{title}</h1>{children}</div></section>;

// ───────────────────────── mockups da Home (dados fictícios, sempre marcados como exemplo) ─────────────────────────

const BARRAS_EXEMPLO = [32, 46, 38, 62, 52, 78, 70, 92];
const VENDAS_EXEMPLO = [
  { n: "Marina", p: "Plano Mensal", v: "R$ 5,00", t: "agora" },
  { n: "Lucas", p: "Plano Mensal", v: "R$ 5,00", t: "há 12 min" },
  { n: "Ana", p: "Clone de servidor", v: "R$ 5,00", t: "há 41 min" },
  { n: "Rafael", p: "Plano Mensal", v: "R$ 5,00", t: "há 2 h" },
];

function PhoneMock() {
  return <div className="hm-phone-wrap" data-reveal>
    <div className="hm-phone" role="img" aria-label="Exemplo demonstrativo de notificação de venda no celular">
      <i className="hm-notch" />
      <div className="hm-screen">
        <div className="hm-notif"><span className="hm-ic">Z</span>
          <div><b>ZyraSallers</b><p>Venda aprovada: R$ 5,00</p></div><time>agora</time></div>
        <div className="hm-balance"><small>Saldo disponível</small><strong>R$ 1.240,00</strong></div>
        <div className="hm-listh">Últimas vendas</div>
        <ul className="hm-sales">
          {VENDAS_EXEMPLO.map((v) => <li key={v.n}>
            <span className="hm-av">{v.n[0]}</span>
            <div><b>{v.n}</b><small>{v.p} · {v.t}</small></div>
            <em>{v.v}</em>
          </li>)}
        </ul>
      </div>
    </div>
    <span className="hm-fake">Exemplo com dados fictícios</span>
  </div>;
}

function PixMock() {
  return <div className="hm-card" role="img" aria-label="Exemplo demonstrativo de pagamento PIX aprovado">
    <div className="hm-card-head"><b>Pague com PIX</b><span className="hm-ok">Aprovado</span></div>
    <div className="hm-pixrow">
      <QrExemplo seed={2026} />
      <div className="hm-kv">
        <div><span>Valor</span><b>R$ 5,00</b></div>
        <div><span>Pedido</span><b>#1042</b></div>
        <div><span>Status</span><b>Confirmado</b></div>
      </div>
    </div>
    <div className="hm-deliver"><i aria-hidden="true">✓</i> Entrega realizada por mensagem direta</div>
    <span className="hm-fake">Exemplo com dados fictícios</span>
  </div>;
}

function DashMock() {
  return <div className="hm-card" role="img" aria-label="Exemplo demonstrativo do dashboard de vendas">
    <div className="hm-card-head"><b>Visão geral</b><span className="hm-soft">Exemplo</span></div>
    <div className="hm-kpis">
      <div><span>Faturamento</span><b>R$ 1.240</b></div>
      <div><span>Vendas</span><b>62</b></div>
      <div><span>Clientes</span><b>48</b></div>
    </div>
    <div className="hm-bars">{BARRAS_EXEMPLO.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
    <span className="hm-fake">Exemplo com dados fictícios</span>
  </div>;
}

function Bloco({ tag, titulo, texto, itens, reverse, children }: {
  tag: string; titulo: string; texto: string; itens: string[]; reverse?: boolean; children: ReactNode;
}) {
  return <div className={`hm-row${reverse ? " rev" : ""}`} data-reveal>
    <div className="hm-copy">
      <span className="hm-tag">{tag}</span>
      <h3>{titulo}</h3>
      <p>{texto}</p>
      <ul>{itens.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
    <div className="hm-show">{children}</div>
  </div>;
}

// ───────────────────────── páginas ─────────────────────────

const PASSOS = [
  { t: "Adquira o bot", d: "A compra acontece no servidor oficial da Zyra Applications no Discord." },
  { t: "Entre com o Discord", d: "O site identifica os bots vinculados à sua conta." },
  { t: "Acompanhe suas vendas", d: "Veja estatísticas, clientes e histórico de cada bot no dashboard." },
];

export function Home() {
  const s = useSettings();
  usePageTitle("Venda pelo Discord");
  const faqResumo = useMemo(() => s.faq.slice(0, 6), [s.faq]);
  const recursos = useMemo(() => FEATURES.reduce((a, f) => a + f.items.length, 0), []);

  return <Public>
    <section className="hm-hero"><div className="wrap">
      <span className="pill"><i aria-hidden="true" /> Bot brasileiro de vendas para Discord</span>
      <h1>{s.title ?? <>Venda pelo Discord, <em>no automático.</em></>}</h1>
      <p className="lead">{s.text ?? "O ZyraSallers é um bot brasileiro desenvolvido pela Zyra Applications para automatizar vendas, gerenciar clientes e facilitar a administração do seu servidor Discord."}</p>
      <div className="actions">
        <ExternalLink className="btn solid lg" href={s.invite}>Adquirir ZyraSallers</ExternalLink>
        <a className="btn lg" href="#recursos">Ver recursos</a>
      </div>
      <ul className="hm-stats">
        <li><b>{s.price}</b><span>preço informado</span></li>
        <li><b>{recursos} recursos</b><span>para vender e administrar</span></li>
        <li><b>{GATEWAYS.length} modos</b><span>de receber pagamentos</span></li>
      </ul>
      <PhoneMock />
    </div></section>

    <Marquee />

    <section className="sec" id="recursos"><div className="wrap">
      <div className="sec-head center" data-reveal>
        <h2>O bot cuida das suas vendas do começo ao fim</h2>
        <p>Pedidos, pagamentos, clientes e administração em um único bot, direto no seu servidor Discord.</p>
      </div>

      <Bloco tag="01 · Loja e vendas" titulo="Uma loja dentro do seu servidor"
        texto="O cliente escolhe o produto, abre o carrinho e paga sem sair do Discord. Teste ao lado, do jeito que ele vê."
        itens={["Painel de produto com botão de compra", "Carrinho aberto na hora", "Entrega depois da aprovação do pagamento"]}>
        <DemoPainel />
      </Bloco>

      <Bloco reverse tag="02 · Pagamentos" titulo="Receba pelo método que você já usa"
        texto="Gateways automáticos, integração via IMAP e modo manual. O pedido é confirmado e entregue sem você precisar abrir nada."
        itens={["Pix com QR Code e copia e cola", "Confirmação automática nos gateways compatíveis", "Modo manual para quem prefere conferir"]}>
        <PixMock />
      </Bloco>

      <Bloco tag="03 · Dashboard" titulo="Acompanhe tudo em um só lugar"
        texto="Entre com o Discord e veja estatísticas, clientes e o histórico de vendas de cada bot."
        itens={["Faturamento e número de vendas", "Lista de clientes e pedidos", "Um painel para cada bot vinculado à sua conta"]}>
        <DashMock />
      </Bloco>
    </div></section>

    <section className="sec rule"><div className="wrap">
      <div className="sec-head center" data-reveal>
        <h2>Também incluído</h2>
        <p>Tudo que o seu servidor precisa para vender, divulgar e se manter organizado.</p>
      </div>
      <Features />
    </div></section>

    <section className="sec rule" id="pagamentos"><div className="wrap">
      <div className="sec-head center" data-reveal>
        <h2>Bancos e gateways de pagamento</h2>
        <p>Gateways automáticos, integração via IMAP e modo manual.</p>
      </div>
      <Gateways />
    </div></section>

    <section className="sec rule"><div className="wrap">
      <div className="sec-head center" data-reveal><h2>Do servidor ao painel em três passos</h2></div>
      <div className="steps">
        {PASSOS.map((p, i) => <div key={p.t} data-reveal className={`step spot${i ? ` d${i}` : ""}`}>
          <h3>{p.t}</h3><p>{p.d}</p>
        </div>)}
      </div>
    </div></section>

    <section className="sec tight"><div className="wrap"><PriceBox price={s.price} invite={s.invite} /></div></section>

    <section className="sec rule"><div className="wrap narrow">
      <div className="sec-head center" data-reveal><h2>Antes de começar</h2><p>As dúvidas mais comuns sobre o ZyraSallers.</p></div>
      <FaqList items={faqResumo} numbered />
      <p style={{ marginTop: 24, textAlign: "center" }}><a href="/faq">Ver todas as perguntas</a></p>
    </div></section>

    <section className="cta"><div className="wrap">
      <h2>Pronto para vender mais pelo Discord?</h2>
      <ExternalLink className="btn solid lg" href={s.invite}>Adquirir ZyraSallers</ExternalLink>
    </div></section>
  </Public>;
}

export function Product() {
  const s = useSettings();
  usePageTitle("ZyraSallers");

  return <Public>
    <Hero
      pill="Zyra Applications"
      title="ZyraSallers"
      lead="Bot brasileiro desenvolvido pela Zyra Applications, focado em vendas automatizadas dentro do Discord. Possui ferramentas para gerenciar pedidos, pagamentos, clientes, divulgação de produtos e administração do servidor."
      actions={<>
        <ExternalLink className="btn solid lg" href={s.invite}>Adquirir ZyraSallers</ExternalLink>
        <a className="btn lg" href="/dashboard">Acessar meu dashboard</a>
      </>}
      note={<>Preço informado: <b>{s.price}</b></>}
    />
    <Marquee />

    <section className="sec" id="funcionalidades"><div className="wrap">
      <div className="sec-head" data-reveal>
        <h2>Funcionalidades</h2>
        <p>Funcionalidades informadas do produto. A disponibilidade de cada uma depende da configuração real do seu bot.</p>
      </div>
      <Features />
    </div></section>

    <section className="sec rule"><div className="wrap">
      <div className="sec-head" data-reveal><h2>Bancos e gateways de pagamento</h2></div>
      <Gateways />
    </div></section>

    <section className="sec rule"><div className="wrap narrow">
      <div className="sec-head" data-reveal><h2>Perguntas frequentes</h2></div>
      <FaqList items={s.faq} />
    </div></section>
  </Public>;
}

export function Pricing() {
  const s = useSettings();
  usePageTitle("Preços");

  return <Public>
    <PageHead title="Preços">
      <p>Este é o preço informado. Não há outros planos, taxas ou benefícios comerciais definidos nesta página.</p>
    </PageHead>
    <section className="sec tight"><div className="wrap"><PriceBox price={s.price} invite={s.invite} /></div></section>
  </Public>;
}

export function Faq() {
  const s = useSettings();
  usePageTitle("Perguntas frequentes");

  return <Public>
    <PageHead title="Perguntas frequentes" narrow />
    <section className="sec tight"><div className="wrap narrow"><FaqList items={s.faq} search /></div></section>
  </Public>;
}

// ───────────────────────── login ─────────────────────────

/** Mensagens para o público: sem nomes de variáveis de ambiente nem detalhes de infraestrutura. */
const ERROS_LOGIN: Record<string, string> = {
  state: "A verificação de segurança do login expirou. Tente entrar de novo.",
  token: "O Discord não concluiu o login. Tente novamente em instantes.",
  usuario: "Não foi possível ler seu perfil no Discord. Tente novamente.",
  banco: "Não foi possível salvar seu perfil agora. Tente novamente em instantes.",
  sessao: "Não foi possível criar sua sessão agora. Tente novamente em instantes.",
};
const ERRO_GENERICO = "Não foi possível concluir o login com o Discord. Tente novamente.";

function useMensagemLogin() {
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search);
    if (p.get("expirada")) return "Sua sessão expirou. Entre novamente.";
    const erro = p.get("erro");
    if (!erro) return null;
    // hasOwnProperty: evita que ?erro=constructor devolva algo de Object.prototype
    const conhecido = Object.prototype.hasOwnProperty.call(ERROS_LOGIN, erro);
    const codigo = erro.replace(/[^\w-]/g, "").slice(0, 32);
    return `${conhecido ? ERROS_LOGIN[erro] : ERRO_GENERICO} (código: ${codigo})`;
  }, []);
}

export function Login() {
  const msg = useMensagemLogin();
  usePageTitle("Entrar");

  return <Public><div className="wrap"><div className="loginbox">
    <h1 style={{ fontSize: "2.2rem" }}>Entrar</h1>
    <p style={{ margin: "14px 0 24px" }}>
      Use sua conta Discord para acessar o painel dos seus bots. Pedimos apenas a permissão de identificação: seu ID, nome e avatar.
    </p>
    {msg && <div className="state err" role="alert">{msg}</div>}
    <a className="btn solid lg" href="/api/auth/discord">Entrar com Discord</a>
  </div></div></Public>;
}

// ───────────────────────── páginas legais ─────────────────────────

/** Troque para false quando o texto jurídico for revisado: hoje esse aviso aparece pra todo visitante. */
const MOSTRAR_AVISO_MODELO = true;

interface SecaoLegal { h?: string; p: string[] }

const LEGAL: Record<"privacidade" | "termos", { titulo: string; secoes: SecaoLegal[] }> = {
  privacidade: {
    titulo: "Política de Privacidade",
    secoes: [
      { h: "Dados que coletamos", p: [
        "Ao entrar com Discord, guardamos seu ID, nome de usuário, nome global, avatar e as datas de primeiro e último acesso. Não guardamos tokens de acesso do Discord.",
        "Das vendas recebidas do Bot Manager guardamos apenas o necessário para gestão: ID, nome e ícone do cliente (quando enviados), produto, valores, método de pagamento, status e datas.",
      ] },
      { h: "Como usamos", p: [
        "Para autenticar você, identificar quais bots estão vinculados à sua conta e exibir estatísticas e histórico de vendas.",
      ] },
      { h: "Seus direitos", p: [
        "Você pode solicitar acesso, correção ou exclusão dos seus dados pelo servidor oficial no Discord, respeitadas as obrigações legais de guarda.",
      ] },
    ],
  },
  termos: {
    titulo: "Termos de Uso",
    secoes: [
      { p: [
        "Ao usar o site você concorda em acessar apenas dados dos bots vinculados à sua conta Discord, em não tentar contornar controles de acesso e em manter sigilo das credenciais de API geradas.",
        "O acesso ao painel depende da propriedade do bot registrada pela integração oficial. Condições comerciais não descritas neste site devem ser tratadas no servidor oficial da Zyra Applications.",
      ] },
    ],
  },
};

export function Legal({ kind }: { kind: "privacidade" | "termos" }) {
  const { titulo, secoes } = LEGAL[kind];
  usePageTitle(titulo);

  return <Public><section className="sec tight"><div className="wrap narrow legal">
    {MOSTRAR_AVISO_MODELO && <div className="state">Modelo inicial. Revise com assessoria jurídica antes de publicar.</div>}
    <h1 style={{ fontSize: "2.6rem" }}>{titulo}</h1>
    {secoes.map((sec, si) => <div key={sec.h ?? si}>
      {sec.h && <h3>{sec.h}</h3>}
      {sec.p.map((texto, pi) =>
        <p key={pi} style={!sec.h && si === 0 && pi === 0 ? { marginTop: 20 } : undefined}>{texto}</p>)}
    </div>)}
  </div></section></Public>;
}
