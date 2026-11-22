# Caçador de Ofertas IA — preparação comercial

## Situação
Esta branch inclui a página pública `/`, o preço de referência e a estrutura inicial de verificação de assinaturas. **Não habilita cobrança nem afirma que o checkout está funcionando**. Manter o site atual em produção enquanto o lançamento é testado.

## Proposta de lançamento
- Plano único: R$ 49,90/mês, valor **proposto**, configurável em `NEXT_PUBLIC_CACADOR_LAUNCH_PRICE`.
- Público: produtores digitais, afiliados e gestores de tráfego que testam ofertas.
- Produto: organização de oportunidades, análise a partir de evidências, comparações e simulador.
- Evitar promessas de ofertas vencedoras, acesso irrestrito à Meta, faturamento garantido ou pesquisa automática sem suporte.
- Antes da venda, definir franquia mensal de análises IA, uso aceitável, suporte, política de reembolso e páginas legais.

## Implantação segura — sequência obrigatória
1. Revisar página pública no deploy de testes. Validar mobile, login e rotas existentes.
2. Executar `supabase/upgrade-comercializacao.sql` no projeto Supabase específico do Caçador e verificar RLS. **Não executar no OrçaJá Pro**.
3. Garantir conta administrativa existente e configurar `CACADOR_ADMIN_UIDS` com o UUID de `auth.users.id` do dono, antes de ativar qualquer bloqueio.
4. Definir provedor/checkout de assinatura recorrente. Implementar criação de pedidos associada ao `user_id`, confirmação de pagamento por webhook autenticado, verificação no provedor, idempotência, renovação, cancelamento, estorno e vencimento. **Não habilitar o checkout só por ter um link externo**.
5. Configurar e testar `SUPABASE_SERVICE_ROLE_KEY` só no backend. O webhook deve atualizar `cacador_subscriptions` apenas após verificar o pagamento e o vínculo correto com o usuário.
6. Adicionar bloqueio aos endpoints privados e testar também o acesso direto por URL/API. Verificar integrações de webhook que não usam sessão de usuário e dados no Supabase (RLS). A página protegida sozinha **não é barreira suficiente**.
7. Só depois de testes ponta a ponta com pagamento real/teste, habilitar `CACADOR_BILLING_ENFORCED=true` no servidor. Usuários sem assinatura ativa serão direcionados a `/assinar` nas páginas privadas. O código de APIs protegidas precisa ser avaliado antes de expor o sistema comercialmente.
8. Configurar `CACADOR_CHECKOUT_URL=https://...` e `CACADOR_PAYMENTS_READY=true` **somente após o passo 4 e 6**. Revisar a experiência de retorno do checkout e confirmação da assinatura.
9. Publicar na Hostinger e testar em conta nova, conta pagante, conta expirada e conta admin.

## Variáveis
```env
NEXT_PUBLIC_CACADOR_LAUNCH_PRICE=49,90
CACADOR_BILLING_ENFORCED=false
CACADOR_ADMIN_UIDS=
CACADOR_CHECKOUT_URL=
CACADOR_PAYMENTS_READY=false
```

## Risco importante
A versão original do aplicativo permite o cadastro gratuito e uso das ferramentas por usuários autenticados. A estrutura desta branch cria uma checagem condicional para páginas protegidas, mas **não completa o sistema de pagamentos** e não deve ser considerada um paywall pronto para comercialização. Não faça anúncios de venda até configurar e validar o fluxo integral.
