'use client';

import {createBrowserClient} from '@supabase/ssr';

const EXPECTED_URL = 'https://brhnrukuwqbfhbyruzak.supabase.co';

/** Impede que o app grave por engano no banco de outro SaaS. */
export function browserClient() {
  const url=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').trim().replace(/\\/+$/,'');
  const key=(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'').trim();

  if(url!==EXPECTED_URL) {
    throw new Error('Conexão com o banco incorreta. Confira NEXT_PUBLIC_SUPABASE_URL na Hostinger e abra /diagnostico para verificar.');
  }
  if(!key || key.includes('COLE_AQUI') || key.startsWith('sb_publishable_test_')) {
    throw new Error('Chave pública do Supabase ausente ou inválida. Confira NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY na Hostinger e reimplante o site.');
  }
  return createBrowserClient(url,key);
}
