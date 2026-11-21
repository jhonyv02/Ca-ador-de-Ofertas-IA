import {NextResponse} from 'next/server';
import {z} from 'zod';
import type {Analysis} from '@/lib/types';
import {serverClient} from '@/lib/supabase/server';
import {runOfferAnalysis} from '@/lib/openai-analysis';
import {researchMonitor,researchProgress,canRecommendTest,researchDecision} from '@/lib/research-pipeline';

export const runtime='nodejs';
const schema=z.object({product_id:z.string().uuid()}).strict();
export async function POST(req:Request){
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'OPENAI_API_KEY não configurada.'},{status:503});
  if(Number(req.headers.get('content-length')||0)>1000)return NextResponse.json({error:'Corpo muito grande.'},{status:413});
  let body:z.infer<typeof schema>;
  try{body=schema.parse(await req.json());}catch{return NextResponse.json({error:'ID da oferta inválido.'},{status:400});}
  const supabase=await serverClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return NextResponse.json({error:'Faça login novamente.'},{status:401});
  const {data:product,error:productError}=await supabase.from('products').select('id,status')
    .eq('id',body.product_id).eq('user_id',user.id).maybeSingle();
  if(productError||!product)return NextResponse.json({error:'Oferta não encontrada.'},{status:404});
  const result=await runOfferAnalysis({supabase,userId:user.id,productId:body.product_id,locale:'pt-BR',audit:true});
  if(!result.ok)return NextResponse.json({error:result.error},{status:result.status});
  const {data:logs,error:logError}=await supabase.from('analyses').select('*')
    .eq('product_id',body.product_id).eq('user_id',user.id).eq('kind','product')
    .eq('model','Grok Monitor').order('created_at',{ascending:false}).limit(120);
  if(logError)return NextResponse.json({error:'Auditoria salva, mas histórico indisponível.'},{status:500});
  const monitor=(logs||[]) as Analysis[];
  const until=monitor.map(researchMonitor).find(a=>a?.monitor_until)?.monitor_until||'';
  const progress=researchProgress(monitor,until);
  const eligible=canRecommendTest(result.analysis,progress);
  let promoted=false;
  if(eligible&&product.status==='researching'){
    const {error:changeError}=await supabase.from('products').update({status:'ready'})
      .eq('id',product.id).eq('user_id',user.id);
    if(changeError)return NextResponse.json({error:'Auditoria salva, mas não foi possível mudar o status.'},{status:500});
    promoted=true;
  }
  return NextResponse.json({ok:true,analysis_id:result.analysis.id,score:result.analysis.score,
    verdict:result.analysis.verdict,promoted,
    days_observed:progress.days,monitor_until:until,funnel:researchDecision(result.analysis)?.funnel||'undecided',
  },{headers:{'Cache-Control':'no-store'}});
}
