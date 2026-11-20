-- Caçador de Ofertas IA — notificações, formato, facilidade e escolha da semana.
-- Execute UMA VEZ no SQL Editor do projeto https://brhnrukuwqbfhbyruzak.supabase.co.
-- Não apaga produtos, anúncios, análises nem testes.
-- Antes de rodar: troque o segredo abaixo pelo mesmo valor de PUSH_WEBHOOK_SECRET na Hostinger
-- (mínimo 24 caracteres). Não deixe o texto de exemplo.

create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;

alter table public.products add column if not exists format text not null default '';
alter table public.products add column if not exists difficulty text not null default '';
alter table public.products add column if not exists weekly_pick boolean not null default false;
alter table public.products add column if not exists weekly_pick_at timestamptz;

alter table public.products drop constraint if exists products_format_check;
alter table public.products add constraint products_format_check
  check (format in ('', 'printable', 'templates', 'planilha', 'ebook', 'biblioteca', 'audio', 'curso', 'app'));

alter table public.products drop constraint if exists products_difficulty_check;
alter table public.products add constraint products_difficulty_check
  check (difficulty in ('', 'facil', 'moderada', 'dificil'));

comment on column public.products.format is
  'Formato digital: printable, templates, planilha, ebook, biblioteca, audio, curso, app ou vazio.';
comment on column public.products.difficulty is
  'Facilidade: facil, moderada, dificil ou vazio. Vazio deixa o app calcular pela análise.';
comment on column public.products.weekly_pick is
  'true marca a escolha da semana, avisa o celular e desmarca as outras ofertas do mesmo usuário.';

update public.products
set format = lower((regexp_match(notes, '#formato-digital:([a-z]+)'))[1])
where format = ''
  and lower((regexp_match(notes, '#formato-digital:([a-z]+)'))[1]) in
    ('printable', 'templates', 'planilha', 'ebook', 'biblioteca', 'audio', 'curso', 'app');

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null check (char_length(endpoint) between 12 and 4096 and endpoint like 'https://%'),
  p256dh text not null check (char_length(p256dh) between 1 and 300),
  auth text not null check (char_length(auth) between 1 and 300),
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id, created_at);
create index if not exists idx_products_weekly_pick
  on public.products (user_id)
  where weekly_pick;

drop trigger if exists trg_push_subscriptions_updated on public.push_subscriptions;
create trigger trg_push_subscriptions_updated
  before update on public.push_subscriptions
  for each row execute function public.update_changed_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;

create table if not exists private.push_settings (
  id int primary key check (id = 1),
  webhook_url text not null,
  webhook_secret text not null
);

alter table private.push_settings enable row level security;
revoke all on private.push_settings from public, anon, authenticated;

insert into private.push_settings (id, webhook_url, webhook_secret)
values (
  1,
  'https://grey-spider-486365.hostingersite.com/api/push/hook',
  'TROQUE_ESTE_SEGREDO_POR_UM_VALOR_LONGO'
)
on conflict (id) do update set
  webhook_url = excluded.webhook_url,
  webhook_secret = case
    when private.push_settings.webhook_secret = 'TROQUE_ESTE_SEGREDO_POR_UM_VALOR_LONGO'
      then excluded.webhook_secret
    else private.push_settings.webhook_secret
  end;

-- Para trocar um segredo que já foi gravado de verdade, rode à parte:
-- update private.push_settings
-- set webhook_url = 'https://grey-spider-486365.hostingersite.com/api/push/hook',
--     webhook_secret = 'NOVO_SEGREDO_COM_24_OU_MAIS_CARACTERES'
-- where id = 1;

create or replace function private.sync_weekly_pick()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.weekly_pick is true and (tg_op = 'INSERT' or old.weekly_pick is distinct from true) then
    update public.products
      set weekly_pick = false,
          weekly_pick_at = null
      where user_id = new.user_id
        and id is distinct from new.id
        and weekly_pick is true;
    if new.weekly_pick_at is null then
      new.weekly_pick_at = now();
    end if;
  elsif new.weekly_pick is distinct from true then
    new.weekly_pick = false;
    new.weekly_pick_at = null;
  end if;
  return new;
end;
$$;

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

revoke all on function private.sync_weekly_pick() from public, anon;
revoke all on function private.enqueue_product_push() from public, anon;
grant usage on schema private to authenticated, service_role;
grant execute on function private.sync_weekly_pick() to authenticated, service_role;
grant execute on function private.enqueue_product_push() to authenticated, service_role;

drop trigger if exists trg_products_weekly_pick on public.products;
create trigger trg_products_weekly_pick
  before insert or update of weekly_pick on public.products
  for each row execute function private.sync_weekly_pick();

drop trigger if exists trg_products_push on public.products;
create trigger trg_products_push
  after insert or update of weekly_pick on public.products
  for each row execute function private.enqueue_product_push();

notify pgrst, 'reload schema';

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'products'
  and column_name in ('format', 'difficulty', 'weekly_pick', 'weekly_pick_at')
order by column_name;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'push_subscriptions';
