import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasCommercialAccess, isBillingEnforced } from '@/lib/billing/access';

// Essas rotas usam sessão e dão acesso a recursos com custo operacional.
// Webhooks externos (Grok, publicador, push) não entram na lista, pois usam
// autenticação de máquina independente e devem continuar a ser auditados.
const paidApiRoutes = new Set([
  '/api/analyze',
  '/api/browser',
  '/api/extract-reference',
  '/api/meta/inspect',
  '/api/push/subscribe',
  '/api/remodel-page',
  '/api/research/audit',
  '/api/sales-visual',
  '/api/weekly-direct',
]);

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (isBillingEnforced() && paidApiRoutes.has(request.nextUrl.pathname)) {
    if (error || !user) return NextResponse.json({ error: 'Entre em sua conta.' }, { status: 401 });
    if (!(await hasCommercialAccess(user.id))) {
      return NextResponse.json({ error: 'Assinatura ativa necessária.', redirect: '/assinar' }, { status: 403 });
    }
  }
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)'] };
