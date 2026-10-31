// Produtos: dashboard (dono do bot) + API do Bot Manager.
// AJUSTE 3 coisas conforme seu projeto: os imports abaixo (db, requireBotAccess, requireCredential)
// e o registro das rotas no router.ts (veja o bloco no final).
import { db } from './db'                                   // cliente Supabase (service role)
import { requireBotAccess, requireCredential } from './auth' // devem lançar Response 401/403/404

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

const MAX_BANNER = 5 * 1024 * 1024
const IMG_TYPES: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
}
const COLS = 'id, bot_id, name, description, delivery_type, banner_url, sync_status, created_at'

/* ───────── Dashboard ───────── */

// GET /api/dashboard/bots/:botId/products
export async function listProducts(req: Request, botId: string) {
  await requireBotAccess(req, botId)
  const { data, error } = await db.from('bot_products').select(COLS)
    .eq('bot_id', botId).order('created_at', { ascending: false })
  if (error) return json({ error: 'Falha ao listar produtos.' }, 500)
  return json({ products: data })
}

// POST /api/dashboard/bots/:botId/products  (multipart/form-data)
export async function createProduct(req: Request, botId: string) {
  await requireBotAccess(req, botId)
  const form = await req.formData()
  const name = String(form.get('name') ?? '').trim()
  const description = String(form.get('description') ?? '').trim()
  const delivery = String(form.get('delivery_type') ?? '')
  const banner = form.get('banner')

  const errors: Record<string, string> = {}
  if (!name || name.length > 80) errors.name = 'Informe o nome (até 80 caracteres).'
  if (!description || description.length > 1000) errors.description = 'Informe a descrição (até 1000 caracteres).'
  if (!['automatic', 'manual'].includes(delivery)) errors.delivery_type = 'Escolha Automático ou Manual.'
  if (!(banner instanceof File) || banner.size === 0) errors.banner = 'Envie o banner.'
  else if (!IMG_TYPES[banner.type]) errors.banner = 'Use PNG, JPG, WEBP ou GIF.'
  else if (banner.size > MAX_BANNER) errors.banner = 'O banner deve ter no máximo 5 MB.'
  if (Object.keys(errors).length) return json({ error: 'Dados inválidos.', errors }, 422)

  const file = banner as File
  const path = `${botId}/${crypto.randomUUID()}.${IMG_TYPES[file.type]}`
  const up = await db.storage.from('product-banners')
    .upload(path, await file.arrayBuffer(), { contentType: file.type })
  if (up.error) return json({ error: 'Falha ao enviar o banner.' }, 500)
  const banner_url = db.storage.from('product-banners').getPublicUrl(path).data.publicUrl

  // Fica "pending" até o bot buscar (GET .../products/pending) e confirmar via listproducts.
  const { data, error } = await db.from('bot_products')
    .insert({ bot_id: botId, name, description, delivery_type: delivery, banner_url })
    .select(COLS).single()
  if (error) return json({ error: 'Falha ao criar o produto.' }, 500)
  return json({ product: data }, 201)
}

/* ───────── API do Bot Manager (Authorization: Bearer zy_...) ───────── */

// GET /api/v1/apps/:botId/products/pending → o bot busca o que foi criado no site
export async function pendingProducts(req: Request, botId: string) {
  await requireCredential(req, botId)
  const { data, error } = await db.from('bot_products')
    .select('id, name, description, delivery_type, banner_url, created_at')
    .eq('bot_id', botId).eq('sync_status', 'pending').order('created_at')
  if (error) return json({ error: 'Falha ao buscar pendentes.' }, 500)
  return json({ products: data })
}

// POST /api/v1/apps/:botId/listproducts → o bot envia TODOS os produtos do cliente
// body: { products: [{ id, site_id?, name, description, delivery_type, banner_url? }] }
export async function syncListProducts(req: Request, botId: string) {
  await requireCredential(req, botId)
  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.products) || body.products.length > 500)
    return json({ error: 'Payload inválido.' }, 422)

  let created = 0, updated = 0
  const seen: string[] = []
  for (const p of body.products) {
    if (!p?.id || !p.name || !['automatic', 'manual'].includes(p.delivery_type))
      return json({ error: 'Produto inválido no payload.', item: p?.id ?? null }, 422)
    const botPid = String(p.id)
    seen.push(botPid)
    const row = {
      name: String(p.name).slice(0, 80),
      description: String(p.description ?? '').slice(0, 1000) || '—',
      delivery_type: p.delivery_type,
      sync_status: 'synced',
      updated_at: new Date().toISOString(),
      ...(p.banner_url ? { banner_url: String(p.banner_url) } : {}),
    }
    // produto criado pelo site: casa pelo site_id e grava o ID do bot
    if (p.site_id) {
      const { data } = await db.from('bot_products')
        .update({ ...row, bot_product_id: botPid })
        .eq('id', p.site_id).eq('bot_id', botId).select('id')
      if (data?.length) { updated++; continue }
    }
    const { data: ex } = await db.from('bot_products').select('id')
      .eq('bot_id', botId).eq('bot_product_id', botPid).maybeSingle()
    if (ex) { await db.from('bot_products').update(row).eq('id', ex.id); updated++ }
    else {
      await db.from('bot_products').insert({
        bot_id: botId, bot_product_id: botPid, banner_url: '', ...row,
      })
      created++
    }
  }
  // produtos que o bot não tem mais (e já estavam sincronizados) saem do site
  const { data: all } = await db.from('bot_products').select('id, bot_product_id')
    .eq('bot_id', botId).eq('sync_status', 'synced')
  const gone = (all ?? []).filter(r => r.bot_product_id && !seen.includes(r.bot_product_id)).map(r => r.id)
  if (gone.length) await db.from('bot_products').delete().in('id', gone)

  return json({ ok: true, created, updated, removed: gone.length })
}

/* Registre no router.ts (padrões):
   GET  /api/dashboard/bots/:botId/products          → listProducts
   POST /api/dashboard/bots/:botId/products          → createProduct
   GET  /api/v1/apps/:botId/products/pending         → pendingProducts
   POST /api/v1/apps/:botId/listproducts             → syncListProducts
*/
