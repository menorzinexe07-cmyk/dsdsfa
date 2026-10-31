// Página /dashboard/bots/:botId/produtos
// Uso na rota: <ProductsPage botId={botId} />
import { useEffect, useRef, useState } from 'react'

type Product = {
  id: string; name: string; description: string
  delivery_type: 'automatic' | 'manual'; banner_url: string
  sync_status: 'pending' | 'synced'; created_at: string
}
const DELIVERY = { automatic: 'Automática', manual: 'Manual' } as const

export default function ProductsPage({ botId }: { botId: string }) {
  const [items, setItems] = useState<Product[] | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const base = `/api/dashboard/bots/${encodeURIComponent(botId)}/products`

  async function load() {
    try {
      const r = await fetch(base, { credentials: 'include' })
      if (!r.ok) throw new Error()
      setItems((await r.json()).products)
      setError('')
    } catch { setError('Não foi possível carregar os produtos.') }
  }
  useEffect(() => { load() }, [botId])

  return (
    <div className="pr">
      <style>{CSS}</style>
      <header className="pr-head">
        <div>
          <h1>Produtos</h1>
          <p>Produtos à venda no seu bot.</p>
        </div>
        <button className="pr-btn" onClick={() => setOpen(true)}>Criar produto</button>
      </header>

      {error && <div className="pr-err" role="alert">{error} <button onClick={load}>Tentar de novo</button></div>}
      {!error && items === null && <p className="pr-muted">Carregando produtos…</p>}
      {items?.length === 0 && (
        <div className="pr-empty">
          <h2>Nenhum produto ainda</h2>
          <p>Crie o primeiro produto com nome, descrição, tipo de entrega e banner.</p>
          <button className="pr-btn" onClick={() => setOpen(true)}>Criar produto</button>
        </div>
      )}
      {!!items?.length && (
        <ul className="pr-grid">
          {items.map(p => (
            <li key={p.id} className="pr-card">
              {p.banner_url
                ? <img src={p.banner_url} alt="" loading="lazy" />
                : <div className="pr-noimg">Sem banner</div>}
              <div className="pr-body">
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="pr-tags">
                  <span className="pr-tag">Entrega {DELIVERY[p.delivery_type]}</span>
                  {p.sync_status === 'pending' && <span className="pr-tag warn">Aguardando o bot</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && <CreateModal base={base} onClose={() => setOpen(false)}
        onCreated={() => { setOpen(false); load() }} />}
    </div>
  )
}

function CreateModal({ base, onClose, onCreated }:
  { base: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [delivery, setDelivery] = useState<'' | 'automatic' | 'manual'>('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const first = useRef<HTMLInputElement>(null)
  useEffect(() => { first.current?.focus() }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [busy])
  useEffect(() => {
    if (!file) { setPreview(''); return }
    const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u)
  }, [file])

  function pick(f: File | null) {
    if (f && !/^image\/(png|jpeg|webp|gif)$/.test(f.type)) return setErrs(e => ({ ...e, banner: 'Use PNG, JPG, WEBP ou GIF.' }))
    if (f && f.size > 5 * 1024 * 1024) return setErrs(e => ({ ...e, banner: 'O banner deve ter no máximo 5 MB.' }))
    setErrs(e => ({ ...e, banner: '' })); setFile(f)
  }

  async function submit() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Informe o nome.'
    if (!desc.trim()) e.description = 'Informe a descrição.'
    if (!delivery) e.delivery_type = 'Escolha o tipo de entrega.'
    if (!file) e.banner = 'Envie o banner.'
    setErrs(e)
    if (Object.values(e).some(Boolean)) return
    setBusy(true)
    const fd = new FormData()
    fd.set('name', name.trim()); fd.set('description', desc.trim())
    fd.set('delivery_type', delivery); fd.set('banner', file!)
    try {
      const r = await fetch(base, { method: 'POST', body: fd, credentials: 'include' })
      if (r.status === 201) return onCreated()
      const j = await r.json().catch(() => ({}))
      setErrs({ ...(j.errors ?? {}), form: j.errors ? '' : (j.error ?? 'Falha ao criar o produto.') })
    } catch { setErrs({ form: 'Sem conexão. Tente novamente.' }) }
    setBusy(false)
  }

  return (
    <div className="pr-overlay" onMouseDown={ev => ev.target === ev.currentTarget && !busy && onClose()}>
      <div className="pr-modal" role="dialog" aria-modal="true" aria-labelledby="pr-t">
        <h2 id="pr-t">Criar produto</h2>

        <label>Nome
          <input ref={first} value={name} maxLength={80} onChange={e => setName(e.target.value)} />
          {errs.name && <small>{errs.name}</small>}
        </label>

        <label>Descrição
          <textarea rows={4} value={desc} maxLength={1000} onChange={e => setDesc(e.target.value)} />
          {errs.description && <small>{errs.description}</small>}
        </label>

        <fieldset>
          <legend>Tipo de entrega</legend>
          <div className="pr-seg">
            {(['automatic', 'manual'] as const).map(v => (
              <button key={v} type="button" aria-pressed={delivery === v}
                className={delivery === v ? 'on' : ''} onClick={() => setDelivery(v)}>
                {DELIVERY[v]}
              </button>
            ))}
          </div>
          {errs.delivery_type && <small>{errs.delivery_type}</small>}
        </fieldset>

        <div className="pr-field">
          <span>Banner</span>
          <label className="pr-drop">
            {preview ? <img src={preview} alt="Prévia do banner" /> : <em>Clique para escolher uma imagem (até 5 MB)</em>}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={e => pick(e.target.files?.[0] ?? null)} />
          </label>
          {errs.banner && <small>{errs.banner}</small>}
        </div>

        {errs.form && <div className="pr-err" role="alert">{errs.form}</div>}
        <div className="pr-actions">
          <button className="pr-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="pr-btn" onClick={submit} disabled={busy}>{busy ? 'Criando…' : 'Criar produto'}</button>
        </div>
      </div>
    </div>
  )
}

// Estilos isolados (prefixo .pr). Se já tiver kit de UI (kit.tsx), troque pelos seus componentes.
const CSS = `
.pr{--bg:var(--surface,#14161c);--bd:var(--border,#2a2e39);--tx:var(--text,#e8eaf0);--mu:var(--muted,#9aa1b2);--ac:var(--accent,#7c5cff);color:var(--tx);max-width:1100px}
.pr-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:24px;flex-wrap:wrap}
.pr h1{margin:0;font-size:1.6rem}.pr-head p,.pr-muted{color:var(--mu);margin:4px 0 0}
.pr-btn{background:var(--ac);color:#fff;border:0;border-radius:8px;padding:10px 18px;font:inherit;font-weight:600;cursor:pointer}
.pr-btn:disabled,.pr-ghost:disabled{opacity:.6;cursor:not-allowed}
.pr-ghost{background:none;border:1px solid var(--bd);color:var(--tx);border-radius:8px;padding:10px 18px;font:inherit;cursor:pointer}
.pr button:focus-visible,.pr input:focus-visible,.pr textarea:focus-visible,.pr-drop:focus-within{outline:2px solid var(--ac);outline-offset:2px}
.pr-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}
.pr-card{background:var(--bg);border:1px solid var(--bd);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.pr-card img,.pr-noimg{width:100%;aspect-ratio:16/7;object-fit:cover;display:grid;place-items:center;background:#0c0d11;color:var(--mu);font-size:.85rem}
.pr-body{padding:14px 16px 16px}.pr-body h3{margin:0 0 6px;font-size:1.05rem}
.pr-body p{margin:0 0 12px;color:var(--mu);font-size:.92rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.pr-tags{display:flex;gap:6px;flex-wrap:wrap}.pr-tag{border:1px solid var(--bd);border-radius:999px;padding:2px 10px;font-size:.8rem}
.pr-tag.warn{border-color:#b7852b;color:#e8b64f}
.pr-empty{border:1px dashed var(--bd);border-radius:12px;padding:48px 24px;text-align:center}
.pr-empty h2{margin:0 0 6px}.pr-empty p{color:var(--mu);margin:0 0 18px}
.pr-err{border:1px solid #8a3340;background:#2a1217;color:#ff9aa6;border-radius:8px;padding:10px 14px;margin:12px 0}
.pr-err button{background:none;border:0;color:inherit;text-decoration:underline;cursor:pointer;font:inherit}
.pr-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;padding:16px;z-index:50}
.pr-modal{background:var(--bg);border:1px solid var(--bd);border-radius:14px;padding:24px;width:100%;max-width:520px;max-height:92vh;overflow:auto;display:grid;gap:16px}
.pr-modal h2{margin:0}.pr-modal label,.pr-field,.pr-modal fieldset{display:grid;gap:6px;border:0;padding:0;margin:0;font-size:.92rem}
.pr-modal legend{padding:0;margin-bottom:6px}
.pr-modal input[type=text],.pr-modal input:not([type]),.pr-modal textarea{background:#0c0d11;border:1px solid var(--bd);border-radius:8px;color:var(--tx);padding:10px 12px;font:inherit;resize:vertical}
.pr-modal small{color:#ff9aa6}
.pr-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pr-seg button{background:#0c0d11;border:1px solid var(--bd);color:var(--tx);border-radius:8px;padding:10px;font:inherit;cursor:pointer}
.pr-seg button.on{border-color:var(--ac);box-shadow:inset 0 0 0 1px var(--ac)}
.pr-drop{border:1px dashed var(--bd);border-radius:10px;min-height:110px;display:grid;place-items:center;cursor:pointer;overflow:hidden;color:var(--mu)}
.pr-drop img{width:100%;aspect-ratio:16/7;object-fit:cover}.pr-drop input{position:absolute;opacity:0;pointer-events:none}
.pr-actions{display:flex;justify-content:flex-end;gap:10px}
`
