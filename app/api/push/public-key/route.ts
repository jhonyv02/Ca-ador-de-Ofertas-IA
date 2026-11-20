import {NextResponse} from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return NextResponse.json({error: 'Notificações ainda não configuradas no servidor.'}, {status: 503});
  }
  return NextResponse.json({publicKey}, {headers: {'Cache-Control': 'no-store'}});
}
