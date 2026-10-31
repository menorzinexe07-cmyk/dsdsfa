-- Produtos dos bots (ZyraSallers). Acesso só pelo servidor (service role).
create table if not exists bot_products (
  id              uuid primary key default gen_random_uuid(),
  bot_id          text not null,
  name            text not null check (char_length(name) between 1 and 80),
  description     text not null check (char_length(description) between 1 and 1000),
  delivery_type   text not null check (delivery_type in ('automatic','manual')),
  banner_url      text not null,
  bot_product_id  text,                       -- ID do produto dentro do bot (preenchido no sync)
  sync_status     text not null default 'pending' check (sync_status in ('pending','synced')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (bot_id, bot_product_id)
);
create index if not exists bot_products_bot_idx on bot_products (bot_id, created_at desc);
alter table bot_products enable row level security; -- sem policies: só service role

insert into storage.buckets (id, name, public)
values ('product-banners', 'product-banners', true)
on conflict (id) do nothing;
