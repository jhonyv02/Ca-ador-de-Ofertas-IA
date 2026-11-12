# Publicar o Caçador de Ofertas IA na Hostinger (produção)

Este repositório já contém o código Next.js na **raiz** (não implante o ZIP antigo). O GitHub Actions executa instalação, testes do parser da Meta, verificação TypeScript e build Next.js em cada push. Confira o sinal verde em **Actions > Validar SaaS e gerar lockfile** antes de publicar.

## 1. Supabase: projeto separado

**Não execute o SQL do Caçador de Ofertas no banco do OrçaJá Pro/JVianaFlow.** Crie um projeto Supabase novo para manter os dados isolados.

1. Acesse https://supabase.com/dashboard e crie um projeto **Caçador de Ofertas IA** na organização apropriada.
2. Em **SQL Editor**, execute UMA vez `supabase/schema.sql` (projeto novo).
3. Se você **já possui uma versão anterior do banco do Caçador**, execute `supabase/upgrade-link-import.sql` em vez de recriar a estrutura.
4. Em **Connect** (ou **Settings > API Keys**), copie URL do projeto e a **Publishable key** (`sb_publishable_...`). NÃO use `service_role` nem a secret key no browser.
5. Em **Authentication > Providers > Email**, habilite e-mail/senha. Para uso só seu, crie sua conta e depois desabilite novos cadastros públicos.
6. Em **Authentication > URL Configuration**, configure:
   - **Site URL**: `https://SEU-DOMINIO.com`
   - **Redirect URLs**: `https://SEU-DOMINIO.com/auth/callback`
   - Também permita `https://SEU-DOMINIO.com/auth/callback?next=/update-password` se o Supabase exigir correspondência com query string. Confirme na tela da versão em produção.

**Nota:** no Supabase de 2026, tabelas podem não estar expostas automaticamente na Data API; o SQL inclui GRANTs e RLS. Se receber "table not exposed" ou 404, revise **Integrations > Data API > Exposed schemas / settings** do projeto. Jamais desative RLS como atalho.

## 2. Hostinger Web Hosting Business/Cloud

A documentação oficial da Hostinger informa que a hospedagem **Business/Cloud** suporta apps Next.js/Node.js pelo fluxo **Web App**. Hospedagens só de HTML/PHP não executam estas rotas API. Se você tem VPS, use as instruções da seção seguinte.

1. Hostinger **Websites > Create site > Web App** (não use o menu **Advanced > Git** de sites HTML/PHP).
2. Selecione o domínio ou domínio temporário.
3. **Import your Git repository** e selecione `jhonyv02/Ca-ador-de-Ofertas-IA`, branch `main`.
4. Framework/preset: **Next.js**; diretório do projeto: **/** (raiz); Node.js **22.x**.
5. Comandos quando solicitados: instalar `npm ci`, build `npm run build`, iniciar `npm run start`. Hospedagem gerenciada pode preencher isso automaticamente.
6. Antes do build, configure **Environment variables** com os valores **do projeto novo**:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
NEXT_PUBLIC_SITE_URL=https://SEU-DOMINIO.com
OPENAI_API_KEY=COLE_SOMENTE_NA_HOSTINGER
OPENAI_MODEL=gpt-4.1-mini
```

- `OPENAI_API_KEY` é opcional para cadastrar e salvar ofertas; é necessária para os botões **Analisar com IA**.
- `NEXT_PUBLIC_*` ficam embutidas no bundle na etapa de **build**: se você mudar alguma, execute **Redeploy** na Hostinger (apenas reiniciar não basta).
- `OPENAI_API_KEY` jamais deve ser colocada em `NEXT_PUBLIC_*` ou comitada no GitHub.
- Insira os valores no painel; **não publique seu arquivo `.env.local`**.

7. Clique **Deploy**. Consulte o dashboard **Deployments** e o log do build.
8. Configure o domínio definitivo no Supabase URL Configuration, se você começou com domínio temporário.

Fontes da Hostinger:
- https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- https://www.hostinger.com/support/how-to-add-environment-variables-during-node-js-application-deployment/
- https://www.hostinger.com/support/how-to-edit-or-add-environment-variables-after-deployment/

## 3. Hostinger VPS (alternativa)

Use VPS Linux com Node.js 22+, domínio HTTPS, Nginx/Caddy proxy reverso e gerenciador de processos. Exemplo (na VPS, com variáveis já configuradas em local seguro):

```bash
git clone https://github.com/jhonyv02/Ca-ador-de-Ofertas-IA.git
cd Ca-ador-de-Ofertas-IA
npm ci
npm run test:meta
npm run lint
npm run build
npm run start
```

Para manter ativo após logout, use serviço systemd, PM2 ou equivalente; configure TLS/HTTPS e backups.

## 4. Checklist de aceite antes de pesquisar ofertas

- [ ] O link `https://SEU-DOMINIO.com/login` abre sem erro e permite criar/entrar na conta.
- [ ] Cadastrar produto e atualizar página: continua salvo no Supabase.
- [ ] Salvar um anúncio Meta com `?id=123456789`; ID identificado e, se a Meta não fornecer data/status, formulário solicita complementação manual.
- [ ] Abrir anúncio e clicar **Verificar link agora**; histórico distingue **link** e **manual** e não presume que está inativo quando falha consulta.
- [ ] Fazer upload de imagem e abri-la novamente, confirmando Storage privado.
- [ ] Com `OPENAI_API_KEY` configurada e saldo de API, gerar uma análise e comparar ofertas.
- [ ] Testar conta secundária e confirmar isolamento por RLS (em uso multiusuário).
- [ ] Testar no celular e conferir redirecionamento de recuperação de senha.

## Limitações honestas

A Meta pode bloquear/ocultar o HTML. Esse sistema não acessa informações de gasto, ROI ou vendas do anunciante e **não garante** status/data automáticos de todos os links. A coleta é individual e sob demanda; o acompanhamento é manual por padrão (não há serviço cron configurado). A compilação no GitHub não substitui um teste de ponta a ponta na Hostinger com o Supabase.

Não compartilhe senhas, tokens, chaves privadas ou credenciais em prints públicos.
