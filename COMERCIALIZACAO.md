# Caçador de Ofertas IA — Mercado Pago recorrente

## Entrega desta branch
- Página pública de vendas e /assinar para assinaturas de R$ 49,90/mês.
- POST /api/billing/checkout: cria **preapproval pending** associada ao UID autenticado, com referência externa cacador:<uid>.
- GET /api/billing/status: reconsulta a assinatura no Mercado Pago, faturas e pagamento aprovado (não confia na URL de retorno).
- POST /api/billing/webhook: valida x-signature por HMAC SHA-256, x-request-id, data.id e timestamp; consulta os recursos no Mercado Pago e sincroniza por ID da assinatura.
- POST /api/billing/cancel: cancela a renovação no Mercado Pago e mantém acesso até o vencimento da mensalidade paga.
- RLS de leitura por dono e escrita somente pelo backend (service role). Páginas e APIs são bloqueadas apenas quando CACADOR_BILLING_ENFORCED=true.
- Nenhuma cobrança na branch atual: flags desativadas por padrão. Nenhum deploy nem mudança no banco de produção realizados.

## Pré-requisitos para ativar
1. Use o **projeto Supabase do Caçador**, não o OrçaJá. O projeto não está visível na conexão Supabase disponível nesta sessão. Faça backup e rode `supabase/upgrade-comercializacao.sql` no projeto correto. Cheque as policies.
2. Configure a URL de produção HTTPS em NEXT_PUBLIC_SITE_URL, incluindo o callback /auth/callback em Supabase Auth.
3. No painel Mercado Pago Developers, crie/configure a aplicação de **Assinaturas**, copie **Access Token privado** e **segredo de assinatura dos webhooks**. Não cole credenciais em chat, no GitHub ou no navegador. Use variáveis privadas da Hostinger/VPS.
4. Configure webhook `https://SEU-DOMINIO/api/billing/webhook` nos tópicos `subscription_preapproval` e `subscription_authorized_payment`. Teste assinatura, cobrança inicial, renovação, pagamento rejeitado, estorno e cancelamento.
5. Cadastre o UUID administrativo da conta do Caçador em CACADOR_ADMIN_UIDS (UUID, NÃO email).
6. Defina política de limites de IA, termos de uso, privacidade e suporte antes de anunciar. O sistema precisa de limite de uso de IA por assinatura.\n   **Importante:** as telas também leem Supabase diretamente; antes do lançamento, aplique `supabase/habilitar-acesso-pago.sql` SOMENTE depois de criar o admin em `private.cacador_billing_admins` e testar. Sem RLS comercial, dados do próprio usuário continuam acessíveis pelo cliente Supabase mesmo que a UI esteja bloqueada.
7. Somente depois do deploy de homologação, confirmação da migração, credenciais testadas e **testes reais completos**, ativar CACADOR_BILLING_ENFORCED=true e CACADOR_PAYMENTS_READY=true. Mantenha false até lá.
8. Testar com dois usuários diferentes e verificar que cada pagamento só habilita o próprio usuário. Teste páginas privadas, APIs diretas e RLS.
9. Monitorar webhooks: Mercado Pago tenta novamente em caso de status 503. Se notificações não chegarem, o GET /api/billing/status reconcilia quando o usuário consultar.
10. Lembrete: não existe implementação de cobrança Pix Automático nesta integração; /preapproval com checkout hospedado utiliza os meios oferecidos pelo Mercado Pago ao comprador, conforme elegibilidade.

## Variáveis privadas na Hostinger
```dotenv
NEXT_PUBLIC_CACADOR_LAUNCH_PRICE=49,90
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com.br
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
CACADOR_ADMIN_UIDS=
CACADOR_BILLING_ENFORCED=false
CACADOR_PAYMENTS_READY=false
```

**Importante:** evitar alterar as variáveis ou o banco de produção antes de validar o deploy de teste. Em testes locais, sem pagamento real, você pode deixar a integração desativada.

## Documentação oficial Mercado Pago
- https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments
- https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks
- https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/authorized-payment-search/get
