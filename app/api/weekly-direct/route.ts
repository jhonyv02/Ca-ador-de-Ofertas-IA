import {NextResponse} from 'next/server';
import {z} from 'zod';
import {serverClient} from '@/lib/supabase/server';
import {runWeeklyDirect} from '@/lib/weekly-direct';

export const runtime='nodejs';
const inputSchema=z.object({dailyBudget:z.number().finite().min(5).max(5000)}).strict();
const buckets=new Map<string,{count:number;expires:number}>();
function underLimit(id:string){
  const now=Date.now();
  const state=buckets.get(id);
  if(!state||state.expires<now){buckets.set(id,{count:1,expires:now+15*60*1000});return true;}
  if(state.count>=3)return false;
  state.count++;
  return true;
}
export async function POST(req:Request){
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({
    error:'A análise crítica por IA está indisponível: configure OPENAI_API_KEY no servidor.'},{status:503});
  if(Number(req.headers.get('content-length')||0)>2000)return NextResponse.json({error:'Solicitação muito grande.'},{status:413});
  let input:z.infer<typeof inputSchema>;
  try{input=inputSchema.parse(await req.json());}
  catch{return NextResponse.json({error:'Informe orçamento diário válido entre R$ 5 e R$ 5.000.'},{status:400});}
  const supabase=await serverClient();
  const {data:{user},error:authErr}=await supabase.auth.getUser();
  if(authErr||!user)return NextResponse.json({error:'Faça login para analisar as ofertas.'},{status:401});
  if(!underLimit(user.id))return NextResponse.json({error:'Limite de 3 análises a cada 15 minutos atingido.'},{status:429});
  const result=await runWeeklyDirect({supabase,userId:user.id,dailyBudget:input.dailyBudget});
  if(!result.ok)return NextResponse.json({error:result.error},{status:result.status});
  return NextResponse.json(result.body,{headers:{'Cache-Control':'no-store'}});
}
