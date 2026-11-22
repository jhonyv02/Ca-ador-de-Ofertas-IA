-- EXECUTAR SOMENTE NO LANÇAMENTO PAGO, DEPOIS DE:
-- (1) supabase/upgrade-comercializacao.sql
-- (2) preencher UUID do administrador na tabela private.cacador_billing_admins
-- (3) confirmar usuário pagante e checkout testados
-- Este script troca policies, sem apagar os dados.
-- Não executar no Supabase do OrçaJá.

create schema if not exists private;
create table if not exists private.cacador_billing_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.cacador_billing_admins from public, anon, authenticated;

do $
begin
  if not exists (select 1 from private.cacador_billing_admins) then
    raise exception 'Bloqueio interrompido: cadastre ao menos um administrador em private.cacador_billing_admins ANTES de executar esta etapa.';
  end if;
end;
$;

-- ANTES DE EXECUTAR O BLOCO DE POLICIES:
-- Insira o UUID verdadeiro do usuário admin via SQL seguro, por exemplo:
-- insert into private.cacador_billing_admins(user_id) values ('UUID-REAL-DO-ADMIN')
-- on conflict do nothing;
-- Não deixe e-mail nem segredos neste arquivo versionado.

create or replace function private.cacador_has_paid_access()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1 from private.cacador_billing_admins a
      where a.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.cacador_subscriptions s
      where s.user_id = (select auth.uid())
        and s.status in ('active','trialing','canceled')
        and s.current_period_end > now()
    )
  )
$$;
revoke all on function private.cacador_has_paid_access() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.cacador_has_paid_access() to authenticated;

-- FALHA SEGURA: só ativos ou administradores previamente cadastrados
-- conseguem consultar, inserir, atualizar ou excluir linhas próprias.
drop policy if exists products_select_own on public.products;
create policy products_select_own on public.products for select to authenticated
using ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));
drop policy if exists products_insert_own on public.products;
create policy products_insert_own on public.products for insert to authenticated
with check ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));
drop policy if exists products_update_own on public.products;
create policy products_update_own on public.products for update to authenticated
using ((select auth.uid())=user_id and (select private.cacador_has_paid_access()))
with check ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));
drop policy if exists products_delete_own on public.products;
create policy products_delete_own on public.products for delete to authenticated
using ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));

drop policy if exists ads_select_own on public.ads;
create policy ads_select_own on public.ads for select to authenticated
using ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));
drop policy if exists ads_insert_own on public.ads;
create policy ads_insert_own on public.ads for insert to authenticated
with check ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));
drop policy if exists ads_update_own on public.ads;
create policy ads_update_own on public.ads for update to authenticated
using ((select auth.uid())=user_id and (select private.cacador_has_paid_access()))
with check ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));
drop policy if exists ads_delete_own on public.ads;
create policy ads_delete_own on public.ads for delete to authenticated
using ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));

drop policy if exists snapshots_select_own on public.ad_snapshots;
create policy snapshots_select_own on public.ad_snapshots for select to authenticated
using ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));
drop policy if exists snapshots_insert_own on public.ad_snapshots;
create policy snapshots_insert_own on public.ad_snapshots for insert to authenticated
with check ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));
drop policy if exists snapshots_update_own on public.ad_snapshots;
create policy snapshots_update_own on public.ad_snapshots for update to authenticated
using ((select auth.uid())=user_id and (select private.cacador_has_paid_access()))
with check ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));
drop policy if exists snapshots_delete_own on public.ad_snapshots;
create policy snapshots_delete_own on public.ad_snapshots for delete to authenticated
using ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));

drop policy if exists analyses_select_own on public.analyses;
create policy analyses_select_own on public.analyses for select to authenticated
using ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));
drop policy if exists analyses_insert_own on public.analyses;
create policy analyses_insert_own on public.analyses for insert to authenticated
with check ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));

drop policy if exists test_runs_select_own on public.test_runs;
create policy test_runs_select_own on public.test_runs for select to authenticated
using ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));
drop policy if exists test_runs_insert_own on public.test_runs;
create policy test_runs_insert_own on public.test_runs for insert to authenticated
with check ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));
drop policy if exists test_runs_update_own on public.test_runs;
create policy test_runs_update_own on public.test_runs for update to authenticated
using ((select auth.uid())=user_id and (select private.cacador_has_paid_access()))
with check ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));
drop policy if exists test_runs_delete_own on public.test_runs;
create policy test_runs_delete_own on public.test_runs for delete to authenticated
using ((select auth.uid())=user_id and (select private.cacador_has_paid_access()));

drop policy if exists creatives_select_own on storage.objects;
create policy creatives_select_own on storage.objects for select to authenticated
using (bucket_id='creatives' and (storage.foldername(name))[1]=(select auth.uid())::text
  and (select private.cacador_has_paid_access()));
drop policy if exists creatives_insert_own on storage.objects;
create policy creatives_insert_own on storage.objects for insert to authenticated
with check (bucket_id='creatives' and (storage.foldername(name))[1]=(select auth.uid())::text
  and (select private.cacador_has_paid_access()));
drop policy if exists creatives_delete_own on storage.objects;
create policy creatives_delete_own on storage.objects for delete to authenticated
using (bucket_id='creatives' and (storage.foldername(name))[1]=(select auth.uid())::text
  and (select private.cacador_has_paid_access()));

-- TESTE: usuário sem assinatura => zero resultados e sem escrita.
-- TESTE: admin previamente cadastrado => mantém acesso.
-- TESTE: usuário ativo e dentro da data => acesso somente aos próprios dados.
