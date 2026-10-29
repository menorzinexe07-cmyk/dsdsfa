-- Zyra Apps — Fase 2/3. Rode DEPOIS do schema.sql.
-- "Venda confirmada" = status 'approved'. Só ela entra em receita, ticket médio e clientes.
create or replace function bot_stats(p_bot text, p_from timestamptz, p_to timestamptz) returns jsonb language sql stable as $$
with s as (select * from sales where bot_id = p_bot),
     f as (select * from s where sold_at between p_from and p_to),
     a as (select * from f where status = 'approved'),
     sp as (select * from s where status = 'approved')
select jsonb_build_object(
  'gross', (select sum(amount_gross) from a),
  'net', (select sum(amount_net) from a),
  'sales', (select count(*) from a),
  'avg_ticket', (select avg(amount_gross) from a),
  'unique_customers', (select count(distinct coalesce(customer_discord_id, customer_name)) from a),
  'status_counts', (select coalesce(jsonb_object_agg(status, c), '{}') from (select status, count(*) c from f group by status) x),
  'today', (select jsonb_build_object('sales', count(*), 'gross', sum(amount_gross)) from sp
            where (sold_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date),
  'last7', (select jsonb_build_object('sales', count(*), 'gross', sum(amount_gross)) from sp where sold_at >= now() - interval '7 days'),
  'last30', (select jsonb_build_object('sales', count(*), 'gross', sum(amount_gross)) from sp where sold_at >= now() - interval '30 days'),
  'all', (select jsonb_build_object('sales', count(*), 'gross', sum(amount_gross)) from sp),
  'last_sale', (select max(sold_at) from s),
  'daily', (select coalesce(jsonb_agg(d order by d->>'day'), '[]') from (
      select jsonb_build_object('day', (sold_at at time zone 'America/Sao_Paulo')::date, 'sales', count(*), 'gross', sum(amount_gross)) d
      from a group by (sold_at at time zone 'America/Sao_Paulo')::date) q),
  'top_products', (select coalesce(jsonb_agg(t), '[]') from (
      select product_name as name, count(*) as sales, sum(amount_gross) as gross from a
      where product_name is not null group by product_name order by count(*) desc limit 5) t),
  'top_customers', (select coalesce(jsonb_agg(t), '[]') from (
      select max(customer_name) as name, customer_discord_id as discord_id, count(*) as purchases, sum(amount_gross) as spent
      from a where customer_discord_id is not null group by customer_discord_id order by sum(amount_gross) desc nulls last limit 5) t)
);
$$;

create or replace function bot_customers(p_bot text, p_q text, p_limit int, p_offset int) returns jsonb language sql stable as $$
with g as (
  select coalesce(customer_discord_id, 'nome:' || coalesce(customer_name, '?')) k,
         max(customer_discord_id) did, max(customer_name) name,
         min(sold_at) first_at, max(sold_at) last_at, count(*) purchases,
         sum(amount_gross) spent,
         array_remove(array_agg(distinct product_name), null) products
  from sales where bot_id = p_bot and status = 'approved' group by 1),
f as (select * from g where coalesce(p_q, '') = '' or name ilike '%' || p_q || '%' or did = p_q)
select jsonb_build_object(
  'total', (select count(*) from f),
  'rows', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from (
      select * from f order by spent desc nulls last limit p_limit offset p_offset) r));
$$;
revoke all on function bot_stats, bot_customers from public, anon, authenticated;

insert into platform_settings(key, value) values
 ('price', '{"amount":5,"currency":"BRL","label":"R$ 5,00 por mês"}'),
 ('site',  '{"invite":"https://discord.gg/4ucJwmSgPR"}')
on conflict (key) do nothing;
