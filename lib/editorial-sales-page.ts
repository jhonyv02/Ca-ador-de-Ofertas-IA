import type {SalesPageDraft} from './sales-page';

type RenderOptions={name:string;price:number|null;currency:string;checkout:string};
const esc=(value:unknown)=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const https=(value:unknown)=>{
  try{
    const u=new URL(String(value||'').trim());
    return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';
  }catch{return '';}
};
const money=(value:number|null,currency:string)=>{
  if(value===null)return 'Preço a confirmar';
  try{return new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(value);}
  catch{return 'Preço a confirmar';}
};
const image=(link:string,label:string,extraClass='')=>link?
  '<img class="'+extraClass+'" loading="lazy" src="'+esc(link)+'" alt="'+esc(label)+'">':'';

function cta(d:SalesPageDraft,checkout:string,cls=''){
  const text=esc(d.ctaText||'Conhecer a oferta');
  return checkout?'<a class="gold-button '+cls+'" href="'+esc(checkout)+'" target="_blank" rel="noopener noreferrer">'+text+' <span aria-hidden="true">→</span></a>':
    '<span class="gold-button disabled '+cls+'" role="status">Configure seu checkout para ativar o botão</span>';
}
const small=(title:string)=>'<span class="kicker">'+esc(title)+'</span>';

export function editorialSalesPageHtml(d:SalesPageDraft,o:RenderOptions):string{
  const checkout=https(o.checkout);
  const hero=https(d.imageUrl);
  const gallery=(d.gallery||[]).slice(0,4).map(item=>({
    label:String(item.label||'Prévia do conteúdo').slice(0,130),
    url:https(item.url)
  }));
  const benefits=d.benefits.filter(Boolean).slice(0,6);
  const includes=d.includes.filter(Boolean).slice(0,8);
  const steps=d.steps.filter(Boolean).slice(0,5);
  const faq=d.faq.filter(item=>item.question&&item.answer).slice(0,8);
  const bonuses=(d.bonusItems||[]).filter(b=>b.title.trim()&&b.description.trim()).slice(0,6);
  const proofs=(d.proofItems||[]).filter(p=>p.quote.trim()&&p.author.trim()).slice(0,6);
  const gold=/^#[0-9a-f]{6}$/i.test(d.accent)?d.accent:'#e5b853';
  const sellingPrice=money(o.price,o.currency);
  const heroVisual=hero?
    '<div class="hero-image">'+image(hero,'Imagem do produto '+d.brand)+'</div>':
    '<div class="hero-image mock-scene" aria-label="Mockup conceitual do produto">'+
      '<div class="mock-surface"></div><div class="mock-device"><span>MATERIAL DIGITAL</span><strong>'+esc(d.brand)+'</strong><small>Prévia ilustrativa</small></div>'+
      '<div class="mock-page page-one"><span>GUIA DE USO</span><b>'+esc(includes[0]||'Seu material')+'</b><small>Conteúdo ilustrativo</small></div>'+
      '<div class="mock-page page-two"><span>ACESSO DIGITAL</span><b>'+esc(d.eyebrow)+'</b></div></div>';
  const galleryContent=gallery.length?gallery.slice(0,3).map((g,i)=>
    '<article class="visual-card">'+(g.url?
      image(g.url,g.label):
      '<div class="paper-preview"><span>PRÉVIA '+(i+1)+'</span><b>'+esc(g.label)+'</b><small>Ilustração de apresentação</small></div>')+
    '<div class="visual-caption">'+esc(g.label)+'</div></article>').join(''):
    includes.slice(0,3).map((t,i)=>'<article class="visual-card"><div class="paper-preview"><span>PARTE '+String(i+1).padStart(2,'0')+'</span>'+
      '<b>'+esc(t)+'</b><small>Mockup demonstrativo, não fotografia da entrega</small></div>'+
      '<div class="visual-caption">'+esc(t)+'</div></article>').join('');
  const problemItems=benefits.slice(0,4).map((b,i)=>
    '<li><span class="problem-x">×</span><span>'+esc(b)+'</span></li>').join('');
  const includedCards=includes.slice(0,6).map((x,i)=>
    '<article class="included-card"><div class="included-icon">'+['▦','◈','✧','▤','✦','◇'][i]+'</div>'+
    '<h3>'+esc(x)+'</h3><p>Confira o conteúdo e as condições reais informadas na oferta.</p></article>').join('');
  const stepItems=steps.slice(0,4).map((x,i)=>
    '<li><span class="number">'+(i+1)+'</span><div><strong>'+esc(x)+'</strong></div></li>').join('');
  const bonusSection=bonuses.length?
    '<section class="dark-section" id="bonus"><div class="wrap">'+small('PACOTE COMPLETO')+
    '<h2>'+esc(d.bonusTitle||'Bônus incluídos nesta oferta')+'</h2>'+
    '<p class="dark-sub">Somente itens que fazem parte da entrega anunciada.</p>'+
    '<div class="bonus-spotlight"><span>CONTEÚDOS ADICIONAIS</span><strong>'+esc(d.brand)+'</strong></div>'+
    '<div class="bonus-grid">'+bonuses.map((b,i)=>{
      const src=https(b.imageUrl);
      return '<article class="bonus-card">'+(src?image(src,b.title,'bonus-image'):
        '<div class="bonus-visual"><span>BÔNUS '+String(i+1).padStart(2,'0')+'</span><b>'+esc(b.title)+'</b></div>')+
        '<span class="bonus-tag">INCLUÍDO</span><h3>'+esc(b.title)+'</h3><p>'+esc(b.description)+'</p></article>';
    }).join('')+'</div></div></section>':'';
  const proofSection=proofs.length?
    '<section class="light-section" id="feedback"><div class="wrap center">'+small('DEPOIMENTOS REAIS')+
    '<h2>'+esc(d.proofTitle||'O que dizem nossos clientes')+'</h2>'+
    '<p class="sub">Comentários fornecidos e confirmados pelo responsável da oferta.</p>'+
    '<div class="proof-carousel">'+proofs.map(p=>'<article class="proof-card"><div class="stars" aria-hidden="true">★★★★★</div>'+
      '<blockquote>“'+esc(p.quote)+'”</blockquote><strong>'+esc(p.author)+'</strong></article>').join('')+
    '</div></div></section>':'';
  const guaranteeSection=d.guaranteeText?.trim()?
    '<section class="light-section guarantee"><div class="wrap"><div class="guarantee-box">'+small('CONDIÇÕES DE COMPRA')+
    '<h2>Garantia e condições</h2><p>'+esc(d.guaranteeText)+'</p></div></div></section>':'';
  const secondPrice=d.secondPlanPrice?.trim()||'';
  const secondLink=https(d.secondPlanCheckout);
  const secondName=d.secondPlanName?.trim()||'';
  const secondItems=(d.secondPlanItems||[]).filter(Boolean).slice(0,8);
  const hasSecond=!!secondName&&!!secondPrice;
  const planCards='<article class="price-card"><span class="plan-tag">OPÇÃO PRINCIPAL</span>'+
    '<h3>'+esc(d.brand)+'</h3><ul>'+includes.slice(0,6).map(x=>'<li>✓ '+esc(x)+'</li>').join('')+'</ul>'+
    '<div class="price">'+esc(sellingPrice)+'</div>'+cta(d,checkout,'wide')+'</article>'+
    (hasSecond?'<article class="price-card featured"><span class="plan-tag">OUTRA OPÇÃO</span>'+
      '<h3>'+esc(secondName)+'</h3><ul>'+secondItems.map(x=>'<li>✓ '+esc(x)+'</li>').join('')+'</ul>'+
      '<div class="price">'+esc(secondPrice)+'</div>'+
      (secondLink?'<a href="'+esc(secondLink)+'" class="gold-button wide" target="_blank" rel="noopener noreferrer">Ver esta opção →</a>':
        '<span class="gold-button disabled wide" role="status">Configure o checkout desta opção</span>')+
      '</article>':'');
  const faqSection='<section class="faq-section"><div class="wrap slim center">'+small('DÚVIDAS FREQUENTES')+
    '<h2>'+esc(d.faqTitle)+'</h2><div class="faq-list">'+
    faq.map(q=>'<details><summary>'+esc(q.question)+'<span aria-hidden="true">＋</span></summary><p>'+esc(q.answer)+'</p></details>').join('')+
    '</div></div></section>';
  const css=[
    ':root{--navy:#0d1b33;--navy2:#162c50;--gold:'+gold+';--cream:#faf6ed;--ink:#112642;--muted:#50637a;--stroke:#e6e0d5}',
    '*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font:15px/1.6 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;background:#fff;color:var(--ink)}',
    'h1,h2,h3,p{overflow-wrap:break-word}h1,h2,h3{line-height:1.18;letter-spacing:-.025em}h2{font-size:clamp(24px,4.7vw,36px);margin:10px auto 12px;font-weight:850;max-width:780px}',
    'h3{font-size:16px;margin:12px 0 8px}a{text-decoration:none}.wrap{max-width:1080px;width:min(100% - 34px,1080px);margin:0 auto}.slim{max-width:810px}.center{text-align:center}.sub{color:var(--muted);max-width:760px;margin:0 auto 26px}',
    '.top-ribbon{background:#961b30;color:white;text-align:center;padding:7px 15px;font-size:11px;font-weight:750;letter-spacing:.1em}',
    '.hero{background:radial-gradient(ellipse at 45% 8%,#1b3151,transparent 65%),var(--navy);color:white;text-align:center;padding:52px 0 65px}',
    '.hero .wrap{max-width:940px}.hero h1{font-size:clamp(29px,6vw,53px);max-width:830px;margin:16px auto 11px;text-transform:uppercase;line-height:1.12}.hero h1 strong{color:var(--gold)}',
    '.hero .lead{max-width:720px;margin:0 auto 24px;color:#d5dfef;font-size:16px}.kicker{display:inline-block;letter-spacing:.12em;font-weight:850;text-transform:uppercase;font-size:11px;color:#bf8e36;background:#fff8e8;border:1px solid #e9cd8d;border-radius:20px;padding:5px 13px}',
    '.hero .kicker,.dark-section .kicker,.bottom-cta .kicker{color:#ffcf68;background:#172941;border-color:#80662b}',
    '.hero-image{max-width:560px;margin:23px auto 20px;border-radius:16px;overflow:hidden;min-height:285px;box-shadow:0 18px 35px #030d1ab2;border:1px solid #947b3d}',
    '.hero-image>img{width:100%;height:100%;max-height:500px;object-fit:contain;display:block;background:#172d46}',
    '.mock-scene{height:320px;position:relative;display:grid;place-items:center;background:radial-gradient(ellipse at 65% 70%,#a87f47,#1a3249 70%);isolation:isolate}',
    '.mock-surface{position:absolute;bottom:0;inset-inline:0;height:30%;background:linear-gradient(160deg,#704f35,#2c2a29);transform:skewY(-5deg);z-index:-1}',
    '.mock-device{position:relative;display:flex;flex-direction:column;gap:14px;justify-content:space-between;background:linear-gradient(155deg,#e9dfc0,#a48750);border:8px solid #e7dbb8;border-left:15px solid #5b472f;border-radius:6px 12px 12px 6px;padding:28px 16px;width:46%;height:78%;box-shadow:13px 15px 20px #070b13a8;transform:rotate(-5deg);color:#17345a}',
    '.mock-device span,.mock-page span{font-size:10px;letter-spacing:.13em}.mock-device strong{font-size:clamp(17px,4vw,26px);line-height:1.13}.mock-device small{font-size:10px}',
    '.mock-page{position:absolute;width:28%;height:57%;bottom:8%;background:#fff7e7;color:#24354d;padding:16px 9px;border-radius:5px;box-shadow:8px 13px 17px #0007;display:flex;flex-direction:column;gap:12px;justify-content:center;text-align:left}',
    '.mock-page b{font-size:clamp(10px,2vw,15px);overflow-wrap:anywhere}.page-one{right:6%;transform:rotate(8deg)}.page-two{left:4%;transform:rotate(-11deg)}',
    '.hero-points{display:grid;gap:7px;max-width:610px;text-align:left;margin:22px auto 0;padding:0;list-style:none}.hero-points li{font-size:13px;color:#e4edf8}.hero-points li:before{content:"✦";color:var(--gold);margin-right:9px}',
    '.gold-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:25px;background:linear-gradient(180deg,#f5d37c,#d9a640);color:#192a42;font-weight:900;padding:12px 26px;box-shadow:0 5px 0 #966b23,0 12px 23px #0002;text-align:center;border:1px solid #f8dd94;max-width:100%}',
    '.gold-button:hover{filter:brightness(1.07)}.gold-button:focus-visible{outline:3px solid #78acff;outline-offset:3px}.gold-button.disabled{background:#b7a477;color:#334253;box-shadow:none;font-size:12px}.gold-button.wide{display:flex;width:100%}',
    '.small-note{display:block;font-size:11px;color:#cbd5e2;margin-top:11px}.light-section{padding:68px 0;background:#fff}.cream-section{background:var(--cream);padding:68px 0}',
    '.problem-card{background:white;box-shadow:0 14px 35px #111c2b12;max-width:800px;border-radius:15px;padding:30px;margin:0 auto;text-align:center;border:1px solid #eadfd3}',
    '.problem-list{margin:25px auto 0;padding:0;text-align:left;list-style:none;display:grid;gap:9px;max-width:650px}.problem-list li{background:#fff0ef;padding:12px 14px;border-left:3px solid #e08a81;border-radius:5px;color:#5d2630;font-size:13px}',
    '.problem-x{font-weight:800;margin-right:9px}.problem-summary{background:#112849;border-radius:10px;padding:16px;color:white;margin-top:22px;font-size:13px}',
    '.section-grid{display:grid;grid-template-columns:1fr;gap:32px;align-items:center;margin:0 auto}.section-grid>div{min-width:0}',
    '.illustration{min-height:240px;border:2px solid #e7e1d7;background:linear-gradient(160deg,#fffefd,#f1ead9);border-radius:14px;display:grid;place-items:center;overflow:hidden;box-shadow:0 15px 32px #121b3010}',
    '.illustration img{display:block;width:100%;height:100%;max-height:430px;object-fit:contain}.illustration .paper-preview{max-width:80%;min-height:200px;transform:rotate(-4deg);box-shadow:12px 15px 25px #0d1b3329}',
    '.step-list{padding:0;list-style:none;display:grid;gap:12px}.step-list li{display:flex;gap:13px;padding:14px;background:#faf7f0;border-radius:9px;align-items:flex-start;font-size:13px}.number{display:grid;place-items:center;min-width:30px;height:30px;border-radius:50%;background:#122a50;color:#f3cd75;font-weight:800}',
    '.included-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:26px}.included-card{background:#fff;border-radius:10px;box-shadow:0 10px 24px #121b3010;padding:22px 16px;text-align:center;min-height:162px}.included-card p{font-size:12px;color:#5e6c7e;margin:0}.included-icon{font-size:27px;color:#bd8f43}',
    '.visual-grid{display:grid;grid-template-columns:1fr;gap:15px;margin-top:28px}.visual-card{border-radius:10px;overflow:hidden;border:1px solid #e5ddd0;background:white;box-shadow:0 9px 25px #0001}',
    '.visual-card img{width:100%;height:235px;object-fit:contain;display:block}.visual-caption{padding:14px;font-weight:750;font-size:13px}.paper-preview{display:flex;flex-direction:column;gap:19px;justify-content:space-between;min-height:230px;padding:25px;background:linear-gradient(145deg,#fffdfa,#e9dec3);color:#263a5c;text-align:left}',
    '.paper-preview span{font-size:11px;letter-spacing:.13em;color:#a67c37}.paper-preview b{font-size:22px}.paper-preview small{font-size:11px;color:#727885}',
    '.dark-section{background:radial-gradient(circle at top,#19365b,var(--navy) 65%);padding:77px 0;color:white;text-align:center}.dark-section h2{color:white}.dark-sub{color:#bfcee1;font-size:13px}',
    '.bonus-spotlight{width:min(100%,320px);height:240px;margin:29px auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:linear-gradient(160deg,#1d365b,#0b1529);border:1px solid #b18c43;border-radius:10px;box-shadow:0 18px 35px #060a1899}',
    '.bonus-spotlight span{font-size:11px;color:var(--gold);letter-spacing:.12em}.bonus-spotlight strong{font-size:23px;max-width:250px}',
    '.bonus-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.bonus-card{background:#152845;border-radius:10px;padding:12px;text-align:left;border:1px solid #31445f}',
    '.bonus-visual{height:138px;border-radius:7px;background:linear-gradient(145deg,#0a182b,#3b4d65);display:flex;flex-direction:column;justify-content:center;padding:16px;gap:10px}',
    '.bonus-visual span{color:var(--gold);font-size:10px;letter-spacing:.13em}.bonus-visual b{font-size:15px}.bonus-image{width:100%;height:138px;object-fit:contain}',
    '.bonus-tag{display:inline-block;padding:3px 10px;background:#e4bd65;color:#142b4c;font-size:10px;font-weight:900;border-radius:20px;margin-top:12px}',
    '.bonus-card h3{color:white}.bonus-card p{color:#c1cfe1;font-size:12px}.pricing-section{padding:72px 0;background:var(--cream);text-align:center}',
    '.pricing-grid{display:grid;grid-template-columns:1fr;max-width:820px;margin:27px auto 0;gap:16px}.price-card{border-radius:13px;padding:26px 23px;background:#fff;border:1px solid #e1d7c7;box-shadow:0 12px 28px #101f3214;text-align:left;display:flex;flex-direction:column}',
    '.price-card.featured{border:2px solid #54ae77}.plan-tag{display:inline-block;color:#9b6b2d;font-size:10px;font-weight:850;letter-spacing:.1em}.price-card h3{font-size:23px}',
    '.price-card ul{list-style:none;padding:0;min-height:80px;font-size:13px;color:#4a6473}.price-card li{padding:5px 0}.price{font-size:clamp(30px,6vw,39px);font-weight:900;color:#246749;margin:15px 0 18px}',
    '.guarantee{padding-top:38px;padding-bottom:60px}.guarantee-box{border:1px solid #efd9a3;background:#fffaf0;border-radius:14px;padding:27px;text-align:center;max-width:790px;margin:auto}',
    '.proof-carousel{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:20px 4px 28px}.proof-card{min-width:min(85%,315px);max-width:315px;flex:1;padding:23px;border-radius:9px;background:white;border:1px solid #e8e0d3;box-shadow:0 10px 22px #101f3212;scroll-snap-align:center;text-align:left}',
    '.proof-card blockquote{padding:0;margin:15px 0;font-size:14px;color:var(--ink)}.proof-card strong{font-size:12px}.stars{color:#d9ab53;letter-spacing:2px}.faq-section{background:white;padding:73px 0}',
    '.faq-list{max-width:780px;margin:24px auto 0;text-align:left}.faq-list details{background:#faf7f0;border-radius:8px;margin:8px 0;padding:13px 17px}.faq-list summary{display:flex;justify-content:space-between;font-weight:750;font-size:13px;cursor:pointer;list-style:none;gap:15px}.faq-list summary::-webkit-details-marker{display:none}.faq-list p{font-size:13px;color:#53677c;padding-top:10px}',
    '.bottom-cta{padding:58px 0 67px;text-align:center;background:var(--navy);color:white}.bottom-cta p{max-width:610px;color:#cbd7e6;margin:0 auto 22px}',
    'footer{background:#050d1b;color:#98aac4;text-align:center;padding:27px 0;font-size:11px}.sticky{position:fixed;inset:auto 0 0 0;background:#0e1a30f2;padding:10px 14px calc(10px + env(safe-area-inset-bottom));z-index:20;border-top:1px solid #8a6b2c;backdrop-filter:blur(8px)}',
    '.sticky .gold-button{width:100%;min-height:45px;font-size:13px}.sr-note{font-size:11px;color:#c8d0df;text-align:center;margin-top:7px}',
    '@media(min-width:700px){.section-grid{grid-template-columns:1fr 1fr}.included-grid{grid-template-columns:repeat(3,1fr)}.visual-grid{grid-template-columns:repeat(3,1fr)}.bonus-grid{grid-template-columns:repeat(3,1fr)}.pricing-grid{grid-template-columns:repeat(2,1fr)}.pricing-grid:has(.price-card:only-child){grid-template-columns:minmax(0,430px);justify-content:center}.proof-carousel{justify-content:center}.hero{padding:74px 0}.hero-image{height:390px}.sticky{display:none}body{padding-bottom:0}}',
    '@media(max-width:699px){body{padding-bottom:70px}.light-section,.cream-section,.dark-section{padding-top:53px;padding-bottom:53px}.hero{padding:38px 0 51px}.hero-image{min-height:240px;height:275px}.included-grid{grid-template-columns:1fr 1fr}.mock-device{height:78%}.bonus-grid{grid-template-columns:1fr 1fr}.top-ribbon{font-size:9px}}',
    '@media(max-width:360px){.included-grid,.bonus-grid{grid-template-columns:1fr}.mock-page{width:29%}.mock-device{width:50%}}',
    '@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}'
  ].join('');
  const sections=[
    '<div class="top-ribbon">MATERIAL DIGITAL · CONHEÇA A PROPOSTA</div>',
    '<main><section class="hero"><div class="wrap">'+small(d.eyebrow)+
      '<h1>'+esc(d.headline)+'</h1><p class="lead">'+esc(d.subheadline)+'</p>'+heroVisual+
      cta(d,checkout)+'<span class="small-note">Confira preço, entrega e condições no checkout.</span>'+
      '<ul class="hero-points">'+benefits.slice(0,4).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div></section>',
    proofSection,
    '<section class="cream-section"><div class="wrap"><div class="problem-card">'+small('RECONHEÇA O DESAFIO')+
      '<h2>'+esc(d.painTitle)+'</h2><p class="sub">'+esc(d.painBody)+'</p>'+
      '<ul class="problem-list">'+problemItems+'</ul>'+
      '<div class="problem-summary">'+esc(d.finalBody)+'</div></div></div></section>',
    '<section class="light-section"><div class="wrap center">'+small('MATERIAL POR DENTRO')+
      '<h2>'+esc(d.galleryTitle||'Veja uma prévia do conteúdo')+'</h2>'+
      '<p class="sub">Imagens fornecidas ou apresentações ilustrativas. Confira o material real antes de publicar.</p>'+
      '<div class="visual-grid">'+galleryContent+'</div></div></section>',
    '<section class="cream-section"><div class="wrap center">'+small('O QUE ESTÁ INCLUÍDO')+
      '<h2>'+esc(d.offerTitle)+'</h2><p class="sub">'+esc(d.benefitsTitle)+'</p>'+
      '<div class="included-grid">'+includedCards+'</div></div></section>',
    '<section class="light-section"><div class="wrap section-grid">'+
      '<div class="illustration">'+(gallery[0]?.url?image(gallery[0].url,gallery[0].label):
        '<div class="paper-preview"><span>ETAPA A ETAPA</span><b>'+esc(d.stepsTitle)+'</b><small>Exemplo conceitual</small></div>')+
      '</div><div>'+small('COMO UTILIZAR')+'<h2>'+esc(d.stepsTitle)+'</h2>'+
      '<ul class="step-list">'+stepItems+'</ul>'+cta(d,checkout)+'</div></div></section>',
    bonusSection,
    '<section class="pricing-section" id="precos"><div class="wrap">'+small('ESCOLHA SUA OPÇÃO')+
      '<h2>'+esc(d.pricingTitle||'Escolha a opção que combina com você')+'</h2>'+
      '<p class="sub">Valores e itens devem corresponder ao checkout e ao produto efetivamente entregue.</p>'+
      '<div class="pricing-grid">'+planCards+'</div></div></section>',
    guaranteeSection,
    faqSection,
    '<section class="bottom-cta"><div class="wrap">'+small('CONHEÇA O PRODUTO')+
      '<h2>'+esc(d.finalTitle)+'</h2><p>'+esc(d.finalBody)+'</p>'+cta(d,checkout)+'</div></section></main>',
    '<footer><div class="wrap">'+esc(d.brand)+' · Confira os detalhes e condições reais da oferta antes de comprar.</div></footer>',
    '<div class="sticky">'+cta(d,checkout)+'<div class="sr-note">Checkout externo seguro, quando configurado</div></div>'
  ];
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'+
    '<meta name="description" content="'+esc(d.subheadline.slice(0,150))+'">'+
    '<title>'+esc(d.brand)+' | '+esc(d.headline)+'</title><style>'+css+'</style></head><body>'+
    sections.join('')+'</body></html>';
}
