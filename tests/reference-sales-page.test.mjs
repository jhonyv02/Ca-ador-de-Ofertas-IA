import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceSalesPageHtml} from '../lib/reference-sales-page.ts';
import {pageVisualAssets} from '../lib/sales-page-visuals.ts';
const sample={
  brand:'Meu Kit Original',eyebrow:'MATERIAL DIGITAL AUTORAL',headline:'Conheça nosso conteúdo original',
  subheadline:'Um conjunto digital de materiais de consulta',
  painTitle:'Está difícil organizar seus materiais?',painBody:'Organização exige tempo.',
  painPoints:['Pouco tempo livre','Materiais em diferentes pastas'],
  benefitsTitle:'Recursos organizados',benefits:['Material claro','Facilidade para consultar','Sem etapas desnecessárias'],
  galleryTitle:'Prévia ilustrativa',offerTitle:'O que está no kit',
  includes:['Guia de estudos','Checklist de preparação','Fichas ilustrativas'],
  stepsTitle:'Como funciona',steps:['Conheça os arquivos','Verifique as condições','Receba sua compra'],
  faqTitle:'Perguntas frequentes',faq:[{question:'É digital?',answer:'Sim, material digital.'}],
  finalTitle:'Conheça os detalhes',finalBody:'Veja se esta proposta atende suas necessidades.',
  ctaText:'Quero conhecer',accent:'#2a9d8f',imageUrl:'',
  ownOfferPrice:'R$ 27,90',gallery:[],proofItems:[],bonusItems:[],
  secondPlanName:'',secondPlanPrice:'',secondPlanItems:[],guaranteeText:''
};
const options={name:'Meu Kit Original',price:98,currency:'BRL',checkout:''};
test('gera pelo menos 15 imagens SVG diferentes sem API paga',()=>{
  const visuals=pageVisualAssets(sample,'clinic');
  assert.equal(visuals.length,15);
  assert.equal(new Set(visuals.map(x=>x.src)).size,15);
  assert.ok(visuals.every(x=>x.src.startsWith('data:image/svg+xml')));
});
test('modelo consultório contém bloco de rolagem contínua e pelo menos dez imagens',()=>{
  const html=referenceSalesPageHtml(sample,options,'clinic');
  assert.ok(html.includes('class="marquee-track"'));
  assert.ok(html.includes('@keyframes roll'));
  assert.ok((html.match(/<img /g)||[]).length>=10);
  assert.ok(html.includes('class="steps"')&&html.includes('class="plans"'));
  assert.ok(html.includes('href="#oferta"'));
  assert.ok(!html.includes('R$ 98'));
});
test('modelo agenda possui galeria com setas, opções e FAQ',()=>{
  const html=referenceSalesPageHtml(sample,options,'agenda');
  assert.ok(html.includes('class="theme-agenda"'));
  assert.ok(html.includes('data-slide="1"'));
  assert.ok(html.includes('scroll-snap-type:x mandatory'));
  assert.ok((html.match(/<img /g)||[]).length>=10);
  assert.ok(html.includes('class="faq-list"'));
});
test('depoimento, bonus e garantia só são exibidos quando são reais e preenchidos',()=>{
  const html=referenceSalesPageHtml(sample,options,'clinic');
  assert.ok(!html.includes('<section class="section proof"'));
  assert.ok(!html.includes('<section class="section bonus"'));
  assert.ok(!html.includes('<section class="section guarantee"'));
  const filled=referenceSalesPageHtml({...sample,proofItems:[{quote:'Comentário autorizado',author:'Cliente verificado'}],
    bonusItems:[{title:'Arquivo confirmado',description:'Incluso na entrega',imageUrl:''}],
    guaranteeText:'Garantia de 7 dias conforme condições informadas'},options,'agenda');
  for(const text of ['Comentário autorizado','Cliente verificado','Arquivo confirmado',
    'Garantia de 7 dias'])assert.ok(filled.includes(text),text);
});
test('barra opcional não inventa urgência e URLs perigosas não são usadas',()=>{
  const html=referenceSalesPageHtml({...sample,headline:'<script>alert(1)</script>',
    gallery:[{label:'Prévia atual',url:'javascript:alert(1)'}]},options,'agenda');
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)'));
  assert.ok(!html.includes('src="javascript:'));
  assert.ok(!html.includes('class="ribbon"'));
});
