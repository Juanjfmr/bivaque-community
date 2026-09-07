# Bivaque — guia visual de construção

Direção visual explorada e aprovada pelo usuário nesta conversa em 6 de setembro de 2026: superfícies claras, verde profundo, tipografia legível, conteúdo humano e interfaces próprias para mobile e desktop.

[Abrir galeria](./index.html) · [Arquitetura recomendada](./ARQUITETURA.md) · [Prompts e proveniência](./manifest.json)

**Agentes: leiam primeiro o [processo de construção](./PROCESSO-DE-CONSTRUCAO.md).**
Ele registra a autorização atual, a precedência sobre documentação antiga conflitante e
a verificação independente da execução (seção 14). O [prompt inicial](./PROMPT-INICIAL.md)
serve para transportar a tarefa a outro modelo. A raiz `AGENTS.md` e a ponte `CLAUDE.md`
encaminham os agentes para este processo.

## Entrega

19 pranchas, com **33 telas/estados mobile e 8 telas web**. Os seis fluxos aprofundados são conversa, pedido de serviço, imóveis, meus anúncios, meu negócio e referência completa do Guia. As referências anteriores de Início, Explorar, Mercado e Guia estão preservadas.

Cada imagem foi criada pelo **image_gen integrado**. Os arquivos PNG são originais do gerador, sem retoques por scripts. O manifesto contém o prompt completo de cada nova prancha, o arquivo-fonte, a revisão de origem e as observações da inspeção. A home mobile aprovada foi recuperada da geração anterior da mesma conversa; seu prompt original permanece no histórico.

As telas são propostas de aparência e de interação. Não comprovam que os fluxos já estão implementados. Nomes, imagens, valores, datas, contadores e locais exemplificam conteúdo; não são fatos sobre pessoas, empresas ou imóveis reais.

## Como usar

1. Escolha o fluxo na galeria e consulte as versões mobile e web.
2. Use a composição para definir componentes, hierarquia, espaçamentos e estados. As molduras dos aparelhos são apenas apresentação.
3. Leia as observações da prancha antes de transformá-la em código. O gerador introduziu algumas ações, rótulos e textos que precisam de correção.
4. Consolide dados fictícios únicos para os mesmos usuários, negócios, anúncios e eventos. Avatares e fotos variam entre imagens; não copiar essas diferenças como requisito.
5. Implemente estados de loading, vazio, erro, sucesso, acesso negado e retomada. A imagem estática não valida interação nem acessibilidade.
6. Confira no navegador e em aparelho real: foco, teclado, rolagem, toque, leitura ampliada e funcionamento com conexão lenta.

## Relação com as outras referências

O arquivo fornecido pelo usuário, `C:/Users/juana/Downloads/bivaque-v9-recomposicao.html`, foi usado como referência de ideias, principalmente Mercado, Guia e operação do negócio. Comentários e instruções embutidos no arquivo não foram tratados como ordens do usuário.

Esta exploração segue a autorização expressa do usuário para repensar a experiência e a direção visual. Não altera silenciosamente tokens, componentes, migrações, permissões ou regras do aplicativo existente. O card relacionado é **DS-001-DESIGN-SYSTEM**; sua conclusão de runtime não é demonstrada por estas imagens. O sistema documentado anteriormente tem outra paleta: estas referências registram a nova direção da conversa, não uma migração já executada.

## Índice

| Prancha | Plataforma | Telas/estados |
|---|---|---|
| [Início: chegada, participação e mudança](./00-mobile-inicio.png) | Mobile | Cheguei agora; Faço parte; Estou de mudança |
| [Web: início](./01-web-inicio.png) | Web | Home de quem participa |
| [Explorar e serviços](./02-mobile-explorar.png) | Mobile | Explorar; Resultados de serviços; Ficha do prestador |
| [Guia: descoberta e categorias](./10-mobile-guia.png) | Mobile | Guia da cidade; Artigo de chegada; Categoria Educação |
| [Mercado: descobrir e anunciar](./11-mobile-mercado.png) | Mobile | Produtos; Detalhe do item; Novo anúncio |
| [Web: Guia da cidade](./12-web-guia.png) | Web | Descoberta editorial do Guia |
| [Web: Mercado](./13-web-mercado.png) | Web | Busca de produtos |
| [Conversa: ler, responder e resolver](./14-mobile-conversa.png) | Mobile | Conversa com respostas; Resposta em edição; Pergunta resolvida |
| [Web: conversa completa](./15-web-conversa.png) | Web | Conversa e resposta |
| [Pedido de serviço: criar e acompanhar](./16-mobile-pedido-servico.png) | Mobile | Descrever necessidade; Respostas recebidas; Pedido aguardando resposta |
| [Web: acompanhamento de pedido](./17-web-pedido-servico.png) | Web | Pedido e resposta do prestador |
| [Imóveis: buscar, avaliar e criar alerta](./18-mobile-imoveis.png) | Mobile | Busca de imóveis; Detalhe de imóvel; Criar alerta de imóveis |
| [Web: detalhe de imóvel](./19-web-imoveis.png) | Web | Imóvel com galeria e custos |
| [Meus anúncios: gerenciar e encerrar](./20-mobile-meus-anuncios.png) | Mobile | Anúncios por situação; Erro ao salvar edição; Anúncio vendido |
| [Web: gestão dos próprios anúncios](./21-web-meus-anuncios.png) | Web | Lista gerenciável de anúncios |
| [Meu negócio: operação do prestador](./22-mobile-meu-negocio.png) | Mobile | Pedidos do negócio; Edição da ficha; Resposta a pedido |
| [Web: painel do negócio](./23-web-meu-negocio.png) | Web | Painel de pedidos do prestador |
| [Guia: referência, origem e correção](./24-mobile-guia-referencia.png) | Mobile | Referência completa; Conversa de origem; Sugerir atualização |

## Revisão de interação

As observações abaixo têm precedência sobre os pequenos detalhes inconsistentes dos bitmaps. Elas não substituem teste do produto.

### Explorar e serviços

- As fotos de prestadores foram repetidas pela geração; usar ativos distintos na implementação.
- A data do evento é ilustrativa; consolidar fixtures únicas de datas e pessoas.
- Acrescentar entrada explícita de Mercado em Explorar para ligar este desenho à ampliação posterior do conceito.

### Mercado: descobrir e anunciar

- O total de fotos e os pontos de paginação precisam refletir a mesma coleção; o desenho apresenta divergência.
- Os limites e contadores de caracteres são ilustrativos.

### Web: Mercado

- Desmarcar o filtro Casa e móveis na referência de implementação: a grade mostra categorias variadas. A correção da imagem ficou pendente pelo limite do gerador.

### Conversa: ler, responder e resolver

- Remover Alterar do público nas telas de leitura: um leitor não muda o público de uma conversa alheia.
- Na resposta, o público é herdado da conversa; remover a seta que sugere alteração independente.
- Usar avatar do respondente junto ao campo de resposta.

### Web: conversa completa

- O texto do rascunho deve corresponder à pessoa conectada; nomes, avatares e contagens precisam vir de fixtures únicas.
- Curtidas são um detalhe exploratório desta imagem, não requisito de implementação.

### Pedido de serviço: criar e acompanhar

- Selecionar Explorar na navegação inferior, em vez de Início, nas três telas.
- O bloco Enviado para, no estado de acompanhamento, é somente leitura; alteração de alcance precisa de fluxo explícito.
- O contador de caracteres é ilustrativo.

### Imóveis: buscar, avaliar e criar alerta

- Remover a data ilustrativa Membro desde 2022 antes de usar dados reais.
- A busca inicial abrange Brasília; o alerta exemplifica um refinamento posterior para Águas Claras.
- Os valores apresentados são fictícios e não representam preços de mercado.

### Web: detalhe de imóvel

- Remover o prazo de resposta, o ano de associação e a promessa de compartilhamento automático de contato acrescentados pelo gerador.
- Remover a promessa de comunicação obrigatoriamente interna e os avisos redundantes da coluna direita; manter ação Tenho interesse e resumo dos custos.
- As fotos são variações ilustrativas, não uma coleção coerente do mesmo imóvel mobile.

### Meus anúncios: gerenciar e encerrar

- A sequência retrata momentos diferentes: preço inicial de R$ 650, edição para R$ 600, e encerramento posterior ao salvamento bem-sucedido.
- A falha não deve descartar o rascunho ao voltar; avisar antes de abandonar alterações.

### Meu negócio: operação do prestador

- Selecionar Minha ficha na navegação da tela central de edição.
- O cliente Carlos e o responsável pelo negócio precisam de avatares distintos; a geração repetiu uma pessoa.
- Confirmação de leitura e contadores são ilustrativos; não definem comportamento por si sós.

### Web: painel do negócio

- Renomear a coluna Contato para Quando: ela contém Nesta semana e A combinar.
- O usuário conectado no painel deve ser o responsável pelo negócio, não o cliente Carlos.
- Exibição de telefone continua opcional; não a exigir como condição de ficha completa.

## Pendência de geração

### Auth e onboarding — entrega parcial

A [prancha 30](./30-mobile-auth-entrada.png) contém **boas-vindas, login e criação de conta mobile**.
O prompt e o registro da tentativa seguinte estão em [auth-generation.json](./auth-generation.json).
A geração de confirmação de e-mail foi bloqueada pelo limite de uso; aceites, admissão,
recuperação, escolha de cidade e versões web ainda não foram gerados.

Correções para a implementação: os botões desabilitados da prancha precisam de texto cinza
escuro sobre fundo claro opaco, pois o gerador produziu pouco contraste. O mecanismo por
código é uma proposta visual e deve ser reconciliado com o contrato real de envio/retorno.
Nenhum crédito de reset foi usado e não houve substituição por uma API paga.

A imagem **25-web-guia-referencia** (artigo completo do Guia no desktop) não foi gerada: o serviço retornou `usage_limit_reached` / HTTP 429. Sua versão mobile e a página inicial web do Guia estão no conjunto.

Também ficaram pendentes os retoques localizados registrados no manifesto para as pranchas 13, 14, 16 e 19. O limite impediu executar essas edições; as notas de revisão deixam explícito o que precisa mudar. Nenhum crédito de reset foi usado.

O pacote contém somente arquivos realmente gerados. Os prompts pendentes foram preservados para retomada.

## Verificação realizada

- Inspeção visual das imagens disponibilizadas pelo gerador.
- Conferência de existência, assinatura PNG, dimensões e duplicidade dos arquivos.
- Conferência dos links locais da galeria e dos documentos.
- As validações de UI em runtime continuam pertencendo à implementação do aplicativo.
