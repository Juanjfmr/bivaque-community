# Veredito da auditoria visual — P0 (2026-08-17)

> Procedimento §10.2 do `docs/journeys/MAP.md` e `docs/superpowers/plans/2026-08-05-auditoria-telas.md`
> §3 (Task 7 permanente). P0 tocou ou criou cinco telas: `/onboarding`, `/onboarding/status`,
> `/onboarding/locality` (Task 5), `/community` (Task 7), e o estado vazio honesto de
> feed/eventos/guia (Task 9). Cada uma precisaria do veredito tela-a-tela
> (hierarquia, ritmo, densidade, responsivo) para fechar a P0.
>
> **Esta auditoria é uma exceção honesta, não um fechamento.** O ambiente no host de
> desenvolvimento não tem o que a auditoria precisa: `supabase start` (Docker) e
> `playwright install chromium` (download de browser). Sem isso, a captura não
> consegue autenticar nem renderizar as rotas autenticadas — e é exatamente nelas
> que a P0 tocou. A P0 fecha com a auditoria visual **pendente de execução humana**,
> registrada como o terceiro estado do `PRODUCT_STATUS.md` ("código feito,
> não verificado") que o `docs/superpowers/plans/README.md` descreve como
> aceitável.

Capturas: `.visual/2026-08-17T22-24-47-202Z/` (run do `scripts/visual/loop.mjs`
após os commits da P0). O loop rodou em **estado de gates verdes** e
**captura falhou** — ver `ITERATION.md` da run.

Resultado dos gates (cada peça rodada direto, sem passar pelo `npx` —
a regra do `AGENTS.md` §"Commands" continua valendo):

| Estágio | Resultado | Observação |
|---|---|---|
| `lint` | `exit 0` · 238 arquivos · 1 info (schema) | a info do schema `2.5.6` vs CLI `2.5.7` é estado de repo, fix trivial `biome migrate`; o handoff da Task 7 já a registrou |
| `typecheck` | `exit 0` nos 4 workspaces (`apps/web`, `packages/{domain,contracts,tokens}`) | |
| `unit` | `exit 0` · 37 files · 293 tests | +8 testes do `tests/unit/localities/locality-density.test.ts` da P0 Task 9 |
| `privacy` | `exit 0` · 9 files · 189 tests | |
| `scope` | `exit 0` · 39 tests | incl. `no-pilot-locality` da P0 Task 7 — runtime sem `PILOT_LOCALITY_ID` |
| `secrets` | `exit 0` · sem segredos | |
| `build` | `exit 0` | `pnpm --filter web build` (Next 16) |

A captura falhou em duas etapas do `scripts/visual/capture.mjs`:

1. `sign-in failed (400); capturing signed out` — sem `supabase start`, o
   `getSession()` retorna erro e o seed de 2ª UF nunca é provisionado
   (a `BIVAQUE_E2E_LOCALITY_TWO_EMAIL` é parametrizada no spec `two-localities.spec.ts`,
   mas sem Supabase rodando, a sessão não autentica).
2. `browserType.launch: Executable doesn't exist at C:\Users\juana\AppData\Local\ms-playwright\chromium_headless_shell-1161\chrome-win\headless_shell.exe`
   — `playwright install` precisa rodar **uma vez** no host.

Em conjunto, esses dois fatores impedem: (a) autenticar como seed user
para alcançar as rotas autenticadas; (b) renderizar o estado vazio da
Task 9 numa 2ª UF (precisa de `db:reset --com seed` com a segunda
localidade, que a Task 10 Step 3 pediu ao dono, uma vez, no fim).

---

## Telas tocadas pela P0 — estado do veredito

| Tela | Tarefa | Capturada? | Veredito §9 |
|---|---|---|---|
| `/onboarding` (verify step) | Task 8 (removi a entrada de waitlist) | **não** — `sign-in failed`, mas a página é `preauth` e foi acessível; o `capture.mjs` falhou no launch do chromium antes de qualquer navegação | pendente |
| `/onboarding/status` | Task 8 (removi o link de waitlist) | **não** — auth requerida | pendente |
| `/onboarding/locality` (Task 5) | Task 5 (passo pós-elegibilidade) | **não** — auth requerida | pendente |
| `/community` (feed) | Task 7 (LocalityContext) + Task 9 (EmptyState honesto) | **não** — auth requerida | pendente |
| Estado vazio honesto (feed/eventos/guia abaixo do §3.4) | Task 9 | **não** — precisa de 2ª UF abaixo de 30 membros no seed | pendente |
| `/events` (Task 9 empty state) | Task 9 | **não** — auth requerida | pendente |
| `/guide` (Task 9 empty state) | Task 9 | **não** — auth requerida | pendente |

---

## Achados que o auditor **teria** que olhar (e a regra a aplicar)

Telas autenticadas com `LocalityContext` injetado no shell (Task 7) — a
auditoria tem que checar:

- **Hierarquia** §9: o cabeçalho sticky com `cityName` (ex.: "Manaus, AM")
  alinhado com o composer e o `Publicar`; em outras cidades, o nome
  correto (não o fallback "Manaus, AM" que existe no `community/page.tsx:198`
  e que **não foi tocado** pela P0 — bug pré-existente registrado).
- **Densidade** §9: o `EmptyState` honesto (Task 9) — o copy "Você é dos
  primeiros aqui." cabe em todos os três viewports (375/768/1440)? A
  copy padrão "Nenhuma publicação ainda" / "Nenhum evento ainda" / "O
  guia desta cidade está vazio." cabe? O `EmptyState` herda tokens
  (`--surface-sunken`, `--border-dashed`, `text-muted`) que precisam
  contrastar adequadamente em cada viewport.
- **Responsivo** §9: o `SegmentedProgress` da Task 8 tem classes
  `[&_[data-slot=tab]]:text-xs` que viraram `0.625rem` (10px) em
  alguma altura do CSS — `font-too-small` foi achado pré-existente em
  2026-08-06 (linha 100 do `VISUAL_AUDIT-2026-08-06.md`). A P0 não tocou
  essa copy, mas é a mesma família de problema.
- **Ritmo** §9: o copy do EmptyState da Task 9 é mais longo que a copy
  padrão ("Esta comunidade está começando. Publique algo para abrir
  caminho para quem chegar depois." — 81 caracteres) — e o botão
  "Publicar" precisa de `min-h-11` no padrão HeroUI. Já foi visto em
  outras telas (ver `apps/web/lib/portal/verification-copy.ts`).

Esses pontos são **hipóteses de achado**, não veredito. A auditoria
visual não rodou.

---

## O que a P0 precisa para fechar a auditoria

**Três coisas que o ambiente do agente não tem e que o dono precisa prover,
em qualquer ordem:**

1. `npx playwright install chromium` no host de desenvolvimento.
2. `supabase start` (Docker) + `db:reset --com seed` com a 2ª UF (a
   Task 10 Step 3 da P0 já registrou o pedido).
3. Re-rodar `node scripts/visual/loop.mjs` para re-capturar. O loop
   detecta a run anterior, segue da onde travou, e fecha a auditoria.

**E a sessão autenticada:** o `scripts/visual/loop.mjs` precisa do
`apps/web/.env.local` com `BIVAQUE_VISUAL_EMAIL` + `BIVAQUE_VISUAL_PASSWORD`
para autenticar como seed user de Manaus. O `capture.mjs` foi atualizado
para usar `BIVAQUE_E2E_LOCALITY_TWO_EMAIL` quando precisar navegar a
2ª UF (Task 7 do plano da auditoria, registrada em
`docs/superpowers/plans/2026-08-05-auditoria-telas.md`).

**Sem a auditoria visual fechada, a onda T (transferência) fica
bloqueada** — §10.2 do `MAP.md`, regra que o `AGENTS.md` repete. A
P0 fechou a implementação (10/10 tasks), o canon (BIVAQUE.md,
PRODUCT_STATUS.md) e os 4 ADRs (de `proposed` para `accepted`); falta
a auditoria visual. O próximo agente da T começa verificando o estado
deste arquivo: se houver uma run `.visual/<data>/` com `report.md`
concluído, a T segue. Se continuar como agora, a T não começa.

---

## Status do gate §10.2 (MAP) e do gate `auditoria visual` do plano P0

| Estado | Valor |
|---|---|
| Gates mecânicos (lint/typecheck/test/secrets/build) | **pass** |
| Captura tela-a-tela | **FAIL** (chromium ausente + Supabase ausente) |
| Veredito escrito (este documento) | **pass** — com pendência |
| Bloqueio para a onda T | **sim** — até a captura rodar |

A P0 está **fechada em implementação e em canon, aberta em auditoria
visual**. O próximo agente da T começa lendo este arquivo e decide
se a exceção honesta é aceitável, ou se a auditoria visual tem que
rodar antes da T abrir. A documentação desta exceção é a parte
que a P0 fez — a captura é trabalho humano ou de um agente com
ambiente de execução.
