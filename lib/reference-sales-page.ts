import type {SalesPageDraft} from './sales-page';
import {pageVisualAssets,safeImageUrl,type VisualAsset} from './sales-page-visuals';

type RenderOpts={name:string;price:number|null;currency:string;checkout:string};
export type ReferenceTheme='clinic'|'agenda';
const esc=(v:unknown)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const img=(v:VisualAsset)=>'<img loading="lazy" decoding="async" src="'+esc(v.src)+
  '" alt="'+esc(v.label)+(v.illustrative?' — ilustração, não fotografia da entrega':'')+'">';
const tag=(text:string)=>'<span class="tag">'+esc(text)+'</span>';
const safeLink=(value:unknown)=>safeImageUrl(value);
const gotoOffer=(d:SalesPageDraft)=>'<a class="btn" href="#oferta">'+esc(d.ctaText)+' ↓</a>';
function buy(text:string,link:string){
  return link?'<a class="btn" href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">'+esc(text)+' →</a>':
    '<span class="btn disabled" role="status">Checkout ainda não configurado</span>';
}
function controls(){
  return '<div class="controls"><button type="button" data-slide="-1" aria-label="Anterior">‹</button>'+
    '<button type="button" data-slide="1" aria-label="Próximo">›</button></div>';
}
function proof(d:SalesPageDraft){
  const items=(d.proofItems||[]).filter(x=>x.quote.trim()&&x.author.trim()).slice(0,6);
  if(!items.length)return '';
  return '<section class="section proof"><div class="wrap center">'+tag('DEPOIMENTOS REAIS')+
    '<h2>'+esc(d.proofTitle||'Quem já utiliza')+'</h2>'+controls()+
    '<div class="horizontal">'+items.map(x=>'<blockquote class="quote"><b class="quote-icon">“</b><p>'+
      esc(x.quote)+'</p><footer>'+esc(x.author)+'</footer></blockquote>').join('')+
    '</div></div></section>';
}
function gallery(d:SalesPageDraft,visuals:VisualAsset[],theme:ReferenceTheme){
  const cards=visuals.slice(1,11).map((v,i)=>'<figure class="visual-card">'+img(v)+
    '<figcaption><strong>'+String(i+1).padStart(2,'0')+'</strong> '+esc(v.label)+
    (v.illustrative?'<small>Ilustração conceitual</small>':'')+'</figcaption></figure>').join('');
  const heading='<div class="wrap center">'+tag('VEJA POR DENTRO')+
    '<h2>'+esc(d.galleryTitle||'Apresentação do conteúdo')+'</h2>'+
    '<p class="sub">Conheça a organização visual. Substitua mockups conceituais por imagens reais antes de anunciar.</p></div>';
  if(theme==='clinic'){
    return '<section class="section preview" id="preview">'+heading+
      '<div class="marquee" aria-label="Carrossel contínuo com dez visuais">'+
      '<div class="marquee-track"><div class="marquee-set">'+cards+'</div>'+
      '<div class="marquee-set" aria-hidden="true">'+cards+'</div></div></div>'+
      '<div class="wrap center">'+gotoOffer(d)+'</div></section>';
  }
  return '<section class="section preview" id="preview">'+heading+
    '<div class="wrap">'+controls()+'<div class="horizontal">'+cards+'</div>'+
    '<p class="hint center">Arraste para os lados ou use as setas.</p></div></section>';
}
function pain(d:SalesPageDraft){
  const pains=(d.painPoints||[]).filter(Boolean).slice(0,6);
  return '<section class="section pain"><div class="wrap center">'+tag('RECONHEÇA O DESAFIO')+
    '<h2>'+esc(d.painTitle)+'</h2><p class="sub">'+esc(d.painBody)+'</p>'+
    (pains.length?'<div class="pain-grid">'+pains.map(x=>'<div class="pain-item"><b aria-hidden="true">×</b>'+esc(x)+'</div>').join('')+'</div>':'')+
    '</div></section>';
}
function video(d:SalesPageDraft){
  const link=safeLink(d.demoVideoUrl);
  if(!link)return '';
  const u=new URL(link);let src='';
  if(['www.youtube.com','youtube.com','youtu.be'].includes(u.hostname)){
    const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||'';
    if(/^[\w-]{11}$/.test(id))src='https://www.youtube-nocookie.com/embed/'+id;
  }else if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(u.hostname)){
    const id=u.pathname.match(/(?:^|\/)(\d{6,12})(?:\/|$)/);
    if(id)src='https://player.vimeo.com/video/'+id[1];
  }
  return src?'<iframe src="'+src+'" loading="lazy" title="Demonstração fornecida pelo vendedor" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>':'';
}
function how(d:SalesPageDraft,visuals:VisualAsset[]){
  const demo=video(d);
  const steps=d.steps.filter(Boolean).slice(0,5);
  return '<section class="section how"><div class="wrap center">'+tag('PASSO A PASSO')+
    '<h2>'+esc(d.stepsTitle)+'</h2><div class="how-grid"><div class="how-media">'+
    (demo||img(visuals[11]))+'<small>'+(demo?'Vídeo fornecido pelo autor':'Mockup ilustrativo')+
    '</small></div><ol class="steps">'+steps.map((x,i)=>'<li><b>'+String(i+1)+'</b>'+esc(x)+'</li>').join('')+
    '</ol></div>'+gotoOffer(d)+'</div></section>';
}
function included(d:SalesPageDraft){
  return '<section class="section included"><div class="wrap center">'+tag('O QUE VOCÊ RECEBE')+
    '<h2>'+esc(d.offerTitle)+'</h2><p class="sub">'+esc(d.benefitsTitle)+'</p>'+
    '<div class="included-grid">'+d.includes.filter(Boolean).slice(0,8).map((x,i)=>
      '<article class="included-card"><span aria-hidden="true">'+['✦','▣','◈','◇','✧','▤','◎','✳'][i]+
      '</span><h3>'+esc(x)+'</h3></article>').join('')+'</div></div></section>';
}
function splitVisuals(d:SalesPageDraft,visuals:VisualAsset[]){
  const benefits=d.benefits.filter(Boolean).slice(0,5);
  return '<section class="section stories"><div class="wrap">'+
    '<div class="story"><div>'+img(visuals[12])+'</div><div>'+tag('BENEFÍCIOS')+
    '<h2>'+esc(d.benefitsTitle)+'</h2><ul class="checks">'+benefits.map(x=>'<li>'+esc(x)+'</li>').join('')+
    '</ul>'+gotoOffer(d)+'</div></div>'+
    '<div class="story reverse"><div>'+img(visuals[13])+'</div><div>'+tag('MATERIAL ORGANIZADO')+
    '<h2>'+esc(d.galleryTitle||'Veja o material por dentro')+'</h2><p>'+esc(d.finalBody)+
    '</p>'+gotoOffer(d)+'</div></div></div></section>';
}
function bonus(d:SalesPageDraft,visuals:VisualAsset[]){
  const items=(d.bonusItems||[]).filter(x=>x.title.trim()&&x.description.trim()).slice(0,6);
  if(!items.length)return '';
  return '<section class="section bonus"><div class="wrap center">'+tag('CONTEÚDO ADICIONAL CONFIRMADO')+
    '<h2>'+esc(d.bonusTitle||'Bônus incluídos')+'</h2>'+
    '<div class="bonus-hero">'+img(visuals[14])+'</div>'+
    '<div class="bonus-grid">'+items.map((x,i)=>'<article class="bonus-card">'+
      (safeLink(x.imageUrl)?'<img loading="lazy" src="'+esc(safeLink(x.imageUrl))+'" alt="'+esc(x.title)+'">':
      '<div class="bonus-visual">'+String(i+1).padStart(2,'0')+'</div>')+
      '<span class="bonus-tag">INCLUÍDO</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.description)+'</p></article>').join('')+
    '</div></div></section>';
}
function pricing(d:SalesPageDraft,o:RenderOpts){
  const first=d.includes.filter(Boolean).slice(0,8);
  const second=(d.secondPlanItems||[]).filter(Boolean).slice(0,8);
  const primary='<article class="plan"><span>OPÇÃO PRINCIPAL</span><h3>'+esc(d.brand)+'</h3><ul>'+
    first.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
    '<div class="price">'+esc(d.ownOfferPrice?.trim()||'Preço próprio a definir')+'</div>'+
    buy(d.ctaText,safeLink(o.checkout))+'</article>';
  const other=d.secondPlanName?.trim()&&d.secondPlanPrice?.trim()?
    '<article class="plan featured"><span>SEGUNDA OPÇÃO</span><h3>'+esc(d.secondPlanName)+'</h3>'+
    '<ul>'+second.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
    '<div class="price">'+esc(d.secondPlanPrice)+'</div>'+
    buy('Ver segunda opção',safeLink(d.secondPlanCheckout))+'</article>':'';
  return '<section class="section pricing" id="oferta"><div class="wrap center">'+tag('ESCOLHA SUA OPÇÃO')+
    '<h2>'+esc(d.pricingTitle||'Escolha seu pacote')+'</h2>'+
    '<p class="sub">Informações, valores e condições devem corresponder ao produto real e ao checkout.</p>'+
    '<div class="plans">'+primary+other+'</div></div></section>';
}
function guarantee(d:SalesPageDraft){
  return d.guaranteeText?.trim()?'<section class="section guarantee"><div class="wrap">'+
    '<div class="guarantee-box"><div class="shield">✓</div><div>'+tag('GARANTIA INFORMADA')+
    '<h2>Condições de garantia</h2><p>'+esc(d.guaranteeText)+'</p></div></div></div></section>':'';
}
function faq(d:SalesPageDraft){
  return '<section class="section faq"><div class="wrap narrow center">'+tag('DÚVIDAS FREQUENTES')+
    '<h2>'+esc(d.faqTitle)+'</h2><div class="faq-list">'+d.faq.filter(x=>x.question&&x.answer).slice(0,9).map(x=>
    '<details><summary>'+esc(x.question)+' <span aria-hidden="true">+</span></summary><p>'+esc(x.answer)+'</p></details>').join('')+
    '</div></div></section>';
}
const css=[
 ':root{--primary:#238e83;--accent:#2a9d8f;--bg:#faf9f6;--ink:#223344;--muted:#596b78}',
 '.theme-agenda{--primary:#142745;--accent:#e1b550;--bg:#fbf7ef;--ink:#142742;--muted:#596575}',
 '*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.65 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;overflow-x:hidden}',
 'h1,h2,h3,p{overflow-wrap:anywhere}h1,h2,h3{line-height:1.2;letter-spacing:-.02em}h1{font-size:clamp(27px,6vw,45px);max-width:820px;margin:14px auto}h2{font-size:clamp(22px,4vw,35px);max-width:780px;margin:10px auto 16px}h3{font-size:16px}',
 'a{text-decoration:none;color:inherit}img{display:block;max-width:100%;height:auto}.wrap{width:min(calc(100% - 32px),1060px);margin:auto}.narrow{max-width:790px}.center{text-align:center}.section{padding:65px 0}.section:nth-of-type(even){background:#fff}.sub{max-width:720px;margin:0 auto 24px;color:var(--muted)}',
 '.tag{display:inline-block;color:var(--primary);font-size:10px;font-weight:850;letter-spacing:.11em;text-transform:uppercase;padding:5px 12px;border-radius:40px;background:#e7f4ee}.theme-agenda .tag{color:#926d27;background:#fff0c5}',
 '.ribbon{padding:9px 15px;background:#e8384d;color:white;font-size:11px;font-weight:800;text-align:center;letter-spacing:.05em}.theme-agenda .ribbon{background:#982c3f}',
 '.hero{padding:46px 0 58px;text-align:center;background:#fff}.hero .wrap{max-width:860px}.hero p{font-size:16px;max-width:680px;margin:0 auto 19px}.hero-img{max-width:540px;margin:25px auto}.hero-img img{max-height:440px;margin:auto;border-radius:15px;filter:drop-shadow(0 14px 20px #0002)}',
 '.theme-agenda .hero{background:radial-gradient(circle at 43% 12%,#1e3e66,#0d1b32 74%);color:#fff}.theme-agenda .hero p{color:#dce7f1}.theme-agenda .hero .tag{background:#253957;color:#f8d77c}',
 '.btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;border-radius:30px;padding:13px 25px;background:var(--accent);color:#fff;font-weight:850;font-size:14px;max-width:100%;box-shadow:0 7px 20px #0002}.theme-agenda .btn{color:#14253e;background:linear-gradient(120deg,#fbe395,#d9a33e)}.btn.disabled{background:#879399;color:#fff;box-shadow:none;font-size:12px}',
 '.hint{font-size:11px;color:var(--muted);margin:12px auto}.hero .hint{color:#7d8595}.theme-agenda .hero .hint{color:#b7c7dd}.hero-bullets{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:8px 18px;padding:0;margin:22px auto 0;max-width:780px}.hero-bullets li{font-size:12px}.hero-bullets li:before{content:"✓";color:var(--accent);font-weight:900;margin-right:8px}',
 '.preview{background:#f6f0e8!important}.theme-agenda .preview{background:#fff!important}.marquee{overflow:hidden;margin:25px 0}.marquee-track{display:flex;width:max-content;animation:roll 65s linear infinite}.marquee:hover .marquee-track,.marquee:focus-within .marquee-track{animation-play-state:paused}.marquee-set{display:flex;gap:14px;padding-right:14px;flex:none}.marquee-set .visual-card{width:185px}@keyframes roll{to{transform:translateX(-50%)}}',
 '.horizontal{display:flex;gap:15px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;overscroll-behavior-x:contain;padding:12px 3px 23px}.horizontal>*{flex:0 0 clamp(208px,48vw,315px);scroll-snap-align:center}.controls{display:flex;justify-content:center;gap:10px;margin:18px 0}.controls button{border:1px solid #d8d2c6;background:white;color:#17334a;width:40px;height:40px;border-radius:50%;font-size:26px;cursor:pointer}',
 '.visual-card{margin:0;border-radius:12px;border:1px solid #ebe1d6;background:#fff;overflow:hidden;box-shadow:0 4px 16px #00000011}.visual-card img{aspect-ratio:4/3;object-fit:contain;width:100%}.visual-card figcaption{text-align:left;padding:11px 13px;font-size:12px}.visual-card strong{color:var(--primary)}.visual-card small{display:block;font-size:10px;color:#66748a}',
 '.pain{background:#fff!important}.pain-grid{display:grid;gap:9px;max-width:770px;margin:20px auto}.pain-item{text-align:left;padding:13px 16px;border-radius:8px;background:#fdf0ee;border-left:3px solid #df7777}.pain-item b{color:#bc4859;margin-right:9px}',
 '.how{background:#faf6ef!important}.how-grid{display:grid;gap:25px;align-items:center;max-width:960px;margin:26px auto}.how-media img{max-height:430px;margin:auto;border-radius:12px}.how-media iframe{aspect-ratio:16/9;width:100%;border:0;border-radius:12px}.how-media small{display:block;font-size:11px;color:var(--muted)}.steps{display:grid;gap:12px;padding:0;list-style:none;text-align:left}.steps li{display:flex;align-items:flex-start;gap:12px;background:#fff;border-radius:11px;padding:16px}.steps b{display:grid;place-items:center;background:var(--primary);color:#fff;border-radius:50%;min-width:32px;height:32px}',
 '.included{background:#fff!important}.included-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:27px auto}.included-card{padding:24px 13px;border:1px solid #e8e1d7;border-radius:11px;box-shadow:0 6px 16px #0000000b;background:#fff}.included-card span{font-size:25px;color:var(--accent)}.included-card h3{font-size:13px;margin:8px 0}',
 '.stories{background:#fbf7ef!important}.story{display:grid;gap:25px;align-items:center;margin:8px auto 50px}.story img{max-height:410px;margin:auto;border-radius:12px}.story h2{margin:10px 0}.checks{list-style:none;padding:0}.checks li{margin:9px 0}.checks li:before{content:"✓";color:var(--accent);margin-right:9px;font-weight:900}',
 '.bonus{background:var(--primary)!important;color:#fff}.bonus h2{color:#fff}.bonus .tag{background:#ffffff26;color:#fff}.bonus-hero{max-width:340px;margin:0 auto 24px}.bonus-hero img{max-height:240px;border-radius:12px;margin:auto}.bonus-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.bonus-card{text-align:left;border-radius:11px;padding:14px;background:#ffffff1a;border:1px solid #ffffff40}.bonus-card img{height:120px;width:100%;object-fit:contain}.bonus-visual{height:110px;display:grid;place-items:center;font-size:34px;background:#0002;border-radius:8px}.bonus-tag{display:inline-block;border-radius:20px;background:#ffe0a0;color:#28354a;padding:3px 10px;font-size:10px;font-weight:850;margin-top:10px}.bonus-card p{font-size:12px}',
 '.pricing{background:#faf6ef!important}.plans{max-width:830px;margin:26px auto;display:grid;gap:15px}.plan{text-align:left;border:1px solid #e8e0d3;border-radius:14px;background:#fff;padding:24px 21px;display:flex;flex-direction:column}.plan.featured{border:2px solid var(--accent);background:#f0faf6}.theme-agenda .plan.featured{background:#fffaef}.plan span{font-size:10px;font-weight:850;letter-spacing:.1em}.plan h3{font-size:22px}.plan ul{list-style:none;padding:0;flex:1}.plan li{padding:5px 0;font-size:13px}.plan li:before{content:"✓";color:var(--primary);font-weight:900;margin-right:7px}.price{font-size:clamp(22px,5vw,33px);font-weight:900;color:var(--primary);margin:15px 0}.plan .btn{width:100%}',
 '.proof{background:#fff!important}.quote{margin:0;text-align:left;border:1px solid #e9e0d4;border-radius:10px;padding:22px;background:#fff}.quote-icon{font-size:37px;color:var(--accent)}.quote p{font-size:13px}.quote footer{font-size:12px;font-weight:850;color:var(--primary)}',
 '.guarantee{background:#fff!important}.guarantee-box{max-width:800px;margin:auto;padding:24px;display:flex;gap:22px;align-items:center;border:1px solid #edd8ac;border-radius:13px;background:#fff9e9}.shield{flex:none;border-radius:50%;background:#e1f3e4;color:#28914f;width:79px;height:79px;display:grid;place-items:center;font-size:35px}',
 '.faq{background:#f7f1e9!important}.faq-list{margin:24px auto;text-align:left}.faq-list details{background:#fff;border-radius:9px;margin-bottom:9px;padding:13px 16px}.faq-list summary{display:flex;justify-content:space-between;gap:13px;cursor:pointer;font-size:13px;font-weight:800}.faq-list p{font-size:13px;color:var(--muted)}',
 '.final{background:var(--primary);text-align:center;color:#fff;padding:60px 0}.final .tag{background:#ffffff22;color:#fff}.final p{max-width:680px;margin:0 auto 22px;color:#e3e9ef}.final .btn{background:#fff;color:var(--primary)}.theme-agenda .final .btn{background:linear-gradient(120deg,#fbe395,#d9a33e);color:#14253e}',
 '.site-footer{background:#0b1727;color:#adbdcf;padding:25px 0;font-size:11px;text-align:center}.sticky{position:fixed;bottom:0;left:0;right:0;background:#101e36ed;padding:10px 14px calc(10px + env(safe-area-inset-bottom));z-index:9;display:flex;justify-content:center}.sticky .btn{width:100%;max-width:470px}',
 '@media(min-width:700px){.wrap{width:min(calc(100% - 70px),1060px)}.how-grid,.story{grid-template-columns:1fr 1fr}.story.reverse>div:first-child{order:2}.included-grid,.bonus-grid{grid-template-columns:repeat(3,1fr)}.plans{grid-template-columns:repeat(2,1fr)}.plans:has(.plan:only-child){grid-template-columns:minmax(0,420px);justify-content:center}.marquee-set .visual-card{width:225px}.sticky{display:none}}',
 '@media(max-width:699px){body{padding-bottom:69px}.section{padding:48px 0}.marquee-set .visual-card{width:170px}.hero-img img{max-height:340px}.guarantee-box{display:block;text-align:center}.shield{margin:0 auto 15px}}',
 '@media(max-width:360px){.included-grid,.bonus-grid{grid-template-columns:1fr}}',
 '@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.marquee-track{animation:none}}'
].join('');
const scripted='<script>(function(){document.querySelectorAll("[data-slide]").forEach(function(b){b.addEventListener("click",function(){'+
  'var t=b.parentElement.nextElementSibling;if(!t||!t.classList.contains("horizontal"))return;'+
  'var w=(t.firstElementChild?t.firstElementChild.getBoundingClientRect().width:280)+15;'+
  't.scrollBy({left:w*Number(b.getAttribute("data-slide")),behavior:"smooth"});});});})();</script>';
export function referenceSalesPageHtml(d:SalesPageDraft,o:RenderOpts,theme:ReferenceTheme):string{
  const visuals=pageVisualAssets(d,theme);
  const heroImage=safeLink(d.imageUrl)?
    '<img loading="eager" src="'+esc(safeLink(d.imageUrl))+'" alt="'+esc(d.brand)+'">':img(visuals[0]);
  const hero='<header class="hero"><div class="wrap">'+tag(d.eyebrow)+
    '<h1>'+esc(d.headline)+'</h1>'+
    (theme==='clinic'?'<p>'+esc(d.subheadline)+'</p>':'')+
    '<div class="hero-img">'+heroImage+'</div>'+
    (theme==='agenda'?'<p>'+esc(d.subheadline)+'</p>':'')+
    gotoOffer(d)+'<p class="hint">Confira preços e condições reais antes de comprar.</p>'+
    '<ul class="hero-bullets">'+d.benefits.filter(Boolean).slice(0,5).map(x=>'<li>'+esc(x)+'</li>').join('')+
    '</ul></div></header>';
  const bridge='<section class="final"><div class="wrap">'+tag('VOCÊ PODE SIMPLIFICAR SUA ROTINA')+
    '<h2>'+esc(d.benefitsTitle)+'</h2><p>'+esc(d.finalBody)+'</p>'+gotoOffer(d)+'</div></section>';
  const end='<section class="final"><div class="wrap">'+tag('CONHEÇA A OFERTA')+
    '<h2>'+esc(d.finalTitle)+'</h2><p>'+esc(d.finalBody)+'</p>'+gotoOffer(d)+'</div></section>';
  const social=proof(d),problem=pain(d),preview=gallery(d,visuals,theme),steps=how(d,visuals),
    features=included(d),stories=splitVisuals(d,visuals),bonuses=bonus(d,visuals),
    plans=pricing(d,o),safe=guarantee(d),questions=faq(d);
  const order=theme==='clinic'?
    [preview,steps,problem,bridge,social,features,stories,bonuses,plans,safe,questions]:
    [social,problem,preview,steps,features,stories,bonuses,plans,safe,questions];
  const ribbon=d.topRibbon?.trim()?'<div class="ribbon">'+esc(d.topRibbon)+'</div>':'';
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
    '<meta name="description" content="'+esc(d.subheadline.slice(0,155))+'">'+
    '<title>'+esc(d.brand)+' | '+esc(d.headline)+'</title><style>'+css+'</style></head>'+
    '<body class="theme-'+theme+'">'+ribbon+hero+order.filter(Boolean).join('')+end+
    '<footer class="site-footer"><div class="wrap">'+esc(d.brand)+
    ' · Confira o conteúdo e as condições no checkout.</div></footer>'+
    '<div class="sticky">'+gotoOffer(d)+'</div>'+scripted+'</body></html>';
}
