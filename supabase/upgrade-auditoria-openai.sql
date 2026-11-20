-- Caçador de Ofertas IA — auditoria OpenAI, decisão semanal gravada e aviso de pronto.
-- Idempotente. Não apaga produtos, anúncios, análises nem testes.
-- Rode no SQL Editor do Supabase depois de publicar o app que aceita o evento ready_for_approval.

alter table public.analyses add column if not exists verdict text;
alter table public.analyses add column if not exists blockers jsonb;

do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'analyses'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%kind%'
  loop
    execute format('alter table public.analyses drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.analyses add constraint analyses_kind_check
  check (kind in ('product', 'ad', 'openai_audit'));

alter table public.analyses add constraint analysis_kind_matches_ad
  check (
    (kind = 'product' and ad_id is null)
    or (kind = 'ad' and ad_id is not null)
    or (kind = 'openai_audit' and ad_id is null)
  );

alter table public.analyses drop constraint if exists analyses_verdict_check;
alter table public.analyses add constraint analyses_verdict_check
  check (verdict is null or verdict in ('approve', 'reject', 'needs_work'));

alter table public.analyses drop constraint if exists analyses_blockers_check;
alter table public.analyses add constraint analyses_blockers_check
  check (blockers is null or jsonb_typeof(blockers) = 'array');

comment on column public.analyses.verdict is
  'Auditoria OpenAI: approve, reject, needs_work. Nulo nas análises antigas.';
comment on column public.analyses.blockers is
  'Lista de bloqueios da auditoria OpenAI. Nulo quando a análise não é uma auditoria.';

create table if not exists public.weekly_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('launch_one', 'prepare_one', 'no_viable_offer')),
  product_id uuid references public.products(id) on delete set null,
  rationale text not null default '',
  risks jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  model text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_weekly_decisions_owner_created
  on public.weekly_decisions (user_id, created_at desc);

alter table public.weekly_decisions enable row level security;

drop policy if exists weekly_decisions_select_own on public.weekly_decisions;
create policy weekly_decisions_select_own on public.weekly_decisions
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.weekly_decisions from anon;
grant select on public.weekly_decisions to authenticated;
grant select, insert, update, delete on public.weekly_decisions to service_role;

create or replace function private.enqueue_product_push()
returns trigger
language plpgsql
security definer
set search_path = private, public, net, pg_temp
as $$
declare
  settings record;
  events jsonb := '[]'::jsonb;
begin
  if tg_op = 'INSERT' then
    events := events || jsonb_build_array('new_offer');
  end if;
  if new.weekly_pick is true and (tg_op = 'INSERT' or old.weekly_pick is distinct from true) then
    events := events || jsonb_build_array('weekly_pick');
  end if;
  if tg_op = 'UPDATE' and new.status = 'ready' and old.status is distinct from 'ready' then
    events := events || jsonb_build_array('ready_for_approval');
  end if;
  if jsonb_array_length(events) = 0 then
    return new;
  end if;
  if not exists (select 1 from public.push_subscriptions where user_id = new.user_id) then
    return new;
  end if;

  select webhook_url, webhook_secret into settings
  from private.push_settings
  where id = 1;
  if settings.webhook_url is null
     or settings.webhook_url !~ '^https://'
     or settings.webhook_secret is null
     or char_length(settings.webhook_secret) < 24
     or settings.webhook_secret = 'TROQUE_ESTE_SEGREDO_POR_UM_VALOR_LONGO' then
    return new;
  end if;

  perform net.http_post(
    url := settings.webhook_url,
    body := jsonb_build_object(
      'events', events,
      'product_id', new.id,
      'user_id', new.user_id,
      'name', left(new.name, 150)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || settings.webhook_secret
    ),
    timeout_milliseconds := 8000
  );
  return new;
exception when others then
  raise warning 'Notificação push não enfileirada (SQLSTATE %). A oferta foi salva.', sqlstate;
  return new;
end;
$$;

revoke all on function private.enqueue_product_push() from public, anon;
grant execute on function private.enqueue_product_push() to authenticated, service_role;

drop trigger if exists trg_products_push on public.products;
create trigger trg_products_push
  after insert or update of weekly_pick, status on public.products
  for each row execute function private.enqueue_product_push();

notify pgrst, 'reload schema';
