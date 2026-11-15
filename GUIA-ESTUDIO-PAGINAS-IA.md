# Estúdio de Páginas com IA + Mockups (Caçador de Ofertas IA)

## O que foi implementado
O caminho é **Produtos > Abrir uma oferta > Remodelar página de vendas**.

1. **Página de referência**: modo automático escolhe entre páginas próprias já salvas e com ao menos 40 cliques, 2 compras e taxa plausível; modo manual aceita qualquer página própria salva; opção "sem campeã" usa layout original.
2. **Critério prudente**: o Caçador armazena dados por PRODUTO, não por variante de landing page. A preferência pela estrutura da página é hipótese baseada nesses dados, não inferência causal comprovada.
3. **Estrutura**: a IA gera copy original e aplica a ordem dos blocos (dor, benefícios, mockups, conteúdo/preço, passos, FAQ), cor e tema de uma referência própria.
4. **Mockups**: o HTML exportado inclui por padrão um mockup de livro digital + folhas ilustrativas e cartões conceituais responsivos, mesmo sem API de imagens.
5. **Imagens com IA**: o botão "Gerar página no estilo da campeã + mockups" pode gerar duas imagens (hero e galeria) quando a opção estiver marcada; pode também gerar as imagens separadamente.
6. **Edição**: escolha da ordem de blocos, estilo visual, URLs das imagens próprias, legendas, prévia celular/desktop e exportação HTML.
7. **Segurança**: modelos e imagens de concorrentes não são copiados; depoimentos e promessas inventadas não são permitidos.

## Pré-requisitos de produção
- Hostinger com `OPENAI_API_KEY` no **servidor**, `OPENAI_IMAGE_MODEL` opcional, por padrão `gpt-image-1`.
- Rodar **uma vez**, **somente no Supabase do Caçador**, o arquivo `supabase/upgrade-sales-assets.sql` no SQL Editor. Não usar o projeto Orça Já.
- O bucket `sales-page-assets` é **público para leitura por URL**, pois as imagens serão incorporadas a páginas públicas. Não enviar documentos privados de clientes ali. A escrita/exclusão é restrita ao usuário autenticado.
- Fazer redeploy da branch `main` na Hostinger. Se o site público mantiver a versão anterior, conferir o log de deploy e as variáveis.

## Conversão e métricas
- Só há referência automática quando existe uma página própria salva e mínimo de 40 cliques e 2 compras nos registros de `test_runs`.
- A taxa exibida é `compras / cliques`, **não a taxa individual de conversão de uma versão de página**.
- Se não existir campanha registrada, a interface informa ausência de campeão, mas continua permitindo criar páginas originais.

## Limitações
- A geração de imagens tem custo por chamada na API; há limite de 3 imagens por 20 min por usuário no processo do servidor.
- A chave não é enviada ao navegador.
- HTML exportado precisa ser publicado pelo usuário em seu domínio; salvar o rascunho não publica o site.
- Preços e bônus só devem aparecer quando verdadeiros; a IA usa descrições explicitamente confirmadas pelo usuário para gerar textos de entregáveis.
- Mockups sem fotografias são **ilustrações conceituais**, não imagens reais do arquivo/kit entregue.
- Para provar que a versão A vendeu mais que B, será necessário rastrear page_variant + visitas + compras por versão numa atualização posterior.
