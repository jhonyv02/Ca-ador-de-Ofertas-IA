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
  currency text not null default 'BRL' check (currency in ('BRL','USD','EUR','MXN','ARS','COP')),
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
create policy products_select_own on public.products for select to authenticated using ((select auth.uid()) = user_id);
create policy products_insert_own on public.products for insert to authenticated with check ((select auth.uid()) = user_id);
create policy products_update_own on public.products for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy products_delete_own on public.products for delete to authenticated using ((select auth.uid()) = user_id);

create policy ads_select_own on public.ads for select to authenticated using ((select auth.uid()) = user_id);
create policy ads_insert_own on public.ads for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ads_update_own on public.ads for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ads_delete_own on public.ads for delete to authenticated using ((select auth.uid()) = user_id);

create policy snapshots_select_own on public.ad_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy snapshots_insert_own on public.ad_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy snapshots_update_own on public.ad_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy snapshots_delete_own on public.ad_snapshots for delete to authenticated using ((select auth.uid()) = user_id);

create policy analyses_select_own on public.analyses for select to authenticated using ((select auth.uid()) = user_id);
create policy analyses_insert_own on public.analyses for insert to authenticated with check ((select auth.uid()) = user_id);
-- Sem UPDATE/DELETE de análises históricas: mantém um registro das avaliações.

create policy test_runs_select_own on public.test_runs for select to authenticated using ((select auth.uid()) = user_id);
create policy test_runs_insert_own on public.test_runs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy test_runs_update_own on public.test_runs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy test_runs_delete_own on public.test_runs for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.products, public.ads, public.ad_snapshots, public.analyses, public.test_runs from anon;
grant select,insert,update,delete on public.products,public.ads,public.ad_snapshots,public.test_runs to authenticated;
grant select,insert on public.analyses to authenticated;

-- Bucket privado para imagens e vídeos; 30MB por arquivo.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('creatives','creatives',false,31457280,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do nothing;

-- path obrigatório: {auth.uid()}/{ad_id}/{nome_do_arquivo}
create policy creatives_select_own on storage.objects for select to authenticated
using (bucket_id='creatives' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy creatives_insert_own on storage.objects for insert to authenticated
with check (bucket_id='creatives' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy creatives_delete_own on storage.objects for delete to authenticated
using (bucket_id='creatives' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Testes rápidos após a execução:
-- select tablename,rowsecurity from pg_tables where schemaname='public' and tablename in ('products','ads','ad_snapshots','analyses','test_runs');
-- select id,public,file_size_limit from storage.buckets where id='creatives';
