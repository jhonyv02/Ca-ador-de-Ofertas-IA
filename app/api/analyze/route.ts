import {NextResponse} from 'next/server';
import {z} from 'zod';
import {runOfferAnalysis} from '@/lib/openai-analysis';
import {serverClient} from '@/lib/supabase/server';

export const runtime='nodejs';
const schema=z.object({
  productId:z.string().uuid(),
  adId:z.string().uuid().optional(),
  locale:z.string().regex(/^[a-z]{2,8}(?:-[A-Za-z0-9]{2,8})*$/i).max(35).optional(),
}).strict();

export async function POST(req:Request){
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'Configure OPENAI_API_KEY no servidor para habilitar a análise IA.'},{status:503});
  const contentLength=Number(req.headers.get('content-length')||0);
  if(contentLength>16000)return NextResponse.json({error:'Solicitação grande demais.'},{status:413});
  let body:z.infer<typeof schema>;
  try{body=schema.parse(await req.json());}catch{return NextResponse.json({error:'IDs inválidos.'},{status:400});}
  const supabase=await serverClient();
  const {data:{user},error:authErr}=await supabase.auth.getUser();
  if(authErr||!user)return NextResponse.json({error:'Sessão expirada. Entre novamente.'},{status:401});
  const result=await runOfferAnalysis({
    supabase,userId:user.id,productId:body.productId,adId:body.adId,locale:body.locale,audit:false,
  });
  if(!result.ok)return NextResponse.json({error:result.error},{status:result.status});
  return NextResponse.json({analysis:result.analysis});
}
