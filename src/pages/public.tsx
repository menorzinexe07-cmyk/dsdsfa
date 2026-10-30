import { useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Painel de produto demonstrativo, imitando uma mensagem do bot no Discord.
 * Tudo é fictício: o PIX e o QR Code gerados NÃO são válidos e nenhum pagamento acontece.
 * Arquivo único: o CSS vem junto (prefixo .zs-) e não mexe no resto do site.
 */

// ───────────────────────── dados de exemplo ─────────────────────────

interface Plano { id: string; nome: string; desc: string; preco: number }

const PRODUTO = "Cl0nar servidores";
const PLANO: Plano = { id: "clone", nome: "Clone de servidor", desc: "Estrutura completa, pronta em poucos minutos", preco: 5 };

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

// ───────────────────────── QR Code de exemplo (visual, não escaneável) ─────────────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const N = 29; // equivale a um QR "versão 3"

function QrExemplo({ seed }: { seed: number }) {
  const caminho = useMemo(() => {
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
    <svg className="zs-qr" viewBox={`-2 -2 ${N + 4} ${N + 4}`} role="img" shapeRendering="crispEdges"
      aria-label="QR Code de exemplo, não é válido para pagamento">
      <rect x="-2" y="-2" width={N + 4} height={N + 4} fill="#fff" />
      <path d={caminho} fill="#111" />
    </svg>
  );
}

// ───────────────────────── peças de mensagem ─────────────────────────

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
  <div className="zs-embed" style={{ ["--bar" as string]: cor }}>
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

// ───────────────────────── componente principal ─────────────────────────

export function DemoLoja() {
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
    <section className="sec rule" id="demonstracao">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="zs-grid">
          <div className="zs-copy" data-reveal>
            <h2>Veja como seu cliente compra</h2>
            <p>Este painel funciona como o do seu servidor. Teste do início ao fim, sem pagar nada.</p>
            <ol>
              <li><b>Clique em Comprar</b><span>O bot abre o carrinho com o produto e o valor.</span></li>
              <li><b>Gere o PIX</b><span>O bot cria o pagamento com QR Code e código copia e cola.</span></li>
              <li><b>Simule o pagamento</b><span>Veja a confirmação e a entrega acontecerem no chat.</span></li>
            </ol>
            <p className="zs-aviso">Demonstração: o QR Code e o código PIX são fictícios e não geram cobrança.</p>
          </div>

          <div className="zs-janela" data-reveal>
            <div className="zs-janela-topo">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" /></svg>
              <b>loja</b><i>Exemplo demonstrativo</i>
            </div>

            <div className="zs-chat">
              {/* mensagem fixa do painel, igual ao bot no Discord */}
              <Mensagem>
                <div className="zs-embed zs-produto" style={{ ["--bar" as string]: "#fff" }}>
                  <p className="zs-eyebrow">Clonar</p>
                  <h4 className="zs-titulo">{PRODUTO}</h4>
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
                    <p className="zs-preco">{brl(PLANO.preco)}</p>
                    <button type="button" className="zs-comprar" disabled={etapa.t === "gerando"}
                      onClick={() => { setCopiado(null); setEtapa({ t: "carrinho", plano: PLANO }); }}>
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
                      <Campo nome="Produto" valor={PRODUTO} />
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
                        <p className="zs-texto">Pedido <b>#{etapa.pedido}</b> confirmado. {PRODUTO}, {brl(etapa.plano.preco)}.</p>
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
        </div>
      </div>
    </section>
  );
}

// ───────────────────────── estilos ─────────────────────────

const CSS = `
.zs-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:clamp(28px,5vw,72px);align-items:start}
.zs-copy h2{margin:0 0 14px}
.zs-copy>p{margin:0;max-width:44ch}
.zs-copy ol{list-style:none;counter-reset:zs;margin:32px 0 0;padding:0;display:grid;gap:22px}
.zs-copy li{counter-increment:zs;display:grid;grid-template-columns:34px 1fr;column-gap:14px;align-items:start}
.zs-copy li::before{content:counter(zs);grid-row:span 2;width:34px;height:34px;border-radius:50%;border:1px solid currentColor;display:grid;place-items:center;font-weight:700;font-size:.9rem;opacity:.85}
.zs-copy li b{display:block;font-size:1.02rem}
.zs-copy li span{opacity:.7;line-height:1.5}
.zs-copy .zs-aviso{margin-top:30px;font-size:.88rem;opacity:.65;max-width:44ch}

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

@media (max-width:900px){.zs-grid{grid-template-columns:1fr}}
@media (max-width:480px){.zs-msg{grid-template-columns:32px minmax(0,1fr);gap:10px}.zs-av{width:32px;height:32px}
  .zs-pix{grid-template-columns:1fr;justify-items:center}.zs-pix-info{width:100%}.zs-chat{padding-inline:10px}}
`;
