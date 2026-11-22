import {NextResponse} from 'next/server';
import {serverClient} from '@/lib/supabase/server';
import {subscriptionRowForUser,syncMercadoPagoSubscription} from '@/lib/billing/mercadopago';
import {hasCommercialAccess,isBillingEnforced} from '@/lib/billing/access';

export const runtime='nodejs';
export async function GET() {
  const client=await serverClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:'Entre em sua conta.'},{status:401});
  try{
    const initial=await subscriptionRowForUser(user.id);
    if(initial?.provider==='mercadopago' && initial.provider_subscription_id)
      await syncMercadoPagoSubscription(initial.provider_subscription_id);
    const row=await subscriptionRowForUser(user.id);
    const active=isBillingEnforced()?await hasCommercialAccess(user.id):false;
    return NextResponse.json({active,status:row?.status||'inactive',currentPeriodEnd:row?.current_period_end||null},{headers:{'Cache-Control':'no-store'}});
  }catch(e){
    console.error('MP status:',e instanceof Error?e.message:'erro');
    return NextResponse.json({error:'Não foi possível confirmar o pagamento. Consulte novamente.'},{status:503});
  }
}
