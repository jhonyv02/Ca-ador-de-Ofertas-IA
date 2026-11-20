-- Biblioteca de anúncios da Meta: links do anunciante e miniatura de vídeo.
-- Idempotente. Não apaga anúncios, criativos nem ofertas.
-- Depois de executar, o PostgREST precisa recarregar o cache (comando no final).

alter table public.ads
  add column if not exists advertiser_page_id text,
  add column if not exists advertiser_library_url text not null default '',
  add column if not exists creative_thumb_path text;
alter table public.products
  add column if not exists ad_library_url text not null default '';
update public.ads set advertiser_library_url = substring(notes from 'Biblioteca do anunciante: (\S+)')
 where advertiser_library_url = '' and notes like '%Biblioteca do anunciante:%';
update public.products p set ad_library_url = coalesce((select a.advertiser_library_url from public.ads a
 where a.product_id = p.id and a.advertiser_library_url <> '' order by a.created_at limit 1), '')
 where ad_library_url = '';

notify pgrst, 'reload schema';
