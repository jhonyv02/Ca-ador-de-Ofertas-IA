import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
export async function GET(request:NextRequest) {
  const url = new URL(request.url); const code = url.searchParams.get('code');
  if(code){const client=await serverClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error) { const next=url.searchParams.get('next'); return NextResponse.redirect(new URL(next==='/update-password'?next:'/dashboard',url.origin)); }}
  return NextResponse.redirect(new URL('/login?erro=confirmacao',url.origin));
}
