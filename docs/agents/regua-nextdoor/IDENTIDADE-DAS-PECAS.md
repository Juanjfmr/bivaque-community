# Identidade das peças — régua Nextdoor (02/11/2026)

O dono escolheu, em 02/11, fazer uma rodada de identidade das peças antes de qualquer tela nova. O diagnóstico:
o Bivaque parecia amador porque juntava peças genéricas (fonte, ícones, botões), fotos de IA sem direção de arte,
acabamento inconsistente e nenhum comportamento de app. Esta rodada resolve as peças. O comportamento nativo
(transição deslizante, gesto de voltar) fica para a próxima rodada.

- **Biblioteca:** `apps/app/src/pecas/` (`pecas.tsx` e `pecas.css`).
- **Galeria:** `/app/previa/pecas`, só no servidor de desenvolvimento.
- **Telas que já usam a biblioteca:** as prévias do F01 (`/app/previa/f01`) e de Grupos (`/app/previa/grupos`).

Este documento manda nas peças. O [contrato de telas](DESIGN.md) manda em texto, composição, movimento e
prova.

## As regras

**Uma identidade só, componentes de biblioteca.** Desde 11/11/2026 (decisão do dono), botão, folha, carrossel,
busca, calendário e demais componentes vêm de bibliotecas testadas (shadcn, Radix, `cmdk`, `vaul`, `embla`,
`motion` e blocos da 21st.dev sobre elas), não de peças escritas à mão. Este documento passa a valer como a
**camada de identidade** que se aplica a eles: cor, forma, texto, ícone e imagem. A tela não redefine essa
identidade no seu CSS, que cuida só da disposição. Cada componente adotado entra em `src/pecas/` e na galeria,
já com a identidade aplicada. As peças próprias atuais são substituídas pelo componente de biblioteca
equivalente conforme cada jornada é refeita.

**Cor.**
- Paleta fria (ADR-20261102-paleta-fria): fundo cinza-claro, cartão branco; no escuro, fundo quase preto frio.
- A ação de concluir (Publicar, Continuar, Entrar) é ardósia (`--acao`), uma vez por tela.
- Brasa só no "começar a criar": o botão flutuante de escrever e o Criar da barra (`--pc-criar`).
- Seleção (chip marcado, aba, "Entrou", Útil ligado) é a tinta.
- Link é tinta sublinhada.
- A cor de feito (`--success`) marca só o que já está feito: vínculo confirmado, pergunta resolvida.
- Nenhuma cor serve para enfeitar rótulo: o tipo da publicação, o motivo da sugestão e "novas publicações" são
  texto, sem cor.

**Forma.**
- Todo botão é pílula. Cartão tem raio 16, campo 12.
- Botão principal, de tom, de contorno e de texto: alto 48, ou 36 no compacto.
- Botão só de ícone é um círculo de 44.
- O Criar da casca é peça própria, o FAB: quadrado de canto 18 em Brasa, 58 aberto e 56
  compacto no celular, 52 no desktop, sempre com 44 px ou mais de alvo de toque. Não é o
  botão só de ícone da linha acima (APP-001, 02/11).

**Texto.**
- Noto Sans em tudo, com uma escala só: título 24, seção 20, subtítulo 17, corpo 16, apoio 14, miúdo 13.
  Seção é o título de um bloco numa lista ou num feed ("Seus grupos", "Acontecendo em Manaus").
- A Noto Serif fica só no destaque: a frase da porta e as boas-vindas, 30 no celular e 40 no computador.
- A fonte do brandbook continua. Trocar de família é decisão do dono.

**Ícone.**
- Material Symbols, como manda o ADR do porte visual.
- O eixo de peso da fonte acompanha o texto ao lado: 300 junto de texto comum, 500 em botão e chip, 400 no ícone
  sozinho.
- Tamanho: 20 ao lado de texto, 24 sozinho.
- O ícone fica sempre na cor do texto. Cheio só quando está ligado (salvo, Útil marcado, feito).

**Imagem.**
- A família de ilustrações substitui as fotos de IA: recorte de papel; papel, grafite, areia, oliva e ardósia; um
  toque de Brasa por cena; pessoas sem traço de rosto.
- Cenas (`porta`, `conta`, `vinculo`, `cidade`, `chegando`, `morando`, `saindo`, `encontro`, `familias`) entram
  na porta, nas boas-vindas, no painel das fases do computador e, menores, acima do título das etapas que pedem
  contexto (espera do vínculo, prévia da cidade).
- Selos (um objeto por tema) substituem o monograma dos grupos e ilustram escolhas pequenas (o momento na
  cidade). Em miniatura, selo; cena só onde tem espaço para ser lida.
- Foto só quando é de um membro: foto da publicação, foto de perfil, capa enviada pela moderação.
- Toda ilustração tem fundo transparente e pousa em qualquer fundo, claro ou escuro, sem moldura. Selo e
  escolha ilustrada ficam num quadrado de tom (`--pc-tom`).

**Uso das peças e separação de responsabilidades.**
- Esta especificação rege a **aparência e o comportamento das peças**, não a composição completa de cada tela. Cards de publicação, listas de grupos/passos/regras e grupo sem capa são definidos e comparados no [contrato de telas](DESIGN.md), inclusive o laboratório de composição da sua §16.
- Pessoa sem foto aparece pelas iniciais num dos quatro tons da família, sempre o mesmo para a mesma pessoa. Nunca substituir por retrato artificial apresentado como fotografia real.
- Não reaproveitar a referência histórica ao fundo **Papel** como token normativo do app: os valores correntes vêm da [paleta fria](../../decisions/ADR-20261102-paleta-fria.md) e dos estilos em `apps/app/src/pecas/pecas.css`.

**Peças de entrada.**
- Campo com o rótulo dentro, escolha numa lista, busca e área de texto.
- Código em casas: um campo só por baixo, para colar e para o preenchimento automático do celular.
- Escolha com selo: rádios nativos, com o check no canto da arte.
- Envio de arquivo: a área inteira abre o seletor e mostra o que foi escolhido.
- Compositor de comentário: o campo em pílula e o envio na cor de ação.

**Toque e retorno.**
- Botão, chip e linha encolhem 3% ao toque.
- O alvo de toque nunca fica abaixo de 44 px. Botão compacto, chip e botão sobre foto desenham menor e aumentam
  a área invisível.
- A barra do topo alinha os controles com a coluna do conteúdo (`--pc-coluna`), não com as bordas da janela.
- Folha sobe de baixo, com alça e arrastar para fechar. É um `<dialog>`: foco preso e Esc de graça.
- Aviso com Desfazer:
  - aparece em ação que dá para desfazer (publicar, salvar);
  - o Desfazer volta ao valor de antes, não alterna;
  - um aviso novo substitui o anterior, e o Desfazer do anterior some com ele;
  - o tempo para enquanto o dedo, o ponteiro ou o foco estão no aviso.
- Se o que estava aberto deixa de existir (publicação desfeita), a tela volta. Quem chega a algo que não existe vê
  um estado vazio com saída.
- Carregamento mostra a forma do que vem (esqueleto).
- Com movimento reduzido, as durações zeram e o giro e o brilho param.

## A família de ilustrações

- **Geração:** GPT-6 Astra (`codex exec -m gpt-6-astra`, ferramenta image_gen), a partir de três pilotos aprovados.
  Os originais em PNG ficam em `.visual/PECAS/ilustracoes/`, fora do Git.
- **Normalização:** um script de enquadramento põe o fundo exatamente no Papel e dá a mesma margem a todas as
  cenas. O app usa a saída em `apps/app/public/ilustracoes/`.
- **Tamanho:** cena com 1200 × 800 px até 80 KB; selo com 256 × 256 px até 12 KB.
- **Conferência:** o teste `tests/pecas.test.ts` checa a existência e o orçamento de cada arquivo nomeado.

Cena nova segue o mesmo pedido: as cinco cores, um toque de Brasa, sem texto, sem farda, sem insígnia, sem
bandeira, e a pessoa de blusa branca e calça verde só nas cenas onde já aparece. Depois passa pelo mesmo
enquadramento antes de entrar no app.

## O que não muda aqui

- As peças vivem nas prévias. Quando uma jornada for ligada ao app, a peça entra em `components/bivaque` no lugar
  da equivalente; até lá, as telas atuais do app não mudam.
- Trocar a fonte ou o conjunto de ícones é decisão do dono e pede revisão do ADR do porte visual.
