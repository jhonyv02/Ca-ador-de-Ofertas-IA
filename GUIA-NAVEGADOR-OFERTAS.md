# Navegador de Ofertas IA — implantação na VPS existente

## O que o MVP faz
- Menu Navegador: sessão real do Chromium/Playwright com clique nas imagens, rolagem, teclado, voltar/avançar e URL.
- Botão Trazer esta oferta para o Caçador: salva título, URL, copy pública, preços candidatos, possíveis checkouts e print privado no Supabase.
- Sem chamada paga de IA: captura via navegador e leitura do DOM. Os dados extraídos precisam de revisão.
- É navegação por imagens sucessivas, não streaming de vídeo. Algumas páginas (inclusive Meta) podem exigir login, impedir acesso ou impedir captura. Não contorna restrições.

## Recursos/custo
O código usa software livre e não exige assinatura nova. Entretanto, Chromium utiliza RAM/CPU na VPS já paga e pode afetar o JVianaFlow. Antes de instalar, verificar uso com:
    free -h
    docker stats

Se não houver capacidade, não instalar no mesmo VPS. Isolar o worker em Docker, sem acesso a pastas ou chaves do JVianaFlow.

## Instalação do worker na VPS
1. Ter Docker e Docker Compose.
2. Baixar o repositório e entrar na pasta browser-worker.
3. Criar o arquivo .env local (NUNCA enviar ao GitHub) com esta variável:
    BROWSER_WORKER_TOKEN=UMA_CHAVE_GERADA_PELO_COMANDO_ABAIXO

   Gerar uma chave segura no terminal da VPS: openssl rand -hex 32.
4. Executar: docker compose up -d --build
5. Testar no próprio servidor:
    curl -H "Authorization: Bearer SUA_CHAVE" http://127.0.0.1:8765/health

O worker está disponível APENAS no 127.0.0.1 da VPS e não deve ficar exposto diretamente na internet.

## Configurar o Next.js do Caçador
Configurar NO SERVIDOR da Hostinger (nunca como NEXT_PUBLIC):
- BROWSER_WORKER_URL = http://127.0.0.1:8765 quando o Caçador e o worker estão na mesma VPS.
- BROWSER_WORKER_TOKEN = a mesma chave da VPS.

Se o Caçador e a VPS estão em máquinas diferentes, usar um proxy HTTPS seguro, ou túnel privado. Exemplo: https://browser.jvianaflow.online aproveitando o domínio atual, com Nginx + certificado TLS, apontando para 127.0.0.1:8765. Esse subdomínio deve ser configurado no DNS e NÃO expor portas HTTP do worker sem TLS. O worker exige a chave forte em todas as requisições.

Fazer redeploy da branch main na Hostinger, depois abrir /browser no Caçador.

## Segurança e limites
- Autenticação Supabase obrigatória; sessões pertencem ao usuário que as criou.
- Máximo de 2 sessões simultâneas, 1 por usuário, com prazo de inatividade de 15 minutos.
- Só HTTPS público, validação de DNS e bloqueio de IPs reservados. Downloads, WebSockets e pop-ups são bloqueados.
- Não insira senhas, login bancário ou dados pessoais nesse navegador de pesquisa.
- Prints salvos no bucket PRIVADO creatives, em pasta por usuário. A URL assinada é temporária.
- Sem comprovação de venda, anúncio ativo ou lucro do concorrente; preços capturados são referências.
- A segurança de um navegador que visita sites desconhecidos exige mais do que um contêiner Docker. Para uso amplo, implementar regras de firewall de saída bloqueando redes privadas e realizar auditoria de segurança (proteção contra DNS rebinding, isolamento de cookies e exploração de navegador).

## Verificação
Rodar npm run test:meta, npm run lint e npm run build na raiz do repositório; rodar node --check browser-worker/server.mjs para sintaxe do worker.
Nenhum SQL adicional é necessário: utiliza a tabela products e o bucket privado creatives já existentes.
O APK anterior apresenta a nova página quando o site da Hostinger for publicado; não é preciso gerar outro APK somente por essa mudança.
