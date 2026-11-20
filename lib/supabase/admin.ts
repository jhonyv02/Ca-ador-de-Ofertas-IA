import {createClient} from '@supabase/supabase-js';

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no servidor.');
  }
  return createClient(url, key, {
    auth: {persistSession: false, autoRefreshToken: false},
  });
}
