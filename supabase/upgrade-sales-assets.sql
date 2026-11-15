-- Executar SOMENTE no projeto Supabase do Caçador de Ofertas IA.
-- As imagens aqui são PÚBLICAS por natureza: usadas em páginas de vendas exportadas.
-- Nunca coloque imagens privadas ou de clientes neste bucket.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('sales-page-assets','sales-page-assets',true,5242880,array['image/webp'])
on conflict (id) do update set
  public=true,
  file_size_limit=5242880,
  allowed_mime_types=array['image/webp'];

drop policy if exists sales_pages_assets_upload_own on storage.objects;
create policy sales_pages_assets_upload_own on storage.objects
for insert to authenticated
with check (
  bucket_id='sales-page-assets'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and storage.extension(name)='webp'
);
drop policy if exists sales_pages_assets_delete_own on storage.objects;
create policy sales_pages_assets_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id='sales-page-assets'
  and owner_id=(select auth.uid())::text
  and (storage.foldername(name))[1]=(select auth.uid())::text
);
-- Não criar políticas de listagem pública. Os arquivos são publicados por URL direta.
select id,name,public,file_size_limit from storage.buckets where id='sales-page-assets';
