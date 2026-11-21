import test from 'node:test';
import assert from 'node:assert/strict';
import {advertiserLibraryUrl,distinctAdvertisers,firstAdWithImage,linkifyParts,offerLibraryUrl} from '../lib/library-links.ts';

test('linkifica http e https e mantém o texto ao redor', () => {
  const parts=linkifyParts('Veja https://www.facebook.com/ads/library/?id=1. e http://exemplo.com/a fim.');
  assert.deepEqual(parts.map(part=>part.type==='link'?part.href:part.value), [
    'Veja ',
    'https://www.facebook.com/ads/library/?id=1',
    '.',
    ' e ',
    'http://exemplo.com/a',
    ' fim.'
  ]);
  assert.equal(parts.filter(part=>part.type==='link').length, 2);
});

test('lê a biblioteca do anunciante nas notas quando a coluna ainda não veio do banco', () => {
  const ad={advertiser_library_url:'',notes:'Copy\nBiblioteca do anunciante: https://www.facebook.com/ads/library/?view_all_page_id=99',ad_url:'https://www.facebook.com/ads/library/?id=1734261794294518',created_at:'2026-01-01'};
  assert.equal(new URL(advertiserLibraryUrl(ad)).searchParams.get('view_all_page_id'),'99');
  assert.equal(new URL(offerLibraryUrl({ad_library_url:'',notes:''}, [ad])).searchParams.get('view_all_page_id'),'99');
  assert.equal(offerLibraryUrl({ad_library_url:'',notes:''}, [{...ad,advertiser_library_url:'',notes:''}]), 'https://www.facebook.com/ads/library/?id=1734261794294518');
});

test('prioriza o link salvo na oferta e agrupa anunciantes', () => {
  const ads=[
    {id:'1',advertiser:'Loja A',advertiser_library_url:'https://www.facebook.com/ads/library/?view_all_page_id=1',notes:'',ad_url:'https://www.facebook.com/ads/library/?id=1',created_at:'2026-02-01',creative_path:null,creative_thumb_path:null,creative_type:null},
    {id:'2',advertiser:'Loja A',advertiser_library_url:'https://www.facebook.com/ads/library/?view_all_page_id=1',notes:'',ad_url:'https://www.facebook.com/ads/library/?id=2',created_at:'2026-03-01',creative_path:'u/a/x.jpg',creative_thumb_path:null,creative_type:'image'},
    {id:'3',advertiser:'',advertiser_library_url:'',notes:'Biblioteca do anunciante: https://fb.com/lib/2',ad_url:'',created_at:'2026-01-01',creative_path:null,creative_thumb_path:'u/a/t.jpg',creative_type:'video'}
  ];
  assert.equal(new URL(offerLibraryUrl({ad_library_url:'https://www.facebook.com/ads/library/?view_all_page_id=9',notes:''}, ads)).searchParams.get('view_all_page_id'),'9');
  const groups=distinctAdvertisers(ads);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].count, 1);
  assert.equal(groups[1].name, 'Loja A');
  assert.equal(groups[1].count, 2);
  assert.equal(firstAdWithImage(ads)?.id, '2');
  assert.equal(firstAdWithImage([ads[2]])?.id, '3');
});
