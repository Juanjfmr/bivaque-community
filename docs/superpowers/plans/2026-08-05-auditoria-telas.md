# Auditoria das telas â€” Implementation Plan

> **Para quem executa (humano ou agente):** este plano Ã© autocontido e nÃ£o
> depende de ferramenta especÃ­fica. Execute **uma task por vez**, na ordem.
> Marque os checkboxes (`- [ ]`) conforme avanÃ§a.
>
> **NÃ£o** invoque skills do Claude Code (`superpowers:*`, `anthropic-skills:*`):
> nÃ£o existem fora dele e o plano nÃ£o precisa delas.
>
> Regra de parada: se um comando de verificaÃ§Ã£o nÃ£o produzir a contagem
> esperada, **pare e investigue**. Leia antes "Falsos positivos conhecidos" â€”
> trÃªs falhas deste repositÃ³rio nÃ£o tÃªm relaÃ§Ã£o com a mudanÃ§a em curso.

**Goal:** Zerar o backlog mecÃ¢nico da auditoria visual (59 findings, 17 high),
estender a auditoria aos itens da rubrica que sÃ£o mecanizÃ¡veis, e estabelecer o
processo de revisÃ£o por tela para o que sÃ³ olho resolve.

**Architecture:** TrÃªs fases. A 1 torna a auditoria reprodutÃ­vel fora desta
mÃ¡quina â€” hoje ela depende de correÃ§Ãµes nÃ£o commitadas. A 2 zera o backlog
mecÃ¢nico, uma regra por task, com critÃ©rio de pronto objetivo (contagem da
regra â†’ 0). A 3 estende o auditor Ã s regras da rubrica que dÃ¡ para mecanizar e
define a revisÃ£o de julgamento, que **nÃ£o** Ã© automatizÃ¡vel e o plano nÃ£o finge
que seja.

**As Tasks 1 a 6 e 8 rodam uma vez. A Task 7 Ã© permanente** â€” roda a cada onda
do `MAP.md`, sobre as telas que aquela onda tocou ou criou, e bloqueia o
trabalho seguinte (Â§10.2 do MAP). Este documento nÃ£o Ã© consumido ao ser
executado; a Task 7 continua sendo o procedimento de referÃªncia depois disso.

**Tech Stack:** Playwright (3 viewports: 375/768/1440), auditoria determinÃ­stica
in-page em `scripts/visual/capture.mjs`, relatÃ³rios em `.visual/<run>/`.

**Fontes:** [`docs/agents/VISUAL_GUIDE.md`](../../agents/VISUAL_GUIDE.md) Â§9 Ã© a
rubrica; [`docs/agents/DESIGN_SPEC.md`](../../agents/DESIGN_SPEC.md) Ã© a fonte
da linguagem visual; [`docs/journeys/MAP.md`](../../journeys/MAP.md) diz o que
estÃ¡ funcionalmente quebrado â€” e isso governa o que **nÃ£o** polir.

---

## Linha de base medida (run `2026-08-05T15-12-12-782Z`)

**59 findings, 17 high**, sobre 11 rotas Ã— 3 viewports = 33 capturas.

| Regra | Contagem | Severidade | Rubrica Â§9 |
|---|---|---|---|
| `font-too-small` | 33 | medium | item 7 (a11y) |
| `touch-target` | 15 | **high** | item 7 (a11y) |
| `no-transition` | 9 | medium | â€” (affordance) |
| `layout-overflow` | 2 | **high** | item 7 (a11y) |

Os 17 `high` sÃ£o exatamente `layout-overflow` + `touch-target`. Isso define a
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

**JÃ¡ limpas no auditor** (nÃ£o removÃª-las, sÃ£o regressÃ£o-guarda): `contrast`,
`token-discipline`, `image-alt`, `heading-structure`.

---

## A regra que governa o que polir

O MAP.md Â§1 congelou trabalho cosmÃ©tico atÃ© o mapa ser aprovado, com uma
exceÃ§Ã£o explÃ­cita: *"correÃ§Ãµes de acessibilidade, bugs visuais crÃ­ticos e
seguranÃ§a sÃ£o exceÃ§Ãµes"*.

O mapa estÃ¡ aprovado, entÃ£o o congelamento caiu. Mas a lÃ³gica por trÃ¡s dele
continua valendo e vira o critÃ©rio desta auditoria:

> **NÃ£o invista gosto numa tela cujo ciclo funcional nÃ£o fecha.**

Concretamente, cruzando com a matriz do MAP:

| Rota | Findings | Lacuna funcional | O que fazer agora |
|---|---|---|---|
| `/notifications` | 12 | **8a** â€” clicar nÃ£o navega para o objeto | SÃ³ a11y. O card Ã© decorativo atÃ© a Onda 5 |
| `/events` | 19 | **6c** â€” sem rota de detalhe; **6a** â€” convite Ã© placeholder | SÃ³ a11y. Densidade e hierarquia dependem do detalhe existir |
| `/recommendations` | 12 | **7b** â€” sem visualizaÃ§Ã£o dos pedidos | SÃ³ a11y. Ã‰ P2 no mapa |
| `/groups` | 7 | **5a/5d** â€” sem pÃ¡gina de detalhe nem feed | SÃ³ a11y |
| `/onboarding` | 9 | **1a/1b/1c** â€” P0 aberto | SÃ³ a11y. A tela vai mudar na Onda 2 |

**ConsequÃªncia:** as Fases 1 e 2 deste plano sÃ£o inteiramente acessibilidade e
correÃ§Ã£o mecÃ¢nica â€” seguras de fazer agora, em qualquer tela. A Fase 3 tem uma
parte mecanizÃ¡vel (segura) e uma parte de julgamento, que sÃ³ deve rodar nas
telas cujo ciclo funcional jÃ¡ fecha. Hoje isso significa `/community`,
`/profile`, `/login` e `/consent` â€” que, nÃ£o por acaso, sÃ£o as quatro com zero
findings mecÃ¢nicos.

---

## Contexto obrigatÃ³rio antes de comeÃ§ar

### Ciclo de trabalho

```bash
node scripts/visual/loop.mjs          # gates -> build -> serve -> screenshot -> audit
node scripts/visual/loop.mjs --fast   # sÃ³ captura, contra dev server jÃ¡ rodando
```

O loop completo faz build e leva minutos; `--fast` Ã© o que vocÃª usa entre
correÃ§Ãµes. Se o bundle do Chromium gerenciado nÃ£o estiver instalado:

```bash
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
```

Cada run grava em `.visual/<timestamp>/` com `report.json`, `report.md`,
`ITERATION.md` e `shots/<rota>--<viewport>--{fold,full}.png`.

### Ler os findings de uma regra

Este Ã© o comando que vocÃª vai usar em toda task da Fase 2. Ele lista rota,
viewport, seletor e detalhe de cada ocorrÃªncia:

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

### Contagem resumida (critÃ©rio de pronto)

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

**1. Perfil fantasma `Visual Capture`.** O prÃ³prio tooling desta auditoria
insere um perfil no banco local. Se vocÃª rodar `test:db` depois de uma captura,
seis asserts de listagem de perfil falham (`locality-profile-access`,
`authz-allowed-matrix` 12/15/18, `authz-denied-matrix` 13, `full-regression`
35), todos com `have: ("Visual Capture") / want: NULL`. **NÃ£o Ã© regressÃ£o.**
Rode `npx pnpm@11.18.0 db:reset` antes de `test:db`.

**2. Artefatos do Playwright quebram o lint.** `playwright-report/` e
`test-results/` nÃ£o estÃ£o no `.gitignore` e `biome check .` os varre:

```bash
rm -rf playwright-report test-results
```

**3. Rota autenticada caindo em `/login`.** Se o relatÃ³rio vier com
`authenticated: false` ou todas as rotas com `landedOn: "/login"`, a sessÃ£o nÃ£o
chegou ao middleware. A Task 1 corrige isso â€” nÃ£o siga sem ela.

### Regras que nÃ£o podem ser violadas

- **Componentes leem tokens**, nunca cor crua: `var(--â€¦)` ou `brandTokens`.
  A regra `token-discipline` estÃ¡ em zero; mantenha assim.
- **HeroUI v3 Ã© a Ãºnica biblioteca de componentes.** Um teste de escopo falha
  se aparecer import de shadcn/Radix/Headless UI.
- **Biome:** aspas duplas, sem ponto e vÃ­rgula, indentaÃ§Ã£o 2, `lineWidth` 100.
- Nunca commitar `.visual/` â€” Ã© gitignored e deve continuar.

---

## Fase 1 â€” Tornar a auditoria reprodutÃ­vel

## Task 1: Commitar os habilitadores e congelar a linha de base

Hoje `scripts/visual/capture.mjs` e `loop.mjs` tÃªm correÃ§Ãµes **nÃ£o
commitadas** sem as quais a captura autenticada nÃ£o funciona: fallback de
credenciais para `apps/web/.env.local` e gravaÃ§Ã£o da sessÃ£o como **cookie**
alÃ©m de `localStorage` â€” o middleware `@supabase/ssr` lÃª cookie, e sem ele toda
rota protegida redireciona para `/login`.

Enquanto isso nÃ£o estiver no repositÃ³rio, ninguÃ©m alÃ©m desta mÃ¡quina consegue
reproduzir a auditoria.

**Files:**
- Modify: `scripts/visual/capture.mjs`
- Modify: `scripts/visual/loop.mjs`

- [x] **Step 1: Confirmar o que estÃ¡ pendente**

```bash
git diff --stat -- scripts/visual/
```

Esperado: dois arquivos, ~60 inserÃ§Ãµes.

- [x] **Step 2: Rodar os gates de escopo**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 test:scope
```

Esperado: ambos verdes. `test:scope` cobre `scripts/` e config â€” Ã© o gate certo
para mudanÃ§a em tooling.

- [x] **Step 3: Commitar**

```bash
git add scripts/visual/capture.mjs scripts/visual/loop.mjs
git commit -m "fix(visual): read credentials from .env.local and set the session cookie"
```

- [x] **Step 4: Rodar a linha de base limpa**

```bash
node scripts/visual/loop.mjs
```

- [x] **Step 5: Congelar os nÃºmeros**

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

Esperado: `autenticado: true` e contagens prÃ³ximas de
`{"font-too-small":33,"touch-target":15,"no-transition":9,"layout-overflow":2}`.

**Se `autenticado` vier `false`, pare.** Todo o resto do plano mede o
comportamento de usuÃ¡rio logado; sem sessÃ£o a auditoria vÃª sÃ³ `/login` e as
contagens sÃ£o ficÃ§Ã£o.

Anote os nÃºmeros â€” eles sÃ£o o denominador das tasks seguintes.

---

## Fase 2 â€” Zerar o backlog mecÃ¢nico

Ordem por severidade: os 17 `high` primeiro.

## Task 2: `layout-overflow` â€” 2 findings, high

PÃ¡gina que rola de lado Ã© o pior defeito da lista: quebra leitura no mobile e
nÃ£o tem contorno para o usuÃ¡rio.

- [x] **Step 1: Listar as ocorrÃªncias**

```bash
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
for(const x of r.results) for(const f of (x.findings||[])) if(f.rule==='layout-overflow')
  console.log(x.route,'|',x.viewport,'|',f.selector,'|',f.detail);
"
```

- [x] **Step 2: Abrir a captura de cada ocorrÃªncia**

`.visual/<run>/shots/<rota>--<viewport>--full.png`. O elemento que estoura
quase sempre Ã© tabela, bloco de cÃ³digo, chip row ou imagem sem `max-width`.

- [x] **Step 3: Corrigir**

O padrÃ£o do repositÃ³rio: conteÃºdo largo rola **dentro do prÃ³prio container**,
nunca no `body`. Aplique `overflow-x: auto` no wrapper do elemento largo, e
`max-width: 100%` em mÃ­dia. NÃ£o resolva com `overflow: hidden` na pÃ¡gina â€” isso
esconde o sintoma e corta conteÃºdo.

- [x] **Step 4: Verificar**

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

- [x] **Step 5: Commitar**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
git add apps/web
git commit -m "fix(a11y): contain horizontal overflow within scrollable wrappers"
```

---

## Task 3: `touch-target` â€” 15 findings, high

Alvo abaixo de 44Ã—44 CSS px. Concentrado nas rotas de lista.

- [x] **Step 1: Listar as ocorrÃªncias**

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

O agrupamento por seletor Ã© o que importa: se o mesmo seletor aparece em vÃ¡rias
rotas, Ã© **um componente compartilhado** e uma correÃ§Ã£o resolve vÃ¡rias
ocorrÃªncias. Comece por esses.

- [x] **Step 2: Corrigir**

Alvo mÃ­nimo de 44Ã—44. Padding Ã© preferÃ­vel a `width`/`height` fixos â€” preserva
o ritmo visual e nÃ£o deforma o layout. Para Ã­cone pequeno dentro de alvo
grande, aumente a Ã¡rea clicÃ¡vel do botÃ£o, nÃ£o o Ã­cone.

- [x] **Step 3: Verificar**

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

- [x] **Step 4: Commitar**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
git add apps/web
git commit -m "fix(a11y): raise interactive targets to the 44px minimum"
```

---

## Task 4: `font-too-small` â€” 33 findings, medium

Texto abaixo de 12px. Ã‰ a maior contagem e provavelmente a mais barata: 33
ocorrÃªncias em 5 rotas quase certamente saem de dois ou trÃªs componentes de
metadado (carimbo de tempo, contador, legenda de card).

- [x] **Step 1: Listar agrupando por seletor**

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

- [x] **Step 2: Corrigir na origem**

Suba para 12px no mÃ­nimo. **Corrija no componente compartilhado**, nÃ£o em cada
uso â€” se o mesmo seletor aparece 8 vezes, hÃ¡ um componente errado, nÃ£o 8 telas
erradas. Use a escala tipogrÃ¡fica do `DESIGN_SPEC.md` Â§1; nÃ£o introduza um
tamanho novo sÃ³ para passar no limiar.

- [x] **Step 3: Verificar**

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

- [x] **Step 4: Commitar**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
git add apps/web packages
git commit -m "fix(a11y): raise metadata type to the 12px minimum"
```

---

## Task 5: `no-transition` â€” 9 findings, medium

Elemento interativo sem transiÃ§Ã£o de estado. NÃ£o Ã© acessibilidade â€” Ã©
affordance: sem retorno visual, o usuÃ¡rio nÃ£o sabe se o toque registrou.

- [x] **Step 1: Listar**

```bash
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
for(const x of r.results) for(const f of (x.findings||[])) if(f.rule==='no-transition')
  console.log(x.route,'|',x.viewport,'|',f.selector);
"
```

- [x] **Step 2: Corrigir**

TransiÃ§Ã£o curta em `background-color`, `border-color` ou `opacity`. Siga o que
o `DESIGN_SPEC.md` define para movimento; **nÃ£o** anime `width`, `height` nem
`top`/`left` â€” forÃ§a layout a cada quadro.

Respeite `prefers-reduced-motion`: a transiÃ§Ã£o precisa ser suprimida quando o
usuÃ¡rio pediu menos movimento.

- [x] **Step 3: Verificar**

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

Esperado: `total: 0`, `high: 0`, objeto vazio. **Este Ã© o marco da Fase 2.**

- [x] **Step 4: Commitar**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
git add apps/web packages
git commit -m "feat(ui): add state transitions to interactive elements"
```

---

## Fase 3 â€” Estender a auditoria e revisar por tela

## Task 6: Mecanizar os itens 4 e 8 da rubrica

A rubrica Â§9 tem 8 itens. O auditor cobre bem o item 7 (a11y) e nada dos
outros. Dois sÃ£o mecanizÃ¡veis a custo baixo e vale fazer, porque viram
regressÃ£o-guarda permanente em vez de inspeÃ§Ã£o manual repetida.

**Files:**
- Modify: `scripts/visual/capture.mjs` (funÃ§Ã£o `auditPage`)

- [ ] **Step 1: Adicionar a regra `nav-active` (rubrica item 4)**

Dentro de `auditPage`, junto Ã s demais checagens. A rubrica exige: sidebar
ativa correta no desktop, bottom nav ativa no mobile, prÃ©-auth sem nav.

```js
  // 9. active navigation â€” exactly one current item when nav is present
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

O produto proÃ­be expor posto, OM, endereÃ§o e selo de verificaÃ§Ã£o. O banco jÃ¡
impÃµe isso no conteÃºdo do usuÃ¡rio via `post_no_forbidden_terms`
(`supabase/migrations/20260802001300_fix_forbidden_content_regex.sql`), mas a
**copy estÃ¡tica da UI** nÃ£o tem guarda nenhuma.

```js
  // 10. forbidden copy â€” the same privacy vocabulary the database rejects
  const forbidden =
    /\b(patente|posto militar|gradua[Ã§c][Ã£a]o militar|organiza[Ã§c][Ã£a]o militar|endere[Ã§c]o residencial|selo de verifica[Ã§c][Ã£a]o|verificado publicamente)\b/i
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
defeito de verdade â€” nav sem item ativo Ã© a queixa do item 4 da rubrica. SÃ³
ajuste a regra se o componente marcar estado ativo por um mecanismo diferente
de `aria-current` / `data-active`; nesse caso, prefira **mudar o componente
para usar `aria-current`**, que Ã© o que leitor de tela entende.

- [ ] **Step 4: Commitar**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 test:scope
git add scripts/visual/capture.mjs apps/web
git commit -m "feat(visual): audit active-nav state and forbidden UI copy"
```

---

## Task 7: RevisÃ£o de julgamento, tela a tela â€” **recorrente**

Os itens 1, 2, 5 e 6 da rubrica â€” hierarquia, ritmo, densidade, responsivo â€”
**nÃ£o sÃ£o mecanizÃ¡veis** e este plano nÃ£o finge que sejam. Precisam de olho nas
capturas.

### Esta task nÃ£o termina

As Tasks 1 a 6 rodam uma vez. **Esta roda a cada onda do MAP.md**, sobre as
telas que aquela onda tocou ou criou, e Ã© **bloqueante**: pelo Â§10.2 do MAP,
nenhum trabalho seguinte comeÃ§a antes de a auditoria da onda fechar â€” nem a
prÃ³xima onda, nem trabalho paralelo em outra frente.

```
Onda N  â†’  Task 7 sobre as telas de N  â†’  Onda N+1
```

NÃ£o existe rodada de auditoria "no final". Cada onda paga a sua, porque o custo
de corrigir hierarquia e densidade cresce com o nÃºmero de telas que jÃ¡ copiaram
o padrÃ£o errado.

**O que bloqueia Ã© nÃ£o ter olhado.** Achado que exija decisÃ£o de produto vira
linha na matriz do MAP, nÃ£o trava a onda. O artefato que fecha a onda Ã© o
veredito escrito do Step 3 â€” sem ele, a onda nÃ£o estÃ¡ concluÃ­da.

### Escopo desta primeira execuÃ§Ã£o

Apenas as telas cujo ciclo funcional jÃ¡ fecha, conforme a tabela do inÃ­cio deste
plano: **`/community`, `/profile`, `/login`, `/consent`.**

As demais entram na Task 7 **dentro da onda do MAP que as consertar** â€” nÃ£o
antes, porque hierarquia e densidade dependem de conteÃºdo e navegaÃ§Ã£o que ainda
nÃ£o existem; e nÃ£o numa rodada separada depois, porque aÃ­ jÃ¡ Ã© retrabalho.

Telas que uma onda **cria** â€” `/groups/:id`, `/events/:id`,
`/onboarding/status`, painel administrativo, superfÃ­cie de comunidade â€” sÃ£o
auditadas dentro da prÃ³pria onda que as criou. Elas nÃ£o existem hoje e por isso
nÃ£o aparecem na linha de base deste plano.

> As Fases 1 e 2 seguem regra diferente: sÃ£o acessibilidade, valem a exceÃ§Ã£o do
> Â§1 do MAP e nÃ£o esperam onda nenhuma.

- [x] **Step 1: Gerar capturas frescas**

```bash
node scripts/visual/loop.mjs
```

- [x] **Step 2: Revisar cada tela nos trÃªs viewports**

Para cada uma de `/community`, `/profile`, `/login`, `/consent`, abra
`shots/<rota>--{mobile-375,tablet-768,desktop-1440}--full.png` e responda,
por escrito, os quatro itens:

1. **Hierarquia** â€” a aÃ§Ã£o primÃ¡ria Ã© achÃ¡vel em menos de 1 segundo?
2. **Ritmo** â€” gaps de 12-16px entre cards, padding 16px, sem deriva arbitrÃ¡ria?
3. **Densidade** â€” a lista Ã© coesa, sem virar parede de texto nem objetos
   flutuando soltos?
4. **Responsivo** â€” 375 Ã© um desenho prÃ³prio, nÃ£o 1440 espremido? 1440 usa
   right rail e sidebar, sem margem morta nas laterais?

- [x] **Step 3: Registrar o veredito**

Grave em `docs/agents/VISUAL_AUDIT-<data>.md`: uma seÃ§Ã£o por tela, os quatro
itens com **passa/nÃ£o passa** e, quando nÃ£o passar, a evidÃªncia (qual captura,
o que estÃ¡ errado). Sem isso a revisÃ£o nÃ£o Ã© auditÃ¡vel e a prÃ³xima rodada
recomeÃ§a do zero.

- [x] **Step 4: Abrir tarefas de correÃ§Ã£o, nÃ£o corrigir aqui**

Cada "nÃ£o passa" vira uma tarefa prÃ³pria com escopo definido. Misturar achado e
correÃ§Ã£o nesta task produz commit gigante e irrevisÃ¡vel.

- [x] **Step 5: Commitar o registro**

```bash
git add docs/agents/VISUAL_AUDIT-*.md
git commit -m "docs(design): record per-screen visual audit verdict"
```

---

## Task 8: Gate final desta rodada

Fecha a **primeira** execuÃ§Ã£o, nÃ£o a auditoria como prÃ¡tica. A Task 7 continua
valendo a cada onda do MAP daqui em diante.

- [x] **Step 1: Auditoria zerada**

```bash
node scripts/visual/loop.mjs
RUN=$(ls -d .visual/*/ | tail -1)
node -e "
const r=require('./$RUN/report.json');
console.log('autenticado:',r.authenticated,'| total:',r.total,'| high:',r.high);
"
```

Esperado: `autenticado: true`, `total: 0`, `high: 0`.

- [x] **Step 2: SuÃ­te completa na ordem do CI**

```bash
rm -rf playwright-report test-results
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 test
npx pnpm@11.18.0 build
npx pnpm@11.18.0 db:reset
npx pnpm@11.18.0 test:db
```

`db:reset` antes de `test:db` nÃ£o Ã© opcional aqui â€” as capturas desta auditoria
deixaram o perfil `Visual Capture` no banco local.

- [x] **Step 3: Atualizar o MAP**

Registrar em `docs/journeys/MAP.md` que a auditoria mecÃ¢nica estÃ¡ zerada e qual
run Ã© a evidÃªncia. As lacunas funcionais das telas **nÃ£o** mudam â€” auditoria
visual nÃ£o fecha ciclo funcional, e o mapa nÃ£o deve sugerir que fecha.

---

## Fora deste plano

- Redesign, troca de paleta, nova tipografia. A rubrica mede aderÃªncia ao
  `DESIGN_SPEC.md`, nÃ£o propÃµe outro.
- Telas cujo ciclo funcional estÃ¡ aberto (`/events`, `/groups`,
  `/notifications`, `/recommendations`, `/onboarding`) alÃ©m das correÃ§Ãµes de
  acessibilidade das Fases 1 e 2.
- Telas que ainda nÃ£o existem: detalhe de grupo, detalhe de evento,
  `/onboarding/status`, painel administrativo, e toda a superfÃ­cie de
  comunidade do outro plano.
- Contraste, tokens, alt de imagem e `h1` Ãºnico â€” jÃ¡ estÃ£o em zero. As regras
  ficam como guarda; nÃ£o hÃ¡ trabalho pendente.

## Risco conhecido

**A Task 7 Ã© a Ãºnica sem critÃ©rio objetivo de pronto.** As demais terminam
quando uma contagem chega a zero; essa termina quando alguÃ©m decide que estÃ¡
bom. Por isso ela exige registro escrito com evidÃªncia â€” Ã© o que permite
discordar depois, e Ã© o que impede a revisÃ£o de virar opiniÃ£o nÃ£o rastreÃ¡vel.