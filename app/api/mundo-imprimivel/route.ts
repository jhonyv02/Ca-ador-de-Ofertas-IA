import {NextResponse} from 'next/server';
import {z} from 'zod';
import {serverClient} from '@/lib/supabase/server';
import {isPrintableOffer} from '@/lib/printable-eligibility';
import type {Product} from '@/lib/types';

export const runtime='nodejs';
const id=z.string().uuid();
const slug=z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/);
const https=z.string().url().refine(v=>v.startsWith('https://'),'Somente HTTPS');
const optionalHttps=z.union([https,z.literal('')]);
const pageSchema=z.object({
  slug,title:z.string().min(8).max(150),
  subtitle:z.string().max(450).default(''),
  description:z.string().max(1600).default(''),
  price_brl:z.number().finite().positive().max(100000),
  hero_image_url:optionalHttps.default(''),
  gallery:z.array(https).max(10).default([]),
  bullets:z.array(z.string().min(1).max(220)).max(12).default([]),
  faqs:z.array(z.object({question:z.string().min(1).max(180),
    answer:z.string().min(1).max(550)}).strict()).max(8).default([]),
  checkout_url:optionalHttps.default('')
}).strict();
const checks=z.object({pdf:z.literal(true),images:z.literal(true),
  checkout:z.literal(true),delivery:z.literal(true),pixel:z.literal(true)}).strict();
const requestSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('draft'),productId:id,page:pageSchema}).strict(),
  z.object({action:z.literal('preview'),productId:id,slug}).strict(),
  z.object({action:z.literal('approve'),productId:id,slug,checks}).strict()
]);
const siteBase='https://mundoimprimivel.online';

export async function POST(req:Request){
  if(Number(req.headers.get('content-length')||0)>120000){
    return NextResponse.json({error:'Dados de publicação grandes demais.'},{status:413});
  }
  let input:z.infer<typeof requestSchema>;
  try{input=requestSchema.parse(await req.json());}
  catch{return NextResponse.json({error:'Confira os dados da página e a ação solicitada.'},{status:400});}
  const supabase=await serverClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){
    return NextResponse.json({error:'Faça login no Caçador.'},{status:401});
  }
  const {data:product,error:productError}=await supabase.from('products')
    .select('*').eq('id',input.productId).eq('user_id',user.id).maybeSingle();
  if(productError||!product){
    return NextResponse.json({error:'Oferta não encontrada na sua conta.'},{status:404});
  }
  if(!isPrintableOffer(product as Product)){
    return NextResponse.json({error:'Esta operação publica apenas produtos digitais imprimíveis.'},{status:409});
  }
  if(input.action==='draft'){
    const {data:analysis,error:analysisError}=await supabase.from('analyses')
      .select('score,confidence,verdict,blockers').eq('user_id',user.id).eq('product_id',input.productId)
      .eq('kind','openai_audit').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(analysisError)return NextResponse.json({error:'Não foi possível consultar a auditoria.'},{status:503});
    if(!analysis||analysis.score<85||analysis.confidence==='low'||analysis.verdict!=='approve'||
      (Array.isArray(analysis.blockers)&&analysis.blockers.length>0)){
      return NextResponse.json({error:'Auditoria OpenAI não liberou a construção: precisa nota >=85, confiança média/alta, parecer aprovado e nenhum bloqueio grave. A nota não é probabilidade de venda.'},{status:409});
    }
  }
  const token=input.action==='approve'?
    process.env.MI_APPROVAL_TOKEN:process.env.MI_PUBLISH_TOKEN;
  if(!token||token.length<32){
    return NextResponse.json({error:'Publicador Mundo Imprimível ainda não configurado no servidor.'},{status:503});
  }
  const endpoint=input.action==='draft'?'offer.php':input.action==='preview'?'preview.php':'approve.php';
  const payload=input.action==='draft'?
    {...input.page,offer_id:input.productId}:
    input.action==='preview'?{slug:input.slug,offer_id:input.productId}:
    {slug:input.slug,offer_id:input.productId,checks:input.checks};
  let response:Response;
  try{
    response=await fetch(siteBase+'/api/'+endpoint,{
      method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(18000)
    });
  }catch{
    return NextResponse.json({error:'O publicador do Mundo Imprimível não respondeu. Confira domínio, SSL e API.'},{status:502});
  }
  let answer:Record<string,unknown>;
  try{answer=await response.json() as Record<string,unknown>;}
  catch{return NextResponse.json({error:'O publicador devolveu uma resposta inválida.'},{status:502});}
  if(!response.ok){
    return NextResponse.json({error:typeof answer.error==='string'?answer.error:'Publicador não concluiu a operação.'},
      {status:response.status>=400&&response.status<500?response.status:502});
  }
  return NextResponse.json(answer,{headers:{'Cache-Control':'no-store'}});
}
