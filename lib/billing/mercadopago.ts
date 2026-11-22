import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { serviceClient } from '@/lib/supabase/admin';

export const MONTHLY_PRICE = 49.90;
export const SUBSCRIPTION_REASON = 'Caçador de Ofertas IA - mensalidade';
const API = 'https://api.mercadopago.com';

type Json = Record<string, any>;
type SubRow = { user_id:string; status:string; provider:string; provider_subscription_id:string|null; current_period_end:string|null };

export function paymentsReady() {
  return process.env.CACADOR_PAYMENTS_READY === 'true' &&
    process.env.CACADOR_BILLING_ENFORCED === 'true' &&
    !!process.env.MERCADO_PAGO_ACCESS_TOKEN &&
    !!process.env.MERCADO_PAGO_WEBHOOK_SECRET &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !!process.env.NEXT_PUBLIC_SITE_URL;
}

export function subscriptionRef(userId:string) { return 'cacador:' + userId; }

export async function mpApi<T extends Json = Json>(path:string, init: RequestInit = {}):Promise<T> {
  const token=process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error('Integração do Mercado Pago não configurada');
  if (!/^\/[a-z0-9_/?&=.%:-]+$/i.test(path) || path.startsWith('//'))
    throw new Error('Caminho inválido para API');
  const response = await fetch(API+path, {
    ...init, cache:'no-store', signal: AbortSignal.timeout(12000),
    headers:{'Authorization':'Bearer '+token, 'Content-Type':'application/json', ...init.headers},
  });
  if (!response.ok) throw new Error('Mercado Pago indisponível (' + response.status + ')');
  return await response.json() as T;
}

export function safeCheckoutLink(value:unknown):value is string {
  if (typeof value!=='string') return false;
  try {
    const u=new URL(value);
    return u.protocol==='https:' && (
      u.hostname==='mercadopago.com' || u.hostname.endsWith('.mercadopago.com') ||
      u.hostname==='mercadopago.com.br' || u.hostname.endsWith('.mercadopago.com.br')
    );
  } catch { return false; }
}

export function validateWebhookSignature(xSignature:string|null,xRequestId:string|null,dataId:string|null,secret:string,now=Date.now()):boolean {
  if (!xSignature || !xRequestId || !dataId || !secret) return false;
  const parts=Object.fromEntries(xSignature.split(',').map(s=>s.trim().split('=',2)));
  if (!/^\d{10,13}$/.test(parts.ts||'') || !/^[a-f0-9]{64}$/i.test(parts.v1||'')) return false;
  const ts=Number(parts.ts);
  const when=parts.ts.length===10?ts*1000:ts;
  if (!Number.isFinite(when) || Math.abs(now-when)>10*60*1000) return false;
  const manifest='id:'+dataId.toLowerCase()+';request-id:'+xRequestId+';ts:'+parts.ts+';';
  const expected=createHmac('sha256',secret).update(manifest).digest();
  const received=Buffer.from(parts.v1,'hex');
  return received.length===expected.length && timingSafeEqual(expected,received);
}

export function nextMonthFromPaidDate(paid:string, now=Date.now()):string|null {
  const date=new Date(paid);
  if (!Number.isFinite(date.getTime()) || date.getTime()>now+60_000) return null;
  const y=date.getUTCFullYear(),m=date.getUTCMonth(),d=date.getUTCDate();
  const lastNext=new Date(Date.UTC(y,m+2,0)).getUTCDate();
  const end=new Date(date.getTime());
  end.setUTCFullYear(y,m+1,Math.min(d,lastNext));
  if(end.getTime()<=now)return null;
  return end.toISOString();
}

function validSubscription(sub:Json,row:SubRow,email:string):boolean {
  return String(sub.id)===row.provider_subscription_id &&
    sub.external_reference===subscriptionRef(row.user_id) &&
    typeof sub.payer_email==='string' && sub.payer_email.toLowerCase()===email.toLowerCase() &&
    sub.auto_recurring?.frequency===1 && sub.auto_recurring?.frequency_type==='months' &&
    sub.auto_recurring?.currency_id==='BRL' &&
    Number(sub.auto_recurring?.transaction_amount)===MONTHLY_PRICE;
}

export async function subscriptionRowForUser(userId:string):Promise<SubRow|null> {
  const {data,error}=await serviceClient().from('cacador_subscriptions')
    .select('user_id,status,provider,provider_subscription_id,current_period_end')
    .eq('user_id',userId).maybeSingle();
  if(error)throw new Error('Não foi possível consultar sua assinatura');
  return data as SubRow|null;
}

export async function syncMercadoPagoSubscription(subscriptionId:string) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(subscriptionId)) throw new Error('ID inválido');
  const admin=serviceClient();
  const {data:row,error}=await admin.from('cacador_subscriptions')
    .select('user_id,status,provider,provider_subscription_id,current_period_end')
    .eq('provider','mercadopago').eq('provider_subscription_id',subscriptionId).maybeSingle();
  if(error)throw new Error('Erro ao localizar assinatura');
  if(!row) return {known:false};
  const {data:{user},error:userErr}=await admin.auth.admin.getUserById(row.user_id);
  if(userErr || !user?.email) throw new Error('Conta não encontrada');
  const sub=await mpApi('/preapproval/'+encodeURIComponent(subscriptionId));
  if(!validSubscription(sub,row as SubRow,user.email)) throw new Error('Dados divergentes na assinatura');
  let end:string|null=null;
  let lastPayment:string|null=null;
  if(sub.status==='authorized' || sub.status==='cancelled' || sub.status==='canceled') {
    const inv=await mpApi('/authorized_payments/search?preapproval_id='+encodeURIComponent(subscriptionId)+'&limit=100&offset=0');
    const invoices:Array<Json>=Array.isArray(inv.results)?inv.results:[];
    // A aprovação da assinatura sozinha NÃO libera acesso: exige pagamento efetivo.
    const approved=invoices.filter(i=>String(i.preapproval_id)===subscriptionId &&
      i.currency_id==='BRL' && Number(i.transaction_amount)===MONTHLY_PRICE &&
      i.payment?.status==='approved' && i.payment?.id && i.debit_date)
      .sort((a,b)=>Date.parse(b.debit_date)-Date.parse(a.debit_date));
    for(const invoice of approved) {
      const id=String(invoice.payment.id);
      if(!/^\d{1,25}$/.test(id))continue;
      const payment=await mpApi('/v1/payments/'+id);
      if(payment.status!=='approved' || payment.status_detail!=='accredited' ||
        payment.currency_id!=='BRL' || Number(payment.transaction_amount)!==MONTHLY_PRICE) continue;
      const period=nextMonthFromPaidDate(invoice.debit_date);
      if(period){end=period;lastPayment=id;break;}
    }
  }
  const status = end && sub.status==='authorized' ? 'active'
    : end && (sub.status==='canceled'||sub.status==='cancelled') ? 'canceled'
    : sub.status==='canceled'||sub.status==='cancelled' ? 'canceled'
    : sub.status==='paused' ? 'past_due'
    : row.current_period_end && Date.parse(row.current_period_end)<Date.now() ? 'expired':'inactive';
  const {error:saveError}=await admin.from('cacador_subscriptions').update({
    status, current_period_end:end, provider_customer_id:sub.payer_id?String(sub.payer_id):null,
    mp_last_payment_id:lastPayment, updated_at:new Date().toISOString(),
  }).eq('user_id',row.user_id).eq('provider_subscription_id',subscriptionId);
  if(saveError)throw new Error('Erro ao sincronizar assinatura');
  return {known:true,userId:row.user_id,status,currentPeriodEnd:end};
}
