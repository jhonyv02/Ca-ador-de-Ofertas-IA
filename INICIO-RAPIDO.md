# INÍCIO RÁPIDO — Caçador de Ofertas IA

## 1. Preparar o banco (uma vez)

O banco **ainda não é criado pela Hostinger nem pelo GitHub**.

1. Abra [SQL completo para copiar](https://github.com/jhonyv02/Ca-ador-de-Ofertas-IA/blob/main/supabase/schema.sql). Clique em **Raw** e copie o texto inteiro.
2. Abra o [SQL Editor do Supabase Caçador](https://supabase.com/dashboard/project/brhnrukuwqbfhbyruzak/sql/new).
3. Cole o SQL e clique **Run**. O resultado final deve mostrar as 5 tabelas: **products, ads, ad_snapshots, analyses e test_runs**.

**Atenção:** confirme no topo do Supabase que está no projeto `brhnrukuwqbfhbyruzak`, **não** no banco do OrçaJá. O SQL pode ser executado outra vez se as tabelas tiverem sido criadas parcialmente. Ele não apaga produtos/anúncios já salvos, mas recria as políticas nomeadas para garantir isolamento de usuários.

## 2. Publicar a atualização

Na Hostinger, faça **Reimplantar** a versão mais recente de `main`. Configure `NEXT_PUBLIC_SUPABASE_URL=https://brhnrukuwqbfhbyruzak.supabase.co` e a chave **Publishable** desse mesmo projeto. As demais variáveis estão documentadas em [HOSTINGER-PRODUCAO.md](HOSTINGER-PRODUCAO.md).

## 3. Usar o sistema

- Abra o painel e clique **Salvar anúncio**.
- Cole o link da Biblioteca da Meta e clique **Consultar link**.
- Selecione um produto já existente ou digite o nome de um novo.
- Caso a Meta não revele data/status, clique **Completar manualmente**.
- Clique **Salvar**. Depois acesse **Comparar** para ver as oportunidades.

**Idiomas:** o painel oferece um seletor persistente com 16 opções; a interface principal está localizada nos idiomas principais e algumas telas de apoio ainda exibem textos em português. O idioma de uma oferta pode ser digitado em formato BCP-47 (ex.: `pt-BR`, `es`, `en`, `ar`). A análise IA recebe o idioma do painel. Não é uma tradução universal automática de qualquer texto.

**Moedas:** o cadastro permite selecionar códigos ISO 4217 disponíveis no ambiente (preferência por moedas mais usadas); a moeda padrão é salva no navegador em Configurações. Os preços não são convertidos automaticamente.

**Limitações:** links da Meta podem retornar apenas o ID; dados de vendas, CPA e lucros alheios não são disponibilizados. Não use duração do anúncio como prova de rentabilidade.
