import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Painel de produto demonstrativo, imitando uma mensagem do bot no Discord.
 * Tudo é fictício: o PIX e o QR Code gerados NÃO são válidos e nenhum pagamento acontece.
 * Arquivo único: o CSS vem junto (prefixo .zs-) e não mexe no resto do site.
 */

// ───────────────────────── dados de exemplo ─────────────────────────

interface Plano { id: string; nome: string; desc: string; preco: number }

const PLANOS: Plano[] = [
  { id: "mensal", nome: "Plano Mensal", desc: "Acesso por 1 mês", preco: 20 },
  { id: "trimestral", nome: "Plano Trimestral", desc: "Acesso por 3 meses", preco: 55 },
  { id: "anual", nome: "Plano Anual", desc: "Acesso por 12 meses", preco: 190 },
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const faixa = `${brl(Math.min(...PLANOS.map((p) => p.preco)))} - ${brl(Math.max(...PLANOS.map((p) => p.preco)))}`;
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

// ───────────────────────── seletor estilo Discord ─────────────────────────

function Seletor({ onEscolher, desabilitado }: { onEscolher: (p: Plano) => void; desabilitado?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  const escolher = (p: Plano) => { setAberto(false); onEscolher(p); };

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAberto(true); setAtivo((a) => Math.min(a + 1, PLANOS.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAberto(true); setAtivo((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Escape") setAberto(false);
    else if ((e.key === "Enter" || e.key === " ") && aberto) { e.preventDefault(); escolher(PLANOS[ativo]); }
  };

  return (
    <div className="zs-sel" ref={raiz}>
      <button type="button" className="zs-sel-btn" aria-haspopup="listbox" aria-expanded={aberto}
        aria-controls={`${id}-lista`} aria-activedescendant={aberto ? `${id}-${ativo}` : undefined}
        disabled={desabilitado} onClick={() => setAberto((a) => !a)} onKeyDown={teclas}>
        <span>Selecione uma opção para comprar</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {aberto && (
        <ul className="zs-sel-lista" role="listbox" id={`${id}-lista`} aria-label="Planos disponíveis">
          {PLANOS.map((p, i) => (
            <li key={p.id} id={`${id}-${i}`} role="option" aria-selected={i === ativo}
              className={i === ativo ? "on" : undefined} onMouseEnter={() => setAtivo(i)} onClick={() => escolher(p)}>
              <span><b>{p.nome}</b><small>{p.desc}</small></span>
              <em>{brl(p.preco)}</em>
            </li>
          ))}
        </ul>
      )}
    </div>
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
  const [chave, setChave] = useState(0); // zera o seletor ao reiniciar

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

  const reiniciar = () => { setEtapa({ t: "painel" }); setCopiado(null); setChave((k) => k + 1); };

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
              <li><b>Escolha um plano</b><span>Use o menu do painel para selecionar uma opção.</span></li>
              <li><b>Clique em Comprar</b><span>O bot abre o carrinho e gera o pagamento por PIX.</span></li>
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
              {/* mensagem fixa do painel */}
              <Mensagem>
                <div className="zs-embed" style={{ ["--bar" as string]: "#fff" }}>
                  <h4>Produto Exemplo</h4>
                  <div className="zs-texto">
                    <p><b>Escolha o seu plano</b></p>
                    {PLANOS.map((p) => <p key={p.id} className="zs-li"><b>{p.nome}</b><span>{p.desc}</span></p>)}
                    <p className="zs-suave">Selecione uma opção abaixo para abrir o carrinho.</p>
                  </div>
                  <hr />
                  <p className="zs-preco">{faixa}</p>
                  <Seletor key={chave} desabilitado={etapa.t === "gerando"} onEscolher={(plano) => { setCopiado(null); setEtapa({ t: "carrinho", plano }); }} />
                </div>
              </Mensagem>

              {/* fluxo de compra: aparece como mensagem só sua, igual no Discord */}
              <div aria-live="polite">
                {etapa.t === "carrinho" && (
                  <Mensagem efemera onDispensar={reiniciar}>
                    <Embed titulo="Carrinho aberto">
                      <Campo nome="Produto" valor="Produto Exemplo" />
                      <Campo nome="Plano" valor={etapa.plano.nome} />
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
                        <p className="zs-texto">Pedido <b>#{etapa.pedido}</b> confirmado. {etapa.plano.nome}, {brl(etapa.plano.preco)}.</p>
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

.zs-janela{--bg:#313338;--bg2:#2b2d31;--bg3:#1e1f22;--tx:#dbdee1;--mut:#949ba4;--linha:#3f4147;
  background:var(--bg);color:var(--tx);border:1px solid #3a3c43;border-radius:14px;overflow:hidden;
  box-shadow:0 30px 80px -30px rgba(0,0,0,.7);font-family:'gg sans','Segoe UI',system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.4;text-align:left}
.zs-janela *{box-sizing:border-box}
.zs-janela h4,.zs-janela p{margin:0}
.zs-janela-topo{display:flex;align-items:center;gap:8px;padding:12px 16px;background:var(--bg);border-bottom:1px solid var(--bg3);box-shadow:0 1px 0 rgba(0,0,0,.2)}
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

.zs-embed{position:relative;background:var(--bg2);border:1px solid #26282c;border-left:4px solid var(--bar,#fff);border-radius:6px;padding:12px 14px 14px;max-width:480px;display:grid;gap:10px}
.zs-embed h4{font-size:15px;font-weight:700;color:#fff}
.zs-embed hr{border:0;border-top:1px solid var(--linha);margin:2px 0}
.zs-texto{display:grid;gap:6px;font-size:14px}
.zs-li{display:flex;flex-direction:column}
.zs-li b{color:#fff}
.zs-li span{color:var(--mut);font-size:13px}
.zs-suave{color:var(--mut);font-size:13px;margin-top:4px}
.zs-preco{font-weight:700;color:#fff}

.zs-sel{position:relative}
.zs-sel-btn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--bg3);color:var(--mut);border:1px solid var(--linha);border-radius:6px;padding:11px 12px;font:inherit;cursor:pointer;text-align:left}
.zs-sel-btn:hover:not(:disabled){border-color:#5b5e66;color:var(--tx)}
.zs-sel-btn:disabled{opacity:.55;cursor:default}
.zs-sel-btn svg{width:18px;height:18px;flex:none;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;transition:transform .15s}
.zs-sel-btn[aria-expanded=true] svg{transform:rotate(180deg)}
.zs-sel-lista{position:absolute;z-index:5;left:0;right:0;bottom:calc(100% + 6px);margin:0;padding:6px;list-style:none;background:var(--bg3);border:1px solid var(--linha);border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,.5)}
.zs-sel-lista li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 10px;border-radius:5px;cursor:pointer}
.zs-sel-lista li.on{background:#35373c}
.zs-sel-lista b{display:block;color:#fff;font-weight:600}
.zs-sel-lista small{display:block;color:var(--mut);font-size:12px}
.zs-sel-lista em{font-style:normal;font-weight:700;color:#fff;white-space:nowrap}

.zs-campo{display:flex;justify-content:space-between;gap:16px;font-size:14px}
.zs-campo span{color:var(--mut)}
.zs-campo b{color:#fff;font-variant-numeric:tabular-nums}
.zs-acoes{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.zs-b{font:inherit;font-size:14px;font-weight:600;color:#fff;border:0;border-radius:4px;padding:8px 16px;cursor:pointer;transition:filter .12s}
.zs-b:hover{filter:brightness(1.12)}
.zs-b.verde{background:#248046}.zs-b.cinza{background:#4e5058}.zs-b.azul{background:#5865f2}
.zs-sel-btn:focus-visible,.zs-b:focus-visible,.zs-efemera button:focus-visible,.zs-copia input:focus-visible{outline:2px solid #00a8fc;outline-offset:2px}

.zs-efemera{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:6px;font-size:12px;color:var(--mut)}
.zs-efemera svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2}
.zs-efemera button{background:none;border:0;padding:0;font:inherit;color:#00a8fc;cursor:pointer}
.zs-efemera button:hover{text-decoration:underline}

.zs-pix{display:grid;grid-template-columns:132px minmax(0,1fr);gap:16px;align-items:center}
.zs-qr{width:132px;height:132px;border-radius:6px;display:block}
.zs-pix-info{display:grid;gap:8px}
.zs-copia{display:grid;gap:5px;font-size:12px;color:var(--mut)}
.zs-copia input{width:100%;background:var(--bg3);color:var(--tx);border:1px solid var(--linha);border-radius:5px;padding:8px 10px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace}
.zs-rodape{font-size:12px;color:var(--mut)}

.zs-gerando{display:flex;align-items:center;gap:6px;font-size:14px}
.zs-pts{display:inline-flex;gap:4px}
.zs-pts i{width:6px;height:6px;border-radius:50%;background:var(--mut);animation:zs-pt 1s infinite ease-in-out}
.zs-pts i:nth-child(2){animation-delay:.15s}.zs-pts i:nth-child(3){animation-delay:.3s}
@keyframes zs-pt{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
@media (prefers-reduced-motion:reduce){.zs-pts i{animation:none;opacity:.7}.zs-sel-btn svg{transition:none}}

@media (max-width:900px){.zs-grid{grid-template-columns:1fr}}
@media (max-width:480px){.zs-msg{grid-template-columns:32px minmax(0,1fr);gap:10px}.zs-av{width:32px;height:32px}
  .zs-pix{grid-template-columns:1fr;justify-items:center}.zs-pix-info{width:100%}.zs-chat{padding-inline:10px}}
`;
