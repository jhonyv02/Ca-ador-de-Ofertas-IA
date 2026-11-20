# Automação da auditoria e da decisão semanal

Este guia é para quem dispara a auditoria OpenAI e a decisão da semana de fora do site, sem login de usuário. Os botões **Analisar produto com IA** (`POST /api/analyze`) e **Análise crítica com IA** (`POST /api/weekly-direct`) continuam iguais: pedem a sessão e, no caso da semana, o parecer do botão fica só no navegador.

O site em produção é https://grey-spider-486365.hostingersite.com. Troque a URL nos exemplos se o domínio for outro. Não cole segredo real neste arquivo nem no Git.

## O que publicar antes

1. No Supabase, SQL Editor, cole e execute o arquivo inteiro `supabase/upgrade-auditoria-openai.sql`. O script é idempotente: pode rodar de novo. Ele não apaga ofertas. No final pede ao PostgREST para recarregar o schema.
2. Na Hostinger, nas variáveis do app Node.js, crie `ANALYZE_WEBHOOK_SECRET` com um valor de **pelo menos 24 caracteres**. Não use o texto `TROQUE_ESTE_SEGREDO_POR_UM_VALOR_LONGO`. Não use prefixo `NEXT_PUBLIC_`. Um jeito de gerar:

   ```sh
   openssl rand -base64 32
   ```

3. Confirme que `OPENAI_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já estão no servidor. Sem a chave da OpenAI ou sem o segredo, os hooks respondem `503`. Segredo certo no servidor e token diferente respondem `401`.
4. Salve e faça **Redeploy**. Reiniciar sem novo deploy pode não recarregar o ambiente.

O segredo da automação é independente de `PUSH_WEBHOOK_SECRET`. Os dois não precisam ser iguais.

## Auditoria de uma oferta

`POST /api/analyze/hook`

Corpo JSON, com os nomes exatamente assim:

```json
{"product_id":"UUID-DO-PRODUTO","user_id":"UUID-DO-USUARIO"}
```

O produto tem de pertencer a esse usuário. A linha gravada em `analyses` usa `kind = openai_audit`, `ad_id` nulo, e preenche `verdict` (`approve`, `reject` ou `needs_work`) e `blockers` (lista de textos). O limite é de 30 auditorias em 24 horas por usuário e só conta linhas `openai_audit`. O limite de 20 do botão não conta linhas com `model = Grok Bot` nem estas auditorias.

```sh
curl -sS -X POST "https://grey-spider-486365.hostingersite.com/api/analyze/hook" \
  -H "Authorization: Bearer $ANALYZE_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"UUID-DO-PRODUTO","user_id":"UUID-DO-USUARIO"}'
```

Resposta quando dá certo:

```json
{
  "analysis_id": "UUID-DA-ANALISE",
  "score": 0,
  "confidence": "low",
  "verdict": "needs_work",
  "blockers": ["Falta evidência de demanda"],
  "summary": "Texto curto da auditoria."
}
```

A nota não é probabilidade de venda. No dossiê, a pesquisa do assistente (modelo `Grok Bot`, critérios `facilidade`, `adequacao_br`, `demanda_exterior`, `diferenciacao` e `trafego_direto`) aparece separada da auditoria. O selo mostra **Aprovado**, **Reprovado** ou **Precisa ajuste**. O score do painel usa a auditoria quando ela existe.

`400` é corpo inválido. `404` é produto de outro usuário ou inexistente. `429` é o limite de 30. `502` ou `504` é falha da OpenAI.

## Decisão da semana

`POST /api/weekly-direct/hook`

```json
{"user_id":"UUID-DO-USUARIO","daily_budget":35}
```

`daily_budget` é opcional. Sem ele, o servidor usa 35. O valor, quando enviado, fica entre 5 e 5000, como no botão.

```sh
curl -sS -X POST "https://grey-spider-486365.hostingersite.com/api/weekly-direct/hook" \
  -H "Authorization: Bearer $ANALYZE_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"UUID-DO-USUARIO","daily_budget":35}'
```

O parecer é o mesmo da análise crítica. Além da resposta JSON, o servidor grava uma linha em `weekly_decisions` (`decision`, `product_id`, `rationale`, `risks`, `payload`, `model`, `created_at`). Cada usuário só lê as próprias linhas.

- `launch_one` ou `prepare_one` com produto: marca `weekly_pick = true` nessa oferta. O gatilho que já existia tira a marca das outras e envia o aviso "Escolha da semana".
- `no_viable_offer`: não muda nenhuma oferta.

A página `/semana` mostra a última decisão gravada, mesmo que o botão não tenha sido clicado naquele navegador. O botão continua salvando o parecer local e não grava essa tabela.

## Aviso quando a oferta fica pronta

O mesmo SQL estende o gatilho `trg_products_push`. Quando `products.status` **muda** para `ready`, o banco chama `/api/push/hook` com o evento `ready_for_approval`. O texto é "Produto preparado para aprovação: " seguido do nome. Inserir a oferta já pronta, ou salvar de novo sem sair de `ready`, não gera esse aviso. "Nova oferta" e "Escolha da semana" permanecem como estavam. O detalhe do celular está em `NOTIFICACOES.md`.
