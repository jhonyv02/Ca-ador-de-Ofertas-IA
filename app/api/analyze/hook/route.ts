import {NextResponse} from 'next/server';
import {z} from 'zod';
import {runOfferAnalysis} from '@/lib/openai-analysis';
import {configuredWebhookSecret,webhookAuthorized} from '@/lib/push-payload';
import {serviceClient} from '@/lib/supabase/admin';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const schema=z.object({
  product_id:z.string().uuid(),
  user_id:z.string().uuid(),
}).strict();

export async function POST(req:Request){
  const secret=configuredWebhookSecret(process.env.ANALYZE_WEBHOOK_SECRET);
  if(!process.env.OPENAI_API_KEY||!secret){
    return NextResponse.json({error:'Auditoria indisponível: configure OPENAI_API_KEY e ANALYZE_WEBHOOK_SECRET no servidor.'},{status:503});
  }
  if(!webhookAuthorized(req.headers.get('authorization'),secret)){
    return NextResponse.json({error:'Não autorizado.'},{status:401});
  }
  const contentLength=Number(req.headers.get('content-length')||0);
  if(contentLength>8000)return NextResponse.json({error:'Solicitação grande demais.'},{status:413});
  let body:z.infer<typeof schema>;
  try{body=schema.parse(await req.json());}catch{return NextResponse.json({error:'Payload inválido.'},{status:400});}
  let admin;
  try{admin=serviceClient();}
  catch{return NextResponse.json({error:'SUPABASE_SERVICE_ROLE_KEY ausente no servidor.'},{status:503});}
  const result=await runOfferAnalysis({
    supabase:admin,userId:body.user_id,productId:body.product_id,locale:'pt-BR',audit:true,
  });
  if(!result.ok)return NextResponse.json({error:result.error},{status:result.status});
  const analysis=result.analysis;
  const blockers=Array.isArray(analysis.blockers)?analysis.blockers:[];
  return NextResponse.json({
    analysis_id:analysis.id,
    score:analysis.score,
    confidence:analysis.confidence,
    verdict:analysis.verdict??null,
    blockers,
    summary:analysis.summary,
  },{headers:{'Cache-Control':'no-store'}});
}
