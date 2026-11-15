import {NextResponse} from 'next/server';
import {z} from 'zod';
import {serverClient} from '@/lib/supabase/server';
import {resolve4} from 'node:dns/promises';
import {request as httpsRequest} from 'node:https';
import {isIP} from 'node:net';
export const runtime='nodejs';

const form=z.object({productId:z.string().uuid()}).strict();
const hits=new Map<string,{count:number;expires:number}>();
function allowedToCheck(id:string){
  const now=Date.now();const old=hits.get(id);
  if(!old||old.expires<now){hits.set(id,{count:1,expires:now+15*60*1000});return true;}
  if(old.count>=4)return false;old.count++;return true;
}
function safePublicIPv4(value:string){
  const n=value.split('.').map(Number);
  if(n.length!==4||n.some(x=>!Number.isInteger(x)||x<0||x>255))return false;
  const [a,b,c]=n;
  if(a===0||a===10||a===127||a>=224)return false;
  if(a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||
     a===100&&b>=64&&b<=127||a===198&&b>=18&&b<=19||
     a===192&&b===0||a===192&&b===0&&c===2||
     a===198&&b===51&&c===100||a===203&&b===0&&c===113)return false;
  return true;
}
async function inspectUrl(value:string){
  const u=new URL(value);
  const h=u.hostname.toLowerCase().replace(/\.$/,'');
  if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||
    isIP(h)!==0||!h.includes('.')||h.length>250||
    /(^|\.)(localhost|local|internal|test|invalid)$/.test(h)||
    /(^|\.)(localhost|local|internal|test|invalid)\./.test(h))
    throw new Error('Apenas links HTTPS públicos são aceitos para consulta.');
  const addresses=await resolve4(h);
  if(!addresses.length||addresses.some(a=>!safePublicIPv4(a)))
    throw new Error('O domínio não possui endereço público permitido.');
  return {url:u,ip:addresses[0]};
}
async function publicHtml(value:string,remaining=2):Promise<string>{
  const safe=await inspectUrl(value);
  return new Promise<string>((resolve,reject)=>{
    const lookup=((_hostname:string,options:any,callback:any)=>{
      if(options?.all)callback(null,[{address:safe.ip,family:4}]);
      else callback(null,safe.ip,4);
    });
    const req=httpsRequest(safe.url,{
      method:'GET',timeout:11000,lookup,
      headers:{'user-agent':'CacadorDeOfertasIA/1.0 (private manual research)',
        'accept':'text/html,application/xhtml+xml',
        'accept-encoding':'identity'}},res=>{
      const code=res.statusCode||0;
      if([301,302,303,307,308].includes(code)){
        const target=res.headers.location;
        res.resume();
        if(!target||remaining<=0){reject(new Error('Redirecionamentos demais ou link inválido.'));return;}
        let redirected='';
        try{redirected=new URL(target,safe.url).toString();}
        catch{reject(new Error('Redirecionamento inválido.'));return;}
        publicHtml(redirected,remaining-1).then(resolve,reject);
        return;
      }
      if(code!==200){res.resume();reject(new Error('A página de referência respondeu HTTP '+code+'. Cole a copy manualmente.'));return;}
      const kind=String(res.headers['content-type']||'');
      if(!/text\/html|application\/xhtml\+xml/i.test(kind)){
        res.resume();reject(new Error('O link não retornou uma página HTML.'));return;
      }
      const chunks:Buffer[]=[];let size=0;
      res.on('data',(chunk:Buffer)=>{
        size+=chunk.length;
        if(size>300000){req.destroy(new Error('Página grande demais para extrair.'));return;}
        chunks.push(chunk);
      });
      res.once('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
      res.once('error',reject);
    });
    req.once('timeout',()=>req.destroy(new Error('O site demorou para responder. Cole a copy manualmente.')));
    req.once('error',reject);
    req.end();
  });
}
function htmlToVisibleText(html:string){
  let content=html.replace(/<!--[\s\S]*?-->/g,' ')
    .replace(/<(script|style|noscript|svg|template|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
    .replace(/<(br|hr|\/p|\/div|\/h[1-6]|\/li|\/section|\/article|\/button)>/gi,'\n')
    .replace(/<[^>]*>/g,' ');
  const named:Record<string,string>={nbsp:' ',amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',ndash:'–',mdash:'—',hellip:'…',bull:'•',rsquo:'’',ldquo:'“',rdquo:'”'};
  content=content.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi,(_,entity:string)=>{
    const key=entity.toLowerCase();
    if(key.startsWith('#')){
      const numeric=key.startsWith('#x')?parseInt(key.slice(2),16):parseInt(key.slice(1),10);
      return numeric>0&&numeric<=0x10ffff?String.fromCodePoint(numeric):' ';
    }
    return named[key]||' ';
  });
  const lines=content.split('\n').map(line=>line.replace(/\s+/g,' ').trim())
    .filter(line=>line.length>=8&&line.length<=1000);
  const unique=[...new Set(lines)];
  return unique.join('\n').slice(0,7000);
}
export async function POST(req:Request){
  if(Number(req.headers.get('content-length')||0)>1500)return NextResponse.json({error:'Solicitação grande demais.'},{status:413});
  let input:z.infer<typeof form>;
  try{input=form.parse(await req.json());}
  catch{return NextResponse.json({error:'Selecione um produto válido.'},{status:400});}
  const supabase=await serverClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return NextResponse.json({error:'Faça login novamente.'},{status:401});
  if(!allowedToCheck(user.id))return NextResponse.json({error:'Limite de 4 leituras a cada 15 minutos atingido.'},{status:429});
  const {data:p,error:productError}=await supabase.from('products')
    .select('landing_url').eq('id',input.productId).eq('user_id',user.id).single();
  if(productError||!p)return NextResponse.json({error:'Produto não encontrado.'},{status:404});
  if(!p.landing_url)return NextResponse.json({error:'Cadastre o link da página concorrente no dossiê.'},{status:400});
  try{
    const html=await publicHtml(p.landing_url);
    const text=htmlToVisibleText(html);
    if(text.length<80)return NextResponse.json({
      error:'A página não forneceu texto legível (pode carregar via JavaScript ou bloquear robôs). Cole a copy manualmente.'},{status:422});
    return NextResponse.json({text,source:'Texto HTML público extraído sob demanda. Confira antes de usar como referência.'},
      {headers:{'Cache-Control':'no-store'}});
  }catch(e){
    const msg=e instanceof Error?e.message:'O site não pôde ser consultado.';
    return NextResponse.json({error:msg},{status:422});
  }
}
