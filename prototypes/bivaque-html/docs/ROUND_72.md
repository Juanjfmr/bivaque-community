# Bivaque — Rodada 72: as correções da revisão do Codex sobre as rodadas 70 e 71

Data: 22/10/2026. Contrato: `docs/agents/tasks/HTML-072.task.yml` (R2, com o
[ADR-20261020](../../../docs/decisions/ADR-20261020-identidade-visual-e-tema-escuro.md)).
Base: `574365f4` (build `0c579323…`), a revisão independente do Codex (gpt-6.1-sol) sobre as rodadas
70 e 71. Candidato: build `ae26590f…`.

**Veredito: PASS** no protótipo, nos quatro contextos da prova. Oito achados corrigidos, 22 dos 28
checkpoints vermelhos na base e 28 verdes no candidato.

## Os oito achados, e o que cada correção fez

### 1. MÉDIA — o menu Criar era todo em Brasa

As sete opções do menu do celular usavam `--bv-brasa` como fundo de um `md-filled-tonal-button`, e o
subtítulo levava `opacity:.8` — 3,88:1 no claro e 4,23:1 no escuro, abaixo de 4,5:1.

**Correção (`src/styles/create-menu.css`).** Só o botão Criar é Brasa (o FAB, que já era). As opções
passaram aos tokens neutros:

- fundo `--md-sys-color-surface-container-high`;
- título e rótulo `--md-sys-color-on-surface`;
- ícone `--md-sys-color-on-surface-variant`;
- subtítulo `--md-sys-color-on-surface-variant`, **sem `opacity`**.

Os estados de hover, foco e pressionado também foram fixados nos mesmos tokens, para o rótulo não
voltar ao `on-secondary-container` do Material no meio da interação.

O menu do desktop (`create-rail.css`, o painel do Criar) já estava na regra: o item é um `button`
sem fundo, o título em `on-surface`, o subtítulo em `on-surface-variant` e o ícone numa tile da
categoria. Nada mudou ali — e a prova mede os dois menus. O único Brasa do painel é o do botão, que
é o mesmo FAB.

### 2. MÉDIA — cores fixas no cartão de compartilhamento

`share-card.js` tinha hexadecimais soltos no desenho (linhas 22, 32, 33 e 38).

**Correção.** Toda a paleta clara da marca mora numa constante nomeada no topo do arquivo:

```js
const SHARE_PALETTE={paper:'#F2F0EB',graphite:'#253033',muted:'#55625F',brasa:'#B84A3A',
  placeholder:'#E8E5DE',placeholderGlyph:'#78807D',tag:'rgba(37,48,51,.86)',
  footerText:'rgba(242,240,235,.85)'};
```

O desenho usa só ela (`const P=SHARE_PALETTE` dentro de `shareCardBlob`). Os dois `rgba` que estavam
soltos (o véu da etiqueta e o texto do rodapé) também entraram na constante. Fora dela não sobra
nenhum `#rrggbb` no arquivo. A imagem continua na paleta clara nos dois temas — a exceção que o
contrato da R70 registra: a imagem sai do app e não acompanha o tema.

### 3. BAIXA — cantos fora de 12 px na entrada e na ajuda

**Correção (`src/styles/entry.css`).** O que mudou:

| Elemento | Antes | Agora |
|---|---|---|
| `.en-date input` (data de chegada e de saída) | 4 px | **12 px** |
| `.en-tile` (boas-vindas) | 16 px | **12 px** |
| `.help-card` (Ajuda e Fale com a gente) | 16 px | **12 px** |
| `.ticket` (Meus chamados) | 16 px | **12 px** |
| `.en-why` (Por que o CPF) | 16 px | **12 px** |
| `.en-inv` (convite de familiar) | 16 px | **12 px** |
| `.en-link`, `.en-file` (convite e envio de documento) | 14 px | **12 px** |
| `.en-seg` (momento: chegando/moro/saindo) | 20 px | **12 px** |

Ficaram como estavam, por serem círculos e não cartões: `.en-av` (22 px num avatar de 44) e
`.en-badge` (32 px num selo de 64); o `border-radius:2px` que sobra é o do contorno de foco do
`.en-inline`, que acompanha o raio do texto, não um cartão. Os campos do Material já vinham a 12 px,
e o resto da entrada (`.en-ok`, `.en-test`, `.help-warn`, `.ticket-reply`, `.en-time i`) já estava em
12.

### 4. BAIXA — a letra "B" no lugar do símbolo oficial

Os cabeçalhos do cadastro, do login, do convite, das páginas legais, do suporte, das boas-vindas e
da conta apagada traziam `<span class="en-mark">B</span>`.

**Correção.** Os cinco pontos que desenham esse cabeçalho passaram a usar `mark()`
(`src/utilities/format.js`), o mesmo símbolo da R70 (`viewBox 0 0 100 100`, dois caminhos que leem
`--bv-symbol-body` e `--bv-symbol-threshold`):

- `src/features/entry/account.js` — `entryTop()`, que serve cadastro, login e convite;
- `src/features/entry/arrive.js` — boas-vindas;
- `src/features/legal/pages.js` — Política de privacidade e Código de conduta;
- `src/features/support/help.js` — Ajuda, Fale com a gente e Meus chamados, e a conta apagada.

A regra `.en-mark` ficou órfã e saiu do CSS. O símbolo herda o tamanho de `.brand-mark` (32 px) e as
cores do tema, como no topo do app.

### 5. BAIXA — checkpoints que contavam PASS sem verificar

Em `scripts/bivaque-html/round71-proof.mjs`, no 1440, `mobile-menu` e `no-overflow` retornavam antes
de abrir a landing.

**Correção.**

- `mobile-menu`, no 1440: abre a landing e afirma que o botão do menu **não** está visível, que a
  navegação por âncoras **está** visível e que há pelo menos quatro âncoras à vista.
- `no-overflow`: mede `scrollWidth ≤ clientWidth` do `#main` nos dois tamanhos; a mensagem de falha
  agora diz em que largura a landing rolou de lado.

Nenhum dos dois tem mais caminho de retorno antecipado.

### 6. MÉDIA — o foco escapava da folha do menu

A folha tinha `aria-modal="true"`, mas Tab e Shift+Tab alcançavam a página atrás dela.

**Correção (`src/features/entry/landing.js`).**

- Com a folha aberta, tudo o que está fora dela na landing fica `inert`: o atalho "Pular para o
  conteúdo", o topo, `#ld-main`, o rodapé e a barra fixa. Ao fechar, o `inert` sai — inclusive no
  `destroy()` do `landingMount`, para uma troca de tela não deixar a landing morta.
- O `keydown` da folha ganhou o ciclo do Tab: no último item, Tab volta ao primeiro; no primeiro,
  Shift+Tab vai ao último; se o foco estiver fora da folha, o primeiro Tab o traz para dentro.
- Esc e os itens continuam fechando a folha, e o foco volta ao botão que a abriu (o `setMenu(false)`
  tira o `inert` e então foca o botão).

### 7. MÉDIA — a barra fixa escondida recebia foco

A barra do celular só era deslocada com `translateY(100%)`; o CTA dela continuava focável e exposto.

**Correção (`landing.js` + `styles/landing.css`).** O `sync()` agora amarra o estado da barra ao da
rolagem:

- `inert` na barra escondida (imediato, sem depender da transição);
- `aria-hidden="true"` enquanto escondida, removido quando aparece;
- `visibility:hidden` no CSS, com `visibility` na transição, e `visible` no `.ld-show`.

Ao rolar além do CTA do topo, a barra aparece e o botão volta a receber foco. Ela também continua
sumindo na chamada final (`#fim`), como antes.

### 8. MÉDIA — alvo abaixo de 44 px

"Fale com a gente", nas perguntas, media 149 × 27 px.

**Correção (`styles/landing.css`).** `.ld-inline` virou
`display:inline-flex;align-items:center;min-height:44px;padding:0 4px;margin:0 -4px`: o alvo passa de
44 px sem quebrar a linha do texto nem deslocar a frase (o padding negativo devolve o recuo).

Na revisão dos outros botões inline e do rodapé, "Ajuda" e os links legais ficavam com 44 px de
altura mas menos de 44 de largura. `.ld-link` e os links legais do rodapé/folha ganharam
`min-width:44px` com o texto centralizado. O topo (`.ld-text`, `.ld-home`), o atalho de pular
conteúdo, as perguntas e a folha já passavam.

## Prova nova: `scripts/bivaque-html/round72-proof.mjs`

Roda no `proof-harness.mjs`, nos quatro contextos (375 e 1440, claro e escuro). Sete checkpoints:

1. **`create-menu-neutral`** — abre o Criar na Início (o FAB no 375, o painel do trilho no 1440),
   confere que o botão Criar está em `--bv-brasa`, que nenhuma opção tem esse fundo e que título e
   subtítulo de cada opção passam de 4,5:1 sobre o fundo efetivo (a camada que o Material pinta no
   shadow root, ou a primeira camada opaca acima dela), pela fórmula da WCAG.
2. **`share-palette`** — lê o fonte com `fs`, exige a constante `SHARE_PALETTE` com Papel, Grafite e
   Brasa, e recusa qualquer `#rrggbb` fora dela.
3. **`entry-shapes`** — envia um chamado e mede `.ticket` em Meus chamados, `.help-card` na Ajuda e
   `#en-date` no passo 3 da entrada: os três com 12 px.
4. **`entry-symbol`** — `svg.brand-mark` com `viewBox 0 0 100 100` e dois caminhos no cadastro, no
   convite, no login, na Política de privacidade, na Ajuda e nas boas-vindas (até o fim da entrada),
   e nenhum `.en-mark` sobrando.
5. **`landing-focus-trap`** — abre a folha, exige `inert` no topo, em `#ld-main`, no rodapé e na
   barra; Tab e Shift+Tab mais vezes do que o número de itens, sempre com o `document.activeElement`
   dentro da folha; Esc fecha, devolve o foco ao botão e tira o `inert`. No 1440, onde não há folha,
   afirma o contrário: sem botão de menu, navegação por âncoras à vista e nenhuma folha aberta.
6. **`sticky-bar-hidden-from-keyboard`** — no topo, o botão da barra não recebe foco e a barra está
   `inert`, `aria-hidden="true"` e `visibility:hidden`; depois de rolar, a barra aparece, o `inert`
   sai e o botão recebe foco. No 1440, a barra está `display:none` e o botão também não recebe foco.
7. **`inline-targets`** — "Fale com a gente" e cada link do rodapé com pelo menos 44 × 44 px.

Nenhum checkpoint devolve PASS sem medir: os dois que só valem no celular afirmam, no desktop, a
verdade equivalente (não há folha; a barra está fora de alcance).

### Vermelho contra a base

`round72-proof.mjs` contra `574365f4` (build `0c579323…`), nos quatro contextos:
**22 dos 28 checkpoints falham** (6 passam). As capturas das falhas ficaram em
`.visual/bivaque-html-round72/functional/shots/`; a saída da execução:

| Checkpoint | 375-light | 375-dark | 1440-light | 1440-dark |
|---|---|---|---|---|
| `create-menu-neutral` | falha: opção com fundo `rgb(184, 74, 58)` | falha: fundo `rgb(224, 122, 90)` | passa | passa |
| `share-palette` | falha: sem `SHARE_PALETTE` | falha | falha | falha |
| `entry-shapes` | falha: `ticket: 16px` | falha | falha | falha |
| `entry-symbol` | falha: cadastro sem símbolo | falha | falha | falha |
| `landing-focus-trap` | falha: `#ld-top` ativo com a folha aberta | falha | passa | passa |
| `sticky-bar-hidden-from-keyboard` | falha: barra `visible`, `inert false` | falha | passa | passa |
| `inline-targets` | falha: "Fale com a gente" mede 149×27 | falha | falha | falha |

Os seis que passam na base são os que já estavam certos: o painel do Criar do desktop (nunca foi
Brasa), e os dois checkpoints de celular na sua forma de desktop (não há folha nem barra fixa).

### Verde no candidato

- `round72-proof.mjs`, 4 contextos: **28/28 PASS**, sem erro de JS e sem requisição externa.
- `round71-proof.mjs`, 4 contextos: **44/44 PASS** — inclusive `mobile-menu` e `no-overflow`, agora
  medindo de verdade no 1440.
- `round70-proof.mjs`, 4 contextos: **24/24 PASS** (a pele inteira continua válida).
- `round53-proof.mjs` e `round54-proof.mjs`, em 375-light: **4/4** e **6/6**.

### Contraste do menu Criar (fórmula da WCAG)

| Par | Claro | Escuro |
|---|---|---|
| título (`on-surface`) sobre a opção (`surface-container-high`) | 10,78:1 | 10,50:1 |
| subtítulo (`on-surface-variant`) sobre a mesma opção | 5,06:1 | 6,17:1 |

Os dois subtítulos passavam de 4,5:1 no candidato e davam 3,88:1 e 4,23:1 na base.

## Gate

`npx pnpm@11.18.0 gate` **verde**: lint, typecheck, 1.468 testes unitários, os de privacidade, 120 de
escopo e a varredura de segredos. O build do web pulou (`apps/web/.env.local` ausente nesta
worktree), como nas rodadas anteriores — isso não prova que o Next compila.

## Build

`python scripts/bivaque-html/build.py` → `dist/Bivaque_Material_Web.html`, 3.507.335 bytes, SHA256
`ae26590f4da1d27f34c137200463c5525d15ec336fe8911ea94016f83398ffbb`. A referência congelada continua
intacta (`29a402c4…`).

## O que fica para o fechamento do lote

- Recongelar a base visual a partir deste candidato (`ae26590f…`), nos dois temas.
- Rodar a bateria de captura completa (375/768/1440 × claro/escuro) contra a base nova.
- Revisão independente do diff (o executor não é o revisor).
- O menu do celular e o painel do desktop continuam sendo dois desenhos: a regra de cor é a mesma,
  mas a forma (pilha de tonal buttons × grade de itens) não foi unificada, porque o achado pedia a
  cor, não o desenho.
