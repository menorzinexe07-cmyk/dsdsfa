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
  if (!code) return "";
  if (code === "bot_webhook_not_configured") return "O envio automático ao bot ainda não foi configurado. O bot pode buscar este produto pela API.";
  if (code === "bot_timeout") return "O bot demorou demais para responder.";
  if (code === "bot_unreachable") return "Não foi possível alcançar o bot.";
  if (code.startsWith("bot_http_")) return `O bot recusou o envio (erro ${code.slice(9)}).`;
  return "Não foi possível enviar ao bot.";
}

function createError(e: unknown) {
  const x = e as ApiError;
  const code = (x as any)?.body?.error ?? (x as any)?.code;
  if (x?.status === 413 || code === "file_too_large") return "A imagem passa de 5 MB. Escolha uma menor.";
  if (x?.status === 415 || code === "unsupported_image") return "O arquivo não é uma imagem válida. Use PNG, JPG, WEBP ou GIF.";
  if (x?.status === 409 || code === "product_limit") return "Este bot chegou ao limite de produtos.";
  if (x?.status === 429) return "Muitas tentativas seguidas. Aguarde um instante e tente de novo.";
  if (x?.status === 422) return "Confira os campos e tente de novo.";
  return "Não foi possível criar o produto. Tente de novo.";
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

function CreateForm({ botId, onClose, onCreated }: { botId: string; onClose: () => void; onCreated: (p: any) => void }) {
  const [name, setName] = useState(""), [desc, setDesc] = useState("");
  const [dtype, setDtype] = useState<"" | "automatic" | "manual">("");
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<string | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null), [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [drag, setDrag] = useState(false), [tried, setTried] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!file) { setPreview(null); return; } const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);

  const pick = (f?: File | null) => {
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) return setFileErr("Use uma imagem PNG, JPG, WEBP ou GIF.");
    if (f.size > MAX_BYTES) return setFileErr("A imagem passa de 5 MB. Escolha uma menor.");
    setFileErr(null); setFile(f);
  };
  const miss = { name: !name.trim(), desc: !desc.trim(), dtype: !dtype, banner: !file };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setTried(true); setErr(null);
    if (miss.name || miss.desc || miss.dtype || miss.banner) return;
    const fd = new FormData();
    fd.set("name", name.trim()); fd.set("description", desc.trim()); fd.set("delivery_type", dtype); fd.set("banner", file!);
    setBusy(true);
    try { const r = await api(`/api/bots/${encodeURIComponent(botId)}/products`, { method: "POST", body: fd }); onCreated(r.product); }
    catch (x) { setErr(createError(x)); } finally { setBusy(false); }
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

    <div className="pfile"><span className="lbl">Banner</span>
      <div className={`drop${drag ? " drag" : ""}${preview ? " has" : ""}`} role="button" tabIndex={0} aria-label="Escolher a imagem do banner"
        onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}>
        {preview ? <img src={preview} alt="Prévia do banner" /> : <div><b>Arraste a imagem ou clique para escolher</b><small>PNG, JPG, WEBP ou GIF · até 5 MB</small></div>}
      </div>
      <input ref={input} type="file" hidden accept={OK_TYPES.join(",")} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      {file && <div className="row"><small className="fname">{file.name} · {file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`}</small>
        <button type="button" className="btn sm" onClick={() => setFile(null)}>Trocar</button></div>}
      {(fileErr || (tried && miss.banner)) && <small className="bad">{fileErr ?? "Envie o banner do produto."}</small>}</div>

    {err && <div className="state err" role="alert">{err}</div>}
    <div className="pm-foot"><button type="button" className="btn" onClick={onClose} disabled={busy}>Cancelar</button>
      <button type="submit" className="btn solid" disabled={busy}>{busy ? "Criando…" : "Criar produto"}</button></div>
  </form>;
}

function ProductCard({ p, onResend, busy }: { p: any; onResend: () => void; busy: boolean }) {
  const [broken, setBroken] = useState(false);
  const key = p.sync_status === "synced" ? "synced" : p.sync_status === "failed" ? "failed" : "awaiting";
  return <article className="card pcard">
    <div className="pbanner">{p.banner_url && !broken ? <img src={p.banner_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      : <span aria-hidden="true">{String(p.name ?? "?").slice(0, 1)}</span>}</div>
    <div className="pbody">
      <h3>{p.name}</h3>
      <p className="pdesc">{p.description}</p>
      <div className="pbadges"><Badge s={p.delivery_type} />{p.source === "bot" ? <span className="badge neutral">Veio do bot</span> : <Badge s={key} />}</div>
      {p.source === "site" && key !== "synced" && <div className="psync"><small>{syncText(p.sync_error)}</small>
        <button type="button" className="btn sm" disabled={busy} onClick={onResend}>{busy ? "Enviando…" : "Reenviar ao bot"}</button></div>}
      <small className="pdate">{p.source === "bot" ? "Sincronizado" : "Criado"} em {dt(p.source === "bot" ? p.synced_at ?? p.created_at : p.created_at)}</small>
    </div></article>;
}

export function Products({ botId }: { botId: string }) {
  const enc = encodeURIComponent(botId);
  const q = useApi<any>(`/api/bots/${enc}/products`);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; t: string } | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const created = (p: any) => {
    setOpen(false); q.reload();
    setNote(p.sync_status === "synced" ? { ok: true, t: `“${p.name}” foi criado e enviado ao bot.` }
      : { ok: false, t: `“${p.name}” foi criado, mas ainda não chegou ao bot. ${syncText(p.sync_error)}` });
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
      <button type="button" className="btn solid" onClick={() => { setNote(null); setOpen(true); }}>Criar produto</button></div>
    {note && <div className={`state ${note.ok ? "ok" : "err"}`} role="status">{note.t}</div>}
    <Async q={q}>{(d) => d.items.length
      ? <div className="pgrid">{d.items.map((p: any) => <ProductCard key={p.id} p={p} busy={sending === p.id} onResend={() => resend(p)} />)}</div>
      : <div className="empty card"><h2>Nenhum produto ainda</h2>
          <p>Crie o primeiro produto do bot. Ele é enviado ao bot assim que for salvo, e os produtos que o bot já tem aparecem aqui quando ele sincronizar a lista.</p>
          <button type="button" className="btn solid" onClick={() => setOpen(true)}>Criar o primeiro produto</button></div>}</Async>
    {open && <Modal title="Criar produto" onClose={() => setOpen(false)}><CreateForm botId={botId} onClose={() => setOpen(false)} onCreated={created} /></Modal>}
  </>;
}
