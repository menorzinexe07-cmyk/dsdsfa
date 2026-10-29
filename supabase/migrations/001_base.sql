-- Zyra Apps — Fase 1. Rode no SQL Editor do Supabase.
-- Segurança: RLS ligado em tudo e SEM políticas para anon/authenticated.
-- Todo acesso passa pelo backend (service role), que valida sessão e propriedade.
create extension if not exists pgcrypto;

create table profiles (
  discord_id text primary key,               -- sempre string (snowflake)
  username text not null, global_name text, avatar text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now());

create table platform_admins (discord_id text primary key references profiles on delete cascade,
  created_at timestamptz not null default now());

create table sessions (token_hash text primary key,
  discord_id text not null references profiles on delete cascade,
  expires_at timestamptz not null, created_at timestamptz not null default now());

create table apps (bot_id text primary key, name text not null, avatar_url text,
  license_status text not null default 'active' check (license_status in ('active','suspended','expired')),
  created_at timestamptz not null default now());

create table app_owners (
  bot_id text not null references apps on delete cascade,
  discord_user_id text not null,
  active boolean not null default true,
  acquired_at timestamptz not null default now(),
  primary key (bot_id, discord_user_id));

create table app_purchases (
  purchase_id text primary key,
  event_id text unique not null,
  bot_id text not null references apps, discord_user_id text not null,
  status text not null check (status in ('confirmed','pending','canceled','refunded')),
  purchased_at timestamptz not null, created_at timestamptz not null default now());

create table app_integrations (bot_id text primary key references apps on delete cascade,
  last_request_at timestamptz, last_event_id text, events_processed int not null default 0);

create table api_credentials (
  id uuid primary key default gen_random_uuid(),
  name text not null, key_prefix text not null,
  key_hash text unique not null,             -- sha256 do segredo; o segredo nunca é guardado
  bot_ids text[] not null default '{}',      -- bots autorizados; '*' = Bot Manager global
  revoked_at timestamptz, last_used_at timestamptz,
  created_at timestamptz not null default now());

create table api_events (
  event_id text primary key,                 -- garante idempotência
  credential_id uuid references api_credentials, type text not null, bot_id text,
  payload jsonb, outcome text not null, error text,
  received_at timestamptz not null default now());

create table customers (
  bot_id text not null references apps on delete cascade,
  discord_user_id text not null, name text,
  first_seen_at timestamptz not null default now(),
  primary key (bot_id, discord_user_id));

create table sales (
  bot_id text not null references apps on delete cascade,
  sale_id text not null, event_id text not null,
  customer_discord_id text, customer_name text,
  product_id text, product_name text,
  amount_gross numeric(14,2), fees numeric(14,2), amount_net numeric(14,2),  -- null = não informado
  amounts_source text not null default 'bot_manager',
  currency char(3) not null default 'BRL',
  status text not null check (status in ('approved','pending','canceled','refunded')),
  sold_at timestamptz not null, received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bot_id, sale_id));
create index on sales (bot_id, sold_at desc);
create index on sales (bot_id, status);
create index on sales (bot_id, customer_discord_id);

create table sale_status_history (
  id bigserial primary key, bot_id text not null, sale_id text not null,
  old_status text, new_status text not null, changed_by uuid references api_credentials,
  changed_at timestamptz not null default now(),
  foreign key (bot_id, sale_id) references sales on delete cascade);

create table audit_logs (id bigserial primary key, actor text, action text not null,
  target text, meta jsonb, created_at timestamptz not null default now());
create table platform_settings (key text primary key, value jsonb not null);

do $$ declare t text; begin
  foreach t in array array['profiles','platform_admins','sessions','apps','app_owners','app_purchases',
   'app_integrations','api_credentials','api_events','customers','sales','sale_status_history','audit_logs','platform_settings']
  loop execute format('alter table %I enable row level security', t);
       execute format('revoke all on %I from anon, authenticated', t); end loop; end $$;

-- Ingestão atômica de venda (idempotente por event_id e por bot_id+sale_id)
create or replace function ingest_sale(p jsonb, p_cred uuid) returns text language plpgsql as $$
declare v_bot text := p->>'bot_id'; v_sale text := p->>'sale_id'; v_cust text := p#>>'{customer,discord_user_id}';
begin
  insert into api_events(event_id,credential_id,type,bot_id,payload,outcome)
    values (p->>'event_id',p_cred,'sale',v_bot,p,'processed') on conflict (event_id) do nothing;
  if not found then return 'duplicate_event'; end if;
  if not exists (select 1 from apps where bot_id=v_bot) then raise exception 'bot_not_found'; end if;
  if v_cust is not null then
    insert into customers(bot_id,discord_user_id,name) values (v_bot,v_cust,p#>>'{customer,name}')
      on conflict (bot_id,discord_user_id) do update set name=coalesce(excluded.name,customers.name);
  end if;
  insert into sales(bot_id,sale_id,event_id,customer_discord_id,customer_name,product_id,product_name,
    amount_gross,fees,amount_net,currency,status,sold_at)
  values (v_bot,v_sale,p->>'event_id',v_cust,p#>>'{customer,name}',p#>>'{product,id}',p#>>'{product,name}',
    (p->>'amount_gross')::numeric,(p->>'fees')::numeric,(p->>'amount_net')::numeric,
    coalesce(p->>'currency','BRL'),p->>'status',(p->>'sold_at')::timestamptz)
  on conflict (bot_id,sale_id) do nothing;
  if not found then return 'duplicate_sale'; end if;
  insert into sale_status_history(bot_id,sale_id,old_status,new_status,changed_by) values (v_bot,v_sale,null,p->>'status',p_cred);
  insert into app_integrations(bot_id,last_request_at,last_event_id,events_processed) values (v_bot,now(),p->>'event_id',1)
    on conflict (bot_id) do update set last_request_at=now(),last_event_id=excluded.last_event_id,events_processed=app_integrations.events_processed+1;
  return 'created';
end $$;

-- Ingestão atômica de compra/propriedade
create or replace function ingest_purchase(p jsonb, p_cred uuid) returns text language plpgsql as $$
declare v_bot text := p->>'bot_id'; v_user text := p->>'discord_user_id'; v_status text := p->>'status';
begin
  insert into api_events(event_id,credential_id,type,bot_id,payload,outcome)
    values (p->>'event_id',p_cred,'purchase',v_bot,p,'processed') on conflict (event_id) do nothing;
  if not found then return 'duplicate_event'; end if;
  insert into apps(bot_id,name) values (v_bot,coalesce(p->>'bot_name','ZyraSallers')) on conflict (bot_id) do nothing;
  insert into app_purchases(purchase_id,event_id,bot_id,discord_user_id,status,purchased_at)
    values (p->>'purchase_id',p->>'event_id',v_bot,v_user,v_status,(p->>'purchased_at')::timestamptz)
  on conflict (purchase_id) do update set status=excluded.status;
  insert into app_owners(bot_id,discord_user_id,active) values (v_bot,v_user,v_status='confirmed')
    on conflict (bot_id,discord_user_id) do update set active=(v_status='confirmed');
  return 'ok';
end $$;

-- Atualização de status com histórico
create or replace function update_sale_status(p_bot text, p_sale text, p_status text, p_cred uuid) returns text language plpgsql as $$
declare v_old text;
begin
  select status into v_old from sales where bot_id=p_bot and sale_id=p_sale for update;
  if not found then return 'not_found'; end if;
  if v_old = p_status then return 'unchanged'; end if;
  update sales set status=p_status, updated_at=now() where bot_id=p_bot and sale_id=p_sale;
  insert into sale_status_history(bot_id,sale_id,old_status,new_status,changed_by) values (p_bot,p_sale,v_old,p_status,p_cred);
  return 'updated';
end $$;
revoke all on function ingest_sale, ingest_purchase, update_sale_status from public, anon, authenticated;
