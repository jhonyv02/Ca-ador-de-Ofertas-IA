import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPECTED_HOST = 'brhnrukuwqbfhbyruzak.supabase.co';

/**
 * Testa exclusivamente o endpoint de saúde do Supabase configurado.
 * Não expõe chaves, tokens, usuários, valores de environment ou dados privados.
 * A requisição usa um destino fixo, sem redirecionamentos.
 */
export async function GET() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
  let actualHost = '';
  let validUrl = false;

  try {
    const parsed = new URL(configuredUrl);
    actualHost = parsed.hostname.toLowerCase();
    validUrl = parsed.protocol === 'https:' &&
      actualHost === EXPECTED_HOST &&
      (parsed.pathname === '/' || parsed.pathname === '') &&
      !parsed.username && !parsed.password && !parsed.port;
  } catch {
    // Valor ausente ou URL inválida.
  }

  const result: {
    checkedAt: string;
    expectedHost: string;
    configuredHost: string;
    correctProject: boolean;
    publicKeyPresent: boolean;
    serverReachable: boolean | null;
    httpStatus: number | null;
    problem: string | null;
  } = {
    checkedAt: new Date().toISOString(),
    expectedHost: EXPECTED_HOST,
    configuredHost: actualHost || '(não configurado)',
    correctProject: validUrl,
    publicKeyPresent: !!publishableKey &&
      !publishableKey.includes('COLE_AQUI') &&
      !publishableKey.startsWith('sb_publishable_test_'),
    serverReachable: null,
    httpStatus: null,
    problem: null,
  };

  if (!validUrl) {
    result.problem = 'A URL do projeto Supabase configurada na Hostinger não corresponde ao Caçador de Ofertas.';
  } else if (!result.publicKeyPresent) {
    result.problem = 'A chave pública do Supabase não está configurada na Hostinger.';
  } else {
    try {
      const response = await fetch(`https://${EXPECTED_HOST}/auth/v1/health`, {
        method: 'GET',
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(6500),
        headers: {Accept: 'application/json', apikey: publishableKey},
      });
      result.httpStatus = response.status;
      result.serverReachable = true;
      if (response.status === 401 || response.status === 403) {
        result.problem = 'O Supabase recebeu a chave pública e recusou o acesso (HTTP '+response.status+'). Confira a Publishable key do mesmo projeto.';
      } else if (response.status >= 400) {
        result.problem = 'O Supabase respondeu com HTTP ' + response.status + '.';
      }
    } catch {
      result.serverReachable = false;
      result.problem = 'O servidor da Hostinger não conseguiu estabelecer a conexão com o Supabase.';
    }
  }

  return NextResponse.json(result, {
    headers: {'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex'},
  });
}
