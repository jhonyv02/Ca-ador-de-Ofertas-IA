import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
export const dynamic = 'force-dynamic';
export default async function PrivateLayout({children}:{children:React.ReactNode}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return <div className="setup-warning"><h1>Configuração inicial necessária</h1><p>Preencha .env.local com a URL e a chave pública do Supabase. Leia o README.md.</p></div>;
  }
  const supabase=await serverClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');
  return <AppShell email={user.email||'Conta'}>{children}</AppShell>;
}
