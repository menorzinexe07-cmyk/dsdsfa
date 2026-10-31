// Página /dashboard/bots/:botId/produtos  →  <ProductsPage botId={botId} />
import { useEffect, useMemo, useRef, useState } from 'react'

type Delivery = 'automatic' | 'manual'
type Product = {
  id: string; name: string; description: string
  delivery_type: Delivery; banner_url: string | null
  sync_status: 'pending' | 'synced'; created_at: string
}
const DELIVERY = {
  automatic: { short: 'Automática', hint: 'O bot entrega o produto assim que o pagamento for aprovado.' },
  manual: { short: 'Manual', hint: 'Você entrega o produto ao cliente depois da compra.' },
} as const

const Svg = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const IBolt = () => <Svg><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></Svg>
const IHand = () => <Svg><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v7M10 10.5V6a2 2 0 0 0-4 0v8a8 8 0 0 0 8 8h1a6 6 0 0 0 6-6v-3a2 2 0 0 0-4 0" /></Svg>
const IPlus = () => <Svg><path d="M12 5v14M5 12h14" /></Svg>
const ISearch = () => <Svg><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
const IImage = () => <Svg size={28}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="1.5" /><path d="m21 15-5-5L5 21" /></Svg>

function Card(p: { name: string; description: string; delivery: Delivery | ''; banner: string; pending?: boolean; date?: string; ghost?: boolean }) {
  const d = p.delivery ? DELIVERY[p.delivery] : null
  return (
    <article className={'pr-card' + (p.ghost ? ' ghost' : '')}>
      <div className="pr-media">
        {p.banner ? <img src={p.banner} alt="" loading="lazy" /> : <div className="pr-noimg"><IImage /><span>Sem banner</span></div>}
        {d && <span className={'pr-chip ' + p.delivery}>{p.delivery === 'automatic' ? <IBolt /> : <IHand />}{d.short}</span>}
      </div>
      <div className="pr-body">
        <h3 className={p.name ? '' : 'ph'}>{p.name || 'Nome do produto'}</h3>
        <p className={p.description ? '' : 'ph'}>{p.description || 'A descrição aparece aqui para quem for comprar.'}</p>
        {!p.ghost && (
          <footer>
            <span className={'pr-status ' + (p.pending ? 'wait' : 'ok')}>
              <i />{p.pending ? 'Aguardando o bot' : 'Sincronizado'}
            </span>
            {p.date && <time>{p.date}</time>}
          </footer>
        )}
      </div>
    </article>
  )
}

export default function ProductsPage({ botId }: { botId: string }) {
  const [items, setItems] = useState<Product[] | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | Delivery>('all')
  const [toast, setToast] = useState('')
  const base = `/api/dashboard/bots/${encodeURIComponent(botId)}/products`

  async function load() {
    try {
      const r = await fetch(base, { credentials: 'include' })
      if (!r.ok) throw new Error()
      setItems((await r.json()).products); setError('')
    } catch { setError('Não foi possível carregar os produtos.') }
  }
  useEffect(() => { setItems(null); load() }, [botId])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3500); return () => clearTimeout(t) }, [toast])

  const shown = useMemo(() => (items ?? []).filter(p =>
    (filter === 'all' || p.delivery_type === filter) &&
    (p.name + ' ' + p.description).toLowerCase().includes(q.trim().toLowerCase())), [items, q, filter])

  return (
    <main className="pr">
      <style>{CSS}</style>

      <header className="pr-head">
        <div>
          <h1>Produtos</h1>
          <p>{items === null ? 'Carregando…' : items.length === 1 ? '1 produto no seu bot' : `${items.length} produtos no seu bot`}</p>
        </div>
        <button className="pr-btn" onClick={() => setOpen(true)}><IPlus />Criar produto</button>
      </header>

      {!!items?.length && (
        <div className="pr-tools">
          <label className="pr-search"><ISearch />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome ou descrição" aria-label="Buscar produtos" />
          </label>
          <div className="pr-filter" role="group" aria-label="Filtrar por entrega">
            {([['all', 'Todos'], ['automatic', 'Automática'], ['manual', 'Manual']] as const).map(([v, l]) => (
              <button key={v} aria-pressed={filter === v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="pr-err" role="alert">{error}<button onClick={load}>Tentar de novo</button></div>}

      {!error && items === null && (
        <ul className="pr-grid" aria-hidden="true">
          {[0, 1, 2].map(i => <li key={i} className="pr-skel"><div /><span /><span /></li>)}
        </ul>
      )}

      {items?.length === 0 && (
        <section className="pr-empty">
          <div className="pr-empty-ic"><IImage /></div>
          <h2>Você ainda não tem produtos</h2>
          <p>Cadastre o primeiro com nome, descrição, tipo de entrega e um banner. Ele aparece no bot assim que for sincronizado.</p>
          <button className="pr-btn" onClick={() => setOpen(true)}><IPlus />Criar produto</button>
        </section>
      )}

      {!!items?.length && shown.length === 0 && (
        <p className="pr-none">Nenhum produto encontrado para essa busca.</p>
      )}

      {shown.length > 0 && (
        <ul className="pr-grid">
          {shown.map(p => (
            <li key={p.id}>
              <Card name={p.name} description={p.description} delivery={p.delivery_type} banner={p.banner_url ?? ''}
                pending={p.sync_status === 'pending'} date={new Date(p.created_at).toLocaleDateString('pt-BR')} />
            </li>
          ))}
        </ul>
      )}

      {open && <CreateModal base={base} onClose={() => setOpen(false)}
        onCreated={() => { setOpen(false); setToast('Produto criado. O bot vai receber em instantes.'); load() }} />}
      {toast && <div className="pr-toast" role="status">{toast}</div>}
    </main>
  )
}

function CreateModal({ base, onClose, onCreated }: { base: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [delivery, setDelivery] = useState<'' | Delivery>('')
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

  function pick(f: File | null | undefined) {
    if (!f) return
    if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) return setErrs(e => ({ ...e, banner: 'Use PNG, JPG, WEBP ou GIF.' }))
    if (f.size > 5 * 1024 * 1024) return setErrs(e => ({ ...e, banner: 'O banner deve ter no máximo 5 MB.' }))
    setErrs(e => ({ ...e, banner: '' })); setFile(f)
  }

  async function submit() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Informe o nome do produto.'
    if (!desc.trim()) e.description = 'Informe a descrição.'
    if (!delivery) e.delivery_type = 'Escolha como o produto será entregue.'
    setErrs(e)
    if (Object.values(e).some(Boolean)) return
    setBusy(true)
    const fd = new FormData()
    fd.set('name', name.trim()); fd.set('description', desc.trim())
    fd.set('delivery_type', delivery)
    if (file) fd.set('banner', file) // opcional
    try {
      const r = await fetch(base, { method: 'POST', body: fd, credentials: 'include' })
      if (r.status === 201) return onCreated()
      const j = await r.json().catch(() => ({}))
      setErrs({ ...(j.errors ?? {}), form: j.errors ? '' : (j.error ?? 'Não foi possível criar o produto.') })
    } catch { setErrs({ form: 'Sem conexão. Tente novamente.' }) }
    setBusy(false)
  }

  return (
    <div className="pr-overlay" onMouseDown={ev => ev.target === ev.currentTarget && !busy && onClose()}>
      <div className="pr-modal" role="dialog" aria-modal="true" aria-labelledby="pr-t">
        <div className="pr-form">
          <h2 id="pr-t">Criar produto</h2>

          <label className="pr-f">
            <span>Nome <b>*</b></span>
            <input ref={first} value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder="Ex.: Plano VIP 30 dias" />
            {errs.name && <small>{errs.name}</small>}
          </label>

          <label className="pr-f">
            <span>Descrição <b>*</b></span>
            <textarea rows={4} value={desc} maxLength={1000} onChange={e => setDesc(e.target.value)} placeholder="O que o cliente recebe ao comprar?" />
            {errs.description && <small>{errs.description}</small>}
          </label>

          <fieldset className="pr-f">
            <legend>Tipo de entrega <b>*</b></legend>
            <div className="pr-opts">
              {(['automatic', 'manual'] as const).map(v => (
                <button key={v} type="button" aria-pressed={delivery === v} className={delivery === v ? 'on' : ''} onClick={() => setDelivery(v)}>
                  <strong>{v === 'automatic' ? <IBolt /> : <IHand />}{DELIVERY[v].short}</strong>
                  <span>{DELIVERY[v].hint}</span>
                </button>
              ))}
            </div>
            {errs.delivery_type && <small>{errs.delivery_type}</small>}
          </fieldset>

          <div className="pr-f">
            <span>Banner <em className="opt">(opcional)</em></span>
            <label className={'pr-drop' + (file ? ' has' : '')}
              onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files?.[0]) }}>
              <IImage />
              <em>{file ? file.name : 'Arraste uma imagem ou clique para escolher'}</em>
              <small className="hint">PNG, JPG, WEBP ou GIF · até 5 MB</small>
              <input key={file ? 'f' : 'n'} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => pick(e.target.files?.[0])} />
            </label>
            {file && <button type="button" className="pr-link" onClick={() => setFile(null)}>Remover imagem</button>}
            {errs.banner && <small>{errs.banner}</small>}
          </div>

          {errs.form && <div className="pr-err" role="alert">{errs.form}</div>}
          <div className="pr-actions">
            <button className="pr-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
            <button className="pr-btn" onClick={submit} disabled={busy}>{busy ? 'Criando…' : 'Criar produto'}</button>
          </div>
        </div>

        <aside className="pr-pv" aria-label="Prévia do produto">
          <p>Prévia</p>
          <Card ghost name={name.trim()} description={desc.trim()} delivery={delivery} banner={preview} />
        </aside>
      </div>
    </div>
  )
}

const CSS = `
.pr{--bg:#0a0a0d;--bg2:#101015;--bd:#1f2029;--bd2:#34364a;--tx:#f3f3f7;--mu:#8d8fa3;--ac:#7c5cff;--ok:#3ddc97;--wa:#f0b64a;--rd:#ff8b9a;
  font-family:'Hanken Grotesk',system-ui,sans-serif;color:var(--tx);max-width:1180px;margin:0 auto;padding:40px 32px 96px}
.pr h1,.pr h2{font-family:'Bricolage Grotesque','Hanken Grotesk',sans-serif;letter-spacing:-.02em}
.pr-head{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:28px}
.pr h1{margin:0;font-size:2.4rem;font-weight:800;line-height:1.05}
.pr-head p{margin:8px 0 0;color:var(--mu)}
.pr-btn{display:inline-flex;align-items:center;gap:8px;background:var(--ac);color:#fff;border:0;border-radius:10px;padding:11px 18px;font:inherit;font-weight:600;cursor:pointer;transition:filter .15s}
.pr-btn:hover:not(:disabled){filter:brightness(1.12)}
.pr-btn:disabled,.pr-ghost:disabled{opacity:.55;cursor:not-allowed}
.pr-ghost{background:none;border:1px solid var(--bd2);color:var(--tx);border-radius:10px;padding:11px 18px;font:inherit;cursor:pointer}
.pr button:focus-visible,.pr input:focus-visible,.pr textarea:focus-visible,.pr-drop:focus-within{outline:2px solid var(--ac);outline-offset:2px}

.pr-tools{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:22px}
.pr-search{flex:1 1 260px;display:flex;align-items:center;gap:10px;background:var(--bg);border:1px solid var(--bd);border-radius:10px;padding:0 14px;color:var(--mu)}
.pr-search:focus-within{border-color:var(--bd2)}
.pr-search input{flex:1;background:none;border:0;color:var(--tx);font:inherit;padding:11px 0;outline:0}
.pr-filter{display:flex;background:var(--bg);border:1px solid var(--bd);border-radius:10px;padding:3px;gap:2px}
.pr-filter button{background:none;border:0;color:var(--mu);font:inherit;padding:8px 14px;border-radius:8px;cursor:pointer}
.pr-filter button.on{background:#1b1c26;color:var(--tx)}

.pr-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
.pr-card{background:var(--bg);border:1px solid var(--bd);border-radius:14px;overflow:hidden;height:100%;display:flex;flex-direction:column;transition:border-color .15s,transform .15s}
.pr-card:not(.ghost):hover{border-color:var(--bd2);transform:translateY(-2px)}
.pr-media{position:relative;aspect-ratio:16/9;background:var(--bg2)}
.pr-media img{width:100%;height:100%;object-fit:cover;display:block}
.pr-noimg{height:100%;display:grid;place-content:center;justify-items:center;gap:6px;color:#4d4f63;font-size:.85rem}
.pr-chip{position:absolute;left:12px;top:12px;display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;font-size:.78rem;font-weight:600;background:rgba(8,8,11,.78);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.12)}
.pr-chip.automatic svg{color:var(--ac)}.pr-chip.manual svg{color:var(--wa)}
.pr-body{padding:16px 18px 16px;display:flex;flex-direction:column;gap:6px;flex:1}
.pr-body h3{margin:0;font-size:1.08rem;font-weight:700;line-height:1.3;overflow-wrap:anywhere}
.pr-body p{margin:0;color:var(--mu);font-size:.92rem;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.pr-body .ph{color:#4d4f63}
.pr-body footer{margin-top:auto;padding-top:14px;display:flex;justify-content:space-between;align-items:center;font-size:.8rem;color:var(--mu)}
.pr-status{display:inline-flex;align-items:center;gap:7px}
.pr-status i{width:7px;height:7px;border-radius:50%;background:var(--ok)}
.pr-status.wait{color:var(--wa)}.pr-status.wait i{background:var(--wa)}

.pr-skel{border:1px solid var(--bd);border-radius:14px;padding-bottom:18px;background:var(--bg);overflow:hidden}
.pr-skel div{aspect-ratio:16/9;background:var(--bg2);margin-bottom:16px}
.pr-skel span{display:block;height:12px;border-radius:6px;background:var(--bg2);margin:0 18px 10px;width:60%}
.pr-skel span+span{width:85%}
@media(prefers-reduced-motion:no-preference){.pr-skel{animation:prp 1.4s ease-in-out infinite}@keyframes prp{50%{opacity:.55}}}

.pr-empty{border:1px dashed var(--bd2);border-radius:16px;padding:64px 24px;text-align:center;display:grid;justify-items:center;gap:10px}
.pr-empty-ic{width:56px;height:56px;border-radius:14px;background:var(--bg2);border:1px solid var(--bd);display:grid;place-items:center;color:var(--ac);margin-bottom:6px}
.pr-empty h2{margin:0;font-size:1.4rem}
.pr-empty p{margin:0 0 14px;color:var(--mu);max-width:44ch;line-height:1.55}
.pr-none{color:var(--mu);text-align:center;padding:40px 0}
.pr-err{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid #6d2a36;background:#1d0f13;color:var(--rd);border-radius:10px;padding:12px 16px;margin:0 0 20px}
.pr-err button{background:none;border:0;color:inherit;text-decoration:underline;cursor:pointer;font:inherit}
.pr-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#17181f;border:1px solid var(--bd2);border-left:3px solid var(--ok);padding:12px 18px;border-radius:10px;z-index:60;box-shadow:0 12px 40px rgba(0,0,0,.5)}

.pr-overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:16px;z-index:50}
.pr-modal{background:#0d0d11;border:1px solid var(--bd2);border-radius:18px;width:100%;max-width:880px;max-height:94vh;overflow:auto;display:grid;grid-template-columns:minmax(0,1fr) 300px}
.pr-form{padding:28px;display:grid;gap:18px;align-content:start}
.pr-form h2{margin:0;font-size:1.5rem;font-weight:800}
.pr-f{display:grid;gap:7px;border:0;padding:0;margin:0;font-size:.92rem;min-width:0}
.pr-f>span,.pr-f legend{font-weight:600;padding:0}.pr-f b{color:var(--ac);font-weight:700}
.pr-f input:not([type=file]),.pr-f textarea{background:var(--bg);border:1px solid var(--bd);border-radius:10px;color:var(--tx);padding:11px 13px;font:inherit;resize:vertical;width:100%;box-sizing:border-box}
.pr-f input:focus,.pr-f textarea:focus{border-color:var(--ac)}
.pr-f>small,.pr-f small:not(.hint){color:var(--rd)}
.pr-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pr-opts button{text-align:left;background:var(--bg);border:1px solid var(--bd);color:var(--tx);border-radius:12px;padding:12px 14px;font:inherit;cursor:pointer;display:grid;gap:4px}
.pr-opts button strong{display:inline-flex;align-items:center;gap:7px}
.pr-opts button span{color:var(--mu);font-size:.8rem;line-height:1.4}
.pr-opts button.on{border-color:var(--ac);background:#15122a;box-shadow:0 0 0 1px var(--ac)}
.pr-drop{position:relative;display:grid;justify-items:center;gap:4px;border:1px dashed var(--bd2);border-radius:12px;padding:20px;cursor:pointer;color:var(--mu);text-align:center}
.pr-drop:hover,.pr-drop.has{border-color:var(--ac)}
.pr-drop em{font-style:normal;color:var(--tx);overflow-wrap:anywhere}.pr-drop .hint{font-size:.78rem}
.pr-drop input{position:absolute;inset:0;opacity:0;cursor:pointer}
.pr-f>span em.opt{font-style:normal;font-weight:400;color:var(--mu)}
.pr-link{justify-self:start;background:none;border:0;color:var(--mu);text-decoration:underline;font:inherit;font-size:.85rem;cursor:pointer;padding:0}
.pr-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}
.pr-pv{background:var(--bg2);border-left:1px solid var(--bd);padding:28px 22px;display:grid;align-content:start;gap:12px}
.pr-pv>p{margin:0;font-weight:600;font-size:.92rem;color:var(--mu)}
@media(max-width:760px){.pr{padding:28px 16px 80px}.pr h1{font-size:1.9rem}.pr-modal{grid-template-columns:1fr}.pr-pv{border-left:0;border-top:1px solid var(--bd)}.pr-opts{grid-template-columns:1fr}}
`
