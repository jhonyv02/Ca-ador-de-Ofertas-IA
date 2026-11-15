import http from 'node:http';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {chromium} from 'playwright';
import {assertPublicUrl} from './security.mjs';

const token=process.env.BROWSER_WORKER_TOKEN||'';
if(token.length<32)throw Error('Configure BROWSER_WORKER_TOKEN com pelo menos 32 caracteres.');
const PORT=Number(process.env.PORT||8765);
const sessions=new Map();
const TTL=15*60_000;
let browser;
const now=()=>Date.now();
const send=(res,status,data)=>{
  res.writeHead(status,{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(JSON.stringify(data));
};
function authorized(auth){
  const raw=auth?.startsWith('Bearer ')?auth.slice(7):'';
  const a=Buffer.from(raw),b=Buffer.from(token);
  return a.length===b.length&&timingSafeEqual(a,b);
}
async function close(s){
  sessions.delete(s.id);
  try{await s.context.close();}catch{}
}
function expire(){
  for(const s of sessions.values())if(now()-s.accessed>TTL)void close(s);
}
setInterval(expire,60_000).unref();
async function newSession(owner,mobile){
  for(const s of sessions.values())if(s.owner===owner)await close(s);
  expire();
  if(sessions.size>=2)throw Error('O navegador já possui duas sessões ativas.');
  if(!browser?.isConnected())browser=await chromium.launch({headless:true,
    args:['--disable-dev-shm-usage','--no-first-run']});
  let requestCount=0;
  const width=mobile?390:1100,height=mobile?844:760;
  const context=await browser.newContext({viewport:{width,height},
    locale:'pt-BR',deviceScaleFactor:1,acceptDownloads:false,
    serviceWorkers:'block',permissions:[],ignoreHTTPSErrors:false});
  await context.route('**/*',async route=>{
    try{
      const target=route.request().url();
      if(!target.startsWith('https://')||++requestCount>350)throw Error('blocked');
      await assertPublicUrl(target);
      await route.continue();
    }catch{try{await route.abort('blockedbyclient');}catch{}}
  });
  await context.routeWebSocket('**/*',ws=>ws.close());
  const page=await context.newPage();
  page.setDefaultTimeout(6000);
  page.on('dialog',dialog=>{void dialog.dismiss().catch(()=>{});});
  page.on('popup',popup=>{void popup.close().catch(()=>{});});
  const s={id:randomUUID(),owner,mobile,context,page,accessed:now(),reset(){requestCount=0;}};
  sessions.set(s.id,s);
  return s;
}
function owned(owner,id){
  const s=sessions.get(id);
  if(!s||s.owner!==owner||now()-s.accessed>TTL)throw Error('Sessão encerrada. Inicie uma nova.');
  s.accessed=now();return s;
}
async function moveTo(s,value){
  const u=await assertPublicUrl(value);
  s.reset();
  await s.page.goto(u.href,{waitUntil:'domcontentloaded',timeout:23000});
  await s.page.waitForTimeout(450);
}
async function screenshot(s){
  const shot=await s.page.screenshot({type:'jpeg',quality:60,timeout:13000,animations:'disabled'});
  return {sessionId:s.id,url:s.page.url()==='about:blank'?'':s.page.url(),
    title:(await s.page.title().catch(()=>'' )).slice(0,150),
    image:shot.toString('base64'),width:s.mobile?390:1100,height:s.mobile?844:760};
}
async function capture(s){
  const page=s.page;
  const found=await page.evaluate(()=>{
    const tidy=(str)=>String(str||'').replace(/\s+/g,' ').trim();
    const title=tidy(document.querySelector('h1')?.textContent)||document.title||'';
    const description=document.querySelector('meta[name="description"]')?.getAttribute('content')||'';
    const body=(document.body?.innerText||'').slice(0,12000);
    const structured=[];
    for(const el of document.querySelectorAll('script[type="application/ld+json"]')){
      try{
        const obj=JSON.parse(el.textContent||'null');
        const walk=(v,depth=0)=>{
          if(!v||depth>7)return;
          if(Array.isArray(v)){v.slice(0,15).forEach(item=>walk(item,depth+1));return;}
          if(typeof v!=='object')return;
          const kind=String(v['@type']||'').toLowerCase();
          if(kind.includes('offer')&&v.price!==undefined)structured.push({
            value:String(v.price).slice(0,24),currency:String(v.priceCurrency||'').slice(0,3)});
          if(v.offers)walk(v.offers,depth+1);
          if(v['@graph'])walk(v['@graph'],depth+1);
        };
        walk(obj);
      }catch{}
    }
    const prices=[...new Set([...body.matchAll(/(R\$\s?[\d.]+(?:,\d{2})?|\$\s?\d+(?:[,.]\d{2})?|€\s?\d+(?:[,.]\d{2})?)/g)].slice(0,25).map(m=>m[0]))].slice(0,8);
    const ctas=[...document.querySelectorAll('a,button')].map(a=>tidy(a.textContent))
      .filter(x=>x.length>3&&x.length<70&&/compr|garant|quero|baix|acess|adquir|inscre|buy|obten/i.test(x)).slice(0,10);
    const links=[...document.querySelectorAll('a[href]')].map(a=>({
      label:tidy(a.textContent).slice(0,65),url:a.href
    })).filter(a=>a.url.startsWith('https://')&&
      /hotmart|kiwify|eduzz|checkout|pay\.|compra|monetizze/i.test(a.url+' '+a.label)).slice(0,8);
    return {title:title.slice(0,150),description:description.slice(0,500),
      excerpt:body.slice(0,6500),structuredPrices:structured.slice(0,4),
      prices,ctas,links,lang:(document.documentElement.lang||'').slice(0,15)};
  });
  let screenshotBytes,partial=false;
  try{
    screenshotBytes=await page.screenshot({type:'jpeg',fullPage:true,quality:55,timeout:18000});
    if(screenshotBytes.length>4_000_000)throw Error('large');
  }catch{
    screenshotBytes=await page.screenshot({type:'jpeg',quality:60,timeout:13000});
    partial=true;
  }
  return {...found,url:page.url(),capturedAt:new Date().toISOString(),
    screenshot:screenshotBytes.toString('base64'),partialScreenshot:partial};
}
async function handle(data){
  const owner=data?.owner;
  if(typeof owner!=='string'||!/^[0-9a-f-]{36}$/i.test(owner))throw Error('Usuário inválido.');
  if(data.command==='open'){
    const s=await newSession(owner,data.mobile!==false);
    if(data.url)try{await moveTo(s,data.url);}catch(e){await close(s);throw e;}
    return screenshot(s);
  }
  const s=owned(owner,data.sessionId);
  const cmd=data.command;
  if(cmd==='close'){await close(s);return {closed:true};}
  if(cmd==='navigate'){
    if(typeof data.url!=='string')throw Error('Digite o endereço da página.');
    await moveTo(s,data.url);
  }else if(cmd==='back'){
    s.reset();await s.page.goBack({waitUntil:'domcontentloaded',timeout:16000}).catch(()=>null);
  }else if(cmd==='forward'){
    s.reset();await s.page.goForward({waitUntil:'domcontentloaded',timeout:16000}).catch(()=>null);
  }else if(cmd==='refresh'){
    s.reset();await s.page.reload({waitUntil:'domcontentloaded',timeout:16000});
  }else if(cmd==='scroll'){
    await s.page.mouse.wheel(0,Math.max(-1400,Math.min(1400,Number(data.delta)||0)));
    await s.page.waitForTimeout(250);
  }else if(cmd==='click'){
    const x=Number(data.x),y=Number(data.y),w=s.mobile?390:1100,h=s.mobile?844:760;
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>w||y>h)
      throw Error('Clique fora da página.');
    await s.page.mouse.click(x,y,{timeout:4000});
    await s.page.waitForTimeout(300);
  }else if(cmd==='type'){
    if(typeof data.text!=='string'||data.text.length>350)throw Error('Texto inválido.');
    await s.page.keyboard.type(data.text,{delay:3});
  }else if(cmd==='press'){
    if(!['Enter','Tab','Escape','Backspace'].includes(data.key))throw Error('Tecla não permitida.');
    await s.page.keyboard.press(data.key);
  }else if(cmd==='capture'){
    if(!s.page.url().startsWith('https://'))throw Error('Abra uma página primeiro.');
    return {sessionId:s.id,capture:await capture(s)};
  }else if(cmd!=='frame')throw Error('Comando inválido.');
  return screenshot(s);
}
http.createServer(async(req,res)=>{
  if(!authorized(req.headers.authorization))return send(res,401,{error:'Acesso negado.'});
  if(req.method==='GET'&&req.url==='/health')return send(res,200,{ok:true,sessions:sessions.size});
  if(req.method!=='POST'||req.url!=='/action')return send(res,404,{error:'Rota desconhecida.'});
  let body='';
  try{
    for await(const piece of req){
      body+=piece.toString('utf8');
      if(body.length>4000)throw Error('Requisição muito grande.');
    }
    const result=await handle(JSON.parse(body));
    return send(res,200,result);
  }catch(e){
    console.error('Browser action error:',e?.message);
    return send(res,422,{error:String(e?.message||'Navegação indisponível.').slice(0,240)});
  }
}).listen(Number(process.env.PORT||8765),'0.0.0.0',
  ()=>console.log('Browser worker ativo em '+(process.env.PORT||8765)));
