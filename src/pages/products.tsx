import { useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, api, dt, useApi } from "../ui/api";
import { Async, Badge } from "../ui/kit";

const MAX_BYTES = 5 * 1024 * 1024;
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
  const code = (x as any)?.code;
  if (x?.status === 413 || code === "file_too_large") return "A imagem passa de 5 MB. Escolha uma menor.";
  if (x?.status === 415 || code === "unsupported_image") return "O arquivo não é uma imagem válida. Use PNG, JPG, WEBP ou GIF.";
  if (code === "upload_error") return "Não foi possível enviar a imagem agora. Tente de novo ou salve sem banner.";
  if (x?.status === 409 || code === "product_limit") return "Este bot chegou ao limite de produtos.";
  if (x?.status === 429) return "Muitas tentativas seguidas. Aguarde um instante e tente de novo.";
  if (x?.status === 404) return "Este produto não existe mais. Atualize a página.";
  if (x?.status === 422) return "Confira os campos e tente de novo.";
  return "Não foi possível salvar. Tente de novo.";
}

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
function ProductForm({ botId, initial, onClose, onSaved }: { botId: string; initial?: any; onClose: () => void; onSaved: (p: any) => void }) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? ""), [desc, setDesc] = useState(initial?.description ?? "");
  const [dtype, setDtype] = useState<"" | "automatic" | "manual">(initial?.delivery_type ?? "");
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<string | null>(null), [removeBanner, setRemoveBanner] = useState(false);
  const [fileErr, setFileErr] = useState<string | null>(null), [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [drag, setDrag] = useState(false), [tried, setTried] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!file) { setPreview(null); return; } const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);

  const pick = (f?: File | null) => {
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) return setFileErr("Use uma imagem PNG, JPG, WEBP ou GIF.");
    if (f.size > MAX_BYTES) return setFileErr("A imagem passa de 5 MB. Escolha uma menor.");
    setFileErr(null); setFile(f); setRemoveBanner(false);
  };
  const shown = preview ?? (!removeBanner && initial?.banner_url ? initial.banner_url : null); // o que aparece no quadro do banner
  const miss = { name: !name.trim(), desc: !desc.trim(), dtype: !dtype };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setTried(true); setErr(null);
    if (miss.name || miss.desc || miss.dtype) return;
    const fd = new FormData();
    if (!editing || name.trim() !== initial.name) fd.set("name", name.trim());
    if (!editing || desc.trim() !== initial.description) fd.set("description", desc.trim());
    if (!editing || dtype !== initial.delivery_type) fd.set("delivery_type", dtype);
    if (file) fd.set("banner", file); else if (editing && removeBanner && initial.banner_url) fd.set("remove_banner", "1");
    if (editing && ![...fd.keys()].length) return setErr("Nenhuma alteração para salvar.");
    setBusy(true);
    try {
      const url = `/api/bots/${encodeURIComponent(botId)}/products${editing ? `/${initial.id}` : ""}`;
      const r = await api(url, { method: editing ? "PATCH" : "POST", body: fd });
      onSaved(r.product);
    } catch (x) { setErr(saveError(x)); } finally { setBusy(false); }
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
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}>
        {shown ? <img src={shown} alt="Prévia do banner" referrerPolicy="no-referrer" /> : <div><b>Arraste a imagem ou clique para escolher</b><small>PNG, JPG, WEBP ou GIF · até 5 MB</small></div>}
      </div>
      <input ref={input} type="file" hidden accept={OK_TYPES.join(",")} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      {(file || shown) && <div className="row">
        <small className="fname">{file ? `${file.name} · ${file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`}` : "Banner atual"}</small>
        <button type="button" className="btn sm" onClick={() => input.current?.click()}>Trocar</button>
        <button type="button" className="btn sm" onClick={() => { setFile(null); setRemoveBanner(true); }}>Remover</button></div>}
      {fileErr && <small className="bad">{fileErr}</small>}</div>

    {err && <div className="state err" role="alert">{err}</div>}
    <div className="pm-foot"><button type="button" className="btn" onClick={onClose} disabled={busy}>Cancelar</button>
      <button type="submit" className="btn solid" disabled={busy}>{busy ? "Salvando…" : editing ? "Salvar alterações" : "Criar produto"}</button></div>
  </form>;
}

function ConfirmDelete({ botId, p, onClose, onDone }: { botId: string; p: any; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setErr(null);
    try { await api(`/api/bots/${encodeURIComponent(botId)}/products/${p.id}`, { method: "DELETE" }); onDone(); }
    catch (x) { setErr(saveError(x)); setBusy(false); }
  };
  return <Modal title="Excluir produto" onClose={onClose}>
    <div className="pform">
      <p className="muted" style={{ margin: 0 }}>Você vai excluir <b style={{ color: "#fff" }}>{p.name}</b>. Ele some do painel agora e o bot é avisado para remover o produto dele.</p>
      {err && <div className="state err" role="alert">{err}</div>}
      <div className="pm-foot"><button type="button" className="btn" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="button" className="btn solid danger" onClick={go} disabled={busy}>{busy ? "Excluindo…" : "Excluir produto"}</button></div>
    </div></Modal>;
}

function ProductCard({ p, busy, onResend, onEdit, onDelete }: { p: any; busy: boolean; onResend: () => void; onEdit: () => void; onDelete: () => void }) {
  const [broken, setBroken] = useState(false);
  const key = p.sync_status === "synced" ? "synced" : p.sync_status === "failed" ? "failed" : "awaiting";
  return <article className="card pcard">
    <div className="pbanner">{p.banner_url && !broken ? <img src={p.banner_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      : <span aria-hidden="true">{String(p.name ?? "?").slice(0, 1)}</span>}</div>
    <div className="pbody">
      <h3>{p.name}</h3>
      <p className="pdesc">{p.description}</p>
      <div className="pbadges"><Badge s={p.delivery_type} /><Badge s={key} />{p.source === "bot" && <span className="badge neutral">Veio do bot</span>}</div>
      {key !== "synced" && <div className="psync"><small>{syncText(p.sync_error)}</small>
        {p.sync_error !== "bot_webhook_not_configured" && <button type="button" className="btn sm" disabled={busy} onClick={onResend}>{busy ? "Enviando…" : "Reenviar ao bot"}</button>}</div>}
      <div className="pact"><button type="button" className="btn sm" onClick={onEdit}>Editar</button>
        <button type="button" className="btn sm danger" onClick={onDelete}>Excluir</button></div>
      <small className="pdate">{p.source === "bot" ? "Sincronizado" : "Criado"} em {dt(p.source === "bot" ? p.synced_at ?? p.created_at : p.created_at)}</small>
    </div></article>;
}

export function Products({ botId }: { botId: string }) {
  const enc = encodeURIComponent(botId);
  const q = useApi<any>(`/api/bots/${enc}/products`);
  const [dlg, setDlg] = useState<null | { kind: "create" } | { kind: "edit"; p: any } | { kind: "delete"; p: any }>(null);
  const [note, setNote] = useState<{ ok: boolean; t: string } | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const fila = !!q.data?.items?.some((p: any) => p.sync_status === "pending");
  useEffect(() => { if (!fila) return; const t = setTimeout(q.reload, 10_000); return () => clearTimeout(t); }, [fila, q.data]); // enquanto há alteração na fila, confere de novo a cada 10 s

  /** Mensagem depois de criar/editar: fila normal (bot busca sozinho) não é erro. */
  const saved = (verb: string, p: any) => {
    setDlg(null); q.reload();
    setNote(p.sync_status === "synced" ? { ok: true, t: `“${p.name}” foi ${verb} e o bot já recebeu.` }
      : p.sync_error === "bot_webhook_not_configured" ? { ok: true, t: `“${p.name}” foi ${verb}. O bot busca as alterações sozinho e ele passa para “Enviado ao bot” em instantes.` }
      : { ok: false, t: `“${p.name}” foi ${verb}, mas a alteração ainda não chegou ao bot. ${syncText(p.sync_error)}` });
  };
  const resend = async (p: any) => {
    setSending(p.id); setNote(null);
    try {
      const r = await api(`/api/bots/${enc}/products/${p.id}/resend`, { method: "POST" });
      setNote(r.product.sync_status === "synced" ? { ok: true, t: `“${p.name}” foi enviado ao bot.` } : { ok: false, t: syncText(r.product.sync_error) });
    } catch { setNote({ ok: false, t: "Não foi possível reenviar agora. Tente de novo em instantes." }); }
    finally { setSending(null); q.reload(); }
  };

  return <>
    <div className="row between"><div><h1>Produtos</h1>
      <p className="muted">{q.data ? `${q.data.items.length} ${q.data.items.length === 1 ? "produto" : "produtos"} neste bot.` : "Produtos cadastrados neste bot."}</p></div>
      <button type="button" className="btn solid" onClick={() => { setNote(null); setDlg({ kind: "create" }); }}>Criar produto</button></div>
    {note && <div className={`state ${note.ok ? "ok" : "err"}`} role="status">{note.t}</div>}
    <Async q={q}>{(d) => d.items.length
      ? <div className="pgrid">{d.items.map((p: any) => <ProductCard key={p.id} p={p} busy={sending === p.id} onResend={() => resend(p)}
          onEdit={() => { setNote(null); setDlg({ kind: "edit", p }); }} onDelete={() => { setNote(null); setDlg({ kind: "delete", p }); }} />)}</div>
      : <div className="empty card"><h2>Nenhum produto ainda</h2>
          <p>Crie o primeiro produto do bot. O bot recebe assim que ele for salvo, e os produtos que o bot já tem aparecem aqui quando ele sincronizar a lista.</p>
          <button type="button" className="btn solid" onClick={() => setDlg({ kind: "create" })}>Criar o primeiro produto</button></div>}</Async>
    {dlg?.kind === "create" && <Modal title="Criar produto" onClose={() => setDlg(null)}><ProductForm botId={botId} onClose={() => setDlg(null)} onSaved={(p) => saved("criado", p)} /></Modal>}
    {dlg?.kind === "edit" && <Modal title="Editar produto" onClose={() => setDlg(null)}><ProductForm botId={botId} initial={dlg.p} onClose={() => setDlg(null)} onSaved={(p) => saved("atualizado", p)} /></Modal>}
    {dlg?.kind === "delete" && <ConfirmDelete botId={botId} p={dlg.p} onClose={() => setDlg(null)}
      onDone={() => { const n = dlg.p.name; setDlg(null); q.reload(); setNote({ ok: true, t: `“${n}” foi excluído. O bot é avisado para remover o produto dele.` }); }} />}
  </>;
}
