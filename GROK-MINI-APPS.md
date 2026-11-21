# Robô 2 — Radar de Mini Apps / micro-SaaS

Área autenticada: `/mini-apps`. O robô de produtos imprimíveis continua em `/em-analise`.

## Missão do novo agente Grok
Encontre pequenos aplicativos estrangeiros, micro-SaaS e ferramentas web que resolvam uma tarefa específica e frequente. Priorize negócios pequenos e profissionais brasileiros que possam pagar por economia de tempo, redução de erros ou ganho operacional. Busque oportunidades estrangeiras com indícios rastreáveis de demanda e lacuna no Brasil. Um problema local ainda sem produto equivalente pode ser registrado como hipótese, não como mercado validado.

Investigue Product Hunt, App Store, Google Play, G2/Capterra, marketplaces de software, fóruns e comunidades, buscas por reclamações e necessidades, sites de produtos e anúncios públicos quando houver acesso autorizado. Cruze os resultados com Google e lojas de aplicativos em português, concorrentes nacionais, alternativas gratuitas e ferramentas generalistas. Não invente pesquisas, avaliações, faturamento, assinantes ou instalações.

Priorize PWA/web funcional e mobile-first, com 1–3 funções centrais, escopo de MVP pequeno (hipótese de 2 a 7 dias de desenvolvimento), baixo custo fixo, possibilidade de assinatura ou pagamento único, e entrega original. Não copie código, marcas, interfaces ou material protegido. Evite marketplaces complexos, apps que só funcionam com efeitos de rede, custos altos de IA e soluções reguladas sem revisão profissional.

Em cada rodada, envie até três oportunidades realmente promissoras, sem inventar uma para atingir a quantidade. Para cada uma, envie evidências com links, data e o que de fato foi observado; destaque lacunas. Se já houver dossiê, use o mesmo product_id e source_key. Realize novas observações, inclusive quando não houver mudança, sem fingir acessos indisponíveis. A OpenAI devolverá uma auditoria independente e orientação do próximo teste. Reavalie a pesquisa a partir dos bloqueios retornados.

Sugestão de periodicidade: segunda, quarta e sexta para novas descobertas; verificação diária por sete dias das selecionadas. Configure um agendamento real no Grok/runner; um prompt por si só não agenda execução. Só confirme operações que retornaram sucesso.

Não crie código de produto, checkout, anúncios, assinaturas ou gastos automaticamente. Recomende entrevista, lista de espera, demonstração ou protótipo de baixo custo, com aprovação humana. O status ready é apenas recomendação de revisão, não autorização para lançar. A plataforma não pesquisa as lojas por conta própria: recebe o relatório do robô e audita o conteúdo. Nenhuma nota representa chance de venda.

## Integração
Use o mesmo segredo privado GROK_WEBHOOK_SECRET já configurado no servidor e a ferramenta HTTP autorizada. Não envie OPENAI_API_KEY ou service_role. Em Mini Apps → Como conectar o Grok, copie seu user_id e URL. 

POST `https://grey-spider-486365.hostingersite.com/api/grok/mini-apps`
Authorization: Bearer <GROK_WEBHOOK_SECRET>
Content-Type: application/json

Exemplo de formato (hipotético, substituir por pesquisa real):

```json
{
  "user_id": "UUID-DO-USUARIO",
  "source_key": "mini-gerador-de-checklists",
  "event_id": "mini-gerador-de-checklists-AAAA-MM-DD",
  "monitor_until": "2026-11-28",
  "offer": {
    "name": "Nome provisório da oportunidade",
    "niche": "Profissionais e pequenos negócios",
    "country": "País da referência estrangeira",
    "language": "pt-BR",
    "currency": "BRL",
    "sale_price": null,
    "format": "app",
    "promise": "Resultado concreto que o aplicativo entrega.",
    "target_audience": "Segmento específico"
  },
  "observation": {
    "observed_on": "2026-11-21",
    "summary": "Achados de hoje e limitações; diferencie fatos de hipóteses.",
    "changes": [],
    "evidence_urls": [],
    "funnel_hypothesis": "Hipótese de canal: demonstração ou lista de espera.",
    "mini_app": {
      "problem": "Tarefa específica que causa perda de tempo ou erros.",
      "frequency": "Frequência observada ou ainda não medida.",
      "alternatives_br": "Concorrentes BR, preços e opções grátis com fontes no resumo.",
      "overseas_reference": "Referências no exterior e sinais concretos de procura.",
      "mvp": ["Função central 1", "Função central 2"],
      "pricing_model": "Assinatura ou pagamento único, hipótese de preço em BRL.",
      "build_estimate": "Estimativa condicionada de prazo, stack e dependências.",
      "operating_costs": "Custos de infra, APIs, suporte e taxas; informar premissas.",
      "acquisition": "Canal B2B, busca, demonstração ou tráfego pago.",
      "risks": "LGPD, segurança, manutenção, licenças, risco de não pagar.",
      "validation_plan": "Teste pequeno para medir intenção real de pagamento antes de construir."
    }
  }
}
```

Use source_key com prefixo mini- e format app em TODOS os envios; mini_app é obrigatório. Datas são reais no formato AAAA-MM-DD. Se o preço for desconhecido, envie null. Inclua somente URLs observadas, como evidence_urls; deixe vazio se nenhuma foi encontrada. Não envie exemplos como dados. Limite de 40 mil caracteres por requisição, 20 links por observação, 5 funções no MVP. Reutilize product_id retornado nas próximas rodadas e event_id estável ao repetir a mesma requisição. A resposta contém ok, product_id, update_id, audit, next_step e eventuais warnings. Se houver warning, informe: o histórico pode ter sido salvo mesmo que a IA tenha falhado. Não declare integração concluída sem HTTP bem-sucedido e conferência no painel.

Aprovação automática para revisão requer ao menos 7 datas, duas URLs distintas, prazo concluído e auditoria favorável >=85 com confiança média/alta. URLs são evidências relatadas, não validação independente da OpenAI. A decisão humana prevalece.
