import test from 'node:test';
import assert from 'node:assert/strict';
import {isPrintableOffer,printableEligibility} from '../lib/printable-eligibility.ts';

test('aceita PDF imprimivel marcado explicitamente',()=>{
  assert.equal(isPrintableOffer({product_type:'digital',format:'printable',name:'Jogos de Natal'}),true);
});
test('aceita biblioteca apenas com indicacao clara de impressao',()=>{
  assert.equal(isPrintableOffer({product_type:'digital',format:'biblioteca',name:'Biblioteca de fichas para imprimir'}),true);
  assert.equal(isPrintableOffer({product_type:'digital',format:'biblioteca',name:'Biblioteca digital de aulas'}),false);
});
test('rejeita app, curso, audio, planilha e fisico mesmo com texto promocional',()=>{
  for(const format of ['app','curso','audio','planilha']){
    assert.equal(isPrintableOffer({product_type:'digital',format,name:'Materiais para imprimir'}),false);
  }
  assert.equal(isPrintableOffer({product_type:'physical',format:'printable',name:'Livro impresso'}),false);
});
test('rejeita ebook comum e materiais sem formato demonstrado',()=>{
  assert.equal(isPrintableOffer({product_type:'digital',format:'ebook',name:'Guia de investimentos'}),false);
  assert.equal(isPrintableOffer({product_type:'digital',format:'',name:'Produto genérico'}),false);
});
test('aceita marcação legada de formato ou prova de A4',()=>{
  assert.equal(isPrintableOffer({product_type:'digital',notes:'#formato-digital:printable'}),true);
  assert.equal(isPrintableOffer({product_type:'digital',format:'templates',promise:'Cartões A4 para imprimir'}),true);
});
test('nota de 90 nao transforma app em elegivel',()=>{
  const item={product_type:'digital',format:'app',notes:'Nota IA: 90/100. Oferta forte.'};
  assert.equal(printableEligibility(item).eligible,false);
});
