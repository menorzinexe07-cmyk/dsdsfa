-- Produtos de cada bot: criados pelo painel (source = 'site') ou enviados pelo bot (source = 'bot', via listproducts).
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  bot_id text not null references apps on delete cascade,
  external_id text,                                   -- id do produto dentro do bot (quando o bot informa)
  name text not null check (char_length(name) between 1 and 80),
  description text not null check (char_length(description) between 1 and 1000),
  delivery_type text not null check (delivery_type in ('automatic', 'manual')),
  banner_url text not null default '',
  banner_path text,                                   -- caminho no Storage (só para banners enviados pelo site)
  source text not null default 'site' check (source in ('site', 'bot')),
  sync_status text not null default 'pending' check (sync_status in ('pending', 'synced', 'failed')),
  sync_error text,
  synced_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());
create index if not exists products_bot_idx on products (bot_id, created_at desc);
create unique index if not exists products_bot_external_uidx on products (bot_id, external_id) where external_id is not null;
alter table products enable row level security;
revoke all on products from anon, authenticated;

-- Bucket público (só leitura) para os banners. Os nomes dos arquivos são aleatórios; quem envia é sempre o servidor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-banners', 'product-banners', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;
