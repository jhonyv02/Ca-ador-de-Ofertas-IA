import {NextResponse} from 'next/server';
import webpush from 'web-push';
import {z} from 'zod';
import {serviceClient} from '@/lib/supabase/admin';
import {notificationPayload, pushMessages, webhookAuthorized, type PushEvent} from '@/lib/push-payload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  events: z.array(z.enum(['new_offer', 'weekly_pick'])).min(1).max(2),
  product_id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().max(150).optional(),
}).strict();

function vapidSubject() {
  const raw = (process.env.VAPID_SUBJECT || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (raw.startsWith('mailto:') || raw.startsWith('https://')) return raw;
  return 'mailto:cacador@localhost';
}

export async function POST(req: Request) {
  if (!webhookAuthorized(req.headers.get('authorization'), process.env.PUSH_WEBHOOK_SECRET)) {
    return NextResponse.json({error: 'Não autorizado.'}, {status: 401});
  }
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 8000) return NextResponse.json({error: 'Corpo grande demais.'}, {status: 413});
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'Payload inválido.'}, {status: 400});
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) {
    return NextResponse.json({error: 'Chaves VAPID ausentes no servidor.'}, {status: 503});
  }
  let admin;
  try {
    admin = serviceClient();
  } catch {
    return NextResponse.json({error: 'SUPABASE_SERVICE_ROLE_KEY ausente no servidor.'}, {status: 503});
  }

  const {data: product, error: productError} = await admin
    .from('products')
    .select('id,user_id,name,weekly_pick')
    .eq('id', body.product_id)
    .maybeSingle();
  if (productError) return NextResponse.json({error: 'Falha ao ler a oferta.'}, {status: 500});
  if (!product || product.user_id !== body.user_id) {
    return NextResponse.json({error: 'Oferta não encontrada.'}, {status: 404});
  }

  const {data: subscriptions, error: subError} = await admin
    .from('push_subscriptions')
    .select('endpoint,p256dh,auth')
    .eq('user_id', product.user_id);
  if (subError) return NextResponse.json({error: 'Falha ao ler inscrições.'}, {status: 500});

  const messages = pushMessages(
    {id: product.id, name: product.name, weekly_pick: !!product.weekly_pick},
    body.events as PushEvent[],
  );
  const targets = subscriptions || [];
  if (!targets.length || !messages.length) {
    return NextResponse.json({ok: true, sent: 0, removed: 0, failed: 0});
  }

  try {
    webpush.setVapidDetails(vapidSubject(), publicKey, privateKey);
  } catch {
    return NextResponse.json({error: 'Chaves VAPID inválidas.'}, {status: 503});
  }

  let sent = 0;
  let removed = 0;
  let failed = 0;
  await Promise.all(targets.flatMap(target => messages.map(async message => {
    try {
      await webpush.sendNotification({
        endpoint: target.endpoint,
        keys: {p256dh: target.p256dh, auth: target.auth},
      }, notificationPayload(message), {TTL: 60 * 60 * 24});
      sent += 1;
    } catch (error) {
      const status = typeof error === 'object' && error && 'statusCode' in error
        ? Number((error as {statusCode?: number}).statusCode)
        : 0;
      if (status === 404 || status === 410) {
        removed += 1;
        await admin.from('push_subscriptions').delete().eq('user_id', product.user_id).eq('endpoint', target.endpoint);
      } else {
        failed += 1;
      }
    }
  })));
  return NextResponse.json({ok: true, sent, removed, failed});
}
