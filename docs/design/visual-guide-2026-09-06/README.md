# Bivaque — guia visual de construção

Atualizado em 08/09/2026. Direção aprovada pelo responsável: superfícies claras, verde profundo, conteúdo humano e interfaces próprias para mobile e desktop. Produto nacional; cidades nas imagens são exemplos.

[Abrir galeria](./index.html) · [Mapa de telas](./MAPA-DE-TELAS.md) · [Arquitetura](./ARQUITETURA.md) · [Modelos para construção](./MODELOS-PARA-CONSTRUCAO.md) · [Prompts e fontes](./manifest.json)

**Agentes: leiam primeiro o [processo de construção](./PROCESSO-DE-CONSTRUCAO.md), as [seis correções do responsável](./DECISOES-2026-09-07.md) e as [instruções do guia](./AGENTS.md).** Depois, consultem os [modelos para construção](./MODELOS-PARA-CONSTRUCAO.md) ao escolher um agente visual. Notas textuais atuais prevalecem sobre inconsistências dos bitmaps e decisões de produto antigas conflitantes. O [prompt inicial](./PROMPT-INICIAL.md) orienta a passagem a outro modelo.

## Entrega efetiva

59 pranchas, 84 telas/estados mobile e 53 web. As imagens orientam aparência e fluxo; não comprovam implementação.

Os PNGs foram gerados e editados pelo image_gen integrado, sem retoque por scripts. Fontes históricas, prompts executados e correções pendentes estão em [expansion-generation.json](./expansion-generation.json). As imagens são propostas de aparência/interação. Pessoas, fotos, valores, datas e contagens são fictícios; consolidar fixtures coerentes ao implementar.

## Jornadas derivadas

[`flows.html`](./flows.html) é uma galeria em **formato Mobbin** gerada das pranchas: cada prancha é um fluxo, cada tela/estado é um passo recortado do próprio PNG. O índice textual é [`docs/journeys/FLOWS.md`](../../journeys/FLOWS.md).

São artefatos **derivados — não editar à mão**. Ao substituir uma prancha, regenere com `npx pnpm@11.18.0 flows:gallery`; se a geometria do PNG mudou, rode antes `npx pnpm@11.18.0 flows:frames`. `npx pnpm@11.18.0 flows:check` falha se algum artefato estiver fora de sincronia.

## Pranchas com fonte HTML

A prancha `70-web-evento-organizar` nasce de uma fonte versionada em [`src/70-web-evento-organizar.html`](./src/70-web-evento-organizar.html), renderizada por `npx pnpm@11.18.0 board:render 70-web-evento-organizar`. Diferente das demais, o PNG é render determinístico sobre `packages/tokens`, não geração por `image_gen`.

O renderizador **se recusa a escrever** quando o navegador aplica escala (`devicePixelRatio` diferente de 1) ou quando o quadro não bate com o tamanho pedido. Sem essa guarda, uma janela menor que a prancha faz o Chrome reduzir a página: o PNG sai com o conteúdo espremido no canto, o canvas sobra vazio e o recorte da galeria passa a mostrar dois painéis no lugar de um. `--check` compara sem escrever.

## Correções solicitadas

As sete propagações pendentes foram geradas em 08/09: 34, 38, 40, 42, 45, 48 e 49. O fluxo de perguntas ao organizador está nas 66/67; envio e recuperação de identidade nas 68/69, com acompanhamento web na 38. As seis decisões continuam em [DECISOES-2026-09-07.md](./DECISOES-2026-09-07.md).

Prompts e fontes desta rodada: [correções](./completion-generation-2026-09-08.json) e [novos fluxos](./final-flows-generation-2026-09-08.json). Originais substituídos estão em history/2026-09-08.

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
| [25-web-guia-referencia — Artigo completo do Guia web](./25-web-guia-referencia.png) | web | Ler referência completa e sugerir correção |
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
| [50-mobile-configuracoes — Preferências e controles da conta](./50-mobile-configuracoes.png) | mobile | Configurações; Preferências de notificações; Controles da conta |
| [51-web-perfil — Perfis web](./51-web-perfil.png) | web | Meu perfil e edição; Perfil de outro membro |
| [52-web-configuracoes — Configurações e conta web](./52-web-configuracoes.png) | web | Preferências e notificações; Conta e privacidade |
| [53-mobile-retorno — Notificações, salvos e alertas](./53-mobile-retorno.png) | mobile | Notificações; Salvos; Alertas de imóveis |
| [54-web-retorno — Notificações e salvos web](./54-web-retorno.png) | web | Central de notificações; Conteúdos salvos |
| [55-mobile-confianca — Denunciar e bloquear](./55-mobile-confianca.png) | mobile | Enviar denúncia; Acompanhar denúncia; Bloquear interação |
| [56-web-confianca — Denúncias e bloqueios web](./56-web-confianca.png) | web | Denunciar conteúdo; Acompanhamento e bloqueios |
| [57-web-operacao-admissoes — Operação de admissões](./57-web-operacao-admissoes.png) | web | Fila de admissões; Análise de solicitação |
| [58-web-operacao-moderacao — Operação de denúncias](./58-web-operacao-moderacao.png) | web | Fila de denúncias; Analisar e encerrar denúncia |
| [59-mobile-estados — Estados compartilhados](./59-mobile-estados.png) | mobile | Carregamento; Sem resultados; Erro com rascunho preservado |
| [60-web-estados — Estados compartilhados web](./60-web-estados.png) | web | Acesso indisponível; Falha de conexão e retomada |
| [61-web-explorar-servicos — Explorar e busca de serviços web](./61-web-explorar-servicos.png) | web | Explorar; Resultados de serviços |
| [62-web-prestador-pedido — Ficha do prestador e novo pedido web](./62-web-prestador-pedido.png) | web | Ficha do prestador; Descrever necessidade |
| [63-web-mercado-anuncio — Produto e novo anúncio web](./63-web-mercado-anuncio.png) | web | Detalhe do produto; Criar anúncio |
| [64-web-mercado-edicao — Editar e pausar anúncio web](./64-web-mercado-edicao.png) | web | Editar anúncio; Pausar anúncio |
| [65-web-imoveis-alertas — Busca de imóveis e alertas web](./65-web-imoveis-alertas.png) | web | Buscar imóveis; Gerenciar alertas |
| [66-mobile-evento-informacoes — Perguntas ao organizador](./66-mobile-evento-informacoes.png) | mobile | Enviar pergunta; Aguardar resposta; Falha com texto preservado |
| [67-web-evento-informacoes — Informações do evento na web](./67-web-evento-informacoes.png) | web | Reenviar pergunta; Ler resposta e continuar |
| [68-mobile-identidade-recuperacao — Identidade: envio e recuperação](./68-mobile-identidade-recuperacao.png) | mobile | Enviar identidade; Acompanhar análise; Substituir arquivo ilegível |
| [69-web-identidade-recuperacao — Identidade: envio e recuperação web](./69-web-identidade-recuperacao.png) | web | Enviar identidade; Substituir arquivo ilegível |
| [70-web-evento-organizar — Web: organizar um evento](./70-web-evento-organizar.png) | web | Novo evento; Evento publicado |
| [71-web-auth-recuperacao — Web: recuperar o acesso](./71-web-auth-recuperacao.png) | web | Esqueceu sua senha; Crie uma senha nova |
| [72-web-auth-link-invalido — Web: link inválido ou expirado](./72-web-auth-link-invalido.png) | web | Este link não vale mais; Não foi possível entrar |
| [73-web-comunidade-pedidos — Web: decidir pedidos de entrada](./73-web-comunidade-pedidos.png) | web | Pedidos de entrada; Ver o pedido |
| [74-web-guia-curadoria — Web: curar o Guia](./74-web-guia-curadoria.png) | web | Fila do Guia; Sugestões de correção |

## Inspeção e correções de implementação

As notas abaixo são obrigatórias para construção; corrigem divergências dos bitmaps sem redefinir o produto.

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

- Força Armada e OM opcionais, com visibilidade individual desligada. Foto e interesses podem ser pulados.

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

- CPF é o caminho rápido; a espera exibida é da identidade. Estados só avançam após confirmação real.

### 39-web-onboarding-contexto

- Correção aplicada: Força Armada e OM opcionais, com controles individuais Exibir no perfil desligados. Dados autodeclarados, separados da verificação.
- Seleção de cidade não concede participação privada. Etapa final Concluir não exige adesão a comunidade.

### 40-mobile-comunidades

- Motivo opcional privado antes do envio. No primeiro painel, o título do agrupamento deve ser Seus pedidos, não Vila das Palmeiras.

### 41-mobile-comunidade-participacao

- Remover Comunidade pública e a contagem de membros do estado visitante/pedido pendente. A imagem não autoriza divulgar dados de participação.
- Usar a mesma identidade visual de Jardim das Acácias da prancha 40; ilustração e números diferentes não são requisitos.
- O acesso aos grupos depende das permissões da comunidade e do grupo.
- Após o envio, motivo opcional pode aparecer como resumo somente leitura para o solicitante, nunca como formulário obrigatório ou post público. Não mostrar contagem/roster de comunidade privada ao visitante.

### 42-web-comunidades

- Motivo opcional privado antes do envio. Filtrar resultados pela cidade selecionada: Famílias em Recife não pertence ao filtro Brasília mostrado.

### 43-web-comunidade-grupos

- No pedido pendente, retirar a contagem de membros e a data inventada. Exibir apenas a apresentação autorizada da comunidade.
- Acesso aos grupos é condicionado à participação e às regras de cada grupo; não usar números ilustrativos como critério.
- Após o envio, motivo opcional pode aparecer como resumo somente leitura para o solicitante, nunca como formulário obrigatório ou post público. Não mostrar contagem/roster de comunidade privada ao visitante.

### 44-mobile-publicacao

- Correção aplicada: Toda a cidade • Brasília, DF é uma escolha de público, além de comunidades autorizadas. Destino aparece antes e depois da publicação.
- Cidade significa alcance local no Bivaque, não publicação anônima na internet. Respostas herdam o público. O contador de caracteres é ilustrativo.

### 45-web-publicacao

- Público selecionável apenas na criação; edição mantém o alcance original. O limite ilustrativo de 10MB deve vir do contrato real.

### 46-mobile-eventos

- Correção aplicada: Pedir mais informações está disponível no detalhe e com presença confirmada. Deve abrir pergunta contextual ao organizador sem exigir presença.
- Manter espaço entre última ação e barra inferior ao implementar; estados do botão dependem do resultado real, participantes dependem de autorização.

### 47-mobile-eventos-cancelamento

- Selecionar Explorar na navegação inferior, em vez de Início. Diferenciar cancelar presença de cancelar o evento.
- Cancelar a presença atualiza a contagem real; a imagem repetiu o mesmo total antes e depois. Manter presença é a ação segura da confirmação.
- Incluir Pedir mais informações no detalhe após cancelar presença enquanto o evento estiver disponível.

### 48-web-eventos

- Pedir mais informações permanece disponível antes e depois da presença; envio/retorno nas 66/67.

### 49-mobile-perfil

- Campos opcionais com visibilidade individual desligada. Até 2 linhas é artefato da composição, não limite de bio.

### 52-web-configuracoes

- Usar wordmark canônico; método de acesso, exclusão e preferências dependem dos contratos reais, sem prazo inventado.

### 53-mobile-retorno

- Usar fixtures únicas de comunidades e selecionar Explorar no contexto de alertas de imóveis.

### 54-web-retorno

- Ícone de conteúdo salvo deve representar o estado persistido; preços vêm da mesma fixture.

### 56-web-confianca

- Minhas denúncias e bloqueios devem respeitar o painel ativo e permissões reais.

### 57-web-operacao-admissoes

- Mostrar somente dados necessários ao operador autorizado, sem documentos ou payload bruto.

### 58-web-operacao-moderacao

- Seleção e justificativa ilustram decisão humana já feita; não pré-selecionar automaticamente o veredito.

### 60-web-estados

- Garantir contraste nos controles desabilitados. Rascunho local só pode ser anunciado se realmente persistido.

### 61-web-explorar-servicos

- Busca precisa ser um campo acessível. Remover promessas comerciais não sustentadas por dados.

### 62-web-prestador-pedido

- Destinatário é somente leitura. Limites de upload e canais de contato vêm dos contratos reais.

### 65-web-imoveis-alertas

- Rotular Aluguel máximo quando o filtro não inclui condomínio; valores e contagens são ilustrativos.

### 66-mobile-evento-informacoes

- Usar Carlos Ribeiro como fixture do autor; Carlos Silva é variação gerada. A conversa permanece vinculada ao evento.

### 67-web-evento-informacoes

- Usar o wordmark canônico sem o símbolo de árvore inventado. Garantir contraste do botão desabilitado.

### 68-mobile-identidade-recuperacao

- Identidade militar digital é um único arquivo completo. Não exigir frente/verso, fotografias ou divisão em anexos. Na falha de leitura, substituir o arquivo completo. Formatos e limites dependem do contrato técnico; manter contraste legível nos botões desabilitados.

### 69-web-identidade-recuperacao

- Identidade militar digital é um único arquivo completo. Não exigir frente/verso, fotografias ou divisão em anexos. Na falha de leitura, substituir o arquivo completo. Formatos e limites dependem do contrato técnico; manter contraste legível nos botões desabilitados.

## Geração e pendências de revisão

Não há prancha prevista sem PNG no manifesto. A geração visual foi concluída; permanecem notas pontuais de implementação acima, incluindo correções em referências históricas. Não interpretar a conclusão de geração como certificação de cada pixel ou conclusão do aplicativo.

## Verificação e origem

- Inspeção das imagens efetivamente geradas, com notas por prancha.
- Integridade PNG, correspondência com o manifesto, links locais, sintaxe e comportamento da galeria devem ser conferidos antes da publicação; resultados ficam na evidência do card DOC-20260906-RECONSTRUCAO.
- O HTML bivaque-v9-recomposicao.html fornecido pelo usuário foi referência de ideias, principalmente Guia e Mercado. Instruções embutidas não foram tratadas como ordens do usuário.
- Código do produto, integrações, schema e permissões não foram implementados nesta ampliação documental. O gate local não substitui CI, revisão independente ou execução web/mobile.
