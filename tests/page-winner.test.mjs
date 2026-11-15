import test from 'node:test';
import assert from 'node:assert/strict';
import {pageWinnerCandidates,suggestedWinner} from '../lib/page-winner.ts';

const product=(id)=>({id,name:'Oferta '+id,landing_copy:'CACADOR_ORIGINAL_PAGE_V1:{}'});
const run=(product_id,clicks,sales,spend,revenue)=>({product_id,clicks,sales,spend,revenue});
test('não inventa campeão quando não há conversões suficientes',()=>{
  const items=[product('a'),product('b')];
  assert.equal(suggestedWinner(items,[run('a',100,1,20,30),run('b',0,0,0,0)]),null);
});
test('elege taxa de conversão maior apenas entre amostras qualificadas',()=>{
  const items=[product('a'),product('b')];
  const runs=[run('a',100,3,45,60),run('b',50,4,40,90)];
  assert.equal(suggestedWinner(items,runs)?.productId,'b');
  assert.equal(pageWinnerCandidates(items,runs)[0].conversionRate,0.08);
});
test('não atribui teste a página sem rascunho próprio',()=>{
  assert.equal(suggestedWinner([{...product('a'),landing_copy:''}],[run('a',50,5,50,100)]),null);
});
