import type {Product} from '@/lib/types';
import {safeHttpUrl} from '@/lib/utils';

export const PAGE_PREFIX='CACADOR_ORIGINAL_PAGE_V1:';
export type SalesPageDraft={
  brand:string;eyebrow:string;headline:string;subheadline:string;
  painTitle:string;painBody:string;benefitsTitle:string;benefits:string[];
  offerTitle:string;includes:string[];stepsTitle:string;steps:string[];
  faqTitle:string;faq:{question:string;answer:string}[];
  ctaText:string;finalTitle:string;finalBody:string;
  accent:string;imageUrl:string;
  referenceCopy?:string;differentiation?:string;actualContents?:string;
};
const safeText=(v:string)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const cssColor=(v:string)=>/^#[0-9a-f]{6}$/i.test(v)?v:'#12b886';
const esc=(v:string)=>safeText(v);
const url=(v:string)=>safeHttpUrl(v);

export function starterPage(product:Product):SalesPageDraft{
  const label=product.name.trim()||'Material digital';
  const audience=product.target_audience.trim()||'quem quer aprender com materiais organizados';
  const p=product.promise.trim()||'Um material digital com conteúdo prático e organizado.';
  return {
    brand:label,eyebrow:'MATERIAL DIGITAL · CONHEÇA A PROPOSTA',
    headline:label,subheadline:p,
    painTitle:'Você precisa de uma solução mais prática?',
    painBody:'Para '+audience+', encontrar recursos organizados pode ajudar a ganhar clareza e economizar tempo na preparação.',
    benefitsTitle:'Por que conhecer este material?',
    benefits:['Conteúdo organizado para consultar no seu ritmo','Acesso a um formato digital prático','Uma proposta clara, sem etapas desnecessárias'],
    offerTitle:'O que você encontrará',
    includes:['Veja aqui os módulos e arquivos que serão realmente entregues','Descreva o formato do produto e como o acesso funciona','Inclua apenas recursos já produzidos e conferidos'],
    stepsTitle:'Como funciona',
    steps:['Confira a proposta e o conteúdo','Faça a compra em um checkout seguro, quando disponível','Receba o produto digital conforme as condições informadas'],
    faqTitle:'Perguntas frequentes',
    faq:[{question:'O conteúdo é digital?',answer:'Sim. Confira os formatos e requisitos de acesso na descrição da oferta.'},
      {question:'Como recebo o acesso?',answer:'O procedimento de entrega será informado no checkout antes da compra.'}],
    ctaText:'Quero conhecer o material',
    finalTitle:'Conheça a proposta e decida com tranquilidade',
    finalBody:'Confira o conteúdo, as condições de compra e se esta solução atende ao que você procura.',
    accent:'#12b886',imageUrl:''
  };
}
export function readSalesDraft(value:string):SalesPageDraft|null{
  if(!value?.startsWith(PAGE_PREFIX))return null;
  try{
    const raw=JSON.parse(value.slice(PAGE_PREFIX.length));
    if(!raw||typeof raw!=='object'||typeof raw.headline!=='string')return null;
    const keys=['brand','eyebrow','headline','subheadline','painTitle','painBody',
      'benefitsTitle','offerTitle','stepsTitle','faqTitle','ctaText','finalTitle','finalBody','accent','imageUrl'];
    if(keys.some(k=>typeof raw[k]!=='string'))return null;
    if(!Array.isArray(raw.benefits)||!Array.isArray(raw.includes)||!Array.isArray(raw.steps)||
      !Array.isArray(raw.faq))return null;
    return raw as SalesPageDraft;
  }catch{return null;}
}
export function serializeSalesDraft(d:SalesPageDraft){
  const value=PAGE_PREFIX+JSON.stringify(d);
  if(value.length>11500)throw new Error('A página ficou longa demais. Reduza textos antes de salvar (máximo 11.500 caracteres).');
  return value;
}
export function salesPageHtml(d:SalesPageDraft,options:{name:string;price:number|null;
 currency:string;checkout:string}):string{
  const accent=cssColor(d.accent);
  const checkout=url(options.checkout);
  const price=options.price===null?'Preço a confirmar':new Intl.NumberFormat('pt-BR',
    {style:'currency',currency:options.currency||'BRL'}).format(options.price);
  const cta=checkout?
    '<a class="cta" href="'+esc(checkout)+'" rel="noopener noreferrer" target="_blank">'+esc(d.ctaText)+' <span aria-hidden="true">→</span></a>':
    '<span class="cta disabled" role="status">Checkout ainda não configurado</span>';
  const benefits=d.benefits.filter(Boolean).slice(0,6).map(t=>'<li><span class="tick" aria-hidden="true">✓</span><span>'+esc(t)+'</span></li>').join('');
  const inclusions=d.includes.filter(Boolean).slice(0,8).map((t,i)=>'<li><span class="num">'+String(i+1).padStart(2,'0')+'</span><span>'+esc(t)+'</span></li>').join('');
  const steps=d.steps.filter(Boolean).slice(0,5).map((t,i)=>'<li><span class="number">'+(i+1)+'</span><p>'+esc(t)+'</p></li>').join('');
  const faq=d.faq.filter(q=>q.question&&q.answer).slice(0,6).map(q=>
    '<details><summary>'+esc(q.question)+'</summary><p>'+esc(q.answer)+'</p></details>').join('');
  const image=url(d.imageUrl);
  const heroImage=image?'<div class="visual"><img src="'+esc(image)+'" alt="'+esc(d.brand)+'" loading="lazy"></div>':
    '<div class="visual placeholder" aria-hidden="true"><span>MATERIAL DIGITAL</span><strong>'+esc(d.brand)+'</strong><small>Apresentação visual do produto</small></div>';
  const css=[
    ':root{--accent:'+accent+';--bg:#09131b;--surface:#142330;--text:#f5fafc;--muted:#bed0db;--stroke:#2a4050}',
    '*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    'a{color:inherit;text-decoration:none}p{line-height:1.65}h1,h2,h3,p{overflow-wrap:anywhere}h1,h2,h3{letter-spacing:-.035em;line-height:1.15}',
    '.wrap{width:min(100% - 36px,1040px);margin-inline:auto}header{padding:17px 0;border-bottom:1px solid var(--stroke)}',
    'header .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px}header strong{font-size:15px;letter-spacing:-.02em}',
    '.safe{font-size:11px;color:var(--muted)}main{padding-bottom:92px}',
    '.hero{padding:47px 0 38px;background:radial-gradient(circle at 92% 12%,#153c44,transparent 65%)}',
    '.hero-inner{display:grid;gap:28px}.eyebrow{display:inline-block;font-weight:800;letter-spacing:.12em;font-size:10px;color:#a4f4d2;text-transform:uppercase}',
    'h1{font-size:clamp(33px,8vw,56px);margin:16px 0;max-width:750px}h1 strong{color:var(--accent)}',
    '.lead{color:var(--muted);font-size:16px;max-width:600px;margin:0 0 22px}',
    '.cta{display:flex;align-items:center;justify-content:center;gap:12px;background:var(--accent);color:#052019;border-radius:12px;font-size:16px;font-weight:850;min-height:56px;padding:14px 20px;max-width:440px;box-shadow:0 10px 24px #0004;text-align:center}',
    '.cta:focus-visible{outline:3px solid #fff;outline-offset:3px}.cta:hover{filter:brightness(1.06)}',
    '.cta.disabled{background:#344e50;color:#dde7e9;box-shadow:none}.hint{font-size:11px;color:var(--muted);margin-top:11px}',
    '.visual{aspect-ratio:1.2;border:1px solid #29525b;border-radius:22px;overflow:hidden;background:linear-gradient(140deg,#184a4e,#23334b);display:grid;place-items:center;padding:24px;box-shadow:0 24px 55px #0006}',
    '.visual img{width:100%;height:100%;object-fit:contain}.placeholder{align-content:center;text-align:center;gap:13px}',
    '.placeholder span{font-size:11px;letter-spacing:.14em;color:#b4d6d5}.placeholder strong{font-size:clamp(22px,5vw,32px);line-height:1.18}.placeholder small{font-size:12px;color:#b9d5da}',
    '.block{padding:47px 0}.block:nth-of-type(even){background:#0d1b25}.section-title{font-size:clamp(25px,6vw,36px);max-width:650px;margin:0 0 15px}',
    '.section-lead{font-size:15px;color:var(--muted);max-width:760px;margin:0 0 22px}',
    '.benefits,.includes,.steps{list-style:none;padding:0;margin:18px 0;display:grid;gap:12px}',
    '.benefits li,.includes li,.steps li{display:flex;align-items:flex-start;gap:13px;padding:17px;background:var(--surface);border:1px solid var(--stroke);border-radius:14px;color:#e5f4f5;font-size:14px;line-height:1.5}',
    '.tick{display:grid;place-items:center;flex:none;width:25px;height:25px;border-radius:50%;background:#244c40;color:#7fe9ba;font-weight:900}',
    '.num,.number{color:var(--accent);font-weight:900;font-size:18px;flex:none}.number{display:grid;place-items:center;border-radius:50%;border:1px solid #427c6a;width:30px;height:30px}',
    '.steps li p{margin:4px 0}.pricebox{background:linear-gradient(120deg,#173b3c,#142535);border:1px solid #3c7767;border-radius:18px;padding:22px;margin:25px 0}',
    '.price-label{display:block;color:var(--muted);font-size:12px}.price{font-size:32px;font-weight:900;margin:9px 0 18px}',
    '.faq details{padding:19px 3px;border-bottom:1px solid var(--stroke)}.faq summary{font-weight:750;cursor:pointer;font-size:15px}.faq p{font-size:13px;color:var(--muted);margin:12px 0 0}',
    '.closing{text-align:center}.closing .section-title,.closing .section-lead{margin-left:auto;margin-right:auto}.closing .cta{margin:25px auto}',
    'footer{border-top:1px solid var(--stroke);padding:28px 0;color:var(--muted);font-size:11px;text-align:center}',
    '.sticky{position:fixed;bottom:0;left:0;right:0;background:#09131bed;border-top:1px solid #33594c;padding:10px 16px calc(10px + env(safe-area-inset-bottom));backdrop-filter:blur(12px);z-index:9}',
    '.sticky .cta{max-width:none;width:100%;min-height:49px;font-size:14px}.sticky small{display:block;font-size:10px;text-align:center;margin-top:5px;color:#d8e7e5}',
    '@media(min-width:760px){.wrap{width:min(100% - 72px,1040px)}.hero{padding:84px 0}.hero-inner{grid-template-columns:1.2fr 1fr;align-items:center;gap:42px}',
    '.visual{aspect-ratio:.95}.block{padding:70px 0}.benefits,.includes,.steps{grid-template-columns:repeat(2,minmax(0,1fr))}.sticky{display:none}main{padding-bottom:0}}',
    '@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}'
  ].join('');
  return [
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    '<meta name="description" content="'+esc(d.subheadline.slice(0,155))+'">',
    '<title>'+esc(d.headline)+' | '+esc(d.brand)+'</title><style>',css,'</style></head><body>',
    '<header><div class="wrap"><strong>'+esc(d.brand)+'</strong><span class="safe">Oferta digital</span></div></header>',
    '<main><section class="hero"><div class="wrap hero-inner"><div><span class="eyebrow">'+esc(d.eyebrow)+'</span>',
    '<h1>'+esc(d.headline)+'</h1><p class="lead">'+esc(d.subheadline)+'</p>',cta,
    '<p class="hint">Leia as informações da oferta antes de comprar.</p></div>',heroImage,'</div></section>',
    '<section class="block"><div class="wrap"><h2 class="section-title">'+esc(d.painTitle)+'</h2>',
    '<p class="section-lead">'+esc(d.painBody)+'</p></div></section>',
    '<section class="block"><div class="wrap"><h2 class="section-title">'+esc(d.benefitsTitle)+'</h2>',
    '<ul class="benefits">'+benefits+'</ul></div></section>',
    '<section class="block" id="oferta"><div class="wrap"><h2 class="section-title">'+esc(d.offerTitle)+'</h2>',
    '<ul class="includes">'+inclusions+'</ul><div class="pricebox"><span class="price-label">Investimento informado</span>',
    '<div class="price">'+esc(price)+'</div>',cta,
    '<p class="hint">Verifique valores, entrega, garantia e condições no checkout.</p></div></div></section>',
    '<section class="block"><div class="wrap"><h2 class="section-title">'+esc(d.stepsTitle)+'</h2>',
    '<ul class="steps">'+steps+'</ul></div></section>',
    '<section class="block faq"><div class="wrap"><h2 class="section-title">'+esc(d.faqTitle)+'</h2>',faq,'</div></section>',
    '<section class="block closing"><div class="wrap"><h2 class="section-title">'+esc(d.finalTitle)+'</h2>',
    '<p class="section-lead">'+esc(d.finalBody)+'</p>',cta,'</div></section></main>',
    '<footer><div class="wrap">'+esc(d.brand)+' · Conteúdo sujeito às condições apresentadas no checkout.</div></footer>',
    '<div class="sticky">',cta,'<small>Acesso ao checkout externo após o clique</small></div>',
    '</body></html>'
  ].join('');
}
