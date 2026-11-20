import {NextResponse} from 'next/server';
import {z} from 'zod';
import {configuredWebhookSecret,webhookAuthorized} from '@/lib/push-payload';
import {serviceClient} from '@/lib/supabase/admin';
import {runWeeklyDirect} from '@/lib/weekly-direct';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const schema=z.object({
  user_id:z.string().uuid(),
  daily_budget:z.number().finite().min(5).max(5000).optional(),
}).strict();

export async function POST(req:Request){
  const secret=configuredWebhookSecret(process.env.ANALYZE_WEBHOOK_SECRET);
  if(!process.env.OPENAI_API_KEY||!secret){
    return NextResponse.json({error:'Decisão semanal indisponível: configure OPENAI_API_KEY e ANALYZE_WEBHOOK_SECRET no servidor.'},{status:503});
  }
  if(!webhookAuthorized(req.headers.get('authorization'),secret)){
    return NextResponse.json({error:'Não autorizado.'},{status:401});
  }
  if(Number(req.headers.get('content-length')||0)>8000)return NextResponse.json({error:'Solicitação muito grande.'},{status:413});
  let body:z.infer<typeof schema>;
  try{body=schema.parse(await req.json());}
  catch{return NextResponse.json({error:'Payload inválido. Envie user_id e, se quiser, daily_budget entre 5 e 5000.'},{status:400});}
  let admin;
  try{admin=serviceClient();}
  catch{return NextResponse.json({error:'SUPABASE_SERVICE_ROLE_KEY ausente no servidor.'},{status:503});}
  const dailyBudget=body.daily_budget??35;
  const result=await runWeeklyDirect({supabase:admin,userId:body.user_id,dailyBudget});
  if(!result.ok)return NextResponse.json({error:result.error},{status:result.status});
  const report=result.body.report;
  const picksProduct=report.decision==='launch_one'||report.decision==='prepare_one';
  const productId=picksProduct&&report.selected_product_id?report.selected_product_id:null;
  const {data:saved,error:saveError}=await admin.from('weekly_decisions').insert({
    user_id:body.user_id,
    decision:report.decision,
    product_id:productId,
    rationale:(report.reason_to_choose||report.diagnosis||'').slice(0,4000),
    risks:report.weak_points,
    payload:result.body,
    model:result.body.model,
  }).select('id').single();
  if(saveError||!saved){
    console.error('Save weekly decision',saveError);
    const detail=saveError?.message||'';
    const hint=/weekly_decisions|schema cache|PGRST/i.test(detail)
      ? ' Rode supabase/upgrade-auditoria-openai.sql.'
      : '';
    return NextResponse.json({error:'Parecer gerado, mas não foi possível gravá-lo.'+hint},{status:500});
  }
  let weeklyPickUpdated=false;
  if(productId){
    const {error:pickError}=await admin.from('products').update({weekly_pick:true}).eq('id',productId).eq('user_id',body.user_id);
    if(pickError){
      console.error('Weekly pick',pickError);
      return NextResponse.json({
        ...result.body,decision_id:saved.id,weekly_pick_updated:false,
        warning:'A decisão foi gravada, mas a escolha da semana não foi marcada.',
      },{status:200,headers:{'Cache-Control':'no-store'}});
    }
    weeklyPickUpdated=true;
  }
  return NextResponse.json({
    ...result.body,decision_id:saved.id,weekly_pick_updated:weeklyPickUpdated,
  },{headers:{'Cache-Control':'no-store'}});
}
