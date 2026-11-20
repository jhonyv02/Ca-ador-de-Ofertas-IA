# Notificações, formato e escolha da semana

Guia para o dono do Caçador de Ofertas IA. O site em produção é https://grey-spider-486365.hostingersite.com e o banco é o projeto Supabase `brhnrukuwqbfhbyruzak`.

## Por que o card dizia "Formato não informado"

O card lia somente a linha `#formato-digital:...` dentro de `products.notes`. A facilidade era calculada só por essa tag. Uma análise com nota e `breakdown` não entrava no card. Agora o card lê, nesta ordem:

1. `products.format` e `products.difficulty`
2. se a dificuldade estiver vazia, os pontos de facilidade em `analyses.breakdown`
3. se ainda não houver dificuldade, a tag antiga nas anotações
4. se nada disso existir, continua "Formato não informado" e "Facilidade: Não avaliado"

## O que o assistente grava via REST

Uma linha em `products` por usuário. Não envie `null` nestes campos: omita ou use os valores abaixo.

| Coluna | Valores aceitos | Efeito |
| --- | --- | --- |
| `format` | `printable`, `templates`, `planilha`, `ebook`, `biblioteca`, `audio`, `curso`, `app` ou `""` | Texto do card. `printable` Atividades para imprimir; `templates` Modelos / templates; `planilha` Planilhas / calculadoras; `ebook` E-book / guia; `biblioteca` Biblioteca de materiais; `audio` Áudios / meditações; `curso` Curso em vídeo; `app` Aplicativo / plataforma. |
| `difficulty` | `facil`, `moderada`, `dificil` ou `""` | `facil` = Menor esforço estimado; `moderada` = Esforço moderado; `dificil` = Maior esforço estimado. Vazio deixa o app calcular. |
| `weekly_pick` | `true` ou `false` | `true` marca a escolha da semana, tira a marca das outras ofertas daquele usuário, mostra o selo no painel e envia o aviso "Escolha da semana". `false` não avisa. |

Pontos de facilidade, quando `difficulty` vier vazio: no `breakdown` da análise do produto, grave `ease` com um inteiro de 0 a 30. Quanto maior, mais fácil. O card mostra, por exemplo, `Menor esforço estimado · 24/30`. Também aceita a chave `facilidade`. A chave `execution` de 0 a 15 é a da análise oficial do app; acima de 15 o app trata como a escala de 30.

Exemplo de oferta nova que já é a prioridade da semana:

```json
{
  "user_id": "UUID-DO-USUARIO",
  "name": "Planner de rotina infantil",
  "product_type": "digital",
  "format": "printable",
  "difficulty": "facil",
  "weekly_pick": true,
  "status": "researching"
}
```

E, na análise desse produto, `"breakdown": {"ease": 24}`. Cada usuário só é avisado sobre a linha em que o `user_id` é o dele.

## Passo a passo no ar

1. Gere as chaves de notificação na sua máquina, sem commitar o resultado:

   ```sh
   npx web-push generate-vapid-keys
   ```

2. Gere um segredo longo, com pelo menos 24 caracteres, para o banco chamar o site. Um jeito:

   ```sh
   openssl rand -base64 32
   ```

3. Abra `supabase/upgrade-notificacoes-formato.sql`. Troque `TROQUE_ESTE_SEGREDO_POR_UM_VALOR_LONGO` por esse segredo. A URL já aponta para `https://grey-spider-486365.hostingersite.com/api/push/hook`.
4. No Supabase, SQL Editor, cole o arquivo inteiro e execute. O script só adiciona colunas, a tabela de inscrições e os gatilhos. Não apaga ofertas.
5. Se o segredo ficou o texto de exemplo, as ofertas continuam sendo salvas, mas o aviso não sai. Corrija com:

   ```sql
   update private.push_settings
   set webhook_url = 'https://grey-spider-486365.hostingersite.com/api/push/hook',
       webhook_secret = 'COLE_O_SEGREDO_AQUI'
   where id = 1;
   ```

6. Na Hostinger, no site Node.js, abra as variáveis de ambiente e salve:

   | Variável | Onde vai | Valor |
   | --- | --- | --- |
   | `VAPID_PUBLIC_KEY` | servidor | chave pública gerada no passo 1 |
   | `VAPID_PRIVATE_KEY` | servidor | chave privada gerada no passo 1 |
   | `VAPID_SUBJECT` | servidor | `mailto:seu-email` ou `https://grey-spider-486365.hostingersite.com` |
   | `PUSH_WEBHOOK_SECRET` | servidor | o mesmo segredo do SQL |
   | `SUPABASE_SERVICE_ROLE_KEY` | servidor | secret key ou service_role do Supabase, em Settings → API Keys |

   Não use prefixo `NEXT_PUBLIC_` nestas cinco. Não cole a service role no navegador nem no GitHub. As variáveis que já existiam (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`) continuam iguais.

   Na hospedagem da Hostinger: Websites → o site do Caçador → configurações do app Node.js → Environment variables. Salve e faça **Redeploy**. Reiniciar sem novo deploy pode não recarregar o ambiente. O caminho oficial está em [como editar variáveis depois do deploy](https://www.hostinger.com/support/how-to-edit-or-add-environment-variables-after-deployment/).

7. No celular, entre na conta **pelo ícone certo** e ative o aviso. O caminho simples é este. Não precisa mexer no APK.

   **Android — use o Chrome, não o APK.** O ícone que você já tem no celular é um APK deste repositório (`android/`, pacote `com.jviana.cacadordeofertas`). Ele só abre o site numa WebView. Não é Capacitor, não é TWA e não tem Firebase. O Android não entrega Web Push dentro dessa janela, então o botão de ativar não funciona ali.

   Faça assim:
   1. Abra o **Chrome**.
   2. Entre em https://grey-spider-486365.hostingersite.com e faça login.
   3. Toque nos três pontinhos e em **Instalar app** (em alguns aparelhos o texto é **Adicionar à tela inicial**).
   4. Abra o **ícone novo** do Caçador, o que o Chrome criou. Não use o APK antigo para os avisos.
   5. Vá em Configurações e toque em **Ativar notificações neste aparelho**. Aceite a permissão.

   Pode continuar usando o APK para consultar ofertas. Os avisos chegam no ícone instalado pelo Chrome. Os dois entram na mesma conta.

   **iPhone ou iPad (iOS 16.4 ou mais novo):** o Safari comum também não recebe o aviso. No Safari, toque em Compartilhar → Adicionar à Tela de Início. Abra o Caçador por esse ícone, vá em Configurações e toque em **Ativar notificações neste aparelho**.

   **Se um dia quiser o aviso dentro de um APK**, o caminho mais curto ainda é o Web Push que este site já tem, trocando a WebView por uma Trusted Web Activity (TWA) feita com o Bubblewrap. O Chrome passa a abrir o site em tela cheia e consegue mostrar a notificação, desde que o site publique o `assetlinks.json` e o APK seja assinado de novo. Isso é outro aplicativo, não um ajuste pequeno neste APK. Capacitor seria ainda mais trabalhoso: exigiria Firebase Cloud Messaging (projeto Firebase, `google-services.json` e código nativo) e não reaproveita sozinho estas chaves VAPID. Para quem não vai publicar na Play Store nem manter Firebase, fique no ícone instalado pelo Chrome.

8. Confira com uma oferta de teste na sua conta. Inserir em `products` deve gerar "Nova oferta". Mudar `weekly_pick` para `true` deve gerar "Escolha da semana" e o selo dourado no painel, na lista de produtos e na decisão da semana. Mudar `status` de outro valor para `ready` deve gerar "Pronto para aprovação", com o texto "Produto preparado para aprovação: " e o nome da oferta. Inserir a oferta já com status `ready` não dispara esse aviso: ele só sai na transição. O toque na notificação abre a oferta.

A auditoria OpenAI e a decisão semanal disparadas por uma automação externa, sem login, estão em `AUTOMACAO.md`. Elas usam outro segredo, `ANALYZE_WEBHOOK_SECRET`, e o SQL `supabase/upgrade-auditoria-openai.sql`.

Se o aviso não chegar, no SQL Editor:

```sql
select status_code, error_msg, created
from net._http_response
order by created desc
limit 10;
```

`401` é segredo diferente entre o banco e a Hostinger. `503` é chave VAPID ou service role faltando. A oferta é salva mesmo quando o aviso falha.
