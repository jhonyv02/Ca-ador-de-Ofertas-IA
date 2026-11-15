import {NextResponse} from 'next/server';
import {z} from 'zod';
import {serverClient} from '@/lib/supabase/server';

export const runtime='nodejs';
const requestSchema=z.object({
  command:z.enum(['open','navigate','frame','back','forward','refresh','scroll','click','type','press','capture','close']),
  sessionId:z.string().uuid().optional(),
  url:z.string().max(1800).optional(),
  mobile:z.boolean().optional(),
  x:z.number().min(0).max(1100).optional(),
  y:z.number().min(0).max(844).optional(),
  delta:z.number().min(-1400).max(1400).optional(),
  text:z.string().max(350).optional(),
  key:z.enum(['Enter','Tab','Escape','Backspace']).optional()
}).strict();
const getWorkerConfig=()=>{
  const url=(process.env.BROWSER_WORKER_URL||'').replace(/\/+$/,'');
  const token=process.env.BROWSER_WORKER_TOKEN||'';
  if(!url||token.length<32)return null;
  try{
    const u=new URL(url);
    if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))
      return null;
    if(u.username||u.password||u.search||u.hash)return null;
    return {url,token};
  }catch{return null;}
};
async function invoke(command:Record<string,unknown>,timeoutMs:number){
  const cfg=getWorkerConfig();
  if(!cfg)throw Error('Navegador ainda não conectado à VPS. Configure BROWSER_WORKER_URL e BROWSER_WORKER_TOKEN no servidor.');
  let response:Response;
  try{
    response=await fetch(cfg.url+'/action',{method:'POST',headers:{
      'content-type':'application/json','authorization':'Bearer '+cfg.token},
      body:JSON.stringify(command),signal:AbortSignal.timeout(timeoutMs),cache:'no-store'});
  }catch{throw Error('Navegador da VPS não respondeu. Confira o serviço, o HTTPS e a conexão.');}
  let body:Record<string,unknown>;
  try{
    const t=await response.text();
    if(t.length>8_000_000)throw Error('Resposta muito grande.');
    body=JSON.parse(t);
  }catch{throw Error('Resposta inválida recebida do navegador.');}
  if(!response.ok)throw Error(String(body.error||'Não foi possível navegar.').slice(0,280));
  return body;
}
function readImportPrice(data:Record<string,unknown>){
  const raw=Array.isArray(data.structuredPrices)?data.structuredPrices:[];
  const candidates=raw.filter((v):v is {value:string;currency:string}=>{
    if(!v||typeof v!=='object')return false;
    const r=v as Record<string,unknown>;
    return typeof r.value==='string'&&typeof r.currency==='string'&&
      /^[A-Z]{3}$/.test(r.currency)&&/^\d{1,7}(?:[.,]\d{1,2})?$/.test(r.value);
  });
  const unique=[...new Set(candidates.map(c=>c.currency+':'+c.value))];
  if(unique.length!==1)return {price:null as number|null,currency:'BRL'};
  const c=candidates[0];
  const price=Number(c.value.replace(',','.'));
  return {price:Number.isFinite(price)&&price>0&&price<1_000_000?price:null,currency:c.currency};
}
async function importCapture(userId:string,data:Record<string,unknown>,
  supabase:Awaited<ReturnType<typeof serverClient>>){
  const cap=data.capture;
  if(!cap||typeof cap!=='object')throw Error('Nenhuma captura de página foi recebida.');
  const a=cap as Record<string,unknown>;
  const address=String(a.url||'');
  let u:URL;
  try{u=new URL(address);}catch{throw Error('A captura não tem URL válida.');}
  if(u.protocol!=='https:')throw Error('Somente páginas HTTPS podem ser salvas.');
  const title=String(a.title||'Oferta sem título').replace(/\s+/g,' ').trim().slice(0,150)||'Oferta pesquisada';
  const price=readImportPrice(a);
  const photos=Array.isArray(a.prices)?a.prices.filter(x=>typeof x==='string').slice(0,7).join(', '):'';
  const sourcePrices=Array.isArray(a.structuredPrices)?JSON.stringify(a.structuredPrices).slice(0,350):'';
  const links=Array.isArray(a.links)?a.links.slice(0,5).map(x=>{
    const l=x as Record<string,unknown>;
    return String(l.url||'').slice(0,350);
  }).join('\n'):'';
  const capturedAt=String(a.capturedAt||new Date().toISOString()).slice(0,36);
  const notes=[
    '#navegador-cacador',
    'Captura manual da página em '+capturedAt,
    'O preço é extraído automaticamente e precisa de conferência.',
    'Nenhuma venda ou anúncio ativo foi comprovado nesta captura.',
    'Preços visíveis: '+(photos||'não localizados'),
    'Preço estruturado: '+(sourcePrices||'não encontrado'),
    'Links de possível checkout (do concorrente, NÃO usar no seu produto autoral):\n'+(links||'não localizados'),
    'Trecho público: '+String(a.excerpt||'').slice(0,1550)
  ].join('\n').slice(0,4400);
  const {data:existing,error:findError}=await supabase.from('products')
    .select('id,notes').eq('user_id',userId).eq('landing_url',u.href).limit(1).maybeSingle();
  if(findError)throw Error('Não foi possível verificar duplicações: '+findError.message);
  let id:string;
  if(existing){
    id=existing.id;
  }else{
    const row={user_id:userId,name:title,niche:'A classificar',product_type:'digital',
      country:'A confirmar',language:String(a.lang||'pt-BR').slice(0,15)||'pt-BR',
      currency:price.currency,sale_price:price.price,fulfillment_cost:null,extra_cost:null,
      landing_url:u.href,checkout_url:'',landing_copy:'',promise:String(a.description||title).slice(0,900),
      target_audience:'',notes,status:'researching'};
    const {data:created,error}=await supabase.from('products').insert(row).select('id').single();
    if(error||!created)throw Error('Não foi possível importar o produto: '+(error?.message||'resposta vazia'));
    id=created.id;
  }
  let screenshotUrl='';
  let warning='';
  const b64=String(a.screenshot||'');
  if(b64&&b64.length<6_000_000){
    const buffer=Buffer.from(b64,'base64');
    if(buffer.length>0&&buffer.length<4_500_000){
      const path=userId+'/'+id+'/captura-'+Date.now()+'.jpg';
      const {error:storageError}=await supabase.storage.from('creatives')
        .upload(path,buffer,{contentType:'image/jpeg',upsert:false});
      if(!storageError){
        const {data:signed}=await supabase.storage.from('creatives').createSignedUrl(path,3600);
        screenshotUrl=signed?.signedUrl||'';
        const notePath='Print privado (Supabase creatives): '+path;
        const all=[existing?.notes||notes,notePath].filter(Boolean).join('\n').slice(0,4900);
        const {error:saveError}=await supabase.from('products')
          .update({notes:all}).eq('id',id).eq('user_id',userId);
        if(saveError)warning='A oferta foi salva, mas o caminho do print não pôde ser anotado.';
      }else warning='A oferta foi salva, mas o print não foi armazenado. Confira o bucket privado creatives.';
    }
  }
  if(!screenshotUrl&&!warning)warning='A oferta foi salva, mas não foi possível guardar a imagem completa.';
  return {productId:id,alreadyExists:!!existing,screenshotUrl,warning,
    extracted:{title,price:price.price,currency:price.currency,url:u.href,
      visiblePrices:photos},partialScreenshot:!!a.partialScreenshot};
}
export async function GET(){
  const supabase=await serverClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Entre no Caçador.'},{status:401});
  const cfg=getWorkerConfig();
  if(!cfg)return NextResponse.json({configured:false,
    message:'O código do navegador está pronto, mas falta conectar o serviço na VPS.'});
  try{
    const r=await fetch(cfg.url+'/health',{headers:{authorization:'Bearer '+cfg.token},
      signal:AbortSignal.timeout(5000),cache:'no-store'});
    if(!r.ok)throw Error('indisponível');
    return NextResponse.json({configured:true,online:true});
  }catch{return NextResponse.json({configured:true,online:false,
    message:'Serviço de navegação na VPS não está respondendo.'});}
}
export async function POST(req:Request){
  if(Number(req.headers.get('content-length')||0)>5000)
    return NextResponse.json({error:'Requisição muito grande.'},{status:413});
  let input:z.infer<typeof requestSchema>;
  try{input=requestSchema.parse(await req.json());}
  catch{return NextResponse.json({error:'Comando do navegador inválido.'},{status:400});}
  const supabase=await serverClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return NextResponse.json({error:'Faça login novamente.'},{status:401});
  if(input.command!=='open'&&!input.sessionId)
    return NextResponse.json({error:'Abra uma sessão primeiro.'},{status:400});
  try{
    const result=await invoke({...input,owner:user.id},input.command==='capture'?65000:35000);
    if(input.command==='capture'){
      const saved=await importCapture(user.id,result,supabase);
      return NextResponse.json(saved,{headers:{'Cache-Control':'no-store'}});
    }
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Navegador indisponível.'},{status:422});}
}
