import {NextResponse} from 'next/server';
import {validateWebhookSignature,mpApi,syncMercadoPagoSubscription} from '@/lib/billing/mercadopago';

export const runtime='nodejs';
export async function POST(request:Request) {
  const secret=process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if(!secret)return NextResponse.json({error:'Não configurado'},{status:503});
  const url=new URL(request.url);
  const id=url.searchParams.get('data.id')||url.searchParams.get('id');
  const signature=request.headers.get('x-signature');
  const requestId=request.headers.get('x-request-id');
  if(!validateWebhookSignature(signature,requestId,id,secret))
    return NextResponse.json({error:'Assinatura de webhook inválida'},{status:401});
  if(!id||!/^[A-Za-z0-9_-]{1,100}$/.test(id))
    return NextResponse.json({error:'Recurso inválido'},{status:400});
  let event:Record<string,unknown>;
  try{const raw=await request.text();if(raw.length>10000)throw Error('excessivo');event=JSON.parse(raw);}
  catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
  const type=String(event.type||event.topic||'');
  try{
    if(type==='subscription_preapproval') {
      await syncMercadoPagoSubscription(id);
    } else if(type==='subscription_authorized_payment'){
      const invoice=await mpApi('/authorized_payments/'+encodeURIComponent(id));
      if(invoice.preapproval_id && typeof invoice.preapproval_id==='string')
        await syncMercadoPagoSubscription(invoice.preapproval_id);
    }
    // Outros eventos recebem 200 e não têm autorização para alterar assinaturas.
    return NextResponse.json({received:true});
  } catch(e) {
    console.error('MP webhook:',e instanceof Error?e.message:'erro');
    return NextResponse.json({error:'Falha temporária'},{status:503});
  }
}
