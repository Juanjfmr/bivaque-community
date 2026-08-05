# Auditoria das telas — Implementation Plan

> **Para quem executa (humano ou agente):** este plano é autocontido e não
> depende de ferramenta específica. Execute **uma task por vez**, na ordem.
> Marque os checkboxes (`- [ ]`) conforme avança.
>
> **Não** invoque skills do Claude Code (`superpowers:*`, `anthropic-skills:*`):
> não existem fora dele e o plano não precisa delas.
>
> Regra de parada: se um comando de verificação não produzir a contagem
> esperada, **pare e investigue**. Leia antes "Falsos positivos conhecidos" —
> três falhas deste repositório não têm relação com a mudança em curso.

**Goal:** Zerar o backlog mecânico da auditoria visual (59 findings, 17 high),
estender a auditoria aos itens da rubrica que são mecanizáveis, e estabelecer o
processo de revisão por tela para o que só olho resolve.

**Architecture:** Três fases. A 1 torna a auditoria reprodutível fora desta
máquina — hoje ela depende de correções não commitadas. A 2 zera o backlog
mecânico, uma regra por task, com critério de pronto objetivo (contagem da
regra → 0). A 3 estende o auditor às regras da rubrica que dá para mecanizar e
define a revisão de julgamento, que **não** é automatizável e o plano não finge
que seja.

**Tech Stack:** Playwright (3 viewports: 375/768/1440), auditoria determinística
in-page em `scripts/visual/capture.mjs`, relatórios em `.visual/<run>/`.

**Fontes:** [`docs/agents/VISUAL_GUIDE.md`](../../agents/VISUAL_GUIDE.md) §9 é a
rubrica; [`docs/agents/DESIGN_SPEC.md`](../../agents/DESIGN_SPEC.md) é a fonte
da linguagem visual; [`docs/journeys/MAP.md`](../../journeys/MAP.md) diz o que
está funcionalmente quebrado — e isso governa o que **não** polir.

---

## Linha de base medida (run `2026-08-05T15-12-12-782Z`)

**59 findings, 17 high**, sobre 11 rotas × 3 viewports = 33 capturas.

| Regra | Contagem | Severidade | Rubrica §9 |
|---|---|---|---|
| `font-too-small` | 33 | medium | item 7 (a11y) |
| `touch-target` | 15 | **high** | item 7 (a11y) |
| `no-transition` | 9 | medium | — (affordance) |
| `layout-overflow` | 2 | **high** | item 7 (a11y) |

Os 17 `high` são exatamente `layout-overflow` + `touch-target`. Isso define a
ordem das tasks.

**Por rota:**

| Rota | Findings |
|---|---|
| `/events` | 19 |
| `/recommendations` | 12 |
| `/notifications` | 12 |
| `/onboarding` | 9 |
| `/groups` | 7 |
| `/`, `/login`, `/consent`, `/community`, `/messages`, `/profile` | **0** |

**Já limpas no auditor** (não removê-las, são regressão-guarda): `contrast`,
`token-discipline`, `image-alt`, `heading-structure`.

---

## A regra que governa o que polir

O MAP.md §1 congelou trabalho cosmético até o mapa ser aprovado, com uma
exceção explícita: *"correções de acessibilidade, bugs visuais críticos e
segurança são exceções"*.

O mapa está aprovado, então o congelamento caiu. Mas a lógica por trás dele
continua valendo e vira o critério desta auditoria:

> **Não invista gosto numa tela cujo ciclo funcional não fecha.**

Concretamente, cruzando com a matriz do MAP:

| Rota | Findings | Lacuna funcional | O que fazer agora |
|---|---|---|---|
| `/notifications` | 12 | **8a** — clicar não navega para o objeto | Só a11y. O card é decorativo até a Onda 5 |
| `/events` | 19 | **6c** — sem rota de detalhe; **6a** — convite é placeholder | Só a11y. Densidade e hierarquia dependem do detalhe existir |
| `/recommendations` | 12 | **7b** — sem visualização dos pedidos | Só a11y. É P2 no mapa |
| `/groups` | 7 | **5a/5d** — sem página de detalhe nem feed | Só a11y |
| `/onboarding` | 9 | **1a/1b/1c** — P0 aberto | Só a11y. A tela vai mudar na Onda 2 |

**Consequência:** as Fases 1 e 2 deste plano são inteiramente acessibilidade e
correção mecânica — seguras de fazer agora, em qualquer tela. A Fase 3 tem uma
parte mecanizável (segura) e uma parte de julgamento, que só deve rodar nas
telas cujo ciclo funcional já fecha. Hoje isso significa `/community`,
`/profile`, `/login` e `/consent` — que, não por acaso, são as quatro com zero
findings mecânicos.

---

## Contexto obrigatório antes de começar

### Ciclo de trabalho

```bash
node scripts/visual/loop.mjs          # gates -> build -> serve -> screenshot -> audit
node scripts/visual/loop.mjs --fast   # só captura, contra dev server já rodando
```

O loop completo faz build e leva minutos; `--fast` é o que você usa entre
correções. Se o bundle do Chromium gerenciado não estiver instalado:

```bash
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
```

Cada run grava em `.visual/<timestamp>/` com `report.json`, `report.md`,
`ITERATION.md` e `shots/<rota>--<viewport>--{fold,full}.png`.

### Ler os findings de uma regra

Este é o comando que você vai usar em toda task da Fase 2. Ele lista rota,
viewport, seletor e detalhe de cada ocorrência:

```bash
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
const rule=process.argv[1];
let n=0;
for(const x of r.results) for(const f of (x.findings||[])) if(f.rule===rule){
  n++; console.log(x.route,'|',x.viewport,'|',f.selector,'|',f.detail);
}
console.log('--- total',rule+':',n);
" touch-target
```

Troque `touch-target` pelo nome da regra da task.

### Contagem resumida (critério de pronto)

```bash
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
const by={};
for(const x of r.results) for(const f of (x.findings||[])) by[f.rule]=(by[f.rule]||0)+1;
console.log('total:',r.total,'high:',r.high,JSON.stringify(by));
"
```

### Falsos positivos conhecidos

**1. Perfil fantasma `Visual Capture`.** O próprio tooling desta auditoria
insere um perfil no banco local. Se você rodar `test:db` depois de uma captura,
seis asserts de listagem de perfil falham (`locality-profile-access`,
`authz-allowed-matrix` 12/15/18, `authz-denied-matrix` 13, `full-regression`
35), todos com `have: ("Visual Capture") / want: NULL`. **Não é regressão.**
Rode `npx pnpm@11.18.0 db:reset` antes de `test:db`.

**2. Artefatos do Playwright quebram o lint.** `playwright-report/` e
`test-results/` não estão no `.gitignore` e `biome check .` os varre:

```bash
rm -rf playwright-report test-results
```

**3. Rota autenticada caindo em `/login`.** Se o relatório vier com
`authenticated: false` ou todas as rotas com `landedOn: "/login"`, a sessão não
chegou ao middleware. A Task 1 corrige isso — não siga sem ela.

### Regras que não podem ser violadas

- **Componentes leem tokens**, nunca cor crua: `var(--…)` ou `brandTokens`.
  A regra `token-discipline` está em zero; mantenha assim.
- **HeroUI v3 é a única biblioteca de componentes.** Um teste de escopo falha
  se aparecer import de shadcn/Radix/Headless UI.
- **Biome:** aspas duplas, sem ponto e vírgula, indentação 2, `lineWidth` 100.
- Nunca commitar `.visual/` — é gitignored e deve continuar.

---

## Fase 1 — Tornar a auditoria reprodutível

## Task 1: Commitar os habilitadores e congelar a linha de base

Hoje `scripts/visual/capture.mjs` e `loop.mjs` têm correções **não
commitadas** sem as quais a captura autenticada não funciona: fallback de
credenciais para `apps/web/.env.local` e gravação da sessão como **cookie**
além de `localStorage` — o middleware `@supabase/ssr` lê cookie, e sem ele toda
rota protegida redireciona para `/login`.

Enquanto isso não estiver no repositório, ninguém além desta máquina consegue
reproduzir a auditoria.

**Files:**
- Modify: `scripts/visual/capture.mjs`
- Modify: `scripts/visual/loop.mjs`

- [ ] **Step 1: Confirmar o que está pendente**

```bash
git diff --stat -- scripts/visual/
```

Esperado: dois arquivos, ~60 inserções.

- [ ] **Step 2: Rodar os gates de escopo**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 test:scope
```

Esperado: ambos verdes. `test:scope` cobre `scripts/` e config — é o gate certo
para mudança em tooling.

- [ ] **Step 3: Commitar**

```bash
git add scripts/visual/capture.mjs scripts/visual/loop.mjs
git commit -m "fix(visual): read credentials from .env.local and set the session cookie"
```

- [ ] **Step 4: Rodar a linha de base limpa**

```bash
node scripts/visual/loop.mjs
```

- [ ] **Step 5: Congelar os números**

```bash
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
const by={};
for(const x of r.results) for(const f of (x.findings||[])) by[f.rule]=(by[f.rule]||0)+1;
console.log('autenticado:',r.authenticated,'| total:',r.total,'| high:',r.high);
console.log(JSON.stringify(by));
"
```

Esperado: `autenticado: true` e contagens próximas de
`{"font-too-small":33,"touch-target":15,"no-transition":9,"layout-overflow":2}`.

**Se `autenticado` vier `false`, pare.** Todo o resto do plano mede o
comportamento de usuário logado; sem sessão a auditoria vê só `/login` e as
contagens são ficção.

Anote os números — eles são o denominador das tasks seguintes.

---

## Fase 2 — Zerar o backlog mecânico

Ordem por severidade: os 17 `high` primeiro.

## Task 2: `layout-overflow` — 2 findings, high

Página que rola de lado é o pior defeito da lista: quebra leitura no mobile e
não tem contorno para o usuário.

- [ ] **Step 1: Listar as ocorrências**

```bash
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
for(const x of r.results) for(const f of (x.findings||[])) if(f.rule==='layout-overflow')
  console.log(x.route,'|',x.viewport,'|',f.selector,'|',f.detail);
"
```

- [ ] **Step 2: Abrir a captura de cada ocorrência**

`.visual/<run>/shots/<rota>--<viewport>--full.png`. O elemento que estoura
quase sempre é tabela, bloco de código, chip row ou imagem sem `max-width`.

- [ ] **Step 3: Corrigir**

O padrão do repositório: conteúdo largo rola **dentro do próprio container**,
nunca no `body`. Aplique `overflow-x: auto` no wrapper do elemento largo, e
`max-width: 100%` em mídia. Não resolva com `overflow: hidden` na página — isso
esconde o sintoma e corta conteúdo.

- [ ] **Step 4: Verificar**

```bash
node scripts/visual/loop.mjs --fast
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
let n=0; for(const x of r.results) for(const f of (x.findings||[])) if(f.rule==='layout-overflow') n++;
console.log('layout-overflow:',n);
"
```

Esperado: `0`.

- [ ] **Step 5: Commitar**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
git add apps/web
git commit -m "fix(a11y): contain horizontal overflow within scrollable wrappers"
```

---

## Task 3: `touch-target` — 15 findings, high

Alvo abaixo de 44×44 CSS px. Concentrado nas rotas de lista.

- [ ] **Step 1: Listar as ocorrências**

```bash
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
const by={};
for(const x of r.results) for(const f of (x.findings||[])) if(f.rule==='touch-target'){
  console.log(x.route,'|',x.viewport,'|',f.selector,'|',f.detail);
  by[f.selector]=(by[f.selector]||0)+1;
}
console.log('--- por seletor:',JSON.stringify(by));
"
```

O agrupamento por seletor é o que importa: se o mesmo seletor aparece em várias
rotas, é **um componente compartilhado** e uma correção resolve várias
ocorrências. Comece por esses.

- [ ] **Step 2: Corrigir**

Alvo mínimo de 44×44. Padding é preferível a `width`/`height` fixos — preserva
o ritmo visual e não deforma o layout. Para ícone pequeno dentro de alvo
grande, aumente a área clicável do botão, não o ícone.

- [ ] **Step 3: Verificar**

```bash
node scripts/visual/loop.mjs --fast
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
let n=0; for(const x of r.results) for(const f of (x.findings||[])) if(f.rule==='touch-target') n++;
console.log('touch-target:',n);
"
```

Esperado: `0`.

- [ ] **Step 4: Commitar**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
git add apps/web
git commit -m "fix(a11y): raise interactive targets to the 44px minimum"
```

---

## Task 4: `font-too-small` — 33 findings, medium

Texto abaixo de 12px. É a maior contagem e provavelmente a mais barata: 33
ocorrências em 5 rotas quase certamente saem de dois ou três componentes de
metadado (carimbo de tempo, contador, legenda de card).

- [ ] **Step 1: Listar agrupando por seletor**

```bash
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
const by={};
for(const x of r.results) for(const f of (x.findings||[])) if(f.rule==='font-too-small')
  by[f.selector+' :: '+f.detail]=(by[f.selector+' :: '+f.detail]||0)+1;
for(const [k,v] of Object.entries(by).sort((a,b)=>b[1]-a[1])) console.log(v,'x',k);
"
```

- [ ] **Step 2: Corrigir na origem**

Suba para 12px no mínimo. **Corrija no componente compartilhado**, não em cada
uso — se o mesmo seletor aparece 8 vezes, há um componente errado, não 8 telas
erradas. Use a escala tipográfica do `DESIGN_SPEC.md` §1; não introduza um
tamanho novo só para passar no limiar.

- [ ] **Step 3: Verificar**

```bash
node scripts/visual/loop.mjs --fast
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
let n=0; for(const x of r.results) for(const f of (x.findings||[])) if(f.rule==='font-too-small') n++;
console.log('font-too-small:',n);
"
```

Esperado: `0`.

- [ ] **Step 4: Commitar**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
git add apps/web packages
git commit -m "fix(a11y): raise metadata type to the 12px minimum"
```

---

## Task 5: `no-transition` — 9 findings, medium

Elemento interativo sem transição de estado. Não é acessibilidade — é
affordance: sem retorno visual, o usuário não sabe se o toque registrou.

- [ ] **Step 1: Listar**

```bash
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
for(const x of r.results) for(const f of (x.findings||[])) if(f.rule==='no-transition')
  console.log(x.route,'|',x.viewport,'|',f.selector);
"
```

- [ ] **Step 2: Corrigir**

Transição curta em `background-color`, `border-color` ou `opacity`. Siga o que
o `DESIGN_SPEC.md` define para movimento; **não** anime `width`, `height` nem
`top`/`left` — força layout a cada quadro.

Respeite `prefers-reduced-motion`: a transição precisa ser suprimida quando o
usuário pediu menos movimento.

- [ ] **Step 3: Verificar**

```bash
node scripts/visual/loop.mjs --fast
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
const by={};
for(const x of r.results) for(const f of (x.findings||[])) by[f.rule]=(by[f.rule]||0)+1;
console.log('total:',r.total,'high:',r.high,JSON.stringify(by));
"
```

Esperado: `total: 0`, `high: 0`, objeto vazio. **Este é o marco da Fase 2.**

- [ ] **Step 4: Commitar**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
git add apps/web packages
git commit -m "feat(ui): add state transitions to interactive elements"
```

---

## Fase 3 — Estender a auditoria e revisar por tela

## Task 6: Mecanizar os itens 4 e 8 da rubrica

A rubrica §9 tem 8 itens. O auditor cobre bem o item 7 (a11y) e nada dos
outros. Dois são mecanizáveis a custo baixo e vale fazer, porque viram
regressão-guarda permanente em vez de inspeção manual repetida.

**Files:**
- Modify: `scripts/visual/capture.mjs` (função `auditPage`)

- [ ] **Step 1: Adicionar a regra `nav-active` (rubrica item 4)**

Dentro de `auditPage`, junto às demais checagens. A rubrica exige: sidebar
ativa correta no desktop, bottom nav ativa no mobile, pré-auth sem nav.

```js
  // 9. active navigation — exactly one current item when nav is present
  const navItems = document.querySelectorAll("nav a")
  if (navItems.length > 0) {
    const current = document.querySelectorAll(
      'nav a[aria-current="page"], nav a[data-active="true"]',
    )
    if (current.length !== 1) {
      add(
        "nav-active",
        "medium",
        "nav",
        `${current.length} active nav items (expected 1)`,
      )
    }
  }
```

- [ ] **Step 2: Adicionar a regra `forbidden-copy` (rubrica item 8)**

O produto proíbe expor posto, OM, endereço e selo de verificação. O banco já
impõe isso no conteúdo do usuário via `post_no_forbidden_terms`
(`supabase/migrations/20260802001300_fix_forbidden_content_regex.sql`), mas a
**copy estática da UI** não tem guarda nenhuma.

```js
  // 10. forbidden copy — the same privacy vocabulary the database rejects
  const forbidden =
    /\b(patente|posto militar|gradua[çc][ãa]o militar|organiza[çc][ãa]o militar|endere[çc]o residencial|selo de verifica[çc][ãa]o|verificado publicamente)\b/i
  const bodyText = document.body.innerText || ""
  const hit = forbidden.exec(bodyText)
  if (hit) {
    add("forbidden-copy", "high", "body", `forbidden term in UI copy: "${hit[0]}"`)
  }
```

- [ ] **Step 3: Rodar e confirmar que as regras novas ficam em zero**

```bash
node scripts/visual/loop.mjs --fast
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
const by={};
for(const x of r.results) for(const f of (x.findings||[])) by[f.rule]=(by[f.rule]||0)+1;
console.log(JSON.stringify(by));
"
```

Esperado: `{}` ou apenas as regras novas, caso encontrem algo real.

**Se `nav-active` disparar, investigue antes de corrigir o auditor.** Pode ser
defeito de verdade — nav sem item ativo é a queixa do item 4 da rubrica. Só
ajuste a regra se o componente marcar estado ativo por um mecanismo diferente
de `aria-current` / `data-active`; nesse caso, prefira **mudar o componente
para usar `aria-current`**, que é o que leitor de tela entende.

- [ ] **Step 4: Commitar**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 test:scope
git add scripts/visual/capture.mjs apps/web
git commit -m "feat(visual): audit active-nav state and forbidden UI copy"
```

---

## Task 7: Revisão de julgamento, tela a tela

Os itens 1, 2, 5 e 6 da rubrica — hierarquia, ritmo, densidade, responsivo —
**não são mecanizáveis** e este plano não finge que sejam. Precisam de olho nas
capturas.

**Escopo:** apenas as telas cujo ciclo funcional fecha, conforme a tabela do
início deste plano. Hoje: **`/community`, `/profile`, `/login`, `/consent`.**

As demais entram nesta task depois das ondas correspondentes do MAP.md — não
antes, porque hierarquia e densidade dependem de conteúdo e navegação que ainda
não existem.

- [ ] **Step 1: Gerar capturas frescas**

```bash
node scripts/visual/loop.mjs
```

- [ ] **Step 2: Revisar cada tela nos três viewports**

Para cada uma de `/community`, `/profile`, `/login`, `/consent`, abra
`shots/<rota>--{mobile-375,tablet-768,desktop-1440}--full.png` e responda,
por escrito, os quatro itens:

1. **Hierarquia** — a ação primária é achável em menos de 1 segundo?
2. **Ritmo** — gaps de 12-16px entre cards, padding 16px, sem deriva arbitrária?
3. **Densidade** — a lista é coesa, sem virar parede de texto nem objetos
   flutuando soltos?
4. **Responsivo** — 375 é um desenho próprio, não 1440 espremido? 1440 usa
   right rail e sidebar, sem margem morta nas laterais?

- [ ] **Step 3: Registrar o veredito**

Grave em `docs/agents/VISUAL_AUDIT-<data>.md`: uma seção por tela, os quatro
itens com **passa/não passa** e, quando não passar, a evidência (qual captura,
o que está errado). Sem isso a revisão não é auditável e a próxima rodada
recomeça do zero.

- [ ] **Step 4: Abrir tarefas de correção, não corrigir aqui**

Cada "não passa" vira uma tarefa própria com escopo definido. Misturar achado e
correção nesta task produz commit gigante e irrevisável.

- [ ] **Step 5: Commitar o registro**

```bash
git add docs/agents/VISUAL_AUDIT-*.md
git commit -m "docs(design): record per-screen visual audit verdict"
```

---

## Task 8: Gate final

- [ ] **Step 1: Auditoria zerada**

```bash
node scripts/visual/loop.mjs
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
console.log('autenticado:',r.authenticated,'| total:',r.total,'| high:',r.high);
"
```

Esperado: `autenticado: true`, `total: 0`, `high: 0`.

- [ ] **Step 2: Suíte completa na ordem do CI**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 test
npx pnpm@11.18.0 build
npx pnpm@11.18.0 db:reset
npx pnpm@11.18.0 test:db
```

`db:reset` antes de `test:db` não é opcional aqui — as capturas desta auditoria
deixaram o perfil `Visual Capture` no banco local.

- [ ] **Step 3: Atualizar o MAP**

Registrar em `docs/journeys/MAP.md` que a auditoria mecânica está zerada e qual
run é a evidência. As lacunas funcionais das telas **não** mudam — auditoria
visual não fecha ciclo funcional, e o mapa não deve sugerir que fecha.

---

## Fora deste plano

- Redesign, troca de paleta, nova tipografia. A rubrica mede aderência ao
  `DESIGN_SPEC.md`, não propõe outro.
- Telas cujo ciclo funcional está aberto (`/events`, `/groups`,
  `/notifications`, `/recommendations`, `/onboarding`) além das correções de
  acessibilidade das Fases 1 e 2.
- Telas que ainda não existem: detalhe de grupo, detalhe de evento,
  `/onboarding/status`, painel administrativo, e toda a superfície de
  comunidade do outro plano.
- Contraste, tokens, alt de imagem e `h1` único — já estão em zero. As regras
  ficam como guarda; não há trabalho pendente.

## Risco conhecido

**A Task 7 é a única sem critério objetivo de pronto.** As demais terminam
quando uma contagem chega a zero; essa termina quando alguém decide que está
bom. Por isso ela exige registro escrito com evidência — é o que permite
discordar depois, e é o que impede a revisão de virar opinião não rastreável.
