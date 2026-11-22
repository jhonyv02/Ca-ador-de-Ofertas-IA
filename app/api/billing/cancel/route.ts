import {NextResponse} from 'next/server';
import {serverClient} from '@/lib/supabase/server';
import {mpApi,subscriptionRowForUser,syncMercadoPagoSubscription} from '@/lib/billing/mercadopago';

export const runtime='nodejs';
export async function POST(request:Request){
  const allowed=process.env.NEXT_PUBLIC_SITE_URL;
  if(!allowed||request.headers.get('origin')!==new URL(allowed).origin)
    return NextResponse.json({error:'Origem inválida.'},{status:403});
  const client=await serverClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:'Entre em sua conta.'},{status:401});
  try{
    const row=await subscriptionRowForUser(user.id);
    if(!row?.provider_subscription_id || row.provider!=='mercadopago')
      return NextResponse.json({error:'Nenhuma assinatura Mercado Pago encontrada.'},{status:404});
    const id=row.provider_subscription_id;
    const remote=await mpApi('/preapproval/'+encodeURIComponent(id));
    if(remote.external_reference!=='cacador:'+user.id)
      return NextResponse.json({error:'Assinatura inválida.'},{status:403});
    if(remote.status!=='canceled'&&remote.status!=='cancelled')
      await mpApi('/preapproval/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({status:'canceled'})});
    const result=await syncMercadoPagoSubscription(id);
    return NextResponse.json({canceled:true,status:result.status,currentPeriodEnd:result.currentPeriodEnd});
  }catch(e){
    console.error('MP cancellation:',e instanceof Error?e.message:'erro');
    return NextResponse.json({error:'Não foi possível cancelar. Contate o suporte.'},{status:503});
  }
}
