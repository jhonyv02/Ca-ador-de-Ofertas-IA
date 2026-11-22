import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { serverClient } from '@/lib/supabase/server';
import { serviceClient } from '@/lib/supabase/admin';
import { mpApi, MONTHLY_PRICE, paymentsReady, safeCheckoutLink, subscriptionRef, subscriptionRowForUser, syncMercadoPagoSubscription, SUBSCRIPTION_REASON } from '@/lib/billing/mercadopago';

export const runtime='nodejs';

export async function POST(request:Request) {
  if (!paymentsReady())return NextResponse.json({error:'Assinaturas ainda não foram liberadas.'},{status:503});
  const site=process.env.NEXT_PUBLIC_SITE_URL!;
  let siteUrl:URL;
  try{siteUrl=new URL(site);if(siteUrl.protocol!=='https:')throw Error('https obrigatório');}
  catch{return NextResponse.json({error:'Domínio de vendas não configurado.'},{status:503});}
  if(request.headers.get('origin')!==siteUrl.origin)
    return NextResponse.json({error:'Origem inválida.'},{status:403});
  const client=await serverClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user?.id || !user.email || !user.email_confirmed_at)
    return NextResponse.json({error:'Entre e confirme seu e-mail para assinar.'},{status:401});
  try{
    const existing=await subscriptionRowForUser(user.id);
    if(existing?.provider_subscription_id && existing.provider==='mercadopago'){
      await syncMercadoPagoSubscription(existing.provider_subscription_id);
      const current=await mpApi('/preapproval/'+encodeURIComponent(existing.provider_subscription_id));
      if(current.status==='authorized')return NextResponse.json({error:'Sua assinatura já está autorizada. Verifique o pagamento em andamento.'},{status:409});
      if(current.status==='pending' && safeCheckoutLink(current.init_point))
        return NextResponse.json({url:current.init_point});
      if(current.status!=='canceled'&&current.status!=='cancelled')
        return NextResponse.json({error:'Existe uma assinatura em andamento. Consulte seu status antes de tentar novamente.'},{status:409});
    }
    // A criação exige autorização do usuário já autenticado. Não é link genérico.
    const preapproval=await mpApi('/preapproval',{
      method:'POST',
      headers:{'X-Idempotency-Key':randomUUID()},
      body:JSON.stringify({
        reason:SUBSCRIPTION_REASON,external_reference:subscriptionRef(user.id),payer_email:user.email,
        auto_recurring:{frequency:1,frequency_type:'months',transaction_amount:MONTHLY_PRICE,currency_id:'BRL'},
        back_url:new URL('/assinar?retorno=mercadopago',siteUrl).toString(),
        status:'pending',
      }),
    });
    if(typeof preapproval.id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(preapproval.id)||!safeCheckoutLink(preapproval.init_point))
      throw new Error('Checkout de assinatura inválido');
    const {error}=await serviceClient().from('cacador_subscriptions').upsert({
      user_id:user.id,provider:'mercadopago',provider_subscription_id:preapproval.id,
      status:'inactive',current_period_end:null,mp_last_payment_id:null,updated_at:new Date().toISOString(),
    },{onConflict:'user_id'});
    if(error){
      // Evita deixar cobrança nova ativa caso a gravação local falhe.
      try{await mpApi('/preapproval/'+preapproval.id,{method:'PUT',body:JSON.stringify({status:'canceled'})});}catch{}
      throw new Error('Não foi possível vincular a assinatura à conta.');
    }
    return NextResponse.json({url:preapproval.init_point});
  }catch(e){
    console.error('MP checkout:',e instanceof Error?e.message:'erro');
    return NextResponse.json({error:'Não foi possível preparar a assinatura. Tente novamente.'},{status:502});
  }
}
