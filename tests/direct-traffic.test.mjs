import test from 'node:test';
import assert from 'node:assert/strict';
import {directReadiness,directFlags,notesWithFlag} from '../lib/direct-traffic.ts';
const raw={
  id:'a',name:'Kit digital',niche:'Educação',product_type:'digital',user_id:'u',
  country:'Brasil',currency:'BRL',language:'pt-BR',sale_price:47,
  fulfillment_cost:null,extra_cost:null,
  landing_url:'https://pagina.exemplo.com',checkout_url:'',
  promise:'Material digital',target_audience:'Profissionais',notes:'Pesquisa\n#chatgpt:exemplo',
  status:'researching'
};
test('oferta pesquisada sem custos e conteúdo próprio NÃO fica liberada',()=>{
  const gate=directReadiness(raw,[],[]);
  assert.equal(gate.ready,false);
  assert.equal(gate.breakEvenCpa,null);
  assert.ok(gate.blockers.some(x=>x.includes('Produto próprio')));
  assert.ok(gate.blockers.some(x=>x.includes('Custos')));
});
test('checklist explícito e custos conhecidos desbloqueiam a análise de teste',()=>{
  let notes=raw.notes;
  for(const k of ['content','page','checkout','creative','tracking','delivery']) notes=notesWithFlag(notes,k,true);
  const product={...raw,notes,fulfillment_cost:3,extra_cost:4};
  const gate=directReadiness(product,[],[]);
  assert.equal(gate.ready,true);
  assert.equal(gate.breakEvenCpa,40);
  assert.equal(gate.cautiousCpa,28);
  assert.equal(directFlags(product).checkout,true);
  assert.equal(notesWithFlag(notes,'content',true),notes);
  assert.equal(notesWithFlag(notes,'content',false).includes('#produto_autoral_finalizado'),false);
});
test('margem negativa bloqueia mesmo com seis confirmações',()=>{
  let notes=raw.notes;
  for(const k of ['content','page','checkout','creative','tracking','delivery'])notes=notesWithFlag(notes,k,true);
  const gate=directReadiness({...raw,notes,fulfillment_cost:50,extra_cost:2},[],[]);
  assert.equal(gate.ready,false);
  assert.ok(gate.blockers.some(x=>x.includes('Margem')));
});
test('não inferir venda a partir de anúncios na biblioteca',()=>{
  const ad={observed_active:'active',link_check_result:'verified'};
  const gate=directReadiness(raw,[ad],[]);
  assert.equal(gate.ready,false);
  assert.ok(gate.evidence.every(x=>!x.includes('venda(s)')));
});
