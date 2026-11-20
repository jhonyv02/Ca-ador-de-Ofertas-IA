import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeOfferUrl,metaAdsLibraryUrl,metaSearchUrlForWebsite} from '../lib/meta-search.ts';
test('URL sem https e URL com https funcionam no cadastro',()=>{
 assert.equal(normalizeOfferUrl('tafeljoy.shop/de/'),'https://tafeljoy.shop/de/');
 assert.equal(normalizeOfferUrl('https://tafeljoy.shop/de/'),'https://tafeljoy.shop/de/');
 assert.equal(normalizeOfferUrl('www.tafeljoy.shop/de/'),'https://www.tafeljoy.shop/de/');
});
test('pesquisa na Meta não inclui https, www ou rastreadores',()=>{
 for(const v of ['tafeljoy.shop/de/','https://tafeljoy.shop/de/','https://www.tafeljoy.shop/de/?utm_source=x#c']){
  const u=new URL(metaSearchUrlForWebsite(v));
  assert.equal(u.hostname,'www.facebook.com');
  assert.equal(u.pathname,'/ads/library/');
  assert.equal(u.searchParams.get('q'),'tafeljoy.shop/de/');
 }
 assert.equal(new URL(metaSearchUrlForWebsite('tafeljoy.shop/de/','domain')).searchParams.get('q'),'tafeljoy.shop');
 assert.equal(new URL(metaAdsLibraryUrl('Natal')).searchParams.get('q'),'Natal');
});
test('bloqueia protocolos perigosos, localhost e credenciais',()=>{
 for(const v of ['javascript:alert(1)','file:///etc/passwd','localhost:3000','http://localhost',
 'https://usuario:senha@tafeljoy.shop/de/','https://example.com\\@evil.shop','sem dominio','']){
  assert.equal(normalizeOfferUrl(v),'',v);
  assert.equal(metaSearchUrlForWebsite(v),'',v);
 }
});
