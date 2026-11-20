# Mundo Imprimível — plano operacional do Caçador (novembro de 2026)

## Objetivo
**Caçador** continua no host `grey-spider-486365.hostingersite.com` e controla pesquisa, auditoria e aprovações.
**Mundo Imprimível** (`mundoimprimivel.online`) será um segundo aplicativo de vendas, com URLs como `/jogos-de-natal`.
Não apontar o novo domínio para o Caçador, nem alterar a URL do webhook de notificações do Caçador.

## Regras de decisão
- Este projeto trabalha **somente com materiais digitais para impressão**. Não apagar dados históricos: filtrar.
- Nota **85/100** representa prioridade de pesquisa e construção, **não 85% de chances de vender**.
- Apenas nota alta não autoriza campanha; o parecer pode ser `DADOS_INSUFICIENTES` ou `NAO_TESTAR`.
- Não copiar produtos de concorrentes. PDFs, imagens e textos devem ser originais.
- Entregável real, imagens fiéis e checkout testado são pré-requisitos, não detalhes opcionais.
- Orçamento de referência R$35/dia, sempre exigindo aprovação expressa do proprietário antes de gastar.

## Gatilho de recebimento das ofertas
O Grok pesquisa **segunda/quarta/sexta** e cadastra ofertas `digital` com `format=printable` na tabela de produtos do Caçador, com `user_id` correto, URLs de evidência e notas (não números inventados).
A inserção já aciona o Web Push `new_offer` se o webhook atual estiver saudável. **Não modificar os gatilhos do push** ao criar a fábrica.
Antes de registrar uma nova oferta, validar formato, duplicação e origem confiável.

## Pipeline a implementar, com estados auditáveis
1. `RECEBIDA`: Oferta importada por fonte autenticada.
2. `NA_TRIAGEM`: elegibilidade imprimível, duplicação e fontes analisadas.
3. `AUDITORIA`: análise crítica OpenAI, independente da nota do Grok.
4. `APROVADA_PARA_CONSTRUIR`: nota >=85, riscos aceitáveis e evidências suficientes.
5. `PRODUZINDO`: geração do conteúdo autoral do PDF, imagens e copy.
6. `EM_QUALIDADE`: verificação de número de páginas, ortografia, impressão A4, renderização de páginas reais e links.
7. `RASCUNHO_PUBLICADO`: URL privada/protegida no Mundo Imprimível.
8. `CHECKOUT_PENDENTE`: ainda falta criar ou testar checkout e entrega no Wiven.
9. `PRONTA_PARA_REVISAO`: checkout, evento de compra e entrega confirmados, prévia completa.
10. `APROVADA_PELO_DONO`: liberada para tráfego; publicação pública.
11. `TESTANDO`: campanha iniciada manualmente pelo proprietário.
12. `PAUSADA`, `RECUSADA`, `FALHOU`: estados válidos, com motivo e histórico.

**Nunca publicar a prévia como produto vendável sem aprovação.** O rascunho deve exigir autenticação/token de acesso, não apenas parâmetro na URL.
Um relógio não é garantia de conclusão. A meta operacional é verificar a fila **às 19h America/Sao_Paulo**, mas só notificar "pronta" quando os testes forem concluídos.

## Arquitetura para execução
- Caçador (Next.js) = administração, elegibilidade, auditoria, fila, estado.
- Processador de trabalhos = worker agendável; cria PDFs/miniaturas/mockups, verifica artefatos e registra erros e tentativas sem duplicar jobs.
- Supabase = fila de trabalhos, histórico, ativos privados e publicações.
- Mundo Imprimível (app separado na Hostinger) = motor público de páginas dinâmicas por `slug`, sem rebuild por oferta.
- Wiven = criar/configurar produto/checkout se API e permissões confirmadas; caso contrário, bloquear com `CHECKOUT_PENDENTE` até o link ser associado e testado.
- Segurança = API autenticada Caçador -> publicador; segredos apenas no servidor; papéis de usuário e RLS; rate limit e assinatura do webhook.
- Rastreamento = mesmo Pixel de loja, `ViewContent` por oferta e `InitiateCheckout` no CTA. `Purchase` só após confirmação confiável do checkout, com deduplicação de eventos.

## Checklist de configuração externa
**Não conclui sozinho a implantação**: precisam ser configurados e testados:
- [ ] Publicador Mundo Imprimível criado na Hostinger em uma aplicação **separada** da do Caçador.
- [ ] DNS do domínio apontado, SSL/HTTPS válido e autenticação de previews.
- [ ] Banco e Storage para jobs/pages/assets, migrações revisadas e backups.
- [ ] Chaves OpenAI e Grok presentes no backend; limite de uso/custo.
- [ ] Permissão e mecanismo oficial de integração Wiven confirmados.
- [ ] Retorno de pagamento e entrega testados com uma compra controlada.
- [ ] Worker e agendamento com horário `America/Sao_Paulo`.
- [ ] Web Push atual: nova oferta, escolha da semana, sem regressão.
- [ ] Novos avisos da fábrica só após endpoints próprios serem implementados e testados.
- [ ] Testes no Android/Chrome instalado, iPhone/PWA quando aplicável.
- [ ] Validar no celular que a página abriu a oferta certa.

## Estado da primeira etapa no branch
Esta branch restringe o radar principal e a recomendação semanal a produtos imprimíveis,
interrompe a importação automática do catálogo histórico e adiciona testes para o filtro.
**Não implementa ainda o worker que gera PDF/mockups, o publicador externo ou o envio Wiven.**
Não interpretar esta primeira etapa como um pipeline já operante ou garantir entrega na segunda-feira.
