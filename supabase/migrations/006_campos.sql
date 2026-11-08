-- Campos de um produto (Nome, descrição, preço, emoji) e o estoque de cada campo.
-- O site não regrava o estoque do bot: ele enfileira OPERAÇÕES (criar campo, excluir campo, adicionar estoque) e o bot aplica
-- no banco dele e confirma. Assim, o estoque que o bot já vendeu nunca "volta" por causa de uma lista antiga do site.
create table if not exists product_ops (
  id bigint generated always as identity primary key,
  bot_id text not null references apps on delete cascade,
  product_id uuid not null references products on delete cascade,
  type text not null check (type in ('field.create', 'field.delete', 'stock.add')),
  payload jsonb not null,                 -- o que o bot recebe (no estoque, as linhas)
  resumo jsonb not null default '{}',     -- o que o painel mostra (sem as linhas)
  created_by text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,                 -- quando o bot confirmou
  error text);
create index if not exists product_ops_pending_idx on product_ops (bot_id, id) where applied_at is null;
create index if not exists product_ops_product_idx on product_ops (product_id, id desc);
alter table product_ops enable row level security;
revoke all on product_ops from anon, authenticated;
