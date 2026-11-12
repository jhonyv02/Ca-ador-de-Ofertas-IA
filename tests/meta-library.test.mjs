import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMetaLibraryUrl,parseSpecificAdFromHtml,fallbackInspection} from '../lib/meta-library.ts';

test('normaliza link individual e extrai ID sem inventar dados',()=>{
  assert.deepEqual(parseMetaLibraryUrl('https://business.facebook.com/ads/library/?id=123456789&country=BR'),
    {adId:'123456789',normalizedUrl:'https://www.facebook.com/ads/library/?id=123456789'});
});
test('link de pesquisa sem ID exige captura manual',()=>{
  assert.equal(parseMetaLibraryUrl('https://www.facebook.com/ads/library/?country=BR&q=teste').adId,null);
});
test('recusa host similar, URL não HTTPS e path externo (SSRF)',()=>{
  for(const url of ['https://www.facebook.com.evil.invalid/ads/library/?id=123456789','http://www.facebook.com/ads/library/?id=123456789','https://127.0.0.1/ads/library/?id=123456789','https://www.facebook.com/redirect/?id=123456789']){
    assert.throws(()=>parseMetaLibraryUrl(url));
  }
});
test('isola início e status somente para ID exato',()=>{
  const page=`<html><body>Active Library ID: 111111111 Started running on May 1, 2025 Copy A
    Inactive Library ID: 123456789 Started running on Nov 10, 2026 Copy B
    Active Library ID: 999999999 Started running on Aug 1, 2026</body></html>`;
  assert.deepEqual(parseSpecificAdFromHtml(page,'123456789'),{startedAt:'2026-11-10',status:'inactive'});
  assert.equal(parseSpecificAdFromHtml(page,'123456780'),null);
});
test('nunca usa outro anúncio da página para inventar uma data',()=>{
  const page='<div>Active Library ID: 123456789 Sem data pública Active Library ID: 999999999 Started running on Jan 1, 2025</div>';
  assert.deepEqual(parseSpecificAdFromHtml(page,'123456789'),{startedAt:null,status:'active'});
});
test('ignora dados que só aparecem em scripts e não no conteúdo público',()=>{
  const page='<script>Active Library ID: 123456789 Started running on Apr 21, 2026</script><main>Biblioteca de anúncios</main>';
  assert.equal(parseSpecificAdFromHtml(page,'123456789'),null);
});
test('fallback preserva ID, marca status não confirmado',()=>{
  const r=fallbackInspection('https://www.facebook.com/ads/library/?id=123456789','Bloqueado');
  assert.equal(r.status,'unknown');assert.equal(r.startedAt,null);assert.equal(r.result,'partial');
});
test('reconhece data em português quando ligada ao ID exato',()=>{
  const page='<div>Ativo Identificação da biblioteca: 123456789 Veiculação iniciada em 4 de novembro de 2026</div>';
  assert.deepEqual(parseSpecificAdFromHtml(page,'123456789'),{startedAt:'2026-11-04',status:'active'});
});
