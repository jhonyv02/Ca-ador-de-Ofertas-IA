import {NextResponse} from 'next/server';
import {z} from 'zod';
import {serverClient} from '@/lib/supabase/server';

export const runtime = 'nodejs';
const schema = z.object({endpoint: z.string().url().max(4096)}).strict();

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 4000) return NextResponse.json({error: 'Solicitação grande demais.'}, {status: 413});
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'Inscrição inválida.'}, {status: 400});
  }
  const supabase = await serverClient();
  const {data: {user}, error: authError} = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({error: 'Sessão expirada. Entre novamente.'}, {status: 401});
  const {error} = await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', body.endpoint);
  if (error) return NextResponse.json({error: 'Não foi possível desligar a notificação neste aparelho.'}, {status: 500});
  return NextResponse.json({ok: true});
}
