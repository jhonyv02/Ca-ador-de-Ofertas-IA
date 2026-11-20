import {NextResponse} from 'next/server';
import {z} from 'zod';
import {serverClient} from '@/lib/supabase/server';

export const runtime = 'nodejs';
const schema = z.object({
  endpoint: z.string().url().max(4096),
  keys: z.object({
    p256dh: z.string().min(1).max(300),
    auth: z.string().min(1).max(300),
  }),
}).strict();

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 8000) return NextResponse.json({error: 'Solicitação grande demais.'}, {status: 413});
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'Inscrição de notificação inválida.'}, {status: 400});
  }
  if (!body.endpoint.startsWith('https://')) {
    return NextResponse.json({error: 'O endereço da notificação precisa usar https.'}, {status: 400});
  }
  const supabase = await serverClient();
  const {data: {user}, error: authError} = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({error: 'Sessão expirada. Entre novamente.'}, {status: 401});

  const {data: existing, error: listError} = await supabase
    .from('push_subscriptions')
    .select('id,endpoint,created_at')
    .eq('user_id', user.id)
    .order('created_at', {ascending: true});
  if (listError) {
    return NextResponse.json({error: 'Não foi possível ler as inscrições. Execute o SQL de notificações no Supabase e tente de novo.'}, {status: 500});
  }
  const rows = existing || [];
  if (!rows.some(row => row.endpoint === body.endpoint) && rows.length >= 8 && rows[0]) {
    await supabase.from('push_subscriptions').delete().eq('id', rows[0].id).eq('user_id', user.id);
  }
  const {error} = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
  }, {onConflict: 'user_id,endpoint'});
  if (error) return NextResponse.json({error: 'Não foi possível salvar a inscrição neste aparelho.'}, {status: 500});
  return NextResponse.json({ok: true});
}
