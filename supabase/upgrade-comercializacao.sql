-- Caçador de Ofertas IA — base do controle de assinaturas
-- Execute apenas no projeto Supabase DO CAÇADOR, após backup.
-- Nenhuma assinatura é criada automaticamente por esta migration.
-- Os registros devem ser atualizados EXCLUSIVAMENTE pelo backend, após evento
-- de pagamento validado (assinatura/renovação/cancelamento), nunca pelo navegador.

create table if not exists public.cacador_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'inactive'
    check (status in ('inactive','trialing','active','past_due','canceled','expired')),
  provider text not null default '',
  provider_customer_id text,
  provider_subscription_id text,
  mp_last_payment_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint cacador_subscription_active_has_end
    check (status not in ('active','trialing') or current_period_end is not null)
);

alter table public.cacador_subscriptions add column if not exists mp_last_payment_id text;

create unique index if not exists cacador_subscriptions_provider_subscription_uniq
  on public.cacador_subscriptions (provider,provider_subscription_id)
  where provider_subscription_id is not null;
create index if not exists cacador_subscriptions_status_end_idx
  on public.cacador_subscriptions (status,current_period_end);

alter table public.cacador_subscriptions enable row level security;
drop policy if exists cacador_subscription_read_own on public.cacador_subscriptions;
create policy cacador_subscription_read_own on public.cacador_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.cacador_subscriptions from anon,authenticated;
grant select on public.cacador_subscriptions to authenticated;

-- IMPORTANTE:
-- Pagamentos só podem habilitar acesso depois de validação da assinatura em
-- servidor, vínculo por user_id e deduplicação dos eventos do provedor.
-- Nunca enviar SUPABASE_SERVICE_ROLE_KEY nem credenciais do checkout ao frontend.

-- Reserva acesso administrativo sem depender de uma assinatura paga.
-- Adicione o UID real do admin somente no SQL Editor do Caçador, não no Git.
create schema if not exists private;
create table if not exists private.cacador_billing_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.cacador_billing_admins from public, anon, authenticated;
