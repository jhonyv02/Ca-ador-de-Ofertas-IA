-- CAÇADOR DE OFERTAS IA
-- Execute em um projeto NOVO do Supabase: SQL Editor -> New query -> Run.
-- Dados de usuários isolados por RLS. Storage privado por pasta de usuário.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 150),
  niche text not null default '',
  product_type text not null default 'digital' check (product_type in ('digital','physical','saas','service')),
  country text not null default 'Brasil',
  language text not null default 'pt-BR',
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  sale_price numeric(14,2) check (sale_price is null or sale_price >= 0),
  fulfillment_cost numeric(14,2) check (fulfillment_cost is null or fulfillment_cost >= 0),
  extra_cost numeric(14,2) check (extra_cost is null or extra_cost >= 0),
  landing_url text not null default '',
  checkout_url text not null default '',
  landing_copy text not null default '',
  promise text not null default '',
  target_audience text not null default '',
  notes text not null default '',
  status text not null default 'researching' check (status in ('researching','ready','testing','winning','discarded')),
  format text not null default '',
  difficulty text not null default '',
  weekly_pick boolean not null default false,
  weekly_pick_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,user_id)
);

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null,
  name text not null check (char_length(name) between 1 and 150),
  platform text not null default 'meta' check (platform in ('meta','tiktok','google','youtube','other')),
  advertiser text not null default '',
  ad_url text not null default '',
  creative_path text,
  creative_type text check (creative_type in ('image','video')),
  ad_copy text not null default '',
  hook text not null default '',
  cta text not null default '',
  notes text not null default '',
  first_seen_at date,
  started_at date,
  observed_active text not null default 'unknown' check (observed_active in ('active','inactive','unknown')),
  meta_library_id text,
  link_check_result text not null default 'not_checked' check (link_check_result in ('not_checked','verified','partial','unavailable')),
  last_checked_at timestamptz,
  last_check_message text not null default '',
  started_at_source text not null default 'unknown' check (started_at_source in ('unknown','public_page','manual')),
  status_source text not null default 'unknown' check (status_source in ('unknown','public_page','manual')),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,user_id),
  constraint fk_ads_products_own foreign key(product_id,user_id)
    references public.products(id,user_id) on delete cascade
);

create table if not exists public.ad_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid not null,
  checked_at timestamptz not null default now(),
  status text not null default 'unknown' check (status in ('active','inactive','unknown')),
  check_method text not null default 'manual' check (check_method in ('manual','link')),
  check_result text not null default 'manual' check (check_result in ('manual','verified','partial','unavailable')),
  estimated_creatives int check (estimated_creatives is null or estimated_creatives >= 0),
  notes text not null default '',
  constraint fk_snapshots_ads_own foreign key(ad_id,user_id)
    references public.ads(id,user_id) on delete cascade
);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null,
  ad_id uuid,
  kind text not null check (kind in ('product','ad')),
  score int not null check (score between 0 and 100),
  confidence text not null default 'low' check (confidence in ('low','medium','high')),
  summary text not null default '',
  strengths jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  breakdown jsonb not null default '{}'::jsonb,
  recommendation text not null default '',
  model text not null default '',
  created_at timestamptz not null default now(),
  constraint analysis_kind_matches_ad check ((kind='product' and ad_id is null) or (kind='ad' and ad_id is not null)),
  constraint fk_analyses_products_own foreign key(product_id,user_id)
    references public.products(id,user_id) on delete cascade,
  constraint fk_analyses_ads_own foreign key(ad_id,user_id)
    references public.ads(id,user_id) on delete cascade
);

create table if not exists public.test_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null,
  start_date date not null default current_date,
  budget numeric(14,2) not null default 0 check (budget >= 0),
  spend numeric(14,2) not null default 0 check (spend >= 0),
  clicks int not null default 0 check (clicks >= 0),
  leads int not null default 0 check (leads >= 0),
  sales int not null default 0 check (sales >= 0),
  revenue numeric(14,2) not null default 0 check (revenue >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint fk_test_runs_products_own foreign key(product_id,user_id)
    references public.products(id,user_id) on delete cascade
);

-- Aceita codigos de moedas internacionais em tabelas anteriores sem eliminar dados.
alter table public.products drop constraint if exists products_currency_check;
alter table public.products add constraint products_currency_check check (currency ~ '^[A-Z]{3}$');
-- Completa as colunas de acompanhamento quando o banco foi instalado em parte.
alter table public.ads add column if not exists meta_library_id text,
 add column if not exists link_check_result text not null default 'not_checked',
 add column if not exists last_checked_at timestamptz,
 add column if not exists last_check_message text not null default '',
 add column if not exists started_at_source text not null default 'unknown',
 add column if not exists status_source text not null default 'unknown';
alter table public.ad_snapshots add column if not exists check_method text not null default 'manual',
 add column if not exists check_result text not null default 'manual';

create index if not exists idx_products_owner_created on public.products(user_id,created_at desc);
create index if not exists idx_ads_owner_product on public.ads(user_id,product_id);
create index if not exists idx_snapshots_owner_ad on public.ad_snapshots(user_id,ad_id,checked_at desc);
create index if not exists idx_analyses_owner_product on public.analyses(user_id,product_id,created_at desc);
create index if not exists idx_test_runs_owner_product on public.test_runs(user_id,product_id,created_at desc);

create or replace function public.update_changed_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products for each row execute function public.update_changed_at();
drop trigger if exists trg_ads_updated on public.ads;
create trigger trg_ads_updated before update on public.ads for each row execute function public.update_changed_at();

alter table public.products enable row level security;
alter table public.ads enable row level security;
alter table public.ad_snapshots enable row level security;
alter table public.analyses enable row level security;
alter table public.test_runs enable row level security;

-- A operação é permitida APENAS para o dono, nunca apenas por estar autenticado.
-- UPDATE tem policy SELECT e WITH CHECK explícitos.
drop policy if exists products_select_own on public.products;
create policy products_select_own on public.products for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists products_insert_own on public.products;
create policy products_insert_own on public.products for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists products_update_own on public.products;
create policy products_update_own on public.products for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists products_delete_own on public.products;
create policy products_delete_own on public.products for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists ads_select_own on public.ads;
create policy ads_select_own on public.ads for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists ads_insert_own on public.ads;
create policy ads_insert_own on public.ads for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists ads_update_own on public.ads;
create policy ads_update_own on public.ads for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists ads_delete_own on public.ads;
create policy ads_delete_own on public.ads for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists snapshots_select_own on public.ad_snapshots;
create policy snapshots_select_own on public.ad_snapshots for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists snapshots_insert_own on public.ad_snapshots;
create policy snapshots_insert_own on public.ad_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists snapshots_update_own on public.ad_snapshots;
create policy snapshots_update_own on public.ad_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists snapshots_delete_own on public.ad_snapshots;
create policy snapshots_delete_own on public.ad_snapshots for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists analyses_select_own on public.analyses;
create policy analyses_select_own on public.analyses for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists analyses_insert_own on public.analyses;
create policy analyses_insert_own on public.analyses for insert to authenticated with check ((select auth.uid()) = user_id);
-- Sem UPDATE/DELETE de análises históricas: mantém um registro das avaliações.

drop policy if exists test_runs_select_own on public.test_runs;
create policy test_runs_select_own on public.test_runs for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists test_runs_insert_own on public.test_runs;
create policy test_runs_insert_own on public.test_runs for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists test_runs_update_own on public.test_runs;
create policy test_runs_update_own on public.test_runs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists test_runs_delete_own on public.test_runs;
create policy test_runs_delete_own on public.test_runs for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.products, public.ads, public.ad_snapshots, public.analyses, public.test_runs from anon;
grant select,insert,update,delete on public.products,public.ads,public.ad_snapshots,public.test_runs to authenticated;
grant select,insert on public.analyses to authenticated;

-- Bucket privado para imagens e vídeos; 30MB por arquivo.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('creatives','creatives',false,31457280,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do nothing;

-- path obrigatório: {auth.uid()}/{ad_id}/{nome_do_arquivo}
drop policy if exists creatives_select_own on storage.objects;
create policy creatives_select_own on storage.objects for select to authenticated
using (bucket_id='creatives' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists creatives_insert_own on storage.objects;
create policy creatives_insert_own on storage.objects for insert to authenticated
with check (bucket_id='creatives' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists creatives_delete_own on storage.objects;
create policy creatives_delete_own on storage.objects for delete to authenticated
using (bucket_id='creatives' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Testes rápidos após a execução:
-- select tablename,rowsecurity from pg_tables where schemaname='public' and tablename in ('products','ads','ad_snapshots','analyses','test_runs');
-- select id,public,file_size_limit from storage.buckets where id='creatives';

-- Notificações, formato, facilidade e escolha da semana.
-- O mesmo script idempotente está em supabase/upgrade-notificacoes-formato.sql.

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


-- Resultado esperado: 6 linhas (products, ads, ad_snapshots, analyses, test_runs, push_subscriptions).
select table_name as tabela_criada
from information_schema.tables
where table_schema='public'
  and table_name in ('products','ads','ad_snapshots','analyses','test_runs','push_subscriptions')
order by table_name;
