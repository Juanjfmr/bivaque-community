# Bivaque — Rodada 70: a pele da marca, nos temas claro e escuro

Data: 21/10/2026. Contrato: `docs/agents/tasks/HTML-070.task.yml` (R2, com o
[ADR-20261020](../../../docs/decisions/ADR-20261020-identidade-visual-e-tema-escuro.md)).
Lote Lançamento (R69 a R71). Base: `f633c946` (fontes da marca), protótipo build
`0ac8bd1c…`. Candidato: build `a460dedb…`.

**Veredito: PASS** no protótipo, nos quatro contextos da prova.

## Decisão

O dono aprovou em 20/10/2026 o brandbook oficial **com os ajustes da maquete**
(`docs/brand/maquete-2026-10-20`), nos temas claro e escuro, substituindo a pele
"Material Web" verde-petróleo herdada e a decisão D31 ("light-only").

- **Brasa é ação, não decoração.** Ela aparece no botão Criar e no CTA principal
  (`md-filled-button`). A cidade em destaque usa a Brasa escurecida (`--bv-accent-text`),
  que é um token separado. Links, ações secundárias, aba ativa e contadores ficam no
  Grafite (`primary` / `on-primary`).
- **Vermelho só para erro e ação destrutiva.** O badge deixou de ser vermelho; o aviso
  (`.pill.warn`) passou para o tom terciário (família da Brasa).
- **Cantos do Glifo:** 12 px em cartões, campos e chips; 10 px em abas e no pill da
  navegação; 18 px no Criar; 16 px em diálogos.
- **Noto Serif 600** nos títulos de display (24 px no celular); Noto Sans no resto.
- **Símbolo oficial** no lugar do "B" num quadrado verde: Grafite com a abertura em
  Brasa no claro; branco inteiro no escuro.

### Onde a Brasa entrou, e a exceção registrada

O CTA principal de cada tela é um `md-filled-button`. Não existe, no protótipo, uma
marca estrutural que separe "o CTA da tela" de "um filled de diálogo" sem tocar o
markup de ~60 chamadas de `btn(..., 'filled')` — o mesmo helper serve CTA de tela,
confirmação de diálogo e ação de formulário. Para não adivinhar hierarquia em telas
que a prova não cobre, a rodada usou a opção prevista na tarefa: **todo
`md-filled-button` é Brasa** (o `danger-fill` continua no erro). Consequência
registrada: telas com mais de um filled visível ficam com mais de um CTA em Brasa.

Telas com mais de um `md-filled-button` na mesma vista (levantadas no markup):

- **Editor de anúncio de imóvel** (`propertyWizardActions`): "Continuar" e "Publicar
  anúncio" na mesma barra.
- **Comparação de propostas** (`pedido/:id`, `proposalCard`/`prop-actions`): um
  "Escolher" por proposta.
- **Painel do Bivaque → cidades** (diálogo de convite): um "Convidar" por cidade.
- **Ajuda** (`help-card`): um filled por cartão de ajuda.

Fora dessas, cada tela medida mostrou um único filled visível: `pedidos`, `ajuda`,
`dono`, `dono/pendencias`, `anuncio/:id`, `negocio/:id`, `pergunta/:id`,
`grupo/:id`, `evento/:id`.

## O que mudou

### Tokens (`src/styles/base.css` e `src/styles/palette.css`)

`base.css` é a fonte dos `--md-sys-color-*` e dos `--bv-*`, nos dois temas, exatamente
com os valores da tabela da tarefa. `palette.css` deixou de redefinir a paleta inteira
(ele carrega **depois** de `base.css` e vencia a tabela): agora guarda só os
complementos que o Material usa — `surface-dim`, `surface-bright`, `scrim`,
`primary-fixed`, `tertiary-fixed` e os tokens de sucesso — nos tons da marca.

Tokens novos:

- `--bv-brasa`, `--bv-on-brasa`, `--bv-accent-text`, `--bv-photo-dim`;
- `--bv-symbol-body`, `--bv-symbol-threshold` (o símbolo usa `fill: var(...)`, um SVG só);
- `--bv-on-photo`, `--bv-photo-chip`, `--bv-photo-chip-hover` (chips sobre foto);
- `--bv-overlay`, `--bv-overlay-control`, `--bv-overlay-control-hover` (lightbox);
- `--bv-scrim`, `--bv-scrim-strong`, `--bv-shadow`, `--bv-shadow-strong`,
  `--bv-sheet-backdrop` (véus, sombras e o fundo da folha encolhida).

Também: `--md-ref-typeface-brand` virou `'Noto Serif',Georgia,serif`;
`--md-ref-typeface-plain` virou `'Noto Sans',system-ui,…`; os campos passaram a 12 px
(inclusive o select, que lia `--md-outlined-select-text-field-container-shape`, ausente
da tabela da tarefa); o diálogo a 16 px; a `meta theme-color` a `#171E20`/`#F2F0EB`.

### Forma, tipografia e marca

- `h1` em Noto Serif 600, `clamp(24px,4vw,34px)`; a Início do celular em 24 px.
- Cartões, listas, estados vazios, perguntas, respostas, vendedor, métricas, guia,
  fatos, escolhas, plano, `context-strip`, benefício, patrocinado, progresso, data de
  evento, foto de lista e tiles de categoria: 12 px.
- Abas: indicador de 10 px (`--md-primary-tab-active-indicator-shape`); pills da barra
  e do trilho: 10 px. No celular, a luz no topo da aba deu lugar ao pill de 10 px da
  maquete.
- Criar: quadrado de 18 px, sólido em Brasa, nos três pontos que o desenham
  (`base.css`, `create-menu.css`, `create-rail.css`, `nav-bar.css`).
- Chips (`md-filter-chip`, `md-assist-chip`, `md-input-chip`, `md-suggestion-chip`):
  12 px.
- `mark()` agora emite o SVG oficial (`viewBox 0 0 100 100`, sem `rect`), com as duas
  classes que leem os tokens do símbolo. O favicon e a marca do carregamento usam o
  mesmo desenho.
- Avatares sobrepostos: 28 px com iniciais de 11 px (o mínimo de 28 px vale para
  todos; avatares maiores mantêm o texto proporcional, como o perfil de 62 px).
- No escuro, fotos de cartão, galeria, detalhe, lista, conversa, prévia de foto e
  lightbox recebem `filter: var(--bv-photo-dim)`.

### Busca da Início

A maquete pede "busca alinhada à esquerda, como campo de digitar". O botão tonal
centralizava o conteúdo dentro do shadow do Material (sem variável de alinhamento).
A busca virou um `button` comum com a mesma `id`, a mesma `data-action` e o mesmo
`aria-label`; nenhum fluxo mudou e as provas que clicam em `#home-search` continuam
verdes.

## Provas

### Vermelho contra a base

`round70-proof.mjs` contra `f633c946` (build `0ac8bd1c…`), nos quatro contextos:

- **18 dos 24 checkpoints falham** (6 passam).
- Passam trivialmente, por não haver o que medir: `brasa-only-on-action` nos quatro
  contextos (não existe Brasa na pele antiga) e `photo-dim` no claro nos dois
  (o filtro claro é `none`).
- Falham: `brand-tokens` (superfície `#f9f9fb`, sem `--bv-*`), `contrast`
  (`--bv-on-brasa`/`--bv-brasa` vazios), `shapes` (cartão de 18/22 px, busca de 28 px,
  Criar circular), `symbol` (`viewBox 0 0 64 64` com `rect`) e, no escuro,
  `photo-dim` (sem filtro).

### Verde no candidato

- `round70-proof.mjs`, 4 contextos (375-light, 375-dark, 1440-light, 1440-dark):
  **24/24 PASS**, sem erro de JS e sem requisição externa.
- `round69-proof.mjs` em 375-light: **4/4 PASS** (lançamento sem cobrança).
- Provas antigas que não comparam pixel, em 375-light:
  - R13 **16/16**; R14 **11/11**; R29 **8/8** (o cartão de compartilhamento desenha o
    símbolo novo no canvas); R35 **9/9**; R07 **8/8**.
  - R07 também em 375-dark: **8/8** (contraste e alvo de toque em todas as rotas).
- A R35 afirmava a "luz" no topo da aba ativa. A rodada 70 trocou esse indicador pelo
  pill de 10 px da maquete, então o checkpoint passou a afirmar o pill (mesmo id,
  comentário datado no arquivo). A descrição antiga continua em `ROUND_35.md`, com nota
  de substituição.

### Gate

`npx pnpm@11.18.0 gate` **verde**: lint, typecheck, 1.468 testes unitários, 189 de
privacidade, 120 de escopo e a varredura de segredos. O build do web pulou, como
sempre nesta worktree (`apps/web/.env.local` ausente) — isso não prova que o Next
compila.

## Cores fixas que saíram

Todas viraram token com par claro e escuro, exceto o `share-card.js` (canvas), que
mantém cores fixas da marca clara de propósito: a imagem não acompanha o tema.

| Arquivo | Fixas que existiam | Virou |
|---|---|---|
| `base.css` | paleta verde-petróleo inteira nos dois temas (`#164e63`, `#a2d3e7`, `#f8fafb`, `#10191d`, `#134c61`, `#2f7654`, `#23343c`, `#415660`, …) | tabela da marca + `--bv-*` |
| `base.css` | `rgba(20,41,51,.84)`, `#fff` (chip sobre foto), `#173342dd` (pill do detalhe), `rgba(20,41,51,.7)` (salvar), `#0002`/`#0003` (sombras) | `--bv-photo-chip`, `--bv-on-photo`, `--bv-shadow`, `--bv-shadow-strong` |
| `palette.css` | paleta antiga completa (`#003748`, `#9ccee6`, `#111415`, `#e2e2e4`, `#006b53`, …) | complementos da marca |
| `navigation.js` | `#111415` / `#f9f9fb` (`meta theme-color`) | `#171E20` / `#F2F0EB` |
| `template.html` | `#f8fafb` (meta), `#2f7654` / `#f7f6ef` (favicon e marca do carregamento) | `#F2F0EB`, `#253033`, `#B84A3A`, tokens do símbolo |
| `format.js` | `#2f7654`, `#f7f6ef` (o "B" verde) | símbolo oficial com `--bv-symbol-*` |
| `create-menu.css` | `#164e63`, `#8dbed7`, `#2a6a83`, `#e3f4ff`, `rgba(0,0,0,.15/.3)` | `--bv-brasa`, `--bv-on-brasa`, `--bv-shadow*` |
| `create-rail.css` | gradiente `#2a7d9b`/`#164e63`/`#0b3240`, `#fff`, `#164e63`, `#e3f4ff`, `rgba(22,78,99,.75/.8)`, `rgba(0,30,40,…)`, `rgba(255,255,255,.22/.28)`, `rgba(0,0,0,.18)` | `--bv-brasa`, `--bv-on-brasa`, `--bv-shadow*`, `--bv-scrim` |
| `nav-bar.css` | `#0000000d` (sombra da barra) | `--bv-shadow` |
| `catalog.css` | `#1d5b33`/`#dcefe1`, `#6b4a12`/`#f5e7cf`, `#a8dcb6`/`#1f3a28`, `#f0c98a`/`#3d2e12`, `rgb(10 20 25/.42)`, `rgb(0 0 0/.18/.2/.22/.3)`, `#fff` (borda do pin) | tokens de secondary/tertiary, `--bv-scrim`, `--bv-shadow*`, `--bv-on-photo` |
| `overlays.css` | `rgba(0,0,0,.32)`, `#0004` ×2, `white` (texto do swipe), `#ffc9c2` ×2, `rgb(0 0 0/.16)` | `--bv-scrim`, `--bv-shadow*`, `--bv-on-photo`, `error`/`on-error` |
| `sheets.css` | `#0c1114`, `#0000002e` | `--bv-sheet-backdrop`, `--bv-shadow-strong` |
| `push-install.css` | `#0000000f` | `--bv-shadow` |
| `chat-bubbles.css` | `rgb(0 0 0/.18)` | `--bv-shadow` |
| `command-palette.css` | `rgba(0,22,30,.28)`, `rgba(0,30,40,.45)`, `rgba(0,30,40,.1)` | `--bv-scrim`, `--bv-shadow*` |
| `detail-immersive.css` | `rgba(16,28,34,.52)`, `#fff` ×4 | `--bv-photo-chip`, `--bv-on-photo` |
| `photos.css` | `rgba(0,0,0,.62)` ×2, `#fff` ×6, `rgba(6,10,12,…)`, `rgba(255,255,255,.12/.22)`, `rgba(0,0,0,.4)` | `--bv-photo-chip`, `--bv-on-photo`, `--bv-overlay`, `--bv-overlay-control*` |
| `proposal-compare.css` | `rgba(22,78,99,.6)` | `color-mix` com `primary` |
| `motion-bold.css` | `rgba(0,0,0,.30)` | `--bv-shadow-strong` |
| `plan-timeline.css` | `rgba(22,78,99,.16)` (fallback) | `color-mix` com `primary` |
| `entry.css` | `#b3261e` (fallback do erro) | `--owner-bad`, que lê `error` |
| `owner.css` | `#b3261e`, `#1f7a45`, `#8a5c00`, `#ffb4ab`, `#8fd6a5`, `#f0c46b` | `error`, `secondary`, `tertiary` |
| `gestures.js` | `#31647a`, `#6c7378`, `#2f5f73`, `#654112`, `#ba1a1a` (swipe) | `primary`, `on-surface-variant`, `secondary`, `error` e o par de texto |
| `share-card.js` | `#f9f9fb`, `#e7e8ea`, `#71787d`, `rgba(20,41,51,.86)`, `#fff`, `#191c1d`, `#41484c`, `#2f8a50`, `rgba(255,255,255,.85)`, fallback `#003748` | **fixas da marca clara**: Papel `#F2F0EB`, Grafite `#253033`, Brasa `#B84A3A`, secundário `#55625F`, `#E8E5DE`, `#78807D` |

Não sobraram cores fixas em `src/` fora de `vendor/`, `fonts.css`, das definições de
token e do `share-card.js`.

## Base visual

A R70 muda todas as telas nos dois temas. A comparação estrita contra a base R69
**deve** falhar e a nova base fica para o fechamento do lote, como o contrato registra.
Esta rodada não roda a bateria visual inteira de propósito.

## O que fica para o fechamento do lote

- Recongelar a base visual a partir deste candidato (`a460dedb…`), nos dois temas.
- Rodar a bateria de captura completa (375/768/1440 × claro/escuro) contra a base nova.
- Revisão independente do diff (o executor não é o revisor).
- Decidir, no porte para o Next, se a hierarquia de CTA por tela merece classes
  próprias — a opção por "todo filled em Brasa" foi a segura para o protótipo, e está
  registrada acima.
