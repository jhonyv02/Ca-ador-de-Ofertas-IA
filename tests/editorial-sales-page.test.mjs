import test from 'node:test';
import assert from 'node:assert/strict';
import {editorialSalesPageHtml} from '../lib/editorial-sales-page.ts';

const demo={
  brand:'Kit Organizado',eyebrow:'Aprenda com clareza',headline:'Seu material para estudar',
  subheadline:'Um conteúdo prático e autoral',painTitle:'Dificuldade de organizar seus estudos?',
  painBody:'Aprenda com exemplos e planejamento.',benefitsTitle:'Conteúdo prático',
  benefits:['Etapas claras','Materiais organizados','Mais praticidade'],
  includes:['Guia de estudo','Plano de leitura','Exercícios de consulta'],
  stepsTitle:'Como funciona',steps:['Leia a descrição','Compre no checkout','Receba o material'],
  faqTitle:'Dúvidas frequentes',
  faq:[{question:'É digital?',answer:'Sim, arquivo digital.'}],
  ctaText:'Conheça o kit',finalTitle:'Organize seu aprendizado',
  finalBody:'Veja se esta proposta serve para você.',accent:'#e5b853',imageUrl:'',
  visualStyle:'editorial',galleryTitle:'Veja as prévias',gallery:[]
};
const opt={name:'Kit Organizado',price:29.9,currency:'BRL',
  checkout:'https://checkout.example.com/pagamento'};
test('produz estrutura editorial responsiva com CTA e seções navy, creme e dourado',()=>{
  const html=editorialSalesPageHtml(demo,opt);
  for(const piece of ['class="hero"','class="hero-image mock-scene"','cream-section','included-grid',
    'class="pricing-section"','class="faq-section"','class="bottom-cta"','gold-button',
    'width=device-width','R$','29,90','https://checkout.example.com/pagamento'])
    assert.ok(html.includes(piece),piece);
});
test('não inventa depoimentos, bônus e garantia quando não há dados',()=>{
  const html=editorialSalesPageHtml(demo,opt);
  assert.ok(!html.includes('DEPOIMENTOS REAIS'));
  assert.ok(!html.includes('class="bonus-grid"'));
  assert.ok(!html.includes('class="guarantee-box"'));
  assert.ok(!html.includes('OUTRA OPÇÃO'));
});
test('exibe somente provas e bônus confirmados preenchidos',()=>{
  const html=editorialSalesPageHtml({...demo,
    proofItems:[{quote:'Material fácil de consultar',author:'Comprador autorizado'}],
    bonusItems:[{title:'Checklist existente',description:'Arquivo efetivamente incluído',imageUrl:''}],
    guaranteeText:'Garantia de 7 dias informada pelo vendedor',
    secondPlanName:'Versão completa',secondPlanPrice:'R$ 49,90',
    secondPlanCheckout:'https://checkout.example.com/segundo',
    secondPlanItems:['Bônus existente']
  },opt);
  for(const piece of ['DEPOIMENTOS REAIS','Comprador autorizado','class="bonus-grid"',
    'Checklist existente','Garantia de 7 dias','Versão completa','https://checkout.example.com/segundo'])
    assert.ok(html.includes(piece),piece);
});
test('escapa HTML externo e bloqueia checkout perigoso',()=>{
  const html=editorialSalesPageHtml({...demo,headline:'<img src=x onerror=alert(1)>'},
    {...opt,checkout:'javascript:alert(1)'});
  assert.ok(html.includes('&lt;img src=x'));
  assert.ok(!html.includes('<img src=x onerror='));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes('Configure seu checkout para ativar o botão'));
});
