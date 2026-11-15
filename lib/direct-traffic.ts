import type {Ad, Product, TestRun} from '@/lib/types';

export type DirectCheck = 'content'|'page'|'checkout'|'creative'|'tracking'|'delivery';
export const directCheckLabels:Record<DirectCheck,string>={
  content:'Produto próprio finalizado, original e com entrega preparada',
  page:'Página própria publicada e revisada no celular',
  checkout:'Checkout testado, inclusive pagamento e pós-compra',
  creative:'Criativo e copy prontos e revisados para a Meta',
  tracking:'Evento de compra (Purchase) configurado e testado',
  delivery:'Entrega do produto e suporte pós-compra testados',
};
const tags:Record<DirectCheck,string>={
  content:'#produto_autoral_finalizado',
  page:'#pagina_propria_validada',
  checkout:'#checkout_testado',
  creative:'#criativo_aprovado',
  tracking:'#compra_rastreada',
  delivery:'#entrega_testada',
};
export const checkKeys=Object.keys(tags) as DirectCheck[];
export function directFlags(p:Product):Record<DirectCheck,boolean>{
  const lines=(p.notes||'').split(/\r?\n/).map(x=>x.trim());
  return {content:lines.includes(tags.content),page:lines.includes(tags.page),
    checkout:lines.includes(tags.checkout),creative:lines.includes(tags.creative),
    tracking:lines.includes(tags.tracking),delivery:lines.includes(tags.delivery)};
}
export function notesWithFlag(notes:string,key:DirectCheck,enabled:boolean){
  const flag=tags[key];
  if(enabled&&notes.split(/\r?\n/).some(s=>s.trim()===flag))return notes.trim();
  const lines=notes.split(/\r?\n/).filter(s=>s.trim()!==flag);
  if(enabled)lines.push(flag);
  return lines.join('\n').trim();
}
export type DirectReadiness={
  ready:boolean;blockers:string[];evidence:string[];score:number;
  flags:Record<DirectCheck,boolean>;breakEvenCpa:number|null;
  cautiousCpa:number|null;confirmedCosts:boolean;
};
export function directReadiness(p:Product,ads:Ad[],runs:TestRun[]):DirectReadiness{
  const flags=directFlags(p);
  const blockers:string[]=[];
  const evidence:string[]=[];
  const price=typeof p.sale_price==='number'&&Number.isFinite(p.sale_price)?p.sale_price:0;
  const costsKnown=typeof p.fulfillment_cost==='number'&&
    typeof p.extra_cost==='number'&&Number.isFinite(p.fulfillment_cost)&&Number.isFinite(p.extra_cost);
  const contribution=costsKnown?price-(p.fulfillment_cost||0)-(p.extra_cost||0):null;
  if(!price)blockers.push('Preço de venda não confirmado');
  if(p.currency!=='BRL'||p.country!=='Brasil')blockers.push('Confirmar mercado Brasil, moeda BRL e página localizada');
  if(!p.landing_url)blockers.push('Página de vendas ainda não cadastrada');
  if(!costsKnown)blockers.push('Custos por venda e taxas do checkout desconhecidos');
  if(costsKnown&&contribution!==null&&contribution<=0)blockers.push('Margem de contribuição não positiva');
  for(const key of checkKeys)if(!flags[key])blockers.push(directCheckLabels[key]+' — pendente');
  const verifiedAds=ads.filter(a=>a.observed_active==='active'&&a.link_check_result==='verified');
  if(ads.length) evidence.push(String(ads.length)+' anúncio(s) cadastrados; a presença na biblioteca não comprova vendas');
  if(verifiedAds.length)evidence.push(String(verifiedAds.length)+' anúncio(s) com status ativo observado via link');
  const realSales=runs.reduce((n,r)=>n+r.sales,0);
  if(realSales)evidence.push(String(realSales)+' venda(s) registradas nos testes deste painel — conferir origem e despesas');
  if((p.notes||'').includes('#chatgpt:'))evidence.push('Oferta importada de pesquisa: concorrente/referência, não produto próprio confirmado');
  let score=0;
  if(price>0)score+=10;
  if(p.currency==='BRL'&&p.country==='Brasil')score+=6;
  if(costsKnown)score+=12;
  if(contribution!==null&&contribution>0)score+=6;
  if(p.landing_url)score+=12;
  if(p.checkout_url||flags.checkout)score+=5;
  if(p.promise)score+=5;
  if(p.target_audience)score+=5;
  if(ads.length)score+=5;
  if(verifiedAds.length)score+=6;
  if(realSales>0)score+=10;
  for(const key of checkKeys)if(flags[key])score+=4;
  // É um indicador de cobertura da pesquisa, NÃO uma previsão de lucro.
  const ready=blockers.length===0;
  return {ready,blockers,evidence,score:Math.min(100,score),
    flags,breakEvenCpa:contribution!==null&&contribution>0?contribution:null,
    cautiousCpa:contribution!==null&&contribution>0?Math.round(contribution*0.7*100)/100:null,
    confirmedCosts:costsKnown};
}
