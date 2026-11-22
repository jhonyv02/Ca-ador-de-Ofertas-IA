import { serviceClient } from '@/lib/supabase/admin';

// Começa desligado para não interromper os usuários existentes.
// Habilitar somente após criar a migration e testar checkout + webhooks.
export function isBillingEnforced(): boolean {
  return process.env.CACADOR_BILLING_ENFORCED === 'true';
}

export async function hasCommercialAccess(userId: string): Promise<boolean> {
  if (!isBillingEnforced()) return true;
  const admins = (process.env.CACADOR_ADMIN_UIDS || '').split(',').map(v => v.trim()).filter(Boolean);
  if (admins.includes(userId)) return true;
  try {
    const { data, error } = await serviceClient()
      .from('cacador_subscriptions')
      .select('status,current_period_end')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) {
      if (error) console.error('Erro ao consultar assinatura:', error.code);
      return false;
    }
    const validStatus = data.status === 'active' || data.status === 'trialing';
    const validDate = typeof data.current_period_end === 'string' && Date.parse(data.current_period_end) > Date.now();
    return validStatus && validDate;
  } catch (error) {
    console.error('Erro interno ao verificar assinatura:', error instanceof Error ? error.message : 'desconhecido');
    return false;
  }
}
