import { useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, api, dt, useApi } from "../ui/api";
import { Async, Badge } from "../ui/kit";

const PICK_MAX = 12 * 1024 * 1024; // tamanho máximo da imagem escolhida (ela é reduzida antes de enviar)
const SEND_MAX = 4 * 1024 * 1024;  // o que realmente vai para o site (a Vercel recusa corpo acima de 4,5 MB)
const OK_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const DELIVERY = [
  { k: "automatic", t: "Automático", d: "O bot entrega assim que o pagamento é confirmado." },
  { k: "manual", t: "Manual", d: "Você entrega o produto depois de conferir o pedido." },
] as const;

/** Traduz o código gravado no envio ao bot para uma frase que o cliente entende. */
function syncText(code?: string | null) {
  if (!code) return "Aguardando o bot aplicar a alteração.";
  if (code === "bot_webhook_not_configured") return "Na fila: o bot busca as alterações sozinho, em poucos segundos.";
  if (code === "bot_timeout") return "O bot demorou demais para responder.";
  if (code === "bot_unreachable") return "Não foi possível alcançar o bot.";
  if (code.startsWith("bot_http_")) return `O bot recusou o envio (erro ${code.slice(9)}).`;
  if (code.startsWith("bot_error:")) return `O bot não conseguiu aplicar: ${code.slice(10) || "erro desconhecido"}.`;
  return "Não foi possível enviar ao bot.";
}

function saveError(e: unknown) {
  const x = e as ApiError;
  const status = x?.status ?? 0, code = x?.code;
  if (status === 0) return "Sem conexão com o site. Confira sua internet e tente de novo.";
  if (status === 413 || code === "file_too_large") return "A imagem é grande demais. Escolha uma menor (até 4 MB).";
  if (status === 415 || code === "unsupported_image") return "O arquivo não é uma imagem válida. Use PNG, JPG, WEBP ou GIF.";
  if (code === "upload_error") return "Não foi possível guardar a imagem agora. Tente de novo ou salve sem banner.";
  if (status === 409 || code === "product_limit") return "Este bot chegou ao limite de produtos.";
  if (status === 429) return "Muitas tentativas seguidas. Aguarde um instante e tente de novo.";
  if (status === 404) return "Este produto não existe mais. Atualize a página.";
  if (status === 401) return "Sua sessão expirou. Entre de novo.";
  if (status === 422) return "Confira os campos e tente de novo.";
  return `Não foi possível salvar (erro ${status}${code && code !== "erro" ? `: ${code}` : ""}). Tente de novo.`;
}

/** Reduz o banner no navegador (máx. 1600 px, WebP): o envio fica rápido e dentro do limite do servidor. GIF e imagens pequenas seguem como estão. */
async function prepararBanner(file: File): Promise<File> {
  if (file.type === "image/gif" || file.size < 200 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h); bmp.close?.();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.85));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  } catch { return file; }
}
const tamanho = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

type Draft = { name: string; desc: string; dtype: "" | "automatic" | "manual"; file: File | null; removeBanner: boolean };
type Submit = { fd: FormData; draft: Draft };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); return () => { if (d?.open) d.close(); }; }, []);
  return <dialog ref={ref} className="pmodal" aria-labelledby="pm-title"
    onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
    <div className="pm-in">
      <div className="pm-head"><h2 id="pm-title">{title}</h2><button type="button" className="btn sm" onClick={onClose}>Fechar</button></div>
      {children}
    </div></dialog>;
}

/** Formulário de criar e de editar. Nome, descrição e tipo de entrega são obrigatórios; o banner é opcional. */
function ProductForm({ initial, draft, error, onClose, onSubmit }: { initial?: any; draft?: Draft; error?: string; onClose: () => void; onSubmit: (s: Submit) => void }) {
  const editing = !!initial;
  const [name, setName] = useState(draft?.name ?? initial?.name ?? ""), [desc, setDesc] = useState(draft?.desc ?? initial?.description ?? "");
  const [dtype, setDtype] = useState<Draft["dtype"]>(draft?.dtype ?? initial?.delivery_type ?? "");
  const [file, setFile] = useState<File | null>(draft?.file ?? null), [preview, setPreview] = useState<string | null>(null), [removeBanner, setRemoveBanner] = useState(draft?.removeBanner ?? false);
  const [fileErr, setFileErr] = useState<string | null>(null), [err, setErr] = useState<string | null>(error ?? null);
  const [drag, setDrag] = useState(false), [tried, setTried] = useState(false), [preparing, setPreparing] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!file) { setPreview(null); return; } const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);

  const pick = async (f?: File | null) => {
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) return setFileErr("Use uma imagem PNG, JPG, WEBP ou GIF.");
    if (f.size > PICK_MAX) return setFileErr("A imagem passa de 12 MB. Escolha uma menor.");
    setFileErr(null); setPreparing(true);
    const pronto = await prepararBanner(f);
    setPreparing(false);
    if (pronto.size > SEND_MAX) return setFileErr("Mesmo reduzida, a imagem passa de 4 MB. Escolha outra (ou um GIF menor).");
    setFile(pronto); setRemoveBanner(false);
  };
  const shown = preview ?? (!removeBanner && initial?.banner_url ? initial.banner_url : null); // o que aparece no quadro do banner
  const miss = { name: !name.trim(), desc: !desc.trim(), dtype: !dtype };

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setTried(true); setErr(null);
    if (preparing || miss.name || miss.desc || miss.dtype) return;
    const fd = new FormData();
    if (!editing || name.trim() !== initial.name) fd.set("name", name.trim());
    if (!editing || desc.trim() !== initial.description) fd.set("description", desc.trim());
    if (!editing || dtype !== initial.delivery_type) fd.set("delivery_type", dtype);
    if (file) fd.set("banner", file); else if (editing && removeBanner && initial.banner_url) fd.set("remove_banner", "1");
    if (editing && ![...fd.keys()].length) return setErr("Nenhuma alteração para salvar.");
    onSubmit({ fd, draft: { name, desc, dtype, file, removeBanner } }); // a tela fecha e atualiza na hora; o envio acontece em seguida
  };

  return <form className="pform" onSubmit={submit} noValidate>
    <label>Nome do produto
      <input className="input" value={name} maxLength={80} autoFocus placeholder="ex.: Clonar servidores" aria-invalid={tried && miss.name}
        onChange={(e) => setName(e.target.value)} />
      <small className={tried && miss.name ? "bad" : ""}>{tried && miss.name ? "Informe o nome." : `${name.length}/80`}</small></label>

    <label>Descrição
      <textarea className="input" rows={4} value={desc} maxLength={1000} placeholder="O que o cliente recebe, prazos, regras…" aria-invalid={tried && miss.desc}
        onChange={(e) => setDesc(e.target.value)} />
      <small className={tried && miss.desc ? "bad" : ""}>{tried && miss.desc ? "Informe a descrição." : `${desc.length}/1000`}</small></label>

    <fieldset className="dopts" aria-invalid={tried && miss.dtype}><legend>Tipo de entrega</legend>
      <div>{DELIVERY.map((o) => <label key={o.k} className={`dopt${dtype === o.k ? " on" : ""}`}>
        <input type="radio" name="delivery" value={o.k} checked={dtype === o.k} onChange={() => setDtype(o.k)} />
        <b>{o.t}</b><small>{o.d}</small></label>)}</div>
      {tried && miss.dtype && <small className="bad">Escolha como o produto é entregue.</small>}</fieldset>

    <div className="pfile"><span className="lbl">Banner <em>(opcional)</em></span>
      <div className={`drop${drag ? " drag" : ""}${shown ? " has" : ""}`} role="button" tabIndex={0} aria-label="Escolher a imagem do banner"
        onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void pick(e.dataTransfer.files?.[0]); }}>
        {preparing ? <div><b>Preparando a imagem…</b></div>
          : shown ? <img src={shown} alt="Prévia do banner" referrerPolicy="no-referrer" />
          : <div><b>Arraste a imagem ou clique para escolher</b><small>PNG, JPG, WEBP ou GIF · a imagem é reduzida automaticamente</small></div>}
      </div>
      <input ref={input} type="file" hidden accept={OK_TYPES.join(",")} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      {(file || shown) && !preparing && <div className="row">
        <small className="fname">{file ? `${file.name} · ${tamanho(file.size)}` : "Banner atual"}</small>
        <button type="button" className="btn sm" onClick={() => input.current?.click()}>Trocar</button>
        <button type="button" className="btn sm" onClick={() => { setFile(null); setRemoveBanner(true); }}>Remover</button></div>}
      {fileErr && <small className="bad">{fileErr}</small>}</div>

    {err && <div className="state err" role="alert">{err}</div>}
    <div className="pm-foot"><button type="button" className="btn" onClick={onClose}>Cancelar</button>
      <button type="submit" className="btn solid" disabled={preparing}>{editing ? "Salvar alterações" : "Criar produto"}</button></div>
  </form>;
}

function ConfirmDelete({ p, onClose, onConfirm }: { p: any; onClose: () => void; onConfirm: () => void }) {
  return <Modal title="Excluir produto" onClose={onClose}>
    <div className="pform">
      <p className="muted" style={{ margin: 0 }}>Você vai excluir <b style={{ color: "#fff" }}>{p.name}</b>. Ele some do painel agora e o bot é avisado para remover o produto dele.</p>
      <div className="pm-foot"><button type="button" className="btn" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn solid danger" onClick={onConfirm} autoFocus>Excluir produto</button></div>
    </div></Modal>;
}

function ProductCard({ p, busy, onResend, onEdit, onDelete }: { p: any; busy: boolean; onResend: () => void; onEdit: () => void; onDelete: () => void }) {
  const [broken, setBroken] = useState(false);
  const saving = !!p._saving;
  const key = p.sync_status === "synced" ? "synced" : p.sync_status === "failed" ? "failed" : "awaiting";
  return <article className={`card pcard${saving ? " saving" : ""}`} aria-busy={saving}>
    <div className="pbanner">{p.banner_url && !broken ? <img src={p.banner_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      : <span aria-hidden="true">{String(p.name ?? "?").slice(0, 1)}</span>}</div>
    <div className="pbody">
      <h3>{p.name}</h3>
      <p className="pdesc">{p.description}</p>
      <div className="pbadges"><Badge s={p.delivery_type} />{saving ? <span className="badge neutral"><span className="spin" aria-hidden="true" /> Salvando…</span> : <Badge s={key} />}
        {p.source === "bot" && <span className="badge neutral">Veio do bot</span>}</div>
      {!saving && key !== "synced" && <div className="psync"><small>{syncText(p.sync_error)}</small>
        {p.sync_error !== "bot_webhook_not_configured" && <button type="button" className="btn sm" disabled={busy} onClick={onResend}>{busy ? "Enviando…" : "Reenviar ao bot"}</button>}</div>}
      <div className="pact"><button type="button" className="btn sm" onClick={onEdit} disabled={saving}>Editar</button>
        <button type="button" className="btn sm danger" onClick={onDelete} disabled={saving}>Excluir</button></div>
      <small className="pdate">{p.source === "bot" ? "Sincronizado" : "Criado"} em {dt(p.source === "bot" ? p.synced_at ?? p.created_at : p.created_at)}</small>
    </div></article>;
}

type Dlg = null | { kind: "create"; draft?: Draft; error?: string } | { kind: "edit"; p: any; draft?: Draft; error?: string } | { kind: "delete"; p: any };

export function Products({ botId }: { botId: string }) {
  const enc = encodeURIComponent(botId);
  const q = useApi<any>(`/api/bots/${enc}/products`);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [note, setNote] = useState<{ ok: boolean; t: string } | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  // A lista que aparece na tela. Criar, editar e excluir mudam ela NA HORA; o servidor confirma em seguida e, se falhar, a tela volta atrás.
  const [items, setItems] = useState<any[] | null>(null);
  const ops = useRef(0);
  useEffect(() => { if (q.data && ops.current === 0) setItems(q.data.items); }, [q.data]);
  const atual = () => items ?? q.data?.items ?? [];
  const fila = atual().some((p: any) => p.sync_status === "pending" && !p._saving);
  useEffect(() => { if (!fila) return; const t = setTimeout(q.reload, 10_000); return () => clearTimeout(t); }, [fila, q.data]); // enquanto há alteração na fila, confere de novo a cada 10 s

  const run = async (fn: () => Promise<void>) => {
    ops.current++;
    try { await fn(); } finally { ops.current--; if (ops.current === 0) q.reload(); } // no fim, confere com o servidor sem piscar a tela
  };
  const swap = (id: string, nv: any) => setItems((prev) => (prev ?? []).map((x) => (x.id === id ? nv : x)));
  /** Mensagem depois de salvar: fila normal (bot busca sozinho) não é erro. */
  const saved = (verb: string, p: any) => setNote(p.sync_status === "synced" ? { ok: true, t: `“${p.name}” foi ${verb} e o bot já recebeu.` }
    : p.sync_error === "bot_webhook_not_configured" ? { ok: true, t: `“${p.name}” foi ${verb}. O bot busca as alterações sozinho e ele passa para “Enviado ao bot” em instantes.` }
    : { ok: false, t: `“${p.name}” foi ${verb}, mas a alteração ainda não chegou ao bot. ${syncText(p.sync_error)}` });

  const create = ({ fd, draft }: Submit) => {
    const tmp = `tmp-${Date.now()}`, preview = draft.file ? URL.createObjectURL(draft.file) : "";
    setItems([{ id: tmp, name: draft.name.trim(), description: draft.desc.trim(), delivery_type: draft.dtype, banner_url: preview, source: "site",
      sync_status: "pending", sync_error: null, created_at: new Date().toISOString(), _saving: true }, ...atual()]);
    setDlg(null); setNote(null);
    void run(async () => {
      try { const r = await api(`/api/bots/${enc}/products`, { method: "POST", body: fd }); swap(tmp, r.product); saved("criado", r.product); }
      catch (e) { setItems((prev) => (prev ?? []).filter((x) => x.id !== tmp)); setDlg({ kind: "create", draft, error: saveError(e) }); }
      finally { if (preview) setTimeout(() => URL.revokeObjectURL(preview), 5000); }
    });
  };
  const edit = (orig: any, { fd, draft }: Submit) => {
    const preview = draft.file ? URL.createObjectURL(draft.file) : "";
    swap(orig.id, { ...orig, name: draft.name.trim(), description: draft.desc.trim(), delivery_type: draft.dtype,
      banner_url: draft.file ? preview : draft.removeBanner ? "" : orig.banner_url, sync_status: "pending", sync_error: null, _saving: true });
    setDlg(null); setNote(null);
    void run(async () => {
      try { const r = await api(`/api/bots/${enc}/products/${orig.id}`, { method: "PATCH", body: fd }); swap(orig.id, r.product); saved("atualizado", r.product); }
      catch (e) { swap(orig.id, orig); setDlg({ kind: "edit", p: orig, draft, error: saveError(e) }); }
      finally { if (preview) setTimeout(() => URL.revokeObjectURL(preview), 5000); }
    });
  };
  const remove = (p: any) => {
    const lista = atual(), pos = Math.max(0, lista.findIndex((x: any) => x.id === p.id));
    setItems(lista.filter((x: any) => x.id !== p.id)); setDlg(null);
    setNote({ ok: true, t: `“${p.name}” foi excluído. O bot é avisado para remover o produto dele.` });
    void run(async () => {
      try { await api(`/api/bots/${enc}/products/${p.id}`, { method: "DELETE" }); }
      catch (e) { setItems((prev) => { const l = [...(prev ?? [])]; l.splice(pos, 0, p); return l; }); setNote({ ok: false, t: `Não foi possível excluir “${p.name}”. ${saveError(e)}` }); }
    });
  };
  const resend = async (p: any) => {
    setSending(p.id); setNote(null);
    try {
      const r = await api(`/api/bots/${enc}/products/${p.id}/resend`, { method: "POST" });
      swap(p.id, r.product);
      setNote(r.product.sync_status === "synced" ? { ok: true, t: `“${p.name}” foi enviado ao bot.` } : { ok: false, t: syncText(r.product.sync_error) });
    } catch { setNote({ ok: false, t: "Não foi possível reenviar agora. Tente de novo em instantes." }); }
    finally { setSending(null); }
  };

  const total = atual().length;
  return <>
    <div className="row between"><div><h1>Produtos</h1>
      <p className="muted">{q.data || items ? `${total} ${total === 1 ? "produto" : "produtos"} neste bot.` : "Produtos cadastrados neste bot."}</p></div>
      <button type="button" className="btn solid" onClick={() => { setNote(null); setDlg({ kind: "create" }); }}>Criar produto</button></div>
    {note && <div className={`state ${note.ok ? "ok" : "err"}`} role="status">{note.t}</div>}
    <Async q={q}>{(d) => { const lista = items ?? d.items;
      return lista.length
        ? <div className="pgrid">{lista.map((p: any) => <ProductCard key={p.id} p={p} busy={sending === p.id} onResend={() => void resend(p)}
            onEdit={() => { setNote(null); setDlg({ kind: "edit", p }); }} onDelete={() => { setNote(null); setDlg({ kind: "delete", p }); }} />)}</div>
        : <div className="empty card"><h2>Nenhum produto ainda</h2>
            <p>Crie o primeiro produto do bot. O bot recebe assim que ele for salvo, e os produtos que o bot já tem aparecem aqui quando ele sincronizar a lista.</p>
            <button type="button" className="btn solid" onClick={() => setDlg({ kind: "create" })}>Criar o primeiro produto</button></div>; }}</Async>
    {dlg?.kind === "create" && <Modal title="Criar produto" onClose={() => setDlg(null)}><ProductForm draft={dlg.draft} error={dlg.error} onClose={() => setDlg(null)} onSubmit={create} /></Modal>}
    {dlg?.kind === "edit" && <Modal title="Editar produto" onClose={() => setDlg(null)}><ProductForm initial={dlg.p} draft={dlg.draft} error={dlg.error} onClose={() => setDlg(null)} onSubmit={(s) => edit(dlg.p, s)} /></Modal>}
    {dlg?.kind === "delete" && <ConfirmDelete p={dlg.p} onClose={() => setDlg(null)} onConfirm={() => remove(dlg.p)} />}
  </>;
}
