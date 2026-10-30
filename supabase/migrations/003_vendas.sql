-- Rode DEPOIS de 001 e 002. Novos campos de venda + stats baseadas no valor líquido.
alter table sales add column if not exists customer_icon text;
alter table sales add column if not exists payment_method text;
alter table sales add column if not exists gateway text;
alter table customers add column if not exists icon_url text;

create or replace function ingest_sale(p jsonb, p_cred uuid) returns text language plpgsql as $$
declare v_bot text := p->>'bot_id'; v_sale text := p->>'sale_id'; v_cust text := p#>>'{customer,discord_user_id}';
begin
  insert into api_events(event_id,credential_id,type,bot_id,payload,outcome)
    values (p->>'event_id',p_cred,'sale',v_bot,p,'processed') on conflict (event_id) do nothing;
  if not found then return 'duplicate_event'; end if;
  if not exists (select 1 from apps where bot_id=v_bot) then raise exception 'bot_not_found'; end if;
  if v_cust is not null then
    insert into customers(bot_id,discord_user_id,name,icon_url) values (v_bot,v_cust,p#>>'{customer,name}',p#>>'{customer,icon}')
      on conflict (bot_id,discord_user_id) do update
        set name=coalesce(excluded.name,customers.name), icon_url=coalesce(excluded.icon_url,customers.icon_url);
  end if;
  insert into sales(bot_id,sale_id,event_id,customer_discord_id,customer_name,customer_icon,product_id,product_name,
    amount_gross,fees,amount_net,currency,status,sold_at,payment_method,gateway)
  values (v_bot,v_sale,p->>'event_id',v_cust,p#>>'{customer,name}',p#>>'{customer,icon}',p#>>'{product,id}',p#>>'{product,name}',
    (p->>'amount_gross')::numeric,(p->>'fees')::numeric,(p->>'amount_net')::numeric,
    coalesce(p->>'currency','BRL'),p->>'status',(p->>'sold_at')::timestamptz,p->>'payment_method',p->>'gateway')
  on conflict (bot_id,sale_id) do nothing;
  if not found then return 'duplicate_sale'; end if;
  insert into sale_status_history(bot_id,sale_id,old_status,new_status,changed_by) values (v_bot,v_sale,null,p->>'status',p_cred);
  insert into app_integrations(bot_id,last_request_at,last_event_id,events_processed) values (v_bot,now(),p->>'event_id',1)
    on conflict (bot_id) do update set last_request_at=now(),last_event_id=excluded.last_event_id,events_processed=app_integrations.events_processed+1;
  return 'created';
end $$;
revoke all on function ingest_sale from public, anon, authenticated;

-- "valor" = líquido enviado; se só o bruto foi informado, usa o bruto.
create or replace function bot_stats(p_bot text, p_from timestamptz, p_to timestamptz) returns jsonb language sql stable as $$
with s as (select *, coalesce(amount_net, amount_gross) as v from sales where bot_id = p_bot),
     f as (select * from s where sold_at between p_from and p_to),
     a as (select * from f where status = 'approved'),
     sp as (select * from s where status = 'approved')
select jsonb_build_object(
  'revenue', (select sum(v) from a),
  'gross', (select sum(amount_gross) from a),
  'net', (select sum(amount_net) from a),
  'sales', (select count(*) from a),
  'avg_ticket', (select avg(v) from a),
  'unique_customers', (select count(distinct coalesce(customer_discord_id, customer_name)) from a),
  'status_counts', (select coalesce(jsonb_object_agg(status, c), '{}') from (select status, count(*) c from f group by status) x),
  'today', (select jsonb_build_object('sales', count(*), 'revenue', sum(v)) from sp
            where (sold_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date),
  'last7', (select jsonb_build_object('sales', count(*), 'revenue', sum(v)) from sp where sold_at >= now() - interval '7 days'),
  'last30', (select jsonb_build_object('sales', count(*), 'revenue', sum(v)) from sp where sold_at >= now() - interval '30 days'),
  'all', (select jsonb_build_object('sales', count(*), 'revenue', sum(v)) from sp),
  'last_sale', (select max(sold_at) from s),
  'daily', (select coalesce(jsonb_agg(d order by d->>'day'), '[]') from (
      select jsonb_build_object('day', (sold_at at time zone 'America/Sao_Paulo')::date, 'sales', count(*), 'revenue', sum(v)) d
      from a group by (sold_at at time zone 'America/Sao_Paulo')::date) q),
  'top_products', (select coalesce(jsonb_agg(t), '[]') from (
      select product_name as name, count(*) as sales, sum(v) as revenue from a
      where product_name is not null group by product_name order by count(*) desc limit 5) t),
  'top_customers', (select coalesce(jsonb_agg(t), '[]') from (
      select max(customer_name) as name, customer_discord_id as discord_id, max(customer_icon) as icon,
             count(*) as purchases, sum(v) as revenue
      from a where customer_discord_id is not null group by customer_discord_id order by sum(v) desc nulls last limit 5) t)
);
$$;

create or replace function bot_customers(p_bot text, p_q text, p_limit int, p_offset int) returns jsonb language sql stable as $$
with g as (
  select coalesce(customer_discord_id, 'nome:' || coalesce(customer_name, '?')) k,
         max(customer_discord_id) did, max(customer_name) name, max(customer_icon) icon,
         min(sold_at) first_at, max(sold_at) last_at, count(*) purchases,
         sum(coalesce(amount_net, amount_gross)) spent,
         array_remove(array_agg(distinct product_name), null) products
  from sales where bot_id = p_bot and status = 'approved' group by 1),
f as (select * from g where coalesce(p_q, '') = '' or name ilike '%' || p_q || '%' or did = p_q)
select jsonb_build_object(
  'total', (select count(*) from f),
  'rows', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from (
      select * from f order by spent desc nulls last limit p_limit offset p_offset) r));
$$;
revoke all on function bot_stats, bot_customers from public, anon, authenticated;
