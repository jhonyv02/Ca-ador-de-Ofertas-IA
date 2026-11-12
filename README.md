# Caçador de Ofertas IA

SaaS de pesquisa e comparação de produtos para tráfego pago construído com Next.js 16 e React 19, em português, com autenticação, dados isolados por usuário, arquivo privado de criativos, análise multimodal opcional e simulador.

## O que está implementado

- Login e cadastro com Supabase Auth (e-mail e senha); redefinição de senha.
- Painel de métricas, ranking de produtos, favoritos e links para pesquisa.
- Cadastro/edição/exclusão de **produtos** (digitais, físicos, SaaS e serviços).
- Cadastro/edição/exclusão de **anúncios** por produto, com copy, gancho, CTA, status, datas, link de origem e upload de print/vídeo.
- Bucket privado com URLs temporárias para visualizar os arquivos.
- Consulta sob demanda de **links individuais da Meta Ads Library**: valida domínio, extrai ID, tenta ler data de início/status quando o texto público da página identificar precisamente aquele anúncio. Se a Meta bloquear ou ocultar detalhes, mostra aviso para completar manualmente.
- Histórico de consultas por link e verificações manuais, diferenciando a origem dos dados e evitando tratar página indisponível como anúncio inativo.
- Reconsulta individual pelo botão **Verificar link agora**. Não há monitoramento recorrente agendado neste pacote.
- Análise de produtos e criativos por IA (API OpenAI no servidor, com imagem de criativos quando houver), explicação da pontuação e indicação de incerteza.
- Score heurístico sem IA quando ainda não existe análise: **mede sinais documentados/completude, não lucro**.
- Comparação de até três produtos.
- Simulador de orçamento, CPC, conversão e teto de CPA, mais registro de números reais e histórico.
- Exportação CSV de produtos, anúncios, verificações, análises e testes.
- Layout responsivo para computador e celular.
- Segurança com Row Level Security (RLS) nas cinco tabelas e Storage privado por pasta de usuário.

## Prévia instantânea

Abra `demonstracao.html` com duplo clique: funciona offline e salva seus testes no localStorage deste navegador. Os dados exibidos inicialmente são **fictícios**. Esta prévia não tem IA, login nem upload de mídia; os recursos de produção estão no projeto Next.js.

## Atualização: importação por link da Meta

1. Se você **ainda não criou o banco**, execute `supabase/schema.sql` atualizado.
2. Se já executou o SQL da versão anterior do **Caçador de Ofertas**, execute somente `supabase/upgrade-link-import.sql` no SQL Editor desse projeto. Ele adiciona campos sem apagar dados existentes.
3. Vá em **Biblioteca de anúncios → Salvar anúncio**, cole um URL individual `https://www.facebook.com/ads/library/?id=123456789`, clique em **Extrair dados do link** e confira o aviso.
4. Quando houver informação pública associada exatamente ao ID, preenche início/status automaticamente. Quando não houver, exibe **Complete os dados manualmente**. Você pode preencher anunciante, data, copy, status e anexar o criativo.
5. Clique em **Salvar anúncio**. Depois abra-o e use **Verificar link agora** para registrar uma nova tentativa. Cada consulta fica no histórico, mesmo quando não foi possível confirmar dados.

**Limites reais:** a Meta pode fornecer uma página gerada por JavaScript, exigir autenticação, bloquear a consulta ou não apresentar os dados em HTML legível. O SaaS não tenta quebrar captchas, autenticação ou bloqueios. Portanto, somente o ID do link é previsível; a data e o status podem não ser extraíveis. Link sem `?id=` é uma pesquisa, não um anúncio específico. Não há API da Meta, proxy nem provedor externo incluído; não há garantia de extração completa, verificação periódica automática ou acesso a métricas privadas. Data de início até hoje **não garante veiculação ininterrupta**, nem lucro. Nunca inferimos que um anúncio encerrou só porque a página está indisponível.

**Segurança:** a API exige sessão Supabase; normaliza URLs apenas para `www.facebook.com/ads/library/?id=...`, não segue redirecionamentos, limita corpo/tempo e usa um limitador básico em memória de 12 consultas/minuto/usuário. Para escala com múltiplas instâncias, troque por um rate limiter distribuído. O backend só acessa a Meta no clique voluntário do usuário.

**Teste automatizado local do parser:** `npm run test:meta` (não exige chave de API).

## Configuração — 10 passos

1. Instale **Node.js 20+** e rode `npm install` dentro da pasta do projeto (Internet necessária).
2. Crie **um NOVO projeto** no https://supabase.com/dashboard. Não use o banco do OrçaJá Pro/JVianaFlow sem antes isolar ambientes.
3. Abra **SQL Editor → New query**, cole `supabase/schema.sql` e execute **Run**. Veja os cinco conjuntos de tabelas e o bucket `creatives`.
4. Em **Project Settings / Connect**, copie a **URL** e a **Publishable key** `sb_publishable_...`.
5. Copie `.env.example` para `.env.local` e preencha as duas variáveis públicas do Supabase.
6. No Supabase, em **Authentication → Providers**, habilite Email. Configure a URL do site e os redirecionamentos permitidos (veja abaixo). Por segurança, habilite confirmação de e-mail. Em uso privado, desative cadastro livre após criar sua conta.
7. Para análise por IA, crie uma chave em https://platform.openai.com/api-keys, coloque **somente** no servidor em `OPENAI_API_KEY` e defina `OPENAI_MODEL`. Não coloque essa chave no frontend nem em `NEXT_PUBLIC_`.
8. Inicie com `npm run dev` e abra http://localhost:3000.
9. Cadastre um produto → salve um anúncio com print/link/copy → registre verificações → peça a análise com IA → compare oportunidades.
10. Para publicar, configure as mesmas variáveis no host de Node.js (Vercel ou VPS/Hostinger). Rode `npm run build && npm run start`, ou use o processo de deploy do provedor. Ajuste `NEXT_PUBLIC_SITE_URL` e redirects no Supabase.

**Redirect URLs do Supabase** (em Authentication → URL Configuration):

- Local: `http://localhost:3000/auth/callback`
- Produção: `https://SEU-DOMINIO.com/auth/callback`
- Site URL: `https://SEU-DOMINIO.com` (ou `http://localhost:3000` em desenvolvimento)

### Variáveis de ambiente

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave_publica
OPENAI_API_KEY=sua_chave_secreta_da_openai
OPENAI_MODEL=gpt-4.1-mini
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com
```

`OPENAI_API_KEY` é opcional para CRUD, simulação e score heurístico. É necessária para botões de IA.

### Deploy na Hostinger

O projeto usa **Next.js 16 e precisa de execução Node.js**. Hospedagem que só serve HTML estático não roda `/api/analyze` nem a autenticação server-side. Use VPS com Node.js, um produto Hostinger que suporte Node, ou Vercel. Na VPS, inicie `npm run build` e depois `npm run start` usando gerenciador de processos, HTTPS e proxy reverso. O banco continua no Supabase.

## Como funciona a IA

A API `POST /api/analyze` exige sessão do Supabase, só consulta registros do dono e valida IDs. A IA recebe o produto, até 16 anúncios detalhados, até 30 verificações e um print do anúncio quando existir. Retorna JSON estruturado, salvo em `analyses`. Score vai de 0 a 100, com critérios 20+20+20+15+15+10. O endpoint faz limite simples de até 20 análises salvas por usuário em 24h (**não é limitador resistente a concorrência**, implemente controle transacional ou gateway antes de vender em escala).

**O que não faz:** não faz coleta abrangente/monitoramento automatizado das bibliotecas da Meta/TikTok/Google, não obtém números secretos, não prova ROI, não consulta landing pages apenas por uma URL, não extrai vídeo para IA e não adivinha dados financeiros. Para analisar o conteúdo de uma página de vendas, descreva promessa, público, preço e diferenciais nos campos do produto. Verificação do status do anúncio é manual.

## Checklist de verificação antes de vender

- [ ] Criar duas contas e confirmar que uma não vê produtos, imagens ou análises da outra.
- [ ] Consultar um link da Meta com `?id=...` e um link inválido/sem ID; confirmar a mensagem de fallback e salvar manualmente.
- [ ] Executar `npm run test:meta` e confirmar que os casos de outros anunciantes não contaminam a extração.
- [ ] Testar reset de senha e confirmação de e-mail.
- [ ] Enviar imagem PNG e vídeo MP4 e conferir limite de 30 MB.
- [ ] Editar/excluir anúncios e produtos (deve respeitar cascata do banco).
- [ ] Verificar que `OPENAI_API_KEY` nunca aparece nas respostas, logs públicos ou bundle cliente.
- [ ] Testar com chave válida e saldo de API: análise do produto e análise de anúncio com print.
- [ ] Conferir limites de custo, concorrência e abuso no endpoint de IA.
- [ ] Testar no celular e domínio com HTTPS.
- [ ] Planejar backups, LGPD, política de privacidade e termos antes de abrir a terceiros.

## Estrutura

- `app/(app)` — painel, produtos, anúncios, comparador, simulador, configurações.
- `app/(auth)` — login e troca de senha.
- `app/api/analyze` — endpoint server-side de IA.
- `app/api/meta/inspect` — consulta limitada sob demanda; fallback manual.
- `lib/meta-library.ts` — URL segura e parser conservador.
- `supabase/upgrade-link-import.sql` — atualização para banco existente.
- `components` — formulários, bibliotecas, relatório e layout.
- `lib` — cliente Supabase, tipos, scoring e utilitários.
- `supabase/schema.sql` — tabelas, chaves compostas por dono, RLS, Storage.

## Observações de conformidade

A Meta Ads Library e o TikTok Creative Center são fontes de pesquisa. O MVP não faz scraping nem automatiza acessos sem autorização. Guarde e compartilhe criativos de terceiros respeitando direitos autorais e as regras da plataforma. Se houver uso comercial com múltiplos clientes, será necessário adicionar termos, política de privacidade, limites por plano, cobrança e monitoramento de infraestrutura.

## Dependências e atualizações de segurança

O `package.json` foi ajustado para versões corrigidas publicadas até novembro de 2026, especialmente Next.js 16.4.6 e React 19.3.0. Antes de publicar, rode `npm audit`, revise patches novos e gere/guarde o `package-lock.json` com `npm install`. Não foi possível executar o build nem consultas reais de Supabase/OpenAI neste ambiente sem dependências e chaves.
