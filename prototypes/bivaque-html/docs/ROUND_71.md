# Bivaque — Rodada 71: a landing v8, com o título F, na pele da marca

Data: 21/10/2026. Contrato: `docs/agents/tasks/HTML-071.task.yml` (R2, com o
[ADR-20261020](../../../docs/decisions/ADR-20261020-identidade-visual-e-tema-escuro.md)).
Lote Lançamento (R69 a R71). Base: `4d45ceda` (imagens da landing em WebP), protótipo build
`7dd15d48…`. Candidato: build `c5d5cddf…`.

**Veredito: PASS** no protótipo, nos quatro contextos da prova.

## Decisão

O dono aprovou em 18/10/2026 a landing v8
(`.visual/bivaque-html-landing-v3/v8/maquete-v8.html`) com o **título F** e a linha de apoio dele,
palavra por palavra. A maquete é a referência de estrutura, ordem e texto; a **pele** é a da R70
(ADR-20261020): Grafite, Papel, Brasa e Noto, com o par escuro. Nada da paleta verde-petróleo nem
da Roboto Flex da maquete foi copiado.

- **Um único CTA.** Todo "Criar conta" é um `md-filled-button` em Brasa e chama `entry-join`.
  "Entrar" (texto) chama `entry-login`. O "Recebi um convite de familiar" saiu da landing: o convite
  mora dentro do cadastro, no passo do CPF.
- **Quem está fora não lê o Bivaque.** A amostra por cidade da R53 saiu. A única conversa da página
  é a ilustrativa (Marina A., Paulo S., Renata T.), que não identifica ninguém e não vem do que a
  comunidade publicou.
- **O topo segue a rolagem do `#main`.** Transparente e branco sobre a foto; com a superfície
  translúcida depois dela; esconde ao descer e volta ao subir no celular; a pílula de 10 px marca a
  seção visível.

## O que mudou

### `src/features/entry/landing.js`

`renderEntryLanding()` foi reescrito com a estrutura da v8, nesta ordem: pular para o conteúdo,
topo fixo, `#inicio` (foto + título F), `#exemplo`, `#recursos`, `#mudanca`, `#participar`,
`#perguntas`, `#fim`, rodapé, barra fixa do celular e menu em folha.

- O topo usa o símbolo oficial (`mark()`) e a navegação por âncoras com a pílula em
  `primary-container`.
- A foto do topo vem de `<picture>`: `ASSETS['landing-hero']` acima de 860 px e
  `ASSETS['landing-hero-retrato']` até 860 px, com o texto alternativo da maquete.
- `#exemplo` monta a conversa ilustrativa ao entrar na tela; com `prefers-reduced-motion: reduce`
  ela já nasce montada (o JS só liga a animação quando o movimento é permitido).
- `#perguntas` tem as seis perguntas em `<details>`, com a do CPF aberta; "Fale com a gente" usa
  `support-open` com `contato`.
- `#fim` usa `ASSETS['landing-encontro']` como foto decorativa (`alt=""`).
- `bindLanding()` cria os observadores com `root: #main`, porque o `body` tem `overflow:hidden` e a
  rolagem acontece dentro do `<main>`. O topo que esconde lê `scrollTop` do `#main`; o estado do CTA
  do topo é medido pela geometria (`getBoundingClientRect`), não pela transição do observador — no
  celular ele nasce **abaixo** da dobra, então `isIntersecting` nunca muda e a transição não chega.
- O menu em folha abre pelo botão do topo, fecha com `Esc` e com os itens, trava a rolagem e devolve
  o foco ao botão que o abriu.

### `src/styles/landing.css` (novo, registrado no `manifest.json` após `entry.css`)

- Toda cor vem dos `--md-sys-color-*` e dos `--bv-*`, nos dois temas. As duas exceções são as da
  tarefa: `--bv-on-photo` (branco) e `--bv-photo-scrim` (novo, o véu das fotos), com o mesmo valor
  nos dois temas porque a foto não acompanha o tema. No escuro as duas fotos recebem
  `var(--bv-photo-dim)`.
- Cantos: 12 px em cartões, conversa, passos e capturas; 10 px na pílula; 8 px no chip (herança da
  maquete) e os botões no Material.
- `h1` e `h2` em `var(--md-ref-typeface-brand)` (Noto Serif 600); o resto em Noto Sans.
- Conteúdo com largura máxima de 1160 px; grades de duas colunas acima de 860 px e uma abaixo.
- Alvos de toque de 44 px (topo, rodapé, menu, perguntas) e 56 px no menu em folha.
- O rodapé é a faixa escura da marca (`--bv-sheet-backdrop`) com o símbolo branco — como no
  brandbook, a versão branca existe para fundo escuro.

### `src/styles/base.css`

Um token novo, nos dois temas: `--bv-photo-scrim: rgb(9 14 17 / .72)`.

### `src/styles/entry.css`

Saíram as regras que só a landing da R53 usava (`.en-hero`, `.en-ctas`, `.en-note`, `.en-sample`,
`.en-cards`, `.en-card`, `.en-aud`, `.en-grid`, `.en-legal`). Ficaram as da entrada (`.en-top`,
`.en-mark`, `.en-brand`, `.en-form`, `.en-h1`, `.en-lead`) e `.en-inline`, que os documentos legais
usam em qualquer tela.

### `src/features/legal/pages.js`

`legalLink(kind, label = '')`: o rótulo é opcional para o rodapé e o menu caberem na maquete
("Privacidade"); sem ele, o nome do documento continua sendo o título da página. Nada do fluxo mudou.

### `src/features/support/help.js`

A exclusão de conta não zera mais `entrySampleCity`, que deixou de existir com a amostra.

### `src/shell/bindings.js`

`bindScreen()` chama `bindLanding()` ao fim de cada render; a montagem anterior é desfeita antes de
montar a nova, para os observadores e o `keydown` não se acumularem.

## O que saiu, e por quê

- **A amostra por cidade** (`entrySample`, `entrySampleCity`, a ação `entry-sample-city` e o cartão
  `en-lock`). Decisão do dono: quem está fora não lê o Bivaque. O checkpoint da R53 que trocava de
  cidade virou um que afirma o contrário — a landing não mostra nenhuma pergunta da comunidade.
- **"Termos de uso"** e **"Para negócios"** no rodapé. Na maquete os dois apontam para `#`: não há
  documento de termos no protótipo (só a Política de privacidade e o Código de conduta) nem página
  pública de negócios. Link sem destino real não entra. O rodapé ficou com Entrar, Ajuda,
  Privacidade e Código de conduta, os quatro com destino.
- **"Quero fazer parte"**, **"Recebi um convite de familiar"**, o título "Muda a cidade. Fica a sua
  rede." e a nota "Não é um canal oficial das Forças" — substituídos pelos textos da v8.

## Provas

### Vermelho contra a base

`round71-proof.mjs` contra `4d45ceda` (build `7dd15d48…`), nos quatro contextos:
**36 dos 40 checkpoints falham** (4 passam). O relatório completo, com a mensagem de cada falha,
está em `.visual/bivaque-html-round71/functional/report.json`.

- Passam trivialmente, por só valerem abaixo de 861 px: `mobile-menu` e `no-overflow`, em
  1440-light e 1440-dark (4).
- Falham os outros 36: o `h1` ainda é "Muda a cidade. Fica a sua rede.", não existem as seções da
  v8, o CTA é "Quero fazer parte", as fotos da v8 não estão na página, não há `#ld-top`/`#ld-sheet`/
  `#ld-bar` para medir e a conversa ilustrativa não existe. A `no-overflow` de 375 também falha, e
  por um defeito real da base: a landing da R53 rola de lado (`scrollWidth 900` contra
  `clientWidth 360`) por causa do carrossel de amostra com margem negativa.

### Verde no candidato

- `round71-proof.mjs`, 4 contextos (375-light, 375-dark, 1440-light, 1440-dark): **40/40 PASS**,
  sem erro de JS e sem requisição externa.
- Provas antigas ajustadas, em 375-light: R53 **4/4**, R54 **6/6**, R56 **6/6**, R58 **15/15**,
  R62 **12/12**.
- `round70-proof.mjs` em 375-light e 1440-light: **12/12 PASS** (a pele inteira continua válida).
- `round19-proof.mjs` não foi tocado: o "Amostra" que ele cita é o comentário de uma função que mede
  o texto quadro a quadro.

### Contraste (fórmula da WCAG)

| Par | Claro | Escuro |
|---|---|---|
| texto do corpo (`on-surface`) sobre `surface` | 11,90:1 | 14,04:1 |
| texto das perguntas sobre o fundo delas | 11,90:1 | 14,04:1 |
| `--bv-on-brasa` sobre `--bv-brasa` | 5,15:1 | 5,71:1 |
| branco sobre o véu composto com a média da foto | 16,90:1 | 17,26:1 |

O último é calculado na prova assim: a foto do topo é desenhada num canvas de 48×32 e a média dos
pixels dá `rgb(80 67 48)`; no escuro a foto ainda recebe `brightness(.9)`; o véu
`rgb(9 14 17 / .72)` é composto por cima dessa média, e o branco de `--bv-on-photo` é medido contra
o resultado (`rgb(29 29 26)` no claro, `rgb(27 27 24)` no escuro). O véu é uniforme na área de texto:
o gradiente da versão anterior foi trocado por uma camada só, para a medida não depender do ponto da
foto.

### Achado desta rodada

A fonte de ícones do protótipo é um subconjunto: `grid_view`, `apps`, `category`, `dashboard`,
`widgets` e `view_module` não têm glifo (medidos por largura, 96 a 264 px contra 24 px dos que
existem). O ícone de "O que tem" no menu do celular passou a ser `sell`, que existe. Quem for usar
ícone novo no protótipo precisa medir antes.

## Gate

`npx pnpm@11.18.0 gate` **verde**: lint, typecheck, 1.468 testes unitários, os de privacidade, 120 de
escopo e a varredura de segredos. O build do web pulou (`apps/web/.env.local` ausente), como nas
rodadas anteriores nesta worktree — isso não prova que o Next compila.

## Build

`python scripts/bivaque-html/build.py` → `dist/Bivaque_Material_Web.html`, 3.504.242 bytes,
SHA256 `c5d5cddf0af32108a5e7f3a7e632fa7e4eb08d4eb33e2876a446a4915a07ba0b`. A referência congelada
continua intacta (`29a402c4…`).

## O que fica para o fechamento do lote

- Recongelar a base visual a partir deste candidato (`c5d5cddf…`), nos dois temas.
- Rodar a bateria de captura completa (375/768/1440 × claro/escuro) contra a base nova. Esta rodada
  não rodou a bateria inteira, de propósito.
- Revisão independente do diff (o executor não é o revisor).
- Decidir, no porte para o Next, se a landing continua dentro do shell de entrada ou vira rota
  pública de marketing — hoje ela compartilha `entry-mode`, o que some com a barra do app e com o
  Criar.
- O `#main` reserva 15 px de gutter de rolagem (`scrollbar-gutter: stable`), então a foto do topo
  não alcança a borda direita em nenhuma tela do protótipo. Não é regressão desta rodada; se o porte
  quiser a foto inteira, o ajuste é no contêiner de rolagem, não na landing.
