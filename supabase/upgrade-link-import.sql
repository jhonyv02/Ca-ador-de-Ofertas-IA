-- Execute UMA VEZ no SQL Editor de um Caçador de Ofertas IA JÁ CONFIGURADO.
-- NÃO execute em projetos do OrçaJá Pro/JVianaFlow.
-- Não remove nem apaga nenhum anúncio existente.

alter table public.ads
  add column if not exists meta_library_id text,
  add column if not exists link_check_result text not null default 'not_checked',
  add column if not exists last_checked_at timestamptz,
  add column if not exists last_check_message text not null default '',
  add column if not exists started_at_source text not null default 'unknown',
  add column if not exists status_source text not null default 'unknown';

alter table public.ad_snapshots
  add column if not exists check_method text not null default 'manual',
  add column if not exists check_result text not null default 'manual';

-- As policies RLS existentes continuam funcionando.
-- Confira se as colunas foram criadas:
select column_name,data_type from information_schema.columns
where table_schema='public' and table_name='ads'
  and column_name in ('meta_library_id','link_check_result','last_checked_at','last_check_message','started_at_source','status_source')
order by column_name;
