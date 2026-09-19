# Auditoria de produção — fatia 2: Início

Data: 19/09/2026

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

## Síntese

A base é sólida: não houve overflow horizontal em 375 px, os controles essenciais medidos têm
44 px de altura, a busca e o CTA do estado vazio chegam a destinos reais, e a estrutura semântica
expõe `main`, regiões, títulos, abas e navegação. A maior fragilidade está na experiência de quem
ainda não participa de uma comunidade: a home se comporta como um beco sem saída, apesar de essa
mesma pessoa já poder publicar para a cidade e para um grupo. O compositor também fica
inoperável em telas móveis baixas.

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

## Ordem sugerida de melhoria

1. Corrigir o compositor para qualquer altura móvel e para teclado virtual.
2. Reconciliar o estado sem comunidade com cidade e grupos já disponíveis.
3. Preservar os atalhos úteis no mobile/tablet.
4. Diferenciar ou adiar as abas vazias.
5. Refinar cidade, hierarquia compacta, controle da lateral e localização do rótulo `Fechar`.

## Limites desta rodada

Esta rodada não certifica a home com feed populado, card de evento, faixa de retorno,
notificações não lidas, erro de consulta, sessão expirada ou publicação concluída. Esses estados
exigem uma conta/fixture de produção apropriada ou uma janela controlada de verificação, sem criar
conteúdo real apenas para a auditoria.
