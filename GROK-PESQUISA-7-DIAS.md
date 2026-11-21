# Grok → Caçador: acompanhamento de 7 dias

## Onde os dados ficam
- Menu do Caçador: **Em análise**, em `/em-analise`.
- Cada envio do Grok grava uma linha histórica em `analyses` (modelo `Grok Monitor`) no projeto Supabase **do próprio Caçador**.
- Cada ID individual de anúncio Meta enviado no campo `ads` é salvo em `ads`, com uma nova observação em `ad_snapshots`. Uma URL de pesquisa sem ID individual não é tratada como anúncio confirmado.
- A OpenAI usa a chave **já configurada no servidor**, faz uma auditoria independente e registra `openai_audit`, incluindo sugestão do funil (página, WhatsApp, híbrido ou indefinido).
- Não são criados anúncios nem checkouts. Só se propõe `ready` após pelo menos 7 datas distintas, 2 links de evidência, fim do período e auditoria favorável com pelo menos 85/100 e confiança média/alta. A pontuação NÃO é a probabilidade de vender.
- A marcação `ready` é uma recomendação **para revisão humana**, não autorização para gastar dinheiro.

## Configuração necessária uma única vez
1. Na Hostinger, adicione `GROK_WEBHOOK_SECRET` (segredo aleatório de no mínimo 24 caracteres, privado) às variáveis do servidor e faça redeploy.
2. Certifique-se de que `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` e as colunas de auditoria (`supabase/upgrade-auditoria-openai.sql`) estão operacionais.
3. No Caçador, abra **Em análise → Como conectar o Grok**. Copie a URL do endpoint e o `user_id` exibidos na área autenticada.
4. No Grok ou na automação que o executa, configure uma ferramenta de **HTTP POST autenticado**. Conversar com o Grok não cria, por si só, uma tarefa diária nem chama esse endpoint.
5. Configure verificações diárias de **21 a 28/11/2026** (ou outro período escolhido) e confirme que cada chamada recebeu `ok:true`. Não exponha a chave OpenAI nem a `service_role` ao Grok. Use apenas o segredo específico de integração em ambiente protegido.

Endpoint de produção de referência (confirme a URL atual no Caçador):

```text
POST https://grey-spider-486365.hostingersite.com/api/grok/research
Authorization: Bearer <GROK_WEBHOOK_SECRET>
Content-Type: application/json
```

## Formato completo da atualização

Exemplo da primeira pesquisa (substitua USER_ID pelo seu identificador real e inclua **somente observações verificadas**). Os anúncios do exemplo são referências; não é uma afirmação de que foram verificados pelo sistema.

```json
{
  "user_id": "UUID-DO-USUARIO",
  "source_key": "pasta-familia-preventiva",
  "event_id": "pasta-familia-2026-11-21",
  "monitor_until": "2026-11-28",
  "offer": {
    "name": "Pasta da Família — Prevenção",
    "niche": "Organização familiar",
    "country": "Brasil",
    "language": "pt-BR",
    "currency": "BRL",
    "sale_price": 29.9,
    "format": "ebook",
    "promise": "Organizar informações importantes antes de uma emergência.",
    "target_audience": "Famílias brasileiras",
    "ad_library_url": "https://www.facebook.com/ads/library/?id=1734261794294518"
  },
  "observation": {
    "observed_on": "2026-11-21",
    "summary": "Resumo factual do que foi consultado hoje, indicando também limites de acesso.",
    "changes": [
      "Preço da referência, se verificado, e o respectivo link",
      "Criativo novo, removido ou mudança na página, somente se comprovado"
    ],
    "evidence_urls": [
      "https://www.facebook.com/ads/library/?id=1734261794294518"
    ],
    "funnel_hypothesis": "Hipótese inicial: página de vendas, ainda sem validação.",
    "ads": [
      {
        "url": "https://www.facebook.com/ads/library/?id=1734261794294518",
        "name": "Pasta da Tranquilidade — referência",
        "advertiser": "Anunciante a confirmar",
        "status": "unknown",
        "started_at": null,
        "change": "O status não foi verificado automaticamente."
      }
    ]
  }
}
```

Na resposta, salve `product_id`; nas atualizações seguintes envie **esse mesmo UUID** e mantenha `source_key`. Use `event_id` distinto para cada verificação (por exemplo `pasta-familia-2026-11-22`). Reenviar o mesmo `event_id` não duplica a linha.

A segunda oferta deve usar `source_key: "primeiros-passos-pos-falecimento"`, outro nome e `event_id` próprio. O mesmo período termina em 28/11/2026.

## Instrução para o Grok

> Faça uma verificação diária da Pasta da Família e de um produto que orienta familiares após um falecimento até 28/11/2026. Pesquise anúncios, preço, concorrentes, mudanças nas páginas e sinais de intenção de compra. Compare o achado de hoje com o histórico salvo. Em cada dia, gere uma atualização factual separada por produto no formato JSON deste documento e envie via HTTP POST autenticado ao Caçador. Reutilize o product_id retornado, nunca duplique o produto. Links sem acesso ou indisponíveis devem aparecer como não verificados; não infira vendas de anúncios ativos. A OpenAI do Caçador decide entre observar, preparar, descartar ou recomendar teste e entre página de vendas, WhatsApp ou híbrido. Não publique anúncio, não crie checkout e não altere página sem autorização. Mostre os erros de integração e confirme cada envio. Ao final, compare os dois dossiês, mas mantenha todas as verificações históricas.

## Retorno esperado e resolução de erros
- `200` + `ok:true`: oferta e observação gravadas, com `product_id` e resultado da auditoria (ou aviso de falha da OpenAI).
- `200` + `duplicate:true`: evento já recebido, nenhuma nova auditoria.
- `401`: segredo do Grok errado/ausente.
- `503`: segredo de integração ou chave Supabase no servidor ausente.
- `400`: JSON ou formato de campos inválido.
- `500`: gravação no Supabase falhou. Verifique se o projeto conectado ao Caçador tem as tabelas e colunas esperadas.
- `warning`: dados salvos, mas auditoria não pôde concluir; não declarar oferta aprovada.
- Anúncios individuais podem sumir da visualização pública da Meta por região, status, login ou políticas. O link alternativo de busca por domínio não garante que existam anúncios ativos.
