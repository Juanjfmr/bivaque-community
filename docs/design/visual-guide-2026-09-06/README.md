# Bivaque — guia visual de construção

Atualizado em 07/09/2026. Direção aprovada pelo responsável: superfícies claras, verde profundo, conteúdo humano e interfaces próprias para mobile e desktop. Produto nacional; cidades nas imagens são exemplos.

[Abrir galeria](./index.html) · [Mapa de telas](./MAPA-DE-TELAS.md) · [Arquitetura](./ARQUITETURA.md) · [Modelos para construção](./MODELOS-PARA-CONSTRUCAO.md) · [Prompts e fontes](./manifest.json)

**Agentes: leiam primeiro o [processo de construção](./PROCESSO-DE-CONSTRUCAO.md), as [seis correções do responsável](./DECISOES-2026-09-07.md) e as [instruções do guia](./AGENTS.md).** Depois, consultem os [modelos para construção](./MODELOS-PARA-CONSTRUCAO.md) ao escolher um agente visual. Notas textuais atuais prevalecem sobre inconsistências dos bitmaps e decisões de produto antigas conflitantes. O [prompt inicial](./PROMPT-INICIAL.md) orienta a passagem a outro modelo.

## Entrega efetiva

55 pranchas, com referências adicionais para estados mobile e web nesta ampliação. As imagens orientam aparência e fluxo; não comprovam implementação.

Os PNGs foram gerados e editados pelo image_gen integrado, sem retoque por scripts. Fontes históricas, prompts executados e correções pendentes estão em [expansion-generation.json](./expansion-generation.json). As imagens são propostas de aparência/interação. Pessoas, fotos, valores, datas e contagens são fictícios; consolidar fixtures coerentes ao implementar.

## Correções solicitadas

| Decisão | Situação das imagens |
|---|---|
| Sou militar das Forças Armadas | Aplicada na 32; propagar para a 38 web. Manter a opção selecionável e os demais papéis elegíveis. |
| CPF quase imediato; identidade com reconhecimento por IA como alternativa | Aplicada nas 32/33 mobile; a espera da 33 é da identidade. Propagação web 38 e detalhe adicional do envio/erro ainda pendentes. |
| Motivo opcional para participar | Decisão e contrato de interação registrados; edição das 40/42 bloqueada pelo limite. Antes de enviar deve haver campo opcional, mesmo que o bitmap ainda não o mostre. |
| Perguntar para toda a cidade | Aplicada na 44 mobile; propagar para a 45 web. |
| Pedir mais informações sobre evento | Aplicada na 46 mobile; propagar para a 48 web e detalhes após cancelar presença. |
| Força Armada e OM opcionais, com escolha de visibilidade | Aplicada na 39 web, com controles individuais inicialmente desligados; propagar para 34/49 mobile e futura 51 web. |

A especificação completa está em [DECISOES-2026-09-07.md](./DECISOES-2026-09-07.md). Essas escolhas já foram autorizadas; não pedir nova confirmação somente porque documentação antiga proíbe afiliação declarada ou envio de identidade.

## Como usar com um modelo

1. Entregue uma tarefa pequena, a imagem da plataforma, as notas correspondentes e os componentes/contratos existentes.
2. Peça que inspecione a imagem e identifique campos, ações, público e estados. Se não enxergar, deve declarar essa limitação.
3. Construa componentes responsivos, sem embutir a imagem inteira ou copiar moldura de telefone. Dois desktops numa prancha representam duas telas independentes.
4. Feche entrada, ação, feedback, retorno e falha principal. Não inferir backend, permissão ou regra por aparência de um botão.
5. Execute a interface, compare uma captura com a referência e valide teclado, toque, rolagem e recuperação. Capacidade de enxergar imagem não comprova capacidade de implementar o aplicativo.
6. Escolha um modelo com entrada de imagem e siga o protocolo de comparação em [Modelos para construção](./MODELOS-PARA-CONSTRUCAO.md). Preço e benchmark do fornecedor não substituem a validação desta tarefa.

## Índice

| Prancha | Plataforma | Telas/estados |
|---|---|---|
| [00-mobile-inicio — Início: chegada, participação e mudança](./00-mobile-inicio.png) | mobile | Cheguei agora; Faço parte; Estou de mudança |
| [01-web-inicio — Web: início](./01-web-inicio.png) | web | Home de quem participa |
| [02-mobile-explorar — Explorar e serviços](./02-mobile-explorar.png) | mobile | Explorar; Resultados de serviços; Ficha do prestador |
| [10-mobile-guia — Guia: descoberta e categorias](./10-mobile-guia.png) | mobile | Guia da cidade; Artigo de chegada; Categoria Educação |
| [11-mobile-mercado — Mercado: descobrir e anunciar](./11-mobile-mercado.png) | mobile | Produtos; Detalhe do item; Novo anúncio |
| [12-web-guia — Web: Guia da cidade](./12-web-guia.png) | web | Descoberta editorial do Guia |
| [13-web-mercado — Web: Mercado](./13-web-mercado.png) | web | Busca de produtos |
| [14-mobile-conversa — Conversa: ler, responder e resolver](./14-mobile-conversa.png) | mobile | Conversa com respostas; Resposta em edição; Pergunta resolvida |
| [15-web-conversa — Web: conversa completa](./15-web-conversa.png) | web | Conversa e resposta |
| [16-mobile-pedido-servico — Pedido de serviço: criar e acompanhar](./16-mobile-pedido-servico.png) | mobile | Descrever necessidade; Respostas recebidas; Pedido aguardando resposta |
| [17-web-pedido-servico — Web: acompanhamento de pedido](./17-web-pedido-servico.png) | web | Pedido e resposta do prestador |
| [18-mobile-imoveis — Imóveis: buscar, avaliar e criar alerta](./18-mobile-imoveis.png) | mobile | Busca de imóveis; Detalhe de imóvel; Criar alerta de imóveis |
| [19-web-imoveis — Web: detalhe de imóvel](./19-web-imoveis.png) | web | Imóvel com galeria e custos |
| [20-mobile-meus-anuncios — Meus anúncios: gerenciar e encerrar](./20-mobile-meus-anuncios.png) | mobile | Anúncios por situação; Erro ao salvar edição; Anúncio vendido |
| [21-web-meus-anuncios — Web: gestão dos próprios anúncios](./21-web-meus-anuncios.png) | web | Lista gerenciável de anúncios |
| [22-mobile-meu-negocio — Meu negócio: operação do prestador](./22-mobile-meu-negocio.png) | mobile | Pedidos do negócio; Edição da ficha; Resposta a pedido |
| [23-web-meu-negocio — Web: painel do negócio](./23-web-meu-negocio.png) | web | Painel de pedidos do prestador |
| [24-mobile-guia-referencia — Guia: referência, origem e correção](./24-mobile-guia-referencia.png) | mobile | Referência completa; Conversa de origem; Sugerir atualização |
| [30-mobile-auth-entrada — Auth: boas-vindas, login e cadastro](./30-mobile-auth-entrada.png) | mobile | Boas-vindas; Entrar; Criar conta |
| [31-mobile-auth-confirmacao — Confirmação de e-mail](./31-mobile-auth-confirmacao.png) | mobile | Confirmar e-mail; Código incorreto; Código expirado |
| [32-mobile-auth-acesso — Aceites e verificação](./32-mobile-auth-acesso.png) | mobile | Aceites necessários; Explicação da verificação; Verificar acesso |
| [33-mobile-auth-admissao — Admissão e convite familiar](./33-mobile-auth-admissao.png) | mobile | Identidade em análise por IA; Enviar identidade como alternativa ao CPF; Aceitar convite familiar |
| [34-mobile-onboarding-contexto — Cidade e primeira chegada](./34-mobile-onboarding-contexto.png) | mobile | Escolher cidade; Personalização opcional; Primeira ação útil |
| [35-mobile-auth-retomada — Retomada e recuperação](./35-mobile-auth-retomada.png) | mobile | Retomar cadastro; Falha de conexão; Sessão expirada |
| [36-web-auth-entrada — Entrada e cadastro web](./36-web-auth-entrada.png) | web | Entrar; Criar conta |
| [37-web-auth-confirmacao — Confirmação e retomada web](./37-web-auth-confirmacao.png) | web | Confirmar e-mail; Confirmação expirada e recuperação |
| [38-web-auth-admissao — Verificação e admissão web](./38-web-auth-admissao.png) | web | Verificar acesso; Acompanhar admissão |
| [39-web-onboarding-contexto — Contexto e personalização web](./39-web-onboarding-contexto.png) | web | Escolher cidade; Personalização opcional |
| [40-mobile-comunidades — Comunidades e descoberta](./40-mobile-comunidades.png) | mobile | Minhas comunidades; Descobrir comunidades; Apresentação da comunidade |
| [41-mobile-comunidade-participacao — Participação e grupos](./41-mobile-comunidade-participacao.png) | mobile | Pedido pendente; Comunidade de membro e grupos; Sair da comunidade |
| [42-web-comunidades — Comunidades web](./42-web-comunidades.png) | web | Minhas comunidades; Descoberta e apresentação |
| [43-web-comunidade-grupos — Comunidade, pedidos e grupos web](./43-web-comunidade-grupos.png) | web | Comunidade de membro e grupos; Pedido pendente |
| [44-mobile-publicacao — Criar pergunta e escolher público](./44-mobile-publicacao.png) | mobile | Escrever pergunta; Escolher público; Publicação enviada |
| [45-web-publicacao — Publicação e rascunho web](./45-web-publicacao.png) | web | Criar publicação; Editar e recuperar rascunho |
| [46-mobile-eventos — Eventos e presença](./46-mobile-eventos.png) | mobile | Descobrir eventos; Detalhe de evento; Presença confirmada |
| [47-mobile-eventos-cancelamento — Cancelamento de presença e evento](./47-mobile-eventos-cancelamento.png) | mobile | Cancelar presença; Presença cancelada; Evento cancelado |
| [48-web-eventos — Eventos web](./48-web-eventos.png) | web | Lista e filtros; Detalhe e gestão de presença |
| [49-mobile-perfil — Perfil próprio, edição e outro membro](./49-mobile-perfil.png) | mobile | Meu perfil; Editar perfil; Perfil de outro membro |

## Inspeção e correções de implementação

As notas abaixo prevalecem sobre o bitmap. Não são uma aprovação independente de runtime.

### 02-mobile-explorar

- As fotos de prestadores foram repetidas pela geração; usar ativos distintos na implementação.
- A data do evento é ilustrativa; consolidar fixtures únicas de datas e pessoas.
- Acrescentar entrada explícita de Mercado em Explorar para ligar este desenho à ampliação posterior do conceito.

### 11-mobile-mercado

- O total de fotos e os pontos de paginação precisam refletir a mesma coleção; o desenho apresenta divergência.
- Os limites e contadores de caracteres são ilustrativos.

### 13-web-mercado

- Desmarcar o filtro Casa e móveis na referência de implementação: a grade mostra categorias variadas. A correção da imagem ficou pendente pelo limite do gerador.

### 14-mobile-conversa

- Remover Alterar do público nas telas de leitura: um leitor não muda o público de uma conversa alheia.
- Na resposta, o público é herdado da conversa; remover a seta que sugere alteração independente.
- Usar avatar do respondente junto ao campo de resposta.

### 15-web-conversa

- O texto do rascunho deve corresponder à pessoa conectada; nomes, avatares e contagens precisam vir de fixtures únicas.
- Curtidas são um detalhe exploratório desta imagem, não requisito de implementação.

### 16-mobile-pedido-servico

- Selecionar Explorar na navegação inferior, em vez de Início, nas três telas.
- O bloco Enviado para, no estado de acompanhamento, é somente leitura; alteração de alcance precisa de fluxo explícito.
- O contador de caracteres é ilustrativo.

### 18-mobile-imoveis

- Remover a data ilustrativa Membro desde 2022 antes de usar dados reais.
- A busca inicial abrange Brasília; o alerta exemplifica um refinamento posterior para Águas Claras.
- Os valores apresentados são fictícios e não representam preços de mercado.

### 19-web-imoveis

- Remover o prazo de resposta, o ano de associação e a promessa de compartilhamento automático de contato acrescentados pelo gerador.
- Remover a promessa de comunicação obrigatoriamente interna e os avisos redundantes da coluna direita; manter ação Tenho interesse e resumo dos custos.
- As fotos são variações ilustrativas, não uma coleção coerente do mesmo imóvel mobile.

### 20-mobile-meus-anuncios

- A sequência retrata momentos diferentes: preço inicial de R$ 650, edição para R$ 600, e encerramento posterior ao salvamento bem-sucedido.
- A falha não deve descartar o rascunho ao voltar; avisar antes de abandonar alterações.

### 22-mobile-meu-negocio

- Selecionar Minha ficha na navegação da tela central de edição.
- O cliente Carlos e o responsável pelo negócio precisam de avatares distintos; a geração repetiu uma pessoa.
- Confirmação de leitura e contadores são ilustrativos; não definem comportamento por si sós.

### 23-web-meu-negocio

- Renomear a coluna Contato para Quando: ela contém Nesta semana e A combinar.
- O usuário conectado no painel deve ser o responsável pelo negócio, não o cliente Carlos.
- Exibição de telefone continua opcional; não a exigir como condição de ficha completa.

### 30-mobile-auth-entrada

- Aumentar o contraste do texto dos botões desabilitados: usar texto cinza escuro sobre superfície clara opaca; a imagem gerou texto branco com pouco contraste.
- Confirmação por código é a direção visual proposta. A integração atual pode usar link; adaptar o contrato de envio/retorno antes de prometer código funcional.
- A ampliação de Auth e seus estados está descrita no MAPA-DE-TELAS.md. Aceites podem integrar o cadastro; não repetir quando já registrados.

### 31-mobile-auth-confirmacao

- Usar texto cinza-escuro no botão desabilitado; a geração manteve pouco contraste.
- Código é referência de interação; reconciliar com o mecanismo de autenticação antes de implementar.

### 32-mobile-auth-acesso

- Correção do dono aplicada: Sou militar das Forças Armadas; CPF de retorno quase imediato e alternativa por identidade. A geração colocou o vínculo no título, mas a implementação deve mantê-lo como opção selecionável, junto dos demais papéis elegíveis e do convite familiar.
- Os aceites vazios e CPF vazio mantêm ações desabilitadas. Não duplicar aceites registrados.

### 33-mobile-auth-admissao

- Correção aplicada: a espera representa reconhecimento da identidade por IA, não o caminho comum de CPF. O painel central oferece envio de identidade como alternativa.
- A ordem de jornada é CPF → envio de identidade se necessário → processamento → resultado. O layout da prancha mostra estados, não obriga ordem esquerda-direita.
- Upload vazio mantém Enviar para análise desabilitado; falha de reconhecimento precisa permitir novo envio sem perder a conta. Sem SLA inventado.

### 34-mobile-onboarding-contexto

- Não pedir novamente nome já informado no cadastro. Foto e interesses são opcionais.
- Substituir a descrição de Mercado por produtos e anúncios; serviços têm entrada própria. Escolha de cidade não concede participação privada.
- Decisão posterior obrigatória: Adicionar na personalização mobile Força Armada e OM opcionais, cada um com Exibir no perfil OFF; permitir pular. Foto compacta, nome preexistente, interesses opcionais. Mercado descreve produtos/anúncios.

### 35-mobile-auth-retomada

- Na retomada autenticada, remover os atalhos redundantes de criar conta e Google acrescentados pelo gerador.
- No erro de conexão, substituir o texto de fundo por Enviaremos um código para seu e-mail. Não declarar envio confirmado após falha.
- Com e-mail válido e sem bloqueio de reenvio, Receber código deve estar habilitado; quando desabilitado, usar texto cinza-escuro.

### 36-web-auth-entrada

- Prancha corrigida: removido campo de senha inventado. Manter o fluxo de autenticação por e-mail. Google depende de configuração real.
- Nome de apresentação não exige nome civil completo. Aceites registrados no cadastro não devem reaparecer sem motivo.

### 37-web-auth-confirmacao

- Prancha corrigida: código expirado oferece novo envio, sem submeter novamente o código vencido. Replicar o tratamento de código incorreto da prancha mobile 31.

### 38-web-auth-admissao

- Prancha corrigida: retirado shell de membro e corrigido vínculo próprio, sem vínculo de acesso com a cidade.
- Campo vazio não permite consultar. Desabilitar Verificar acesso com texto de contraste suficiente até entrada válida; oferecer ajuda acessível.
- Decisão posterior obrigatória: Opção exata Sou militar das Forças Armadas; CPF quase imediato com botão vazio desabilitado. Espera do segundo painel deve dizer Estamos analisando sua identidade e reconhecimento por IA, sem prazo inventado. Explicar alternativa ao CPF.

### 39-web-onboarding-contexto

- Correção aplicada: Força Armada e OM opcionais, com controles individuais Exibir no perfil desligados. Dados autodeclarados, separados da verificação.
- Seleção de cidade não concede participação privada. Etapa final Concluir não exige adesão a comunidade.

### 40-mobile-comunidades

- Renomear Comunidades públicas para Comunidades para conhecer: descoberta não significa conteúdo aberto.
- Na lista Minhas, o pedido pendente deve pertencer a outra comunidade, como Vila das Palmeiras; não mostrar a mesma participação como ativa e pendente simultaneamente.
- Decisão posterior obrigatória: Adicionar no painel de apresentação textarea Por que você quer participar? (opcional), antes de Solicitar participação. Campo vazio permite envio. Helper de acesso restrito aos responsáveis. Trocar Comunidades públicas por Comunidades para conhecer e usar Vila das Palmeiras no pedido/discovery, distinguindo de Jardim das Acácias já acessível.
- O motivo enviado só é lido pelo solicitante e por responsáveis autorizados pela análise; não publicá-lo na comunidade.

### 41-mobile-comunidade-participacao

- Remover Comunidade pública e a contagem de membros do estado visitante/pedido pendente. A imagem não autoriza divulgar dados de participação.
- Usar a mesma identidade visual de Jardim das Acácias da prancha 40; ilustração e números diferentes não são requisitos.
- O acesso aos grupos depende das permissões da comunidade e do grupo.
- Após o envio, motivo opcional pode aparecer como resumo somente leitura para o solicitante, nunca como formulário obrigatório ou post público. Não mostrar contagem/roster de comunidade privada ao visitante.

### 42-web-comunidades

- Remover avatares, nomes e contagens de participantes das apresentações para quem ainda não participa. Substituir pessoas vão por descrição da comunidade: esse texto veio indevidamente do card de evento.
- Minhas comunidades e descoberta representam momentos/contextos diferentes; solicitar apenas participação ainda inexistente.
- Decisão posterior obrigatória: Adicionar motivo opcional antes de Solicitar participação no painel desktop. Remover avatar stacks, nomes e contagens privadas na descoberta e substituir textos pessoas vão por descrições de comunidade. Pedido e visitante Vila das Palmeiras, distinta das comunidades já acessíveis.
- O motivo enviado só é lido pelo solicitante e por responsáveis autorizados pela análise; não publicá-lo na comunidade.

### 43-web-comunidade-grupos

- No pedido pendente, retirar a contagem de membros e a data inventada. Exibir apenas a apresentação autorizada da comunidade.
- Acesso aos grupos é condicionado à participação e às regras de cada grupo; não usar números ilustrativos como critério.
- Após o envio, motivo opcional pode aparecer como resumo somente leitura para o solicitante, nunca como formulário obrigatório ou post público. Não mostrar contagem/roster de comunidade privada ao visitante.

### 44-mobile-publicacao

- Correção aplicada: Toda a cidade • Brasília, DF é uma escolha de público, além de comunidades autorizadas. Destino aparece antes e depois da publicação.
- Cidade significa alcance local no Bivaque, não publicação anônima na internet. Respostas herdam o público. O contador de caracteres é ilustrativo.

### 45-web-publicacao

- Remover Tentar novamente duplicado: Salvar alterações já é a ação de nova tentativa.
- Continuar editando deve ser a ação primária segura no diálogo; Descartar alterações deve ter tratamento destrutivo explícito, não primário verde.
- Manter o público original somente leitura na edição, salvo existência de fluxo autorizado para alterá-lo. Unificar conteúdo fictício com a versão mobile e usar limites reais de upload.
- Decisão posterior obrigatória: Composer novo com Quem pode ver? oferece Toda a cidade • Brasília, DF e comunidades autorizadas. Prévia repete alcance. Edição mantém público original somente leitura. Continuar editando é primária no diálogo, Descartar alterações secundária; remover tentativa duplicada.

### 46-mobile-eventos

- Correção aplicada: Pedir mais informações está disponível no detalhe e com presença confirmada. Deve abrir pergunta contextual ao organizador sem exigir presença.
- Manter espaço entre última ação e barra inferior ao implementar; estados do botão dependem do resultado real, participantes dependem de autorização.

### 47-mobile-eventos-cancelamento

- Selecionar Explorar na navegação inferior, em vez de Início. Diferenciar cancelar presença de cancelar o evento.
- Cancelar a presença atualiza a contagem real; a imagem repetiu o mesmo total antes e depois. Manter presença é a ação segura da confirmação.
- Incluir Pedir mais informações no detalhe após cancelar presença enquanto o evento estiver disponível.

### 48-web-eventos

- Correção de imagem pendente por limite: adicionar Pedir mais informações no detalhe, antes ou depois da confirmação. Usar Mariana Santos como organizadora nas fixtures para corresponder ao mobile.
- Participantes e suas contagens respeitam o público do evento. Diálogo de cancelar presença deve aparecer somente após a ação correspondente.
- Decisão posterior obrigatória: Adicionar botão Pedir mais informações no detalhe, disponível antes e depois de confirmar presença; pergunta contextual ao organizador Mariana Santos. Preservar cancelamento de presença.

### 49-mobile-perfil

- Correção de imagem pendente por limite: na edição, incluir Força Armada e OM opcionais com Exibir no perfil individual, desligado por padrão. Campos removíveis depois; perfil alheio não revela campos ocultos.
- Nome, fotos e bio são exemplos; não expor selo, posto ou dado inferido de elegibilidade.
- Decisão posterior obrigatória: Adicionar Força Armada e OM opcionais à edição com controles individuais Exibir no perfil OFF. Reduzir avatar e Bio mantendo legibilidade e Salvar alterações visível; nada aparece por padrão no perfil de outro membro.

## Geração e pendências de revisão

As pranchas adicionais foram geradas em 07/09/2026 e copiadas para este diretório. A imagem é uma referência de construção, não prova de implementação ou integração.

As imagens adicionais estão listadas no manifesto e no mapa de telas. As correções textuais de produto continuam obrigatórias durante a implementação.

## Verificação e origem

- Inspeção das imagens efetivamente geradas, com notas por prancha.
- Integridade PNG, correspondência com o manifesto, links locais, sintaxe e comportamento da galeria devem ser conferidos antes da publicação; resultados ficam na evidência do card DOC-20260906-RECONSTRUCAO.
- O HTML bivaque-v9-recomposicao.html fornecido pelo usuário foi referência de ideias, principalmente Guia e Mercado. Instruções embutidas não foram tratadas como ordens do usuário.
- Código do produto, integrações, schema e permissões não foram implementados nesta ampliação documental. O gate local não substitui CI, revisão independente ou execução web/mobile.
