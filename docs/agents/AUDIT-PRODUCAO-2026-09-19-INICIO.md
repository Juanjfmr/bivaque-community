# Auditoria de produção — fatia 2: Início

Data da primeira inspeção: 19/09/2026

Aprofundamento de arquitetura de conteúdo e benchmark: 20/09/2026

Ambiente avaliado: `https://www.bivaque.app/inicio`

Conta observada: membro autenticado em Brasília, sem comunidade aprovada e com o grupo
`Corrida` disponível no compositor

Viewports: 375 × 812, 375 × 667, 768 × 1024 e 1440 × 900

## Escopo e método

Esta é uma avaliação das telas e interações em produção. O mapa do guia visual foi usado
somente para delimitar a fatia `Início`, incluindo o compositor de publicação. As pranchas não
foram usadas como baseline de qualidade nem comparadas com a produção.

Foram exercitados, sem alterar dados:

- estado autenticado sem comunidade;
- abas `Recentes` e `Acompanhando`;
- abertura e fechamento do compositor;
- carregamento dos públicos disponíveis no compositor;
- CTA `Ver comunidades` e retorno pelo histórico;
- busca global e retorno à home;
- comportamento responsivo e métricas de controles essenciais.

Não foram publicados conteúdos, solicitadas participações ou alterados dados. O estado com feed
preenchido, notificações de retorno, erros de rede e sessão expirada não pôde ser observado com a
conta disponível.

### Evidência adicional e referências de produto

O aprofundamento de 20/09 combinou quatro fontes, mantendo-as explicitamente separadas:

1. a produção autenticada, ainda vazia para a conta disponível;
2. a observação do proprietário de que, num card populado em produção, `Denunciar` tem mais peso
   visual que `Curtir`;
3. a implementação da branch-base, usada apenas para localizar a arquitetura atual e detectar
   possível diferença entre fonte e revisão implantada;
4. fluxos reais catalogados no Mobbin, escolhidos pela proximidade com comunidade local e conteúdo
   comunitário, não por semelhança cosmética.

Referências examinadas no Mobbin:

- [Nextdoor — Home](https://mobbin.com/flows/f3c0a105-1443-4497-9f1c-20aa376762aa): cards usam uma
  faixa compacta e equilibrada de reação, comentários, compartilhamento e menu; denúncia não
  aparece como ação primária.
- [Nextdoor — Reporting a post](https://mobbin.com/flows/867693ef-fafa-46de-ae50-a84d3edcce7b):
  denúncia começa no menu contextual junto de ocultar/silenciar, abre fluxo dedicado e termina com
  confirmação.
- [Nextdoor — Creating a post](https://mobbin.com/flows/e1bd32fb-c68c-4ae7-8b65-16e47d05571c):
  o primeiro passo é texto + público; imagem e localização são anexos. Evento, enquete e venda
  aparecem em `Mais`, como intenções/fluxos especializados.
- [Reddit — Home](https://mobbin.com/flows/8b65ddf6-aa2f-4a46-8829-0e7549983da7): voto, comentários,
  compartilhamento e menu têm tratamento compacto; moderação permanece no menu de contexto.

Essas referências não são um pedido para copiar Nextdoor ou Reddit. Elas demonstram dois padrões
consistentes: **ações destrutivas ou excepcionais têm baixa saliência e acesso contextual**; e
**mídia é atributo da publicação, não necessariamente seu significado para a comunidade**.

## Síntese

A base é sólida: não houve overflow horizontal em 375 px, os controles essenciais medidos têm
44 px de altura, a busca e o CTA do estado vazio chegam a destinos reais, e a estrutura semântica
expõe `main`, regiões, títulos, abas e navegação. Porém, a fatia não tem apenas problemas de
acabamento. Há três problemas estruturais: o compositor fica inoperável em telas móveis baixas;
a home sem comunidade contradiz os públicos que a pessoa já possui; e a arquitetura da publicação
prioriza formato (`Texto`, `Foto`, `Link`, `Enquete`) em vez do trabalho que o Bivaque precisa
resolver (`perguntar`, `responder`, `acompanhar`, `resolver` e encaminhar a fluxos especializados).

No card populado, a hierarquia relatada para `Denunciar` é sintoma do mesmo problema: ações
excepcionais competem com a conversa principal. O objetivo não é diminuir a área de toque da
denúncia; é manter 44 px de alvo com **menor peso visual**, dentro do menu contextual.

## Achados priorizados

### P0 — O compositor corta a ação principal em uma tela móvel curta

**Evidência.** Em 375 × 667, o diálogo `Criar publicação` apresentou `y = 93 px`, altura de
`703 px` e base em `796 px`, para uma viewport de `667 px`. O diálogo usa `overflow-y: clip`.
O botão principal `Publicar` ficou fora da área visível; `Cancelar` apareceu parcialmente no
limite inferior. Em 375 × 812 o diálogo já ocupa praticamente toda a altura.

**Impacto.** Pessoas em celulares menores, com zoom ou com teclado virtual aberto podem preencher
o conteúdo e não conseguir concluir ou cancelar a publicação por toque. Um controle focado também
pode ficar encoberto.

**Recomendação.** No mobile, usar folha inferior ou diálogo de altura limitada por `100dvh`, com
corpo rolável e cabeçalho/rodapé de ações fixos. Considerar `env(safe-area-inset-bottom)` e testar
com teclado virtual, zoom de 200% e alturas de 568/667/812 px. Manter foco preso ao diálogo e
devolvê-lo ao acionador no fechamento.

Referências: [WCAG 2.2 — foco não encoberto](https://www.w3.org/TR/WCAG22/#focus-not-obscured-minimum)
e [WAI-ARIA — padrão de diálogo modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

### P1 — A denúncia compete visualmente com a ação social principal

**Evidência.** O proprietário identificou no card populado em produção que o botão `Denunciar` é
maior que `Curtir`. A conta de auditoria não possuía posts e, por isso, esse estado não foi
reproduzido sem criar conteúdo real. A observação é coerente com o problema de hierarquia: uma ação
excepcional e negativa ganha mais área aparente que a ação cotidiana que sustenta a conversa.

Há também um sinal de drift a reconciliar antes da correção: na branch-base, o componente de menu
já declara que denúncia pertence ao overflow, e o modal externo não deveria renderizar um segundo
acionador. Logo, a produção observada pelo proprietário pode estar em revisão diferente, ou outro
card/caminho ainda pode renderizar o botão visível. É necessário localizar a revisão implantada e
inventariar todas as variantes do card, em vez de corrigir somente um componente presumido.

**Impacto.** O card comunica que moderar é mais importante que participar. Isso aumenta ruído,
reduz a escaneabilidade e torna uma ação de baixa frequência fácil de acionar por engano. Em uma
comunidade baseada em confiança, a denúncia precisa continuar disponível e acessível, mas não deve
ser apresentada como convite de uso primário.

**Recomendação.** Manter no card apenas as ações frequentes e reversíveis: reação útil,
`Responder` e, se os dados demonstrarem valor, `Acompanhar`. Colocar `Denunciar`, `Ocultar`,
`Silenciar` e opções equivalentes no menu `…`, com alvo mínimo de 44 × 44 px, rótulo acessível e
fluxo de confirmação/retorno. `Compartilhar` pode permanecer compacto ou ir ao menu quando houver
pouco espaço. A área clicável pode ser grande sem que o ícone ou o rótulo tenha alta saliência.

O padrão aparece tanto em
[Nextdoor — denúncia](https://mobbin.com/flows/867693ef-fafa-46de-ae50-a84d3edcce7b) quanto no
[feed do Reddit](https://mobbin.com/flows/8b65ddf6-aa2f-4a46-8829-0e7549983da7).

### P1 — Os “tipos de publicação” descrevem mídia, não a intenção do membro

**Evidência.** O compositor oferece `Texto`, `Foto`, `Link` e `Enquete` como escolhas de primeiro
nível. Três delas são formatos de conteúdo. Elas não explicam por que a pessoa publica, que resposta
espera nem qual ciclo será encerrado. A especificação funcional do próprio produto define como
fluxo central a pergunta/publicação com respostas, acompanhamento e resolução; eventos, pedidos,
indicações e Mercado têm destinos e estados próprios.

O benchmark reforça a distinção. No compositor do Nextdoor, imagem e localização são anexos. Venda,
evento e enquete ficam em uma camada secundária e iniciam fluxos especializados. O Reddit admite
formatos variados porque seu produto é um fórum genérico; mesmo assim, o feed não imprime `Texto`
ou `Foto` como metadado relevante do card.

**Impacto.** O seletor atual força a pessoa a pensar no recipiente antes da necessidade. Também
abre atalhos ambíguos: um `Link` pode ser pergunta, atualização, evento, serviço ou anúncio. Isso
prejudica o texto de apoio, os campos apresentados, a ordenação, a notificação esperada e a
possibilidade de marcar uma pergunta como resolvida. `Foto` como tipo ainda sugere que a imagem é o
objeto da conversa, embora normalmente seja evidência ou complemento.

**Recomendação.** Trocar o primeiro nível por intenção e tratar mídia como anexo:

| Intenção proposta | O que a interface deve fazer | Destino/fechamento |
|---|---|---|
| `Fazer uma pergunta` | Pedir uma pergunta clara, detalhes opcionais e anexos | Receber respostas, acompanhar e marcar como resolvida |
| `Compartilhar uma atualização` | Texto principal, anexos e link opcionais | Informar e permitir conversa; sem fingir resolução |
| `Criar enquete` | Opção secundária em `Mais`, somente se o domínio e a moderação suportarem | Votos, prazo e resultado coerentes |
| `Divulgar evento` | Encaminhar para o criador de evento, sem converter evento em post genérico | Detalhe, RSVP e pedido de informações |
| `Pedir indicação` | Encaminhar para o fluxo de indicação/serviços | Resposta útil e retorno do solicitante |
| `Anunciar no Mercado` | Encaminhar para o fluxo de anúncio | Publicar, conversar, pausar e encerrar |

Para a primeira versão, duas intenções explícitas bastam: `Fazer uma pergunta` e
`Compartilhar uma atualização`. `Foto` e `Link` passam a ser anexos. `Enquete` fica em `Mais` ou é
removida até ter ciclo completo. Evento, indicação e Mercado devem ser atalhos para seus produtos,
não tipos decorativos dentro do feed.

O público permanece um eixo separado e obrigatório: `Toda a cidade · Brasília`, comunidade ou
grupo autorizado. Intenção responde **o que quero conseguir**; público responde **quem pode ver**.
Misturar os dois produziria outro problema de modelo mental.

Referências: [Nextdoor — criação](https://mobbin.com/flows/e1bd32fb-c68c-4ae7-8b65-16e47d05571c)
e contrato funcional local de `/publicacoes/nova` e `/publicacoes/[id]` na especificação vigente.

### P1 — O card expõe ações demais e duplica a entrada de resposta

**Evidência de implementação a validar na revisão implantada.** O card da branch-base reúne uma
linha de contagem de respostas, `Acompanhar`, uma segunda linha com `Curtir`, `Comentar` e
`Compartilhar`, além de um campo de comentário inline. A mesma intenção de responder aparece como
contagem, botão e campo permanente. O tipo de mídia ainda aparece no cabeçalho (`Texto`, `Foto`,
`Link` ou `Enquete`), ocupando o espaço que deveria explicar autor, público e tempo.

**Impacto.** A repetição cria quatro zonas de decisão antes de a pessoa chegar ao próximo post,
reduz densidade útil e dificulta distinguir status de ação. No mobile, esse volume aumenta a altura
do card e aproxima ações de baixa frequência das essenciais.

**Recomendação.** Usar uma anatomia única e previsível:

1. cabeçalho: autor, público, tempo e menu `…`;
2. corpo: intenção/título quando necessário, conteúdo e anexos;
3. prova social: `3 respostas` e reação agregada, como informação, sem parecer botão duplicado;
4. ações: no máximo `Útil`/`Curtir`, `Responder` e `Acompanhar` — validar o vocabulário em teste de
   compreensão antes de trocar `Curtir` por `Útil`;
5. campo de resposta somente depois de acionar `Responder`, ou no detalhe da publicação;
6. moderação e ações raras no menu contextual.

`Responder` é mais aderente ao ciclo do produto que o genérico `Comentar` quando a intenção é
pergunta. Para atualizações, `Comentar` pode continuar. Essa diferença deve vir da intenção da
publicação, não do anexo usado.

### P1 — A home declara ausência de comunidade, mas ignora escopos que a pessoa já possui

**Evidência.** A área principal mostra apenas `Você ainda não participa de uma comunidade`.
Ao abrir o compositor, porém, aparecem dois públicos válidos: `Toda a cidade · Brasília` e
`Corrida`. A home não oferece feed, atalho ou explicação para o grupo já disponível e apresenta
o ingresso em uma comunidade como única continuação.

**Impacto.** O modelo mental fica contraditório: a pessoa pode criar conteúdo para cidade e grupo,
mas a tela de retorno diz, na prática, que não há nada para ela ali. Isso reduz confiança,
descoberta do grupo e probabilidade de retorno.

**Recomendação.** Tratar a home como agregadora dos escopos realmente disponíveis. Para esse
estado, exibir ao menos um bloco `Seus grupos` com `Corrida` e uma entrada clara para conteúdo da
cidade; manter `Na comunidade` como seção específica, não como definição de toda a home. Se a
política não permitir feed municipal, explicar essa diferença e oferecer ações compatíveis, como
eventos, Guia, indicações e grupos existentes.

Referências: [Carbon — empty states](https://carbondesignsystem.com/patterns/empty-states-pattern/)
e [NN/g — empty states em aplicações complexas](https://www.nngroup.com/articles/empty-state-interface-design/).

### P1 — Recursos úteis do desktop desaparecem no mobile e no tablet

**Evidência.** Em 1440 px, a lateral direita oferece `Serviços`, `Guia da cidade`, `Pedir ajuda`
e `Explorar destino`. Em 768 e 375 px, o bloco inteiro desaparece; não há adaptação equivalente
abaixo do estado vazio. Em 768 px, isso deixa a maior parte da tela sem conteúdo útil.

**Impacto.** A versão estreita perde as próximas ações mais valiosas justamente no estado inicial,
quando não existe feed para ocupar a tela. Embora alguns destinos existam em `Explorar`, a
descoberta exige mais navegação e o propósito da home muda conforme o dispositivo.

**Recomendação.** Reposicionar os atalhos no fluxo principal em telas menores, depois do estado
vazio, como lista compacta ou carrossel acessível. Priorizar contextualmente duas ou três ações e
manter todas alcançáveis sem gesto oculto. Responsividade deve mudar a composição, não remover
capacidades.

Referência: [Android/Material — padrões adaptativos de layout e navegação](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns).

### P1 — As abas não oferecem estados vazios distintos

**Evidência.** `Recentes` e `Acompanhando` exibem exatamente o mesmo título, explicação e CTA
quando a pessoa não participa de comunidade. A seleção muda, mas o sistema não explica o que seria
acompanhado nem como criar esse estado.

**Impacto.** A aba parece não funcionar e ensina pouco sobre o produto. A pessoa não consegue
prever a diferença entre conteúdo recente e conteúdo acompanhado.

**Recomendação.** Se nenhuma das abas tem utilidade antes da primeira participação, ocultar a
segmentação até haver conteúdo. Caso ambas devam permanecer, escrever um estado próprio para
`Acompanhando`, explicando o que pode ser acompanhado e oferecendo uma ação direta para descobrir
ou seguir algo.

Referência: [NN/g — empty states devem comunicar estado, ensinar e oferecer um caminho direto](https://www.nngroup.com/articles/empty-state-interface-design/).

### P2 — O contexto de cidade perde clareza no mobile

**Evidência.** O desktop mostra `Brasília, DF` no cabeçalho. Em 375 px sobra apenas o ícone de
localização, sem rótulo visível e sem um controle correspondente na árvore de acessibilidade. O
corpo ainda mostra `Brasília`, mas não comunica se o ícone permite consultar ou trocar a cidade.

**Impacto.** A localidade é determinante para busca, alcance e descoberta. Um ícone isolado reduz
clareza e cria expectativa incerta de interação.

**Recomendação.** Manter um rótulo compacto, por exemplo `Brasília`, ou transformar o conjunto em
um seletor claramente rotulado. Se for apenas informativo, remover a aparência de controle.

Referência: [WAI — nomes e descrições acessíveis](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/).

### P2 — A hierarquia da seção quebra em 375 px

**Evidência.** O título `Na comunidade` divide a mesma linha com as duas abas e quebra em duas
linhas, enquanto `Recentes` e `Acompanhando` ocupam a maior parte da largura.

**Impacto.** A seção começa visualmente comprimida e o título compete com a navegação local.

**Recomendação.** Abaixo do breakpoint compacto, colocar o título em uma linha e o tablist na linha
seguinte, ocupando a largura disponível. Isso também facilita acomodar traduções e aumento de texto.

### P2 — Há dois controles idênticos para recolher a lateral no desktop

**Evidência.** Em 1440 px, a árvore de acessibilidade expõe dois botões chamados
`Recolher menu lateral`: um no cabeçalho e outro no cabeçalho da própria lateral. Ambos aparecem
visualmente como chevrons.

**Impacto.** A duplicação acrescenta ruído e produz dois controles indistinguíveis para teclado e
leitor de tela.

**Recomendação.** Manter um único acionador junto da lateral. Se houver duas funções diferentes,
usar nomes e ícones que expressem a diferença.

Referência: [WCAG 2.2 — ordem de foco e operabilidade previsível](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html).

### P2 — O nome acessível do fechamento está em inglês

**Evidência.** O botão visual `×` do compositor é anunciado como `Close`, enquanto todo o restante
do fluxo está em português.

**Impacto.** A mistura de idioma prejudica consistência e pode alterar a pronúncia em leitores de
tela.

**Recomendação.** Usar `aria-label="Fechar"` e confirmar o retorno de foco ao acionador.

Referência: [WCAG 2.2 — nomes e rótulos](https://www.w3.org/TR/WCAG22/#headings-and-labels).

## Aspectos positivos observados

- Todos os controles essenciais medidos em 375 px têm 44 px de altura.
- Não há overflow horizontal em 375 px (`scrollWidth = clientWidth = 375`).
- A navegação inferior mantém quatro destinos estáveis e rótulos visíveis.
- O CTA `Ver comunidades` chega à área correta e o retorno do navegador volta à home.
- A busca global aceita teclado, preserva a localidade na explicação e oferece recuperação quando
  não encontra resultados.
- Os textos secundários medidos usam `rgb(74, 89, 79)` sobre superfície clara; os CTAs usam branco
  sobre `rgb(22, 71, 52)`, com contraste visual forte.
- Não foram observados erros ou avisos no console durante os caminhos exercitados.
- O seletor de público do compositor é conceitualmente correto e está alinhado ao padrão do
  Nextdoor: alcance é decisão explícita e separada do conteúdo. O problema está na classificação
  por formato e na altura do diálogo, não na existência desse seletor.

## Arquitetura recomendada para a publicação

### Compositor

1. Entrada única `Pergunte ou compartilhe algo`.
2. Escolha de intenção: `Pergunta` ou `Atualização`.
3. Campo principal adaptado à intenção; detalhes e anexos entram progressivamente.
4. Barra compacta de anexos: foto e link; `Mais` contém apenas recursos realmente concluídos.
5. Público sempre visível e confirmado antes de publicar.
6. Prévia opcional no desktop, nunca responsável por esconder a ação principal no mobile.

### Card no feed

```text
[avatar] Autor · Público · tempo                              […]
         Pergunta | Atualização  (somente se ajudar a leitura)

Título ou primeira linha significativa
Conteúdo e anexo

3 respostas · 8 pessoas acharam útil
[Útil/Curtir]  [Responder/Comentar]  [Acompanhar]
```

`Denunciar`, `Ocultar`, `Silenciar` e compartilhamento secundário ficam no menu. O rótulo
`Texto/Foto/Link` desaparece do card: ele descreve implementação, não valor para o membro.

## Ordem sugerida de melhoria

1. Corrigir o compositor para qualquer altura móvel e para teclado virtual.
2. Reconciliar todas as variantes implantadas do card e mover denúncia/ações raras ao menu.
3. Substituir tipos baseados em mídia por intenção; foto/link viram anexos e fluxos especializados
   recebem encaminhamento próprio.
4. Simplificar o card para uma única entrada de resposta e até três ações frequentes.
5. Reconciliar o estado sem comunidade com cidade e grupos já disponíveis.
6. Preservar os atalhos úteis no mobile/tablet.
7. Diferenciar ou adiar as abas vazias.
8. Refinar cidade, hierarquia compacta, controle da lateral e localização do rótulo `Fechar`.

## Limites desta rodada

Esta rodada não certifica a home com feed populado, card de evento, faixa de retorno,
notificações não lidas, erro de consulta, sessão expirada ou publicação concluída. Esses estados
exigem uma conta/fixture de produção apropriada ou uma janela controlada de verificação, sem criar
conteúdo real apenas para a auditoria.

Em particular, a proporção visual exata entre `Denunciar` e `Curtir` foi registrada como evidência
fornecida pelo proprietário, não como medição independente desta conta. A correção precisa começar
pela identificação da revisão de produção e por capturas de cada variante de card populado. O
benchmark do Mobbin sustenta a recomendação de hierarquia, mas não substitui essa reconciliação.
