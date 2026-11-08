import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Dash } from "../ui/Shell";
import { ApiError, api, brl, dt, useApi } from "../ui/api";
import { Async } from "../ui/kit";
import { Emo, type EmoName } from "../ui/Emoji";
import { Modal } from "./products";

type Campo = { nome: string; desc: string; valor: number; emoji: string; criado: number; estoque: number; infinito: boolean; pendente: boolean };
type Op = { id: number; tipo: string; campo: string; qtd: number | null; infinito: boolean; modo: string | null; estado: "pendente" | "aplicado" | "falhou"; erro: string | null; em: string };
type Vista = { product: { id: string; name: string }; fields: Campo[]; ops: Op[]; max_fields: number };
type CampoDraft = { nome: string; desc: string; valor: string; emoji: string };
type Modo = "infinito" | "linhas" | "txt" | "fantasma";
type EstDraft = { valor: string; texto: string; arquivo: string; quantidade: string };
type Dlg = null | { k: "criar"; draft?: CampoDraft; erro?: string } | { k: "estoque"; modo: Modo; campo: string; draft?: EstDraft; erro?: string } | { k: "excluir"; campo: string };

const MODOS: { k: Modo; icone: EmoName; titulo: string; texto: string }[] = [
  { k: "infinito", icone: "infinity", titulo: "Stock Infinito", texto: "Um valor que nunca acaba. Todo cliente recebe o mesmo." },
  { k: "linhas", icone: "notepad", titulo: "1 por 1", texto: "Cada linha que você escrever vira um item do estoque." },
  { k: "txt", icone: "doc", titulo: ".txt", texto: "Envie um arquivo .txt: cada linha dele vira um item." },
  { k: "fantasma", icone: "ghost", titulo: "Stock fantasma", texto: "Cria vários itens numerados a partir de um valor (1/5, 2/5…)." },
];
const MODO_NOME: Record<string, string> = { infinito: "Stock infinito", linhas: "1 por 1", txt: ".txt", fantasma: "Stock fantasma" };

/** Mensagem de erro em português para cada resposta do servidor. */
function erroTexto(e: unknown) {
  const x = e as ApiError, c = x?.code, s = x?.status ?? 0;
  if (s === 0) return "Sem conexão com o site. Confira sua internet e tente de novo.";
  const por: Record<string, string> = {
    field_exists: "Já existe um campo com esse nome neste produto.", field_limit: "Este produto chegou ao limite de 25 campos.",
    field_not_found: "Esse campo não existe mais. Atualize a página.", empty_stock: "Não há nenhuma linha para adicionar.", too_many_lines: "O máximo é 20.000 linhas por vez.",
    line_too_long: "Existem linhas com mais de 2.000 caracteres.", not_text: "O arquivo não parece ser um .txt de texto.", payload_too_large: "O texto é grande demais (máximo de uns 3 MB).",
  };
  if (c && por[c]) return por[c];
  if (s === 413) return "O texto é grande demais (máximo de uns 3 MB).";
  if (s === 429) return "Muitas tentativas seguidas. Aguarde um instante e tente de novo.";
  if (s === 404) return "Este produto não existe mais. Atualize a página.";
  if (s === 401) return "Sua sessão expirou. Entre de novo.";
  if (s === 422) return "Confira os campos e tente de novo.";
  return `Não foi possível salvar (erro ${s}). Tente de novo.`;
}

const idEmoji = (v: string) => /^\d{15,25}$/.test(v) ? v : (v.match(/^<a?:\w+:(\d{15,25})>$/)?.[1] ?? null);
/** Mostra o emoji do campo: ID/menção de emoji personalizado do Discord vira imagem; emoji comum aparece como texto. */
function EmojiCampo({ valor, nome, grande = false }: { valor: string; nome: string; grande?: boolean }) {
  const [quebrou, setQuebrou] = useState(false);
  const v = valor.trim(), id = idEmoji(v);
  useEffect(() => setQuebrou(false), [v]);
  return <span className={`fx-emoji${grande ? " lg" : ""}`}>{id && !quebrou
    ? <img src={`https://cdn.discordapp.com/emojis/${id}.png?size=64`} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setQuebrou(true)} />
    : v && !id ? <b>{v.slice(0, 4)}</b> : <i>{(nome || "?")[0]}</i>}</span>;
}

const normPreco = (s: string) => s.trim().replace(",", ".");
const precoOk = (s: string) => /^\d{1,7}(\.\d{1,2})?$/.test(normPreco(s)) && Number(normPreco(s)) > 0;

function NovoCampo({ draft, erro, onClose, onSubmit }: { draft?: CampoDraft; erro?: string; onClose: () => void; onSubmit: (d: CampoDraft) => void }) {
  const [nome, setNome] = useState(draft?.nome ?? ""), [desc, setDesc] = useState(draft?.desc ?? ""), [valor, setValor] = useState(draft?.valor ?? ""), [emoji, setEmoji] = useState(draft?.emoji ?? "");
  const [tentou, setTentou] = useState(false);
  const falta = { nome: !nome.trim(), valor: !precoOk(valor) };
  const enviar = (e: React.FormEvent) => { e.preventDefault(); setTentou(true); if (falta.nome || falta.valor) return; onSubmit({ nome: nome.trim(), desc: desc.trim(), valor: normPreco(valor), emoji: emoji.trim() }); };
  return <Modal title="Criar campo" wide onClose={onClose}>
    <form className="pform" onSubmit={enviar} noValidate>
      <label>Nome do campo
        <input className="input" value={nome} maxLength={80} autoFocus placeholder="ex.: Plano Mensal" aria-invalid={tentou && falta.nome} onChange={(e) => setNome(e.target.value)} />
        <small className={tentou && falta.nome ? "bad" : ""}>{tentou && falta.nome ? "Informe o nome do campo." : `${nome.length}/80`}</small></label>
      <label><span>Descrição do campo <em className="fx-opc">(opcional)</em></span>
        <textarea className="input fx-grande" rows={8} value={desc} maxLength={500} placeholder="Explique o que o cliente leva neste campo…" onChange={(e) => setDesc(e.target.value)} />
        <small>{desc.length}/500</small></label>
      <div className="fx-duas">
        <label>Preço
          <span className="fx-preco"><b>R$</b><input className="input" inputMode="decimal" value={valor} placeholder="0,00" aria-invalid={tentou && falta.valor}
            onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, "").slice(0, 10))} /></span>
          <small className={tentou && falta.valor ? "bad" : ""}>{tentou && falta.valor ? "Digite só números, maior que zero (ex.: 12,50)." : "Apenas números."}</small></label>
        <label><span>ID de um emoji <em className="fx-opc">(opcional)</em></span>
          <span className="fx-emo-in"><EmojiCampo valor={emoji} nome={nome} /><input className="input" value={emoji} maxLength={100} placeholder="ex.: 1234567890123456789" onChange={(e) => setEmoji(e.target.value)} /></span>
          <small>O ID de um emoji do Discord. Pode deixar em branco.</small></label>
      </div>
      {erro && <div className="state err" role="alert">{erro}</div>}
      <div className="pm-foot"><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" className="btn solid">Criar campo</button></div>
    </form>
  </Modal>;
}

const linhasDe = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

function EstoqueModal({ modo, campo, draft, erro, onClose, onSubmit }: { modo: Modo; campo: string; draft?: EstDraft; erro?: string; onClose: () => void; onSubmit: (d: EstDraft, qtd: number) => void }) {
  const [valor, setValor] = useState(draft?.valor ?? ""), [texto, setTexto] = useState(draft?.texto ?? ""), [arquivo, setArquivo] = useState(draft?.arquivo ?? ""), [quantidade, setQuantidade] = useState(draft?.quantidade ?? "");
  const [aviso, setAviso] = useState<string | null>(null), [tentou, setTentou] = useState(false), [arrasta, setArrasta] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const meta = MODOS.find((m) => m.k === modo)!;
  const linhas = useMemo(() => (modo === "linhas" || modo === "txt" ? linhasDe(texto) : []), [modo, texto]);
  const n = Number(quantidade);

  const lerArquivo = async (f?: File | null) => {
    if (!f) return;
    if (!/\.txt$/i.test(f.name)) return setAviso("Envie um arquivo com a extensão .txt.");
    if (f.size > 2 * 1024 * 1024) return setAviso("O arquivo passa de 2 MB.");
    const t = await f.text();
    if (t.includes("\u0000")) return setAviso("O arquivo não parece ser um .txt de texto.");
    if (!linhasDe(t).length) return setAviso("O arquivo está vazio.");
    setAviso(null); setTexto(t); setArquivo(f.name);
  };
  const invalido = modo === "infinito" ? !valor.trim() : modo === "fantasma" ? !valor.trim() || !Number.isInteger(n) || n < 1 || n > 10000 : !linhas.length || linhas.length > 20000;
  const qtd = modo === "infinito" ? 1 : modo === "fantasma" ? n : linhas.length;
  const enviar = (e: React.FormEvent) => { e.preventDefault(); setTentou(true); if (invalido) return; onSubmit({ valor: valor.trim(), texto, arquivo, quantidade }, qtd); };
  const v = valor.trim();

  return <Modal title={`Estoque: ${meta.titulo}`} wide={modo === "linhas" || modo === "txt"} onClose={onClose}>
    <form className="pform" onSubmit={enviar} noValidate>
      <p className="muted fx-para">Campo <b>{campo}</b>. O estoque novo é <b>somado</b> ao que já existe.</p>
      {modo === "infinito" && <label><span>Valor do estoque <em className="fx-opc">(o que será enviado)</em></span>
        <input className="input" value={valor} maxLength={1900} autoFocus placeholder="ex.: login@email.com:senha123" aria-invalid={tentou && !v} onChange={(e) => setValor(e.target.value)} />
        <small className={tentou && !v ? "bad" : ""}>{tentou && !v ? "Informe o valor." : "O bot entrega esse valor para todo cliente, sem nunca acabar."}</small></label>}
      {modo === "linhas" && <label><span>Itens do estoque <em className="fx-opc">(1 por linha)</em></span>
        <textarea className="input fx-grande mono" rows={14} value={texto} autoFocus placeholder={"item 1\nitem 2\nitem 3"} aria-invalid={tentou && !linhas.length} onChange={(e) => setTexto(e.target.value)} />
        <small className={linhas.length > 20000 || (tentou && !linhas.length) ? "bad" : ""}>{linhas.length > 20000 ? "O máximo é 20.000 linhas por vez." : tentou && !linhas.length ? "Escreva pelo menos uma linha." : `${linhas.length.toLocaleString("pt-BR")} ${linhas.length === 1 ? "item" : "itens"} (linhas vazias são ignoradas)`}</small></label>}
      {modo === "txt" && <div className="pfile"><span className="lbl">Arquivo .txt</span>
        <div className={`drop${arrasta ? " drag" : ""}${arquivo ? " has fx-txt-ok" : ""}`} role="button" tabIndex={0} aria-label="Escolher o arquivo .txt"
          onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setArrasta(true); }} onDragLeave={() => setArrasta(false)} onDrop={(e) => { e.preventDefault(); setArrasta(false); void lerArquivo(e.dataTransfer.files?.[0]); }}>
          {arquivo ? <div className="fx-arq"><Emo n="doc" size={40} /><b>{arquivo}</b><small>{linhas.length.toLocaleString("pt-BR")} {linhas.length === 1 ? "item" : "itens"} encontrados</small></div>
            : <div><b>Arraste o arquivo .txt ou clique para escolher</b><small>Só .txt · até 2 MB · uma linha = um item</small></div>}
        </div>
        <input ref={input} type="file" hidden accept=".txt,text/plain" onChange={(e) => { void lerArquivo(e.target.files?.[0]); e.target.value = ""; }} />
        {arquivo && <><pre className="fx-prev">{linhas.slice(0, 5).join("\n")}{linhas.length > 5 ? `\n… (+${(linhas.length - 5).toLocaleString("pt-BR")})` : ""}</pre>
          <div className="row"><button type="button" className="btn sm" onClick={() => input.current?.click()}>Trocar arquivo</button></div></>}
        {aviso && <small className="bad">{aviso}</small>}{tentou && !arquivo && !aviso && <small className="bad">Escolha um arquivo .txt.</small>}</div>}
      {modo === "fantasma" && <>
        <div className="fx-duas">
          <label>Quantidade do estoque
            <input className="input" inputMode="numeric" value={quantidade} autoFocus placeholder="ex.: 5" aria-invalid={tentou && (!Number.isInteger(n) || n < 1 || n > 10000)}
              onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, "").slice(0, 5))} />
            <small className={tentou && (!Number.isInteger(n) || n < 1 || n > 10000) ? "bad" : ""}>De 1 a 10.000.</small></label>
          <label>Valor
            <input className="input" value={valor} maxLength={1900} placeholder="ex.: Conta Premium" aria-invalid={tentou && !v} onChange={(e) => setValor(e.target.value)} />
            <small className={tentou && !v ? "bad" : ""}>{tentou && !v ? "Informe o valor." : "Cada item recebe a numeração depois do valor."}</small></label>
        </div>
        {v && Number.isInteger(n) && n >= 1 && <pre className="fx-prev">{[1, 2, n > 3 ? "…" : 3, n].filter((x, i, a) => a.indexOf(x) === i && (x === "…" || (x as number) <= n)).map((x) => x === "…" ? "…" : `${v} ${x}/${n}`).join("\n")}</pre>}</>}
      {erro && <div className="state err" role="alert">{erro}</div>}
      <div className="pm-foot"><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" className="btn solid">Adicionar ao estoque</button></div>
    </form>
  </Modal>;
}

const estoqueTxt = (c: Campo) => c.infinito ? "Infinito" : c.estoque ? c.estoque.toLocaleString("pt-BR") : "Sem estoque";

function OpLinha({ o }: { o: Op }) {
  const t = o.tipo === "field.create" ? "Campo criado" : o.tipo === "field.delete" ? "Campo excluído"
    : `+${(o.qtd ?? 0).toLocaleString("pt-BR")} ${o.qtd === 1 ? "item" : "itens"} · ${MODO_NOME[o.modo ?? ""] ?? "Estoque"}`;
  return <li><span className="fx-op-t"><b>{t}</b>{o.campo && o.tipo !== "stock.add" && <em> {o.campo}</em>}<small>{dt(o.em)}</small></span>
    <span className={`badge ${o.estado === "aplicado" ? "synced" : o.estado === "falhou" ? "failed" : "awaiting"}`} title={o.erro ?? undefined}>{o.estado === "aplicado" ? "Aplicado no bot" : o.estado === "falhou" ? "Falhou" : "Aguardando o bot"}</span></li>;
}

export function Fields({ botId, productId }: { botId: string; productId: string }) {
  const enc = encodeURIComponent(botId), base = `/api/bots/${enc}/products/${productId}/fields`;
  const info = useApi<any>(`/api/bots/${enc}`);
  const q = useApi<Vista>(base);
  const [vista, setVista] = useState<Vista | null>(null), ops = useRef(0);
  const [aberto, setAberto] = useState<string | null>(null), [dlg, setDlg] = useState<Dlg>(null), [nota, setNota] = useState<{ ok: boolean; t: string } | null>(null);
  // O painel atualiza na hora e o servidor confirma em seguida; se falhar, volta atrás e reabre a janela com o que foi digitado.
  useEffect(() => { if (q.data && ops.current === 0) setVista(q.data); }, [q.data]);
  const v = vista ?? q.data ?? null;
  const fila = !!v?.ops.some((o) => o.estado === "pendente" && o.id > 0);
  useEffect(() => { if (!fila) return; const t = setTimeout(q.reload, 8000); return () => clearTimeout(t); }, [fila, q.data]); // enquanto o bot não confirmou, confere de novo
  const run = async (fn: () => Promise<void>) => { ops.current++; try { await fn(); } finally { ops.current--; if (ops.current === 0) q.reload(); } };
  const opTmp = (tipo: string, campo: string, extra: Partial<Op> = {}): Op => ({ id: -Date.now(), tipo, campo, qtd: null, infinito: false, modo: null, estado: "pendente", erro: null, em: new Date().toISOString(), ...extra });

  const criar = (d: CampoDraft) => {
    const antes = v!;
    const novo: Campo = { nome: d.nome, desc: d.desc, valor: Number(d.valor), emoji: d.emoji, criado: Date.now(), estoque: 0, infinito: false, pendente: true };
    setVista({ ...antes, fields: [...antes.fields, novo], ops: [opTmp("field.create", d.nome), ...antes.ops] }); setDlg(null); setNota(null);
    void run(async () => {
      try { const r = await api(base, { method: "POST", json: { nome: d.nome, desc: d.desc, valor: d.valor, emoji: d.emoji } }); setVista(r); setNota({ ok: true, t: `Campo “${d.nome}” criado. Clique nele para adicionar o estoque.` }); }
      catch (e) { setVista(antes); setDlg({ k: "criar", draft: d, erro: erroTexto(e) }); }
    });
  };
  const excluir = (nome: string) => {
    const antes = v!; setVista({ ...antes, fields: antes.fields.filter((c) => c.nome !== nome), ops: [opTmp("field.delete", nome), ...antes.ops] }); setDlg(null); setAberto(null);
    setNota({ ok: true, t: `Campo “${nome}” excluído. O bot remove em instantes.` });
    void run(async () => {
      try { setVista(await api(`${base}?nome=${encodeURIComponent(nome)}`, { method: "DELETE" })); }
      catch (e) { setVista(antes); setNota({ ok: false, t: `Não foi possível excluir “${nome}”. ${erroTexto(e)}` }); }
    });
  };
  const estoque = (campo: string, modo: Modo, d: EstDraft, qtd: number) => {
    const antes = v!;
    setVista({ ...antes, fields: antes.fields.map((c) => c.nome === campo ? { ...c, estoque: c.estoque + qtd, infinito: c.infinito || modo === "infinito", pendente: true } : c),
      ops: [opTmp("stock.add", campo, { qtd, modo, infinito: modo === "infinito" }), ...antes.ops] }); setDlg(null); setNota(null);
    const body = modo === "infinito" ? { nome: campo, mode: modo, valor: d.valor } : modo === "fantasma" ? { nome: campo, mode: modo, quantidade: Number(d.quantidade), valor: d.valor } : { nome: campo, mode: modo, texto: d.texto };
    void run(async () => {
      try { setVista(await api(`${base}/stock`, { method: "POST", json: body })); setNota({ ok: true, t: `+${qtd.toLocaleString("pt-BR")} ${qtd === 1 ? "item" : "itens"} no estoque de “${campo}”. O bot aplica em instantes.` }); }
      catch (e) { setVista(antes); setDlg({ k: "estoque", modo, campo, draft: d, erro: erroTexto(e) }); }
    });
  };

  const campoAberto = v && aberto ? v.fields.find((c) => c.nome === aberto) ?? null : null;
  return <Dash bot={{ id: botId, name: info.data?.name, avatar: info.data?.avatar_url }}>
    <p className="fx-back"><a href={`/dashboard/bots/${enc}/produtos`}>← Produtos</a>{campoAberto && <> <span aria-hidden="true">/</span> <button type="button" onClick={() => setAberto(null)}>Campos</button></>}</p>
    <Async q={q}>{() => {
      if (!v) return null;
      return campoAberto ? <>
        <div className="row between fx-head"><div className="fx-titulo"><EmojiCampo valor={campoAberto.emoji} nome={campoAberto.nome} grande /><div><h1>{campoAberto.nome}</h1>
          <p className="muted">{brl(campoAberto.valor)}{campoAberto.desc ? ` · ${campoAberto.desc}` : ""}</p></div></div>
          <button type="button" className="btn danger" onClick={() => setDlg({ k: "excluir", campo: campoAberto.nome })}><Emo n="trash" size={18} /> Excluir campo</button></div>
        {nota && <div className={`state ${nota.ok ? "ok" : "err"}`} role="status">{nota.t}</div>}
        <div className="kpis compact fx-kpis">
          <div className="kpi"><span>Estoque</span><b>{campoAberto.infinito ? "∞" : campoAberto.estoque.toLocaleString("pt-BR")}</b>{campoAberto.pendente && <small>Aguardando o bot</small>}</div>
          <div className="kpi"><span>Preço</span><b>{brl(campoAberto.valor)}</b></div>
          <div className="kpi"><span>Criado em</span><b className="fx-data">{dt(new Date(campoAberto.criado).toISOString())}</b></div></div>
        <h2>Adicionar estoque</h2>
        <div className="fx-modos">{MODOS.map((m) => <button key={m.k} type="button" className="fx-modo" onClick={() => setDlg({ k: "estoque", modo: m.k, campo: campoAberto.nome })}>
          <Emo n={m.icone} size={44} /><b>{m.titulo}</b><small>{m.texto}</small></button>)}</div>
        <p className="muted fx-nota">A contagem de estoque vem do bot e pode levar até 30 segundos para refletir o que foi vendido.</p>
        <h2>Últimas alterações</h2>
        {v.ops.filter((o) => o.campo.toLowerCase() === campoAberto.nome.toLowerCase()).length
          ? <ul className="fx-ops">{v.ops.filter((o) => o.campo.toLowerCase() === campoAberto.nome.toLowerCase()).slice(0, 12).map((o) => <OpLinha key={o.id} o={o} />)}</ul>
          : <div className="card"><p className="muted" style={{ margin: 0 }}>Nenhuma alteração ainda.</p></div>}
      </> : <>
        <div className="row between fx-head"><div><h1>Campos</h1><p className="muted">{v.product.name} · cada campo é uma opção do produto, com preço e estoque próprios.</p></div>
          <button type="button" className="btn solid" onClick={() => { setNota(null); setDlg({ k: "criar" }); }} disabled={v.fields.length >= v.max_fields}><Emo n="plus" size={18} /> Criar campo</button></div>
        {nota && <div className={`state ${nota.ok ? "ok" : "err"}`} role="status">{nota.t}</div>}
        {v.ops.some((o) => o.estado === "falhou") && <div className="state err">O bot não conseguiu aplicar uma alteração: {v.ops.find((o) => o.estado === "falhou")?.erro}. Veja o histórico dentro do campo.</div>}
        {v.fields.length ? <div className="fx-grid">{v.fields.map((c, i) => <article key={c.nome} className={`card fx-card${c.pendente ? " pend" : ""}`} style={{ "--i": i } as React.CSSProperties}>
          <div className="fx-card-h"><EmojiCampo valor={c.emoji} nome={c.nome} /><div><h3><button type="button" className="fx-abrir" onClick={() => setAberto(c.nome)}>{c.nome}</button></h3><b className="fx-valor">{brl(c.valor)}</b></div></div>
          <p className="fx-desc">{c.desc || <em>Sem descrição</em>}</p>
          <div className="fx-card-f"><span className={`fx-est${c.infinito ? " inf" : c.estoque ? "" : " zero"}`}>{c.infinito ? <><Emo n="infinity" size={18} /> Infinito</> : estoqueTxt(c)}{!c.infinito && c.estoque > 0 && <small> em estoque</small>}</span>
            {c.pendente && <span className="badge awaiting">Aguardando o bot</span>}</div>
        </article>)}</div>
          : <div className="empty card"><Emo n="layers" size={64} /><h2>Nenhum campo ainda</h2><p>Crie o primeiro campo deste produto. Cada campo tem nome, preço e o próprio estoque.</p>
            <button type="button" className="btn solid" onClick={() => setDlg({ k: "criar" })}><Emo n="plus" size={18} /> Criar campo</button></div>}
      </>;
    }}</Async>
    {dlg?.k === "criar" && <NovoCampo draft={dlg.draft} erro={dlg.erro} onClose={() => setDlg(null)} onSubmit={criar} />}
    {dlg?.k === "estoque" && <EstoqueModal modo={dlg.modo} campo={dlg.campo} draft={dlg.draft} erro={dlg.erro} onClose={() => setDlg(null)} onSubmit={(d, qtd) => estoque(dlg.campo, dlg.modo, d, qtd)} />}
    {dlg?.k === "excluir" && <Modal title="Excluir campo" onClose={() => setDlg(null)}><div className="pform">
      <p className="muted" style={{ margin: 0 }}>Você vai excluir o campo <b style={{ color: "#fff" }}>{dlg.campo}</b> e todo o estoque dele no bot. Isso não pode ser desfeito.</p>
      <div className="pm-foot"><button type="button" className="btn" onClick={() => setDlg(null)}>Cancelar</button><button type="button" className="btn solid danger" autoFocus onClick={() => excluir(dlg.campo)}>Excluir campo</button></div></div></Modal>}
  </Dash>;
}
