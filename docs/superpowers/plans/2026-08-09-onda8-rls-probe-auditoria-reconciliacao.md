# Onda 8 — Probe de RLS ao vivo, regra `forbidden-copy` e reconciliação do MAP

> **Para quem executa (humano ou agente):** este plano é autocontido. Execute
> **uma task por vez**, na ordem. Marque os checkboxes (`- [x]`) conforme
> avança. Commits convencionais, **um por task**.
>
> Regra de parada: se um step de verificação não produzir a saída esperada,
> **pare e investigue** antes de seguir. Vermelho é parada, não nota de rodapé.

**Goal:** fechar os três resíduos que a própria documentação registrou como
pendentes depois das Ondas 0-7 e do plano de observabilidade:

1. **Probe de RLS ao vivo** — o plano de observabilidade registrou, em "Fora
   deste plano": *"Um probe real — um punhado de asserções de RLS executadas
   server-side com um usuário comum, não `service_role` — é a resposta certa,
   mas é subsistema novo e não cabe aqui."* Hoje a garantia de RLS em produção
   vem só de **paridade de migration** (`test:db` local no CI). O probe fecha
   esse buraco: o operador verifica a fronteira de privacidade **contra o banco
   de produção**, ao vivo, com um usuário comum.
2. **Task 6 do plano de auditoria** — das duas regras mecânicas que faltavam,
   `nav-active` **já foi implementada** (commit `0f0c8c1`). Falta **apenas**
   `forbidden-copy` (rubrica item 8: a UI não pode expor posto, OM, endereço
   residencial ou selo de verificação).
3. **Reconciliação da matriz MAP §4** — o MAP foi escrito em 2026-08-05, antes
   das Ondas 0-7. As ondas fecharam 25 das 41 linhas e o MAP não foi re-auditado.
   Esta onda atualiza cada linha com evidência de código, atualiza o resumo
   executivo (§3), registra a UI de Comunidade como pendência explícita (§0.3)
   e aponta o runbook §6 para o painel em vez de SQL cru.

**Architecture:** três entregas independentes entre si:

- **Probe de RLS** — `apps/web/lib/rls-probe.ts` (lógica pura + execução das
  asserções) e `apps/web/app/api/admin/rls-health/route.ts` (GET, gate
  Bearer + `is_current_user_operator`, mesmo padrão do `portal-health`). O
  probe autentica **como usuário comum** (credenciais de teste via env,
  `createAnonClient` + `signInWithPassword` — nunca `service_role`) e executa
  um conjunto fixo de asserções: positivas (o que um membro verificado deve
  ver) e negativas (o que ele **não** deve ver/fazer). Devolve **apenas**
  booleanos por asserção + enum agregado — nunca linhas, nunca dados.
- **Auditoria** — uma regra nova em `scripts/visual/capture.mjs`, seguindo o
  padrão das 10 existentes.
- **Docs** — `docs/journeys/MAP.md` (matriz + §3 + §0.3 + §10.1) e
  `docs/PILOT_RUNBOOK.md` (§6 aponta para o painel; §9 inclui o probe).

**Subdivisões resolvidas (per MAP §4):** nenhuma linha nova de produto — a
Onda 8 é verificação, docs e um guarda mecânico. As linhas que o MAP ainda
lista como abertas e **continuam** abertas (1e, 5b, 5c, 6b, 7a, 7b, 7c, 10b,
11a) não são tocadas aqui — só reclassificadas com evidência.

**Tech Stack:** Supabase CLI 2.107.0, Next.js 16 (server runtime), vitest,
`node --test` (scope), Playwright 1.51.1, pnpm 11.18.0, Node ≥ 22.

**Fontes:**

- `docs/superpowers/plans/2026-08-06-observabilidade-do-produto.md` — "Fora
  deste plano" (probe de RLS), Task 8 (padrão do probe), Task 5 (reconciliar
  MAP e runbook).
- `docs/superpowers/plans/2026-08-05-auditoria-telas.md` — Fase 3, Task 6
  (regras `nav-active` + `forbidden-copy`); `nav-active` já feita em `0f0c8c1`.
- `docs/journeys/MAP.md` — §4 (41 linhas), §3 (resumo), §0.3 (comunidade),
  §10.1 (registro de ondas), §10.2 (auditoria bloqueia onda).
- `apps/web/app/api/admin/portal-health/route.ts` — padrão Bearer + operador a
  copiar.
- `apps/web/lib/supabase/server.ts` — `createAnonClient()` já existe.
- `supabase/migrations/20260802001300_fix_forbidden_content_regex.sql` — o
  vocabulário proibido que o banco já rejeita; a regra `forbidden-copy` guarda
  a mesma fronteira na copy estática da UI.
- `tests/scope/support-channel.test.mjs` — precedente de scope test de guarda.

---

## Contexto obrigatório antes de começar

### Ciclo de trabalho

```bash
npx pnpm@11.18.0 gate --fast   # lint + typecheck, para o loop de edição
npx pnpm@11.18.0 gate          # porta única completa, antes de declarar pronto
```

Tasks que tocam schema/seed adicionam `db:reset` + `test:db` + `db:lint`
(esta onda **não** toca schema — o probe é leitura; nenhum reset é exigido).

### Estado inicial verificado (2026-08-09)

- Matriz MAP §4 verificada contra a main (`b9d30df`) por inspeção de código:
  **25 linhas Corrigidas, 7 Parciais, 2 Ausentes** (10b, 11a), 4e/4f já
  Corrigidas, 1d/2a/2b/2c-1 já Completas. Tabela completa na Task 3.
- `scripts/visual/capture.mjs` já tem a regra `nav-active` (linhas 253-269).
  `forbidden-copy` **não existe** — confirmado por grep.
- `apps/web/lib/supabase/server.ts` já exporta `createAnonClient()`.
- Seed local tem as contas de teste: `visual@bivaque.example.invalid` e
  `rejected@bivaque.example.invalid`, senha `bivaque-e2e-local` (credenciais
  públicas e descartáveis por design — ver AGENTS.md).
- Runbook §9 já cita `/api/admin/portal-health`; §6 ainda instrui SQL cru.
- O `.env.example` já tem `NEXT_PUBLIC_SUPPORT_EMAIL`; **não** tem
  `RLS_PROBE_EMAIL` / `RLS_PROBE_PASSWORD` (serão adicionadas).

### Falsos positivos conhecidos

1. **Ghost profile do Visual Capture.** Se uma captura rodar entre `db:reset`
   e `test:db`, seis asserts de listagem de perfis falham. `test:db` roda
   contra banco SEM seed e SEM servidor/captura rodando.
2. **`dev-server.pid` / `dev-server.log` stale.** Apague se o loop visual
   "anexar" a um servidor morto.
3. **Porta 3000 ocupada.** O Playwright reutiliza `next start` sobrevivente e
   mascara mudanças. Confirme a porta livre antes de medir.
4. **`.pw-results.json` no lint.** Artefato do reporter JSON excede o
   `files.maxSize` do Biome e gera warning. Apague antes de rodar `lint`.
5. **A outra sessão ativa edita `PILOT_RUNBOOK.md` e `next-env.d.ts`.**
   `git status` pode mudar a qualquer momento. **Nunca commitar
   `next-env.d.ts`** da outra sessão; antes da Task 4, confirme com
   `git status` que o runbook não tem edições não commitadas da outra sessão —
   se tiver, pare e alinhe (stash/pop), não sobrescreva.

### Regras que não podem ser violadas

- **O probe nunca usa `service_role`** para as asserções — esse é o ponto do
  subsistema. `service_role` só existe na checagem de operador (gate), como no
  `portal-health`.
- **O probe nunca devolve dados.** Resposta: `{ status, checks, checked_at }`,
  onde cada check é `{ id, pass, detail? }`. Nenhuma linha, nenhum CPF,
  nenhum corpo de resposta. Loga apenas ids/status, nunca dados.
- **Nenhuma asserção pode ter efeito colateral.** Toda mutação do probe espera
  **erro** (insert em `operators`, update de `is_deleted`); se uma mutação
  passar, o probe reporta `degraded` — e a asserção continua sem efeito real.
- **Não editar migration aplicada.** Se algo precisar de schema (não precisa),
  migration nova com timestamp.
- **`test:db` sempre com banco SEM seed** (`db:reset --no-seed`); E2E/QA com
  seed.
- **Não commitar credenciais.** `RLS_PROBE_EMAIL`/`RLS_PROBE_PASSWORD` entram
  em `.env.example` como placeholders `<...>` e em `apps/web/.env.local` para
  QA. `test:secrets` deve passar.

---

## Estrutura de arquivos

| Arquivo | Mudança |
|---|---|
| `apps/web/lib/rls-probe.ts` | **Cria.** Asserções + classificador + execução. |
| `apps/web/app/api/admin/rls-health/route.ts` | **Cria.** GET com gate Bearer + operador. |
| `tests/unit/admin/rls-probe.test.ts` | **Cria.** Classificador + contrato da resposta. |
| `tests/scope/rls-probe-contract.test.mjs` | **Cria.** Guarda do subsistema (endpoint existe, sem service_role, env vars no .env.example). |
| `apps/web/.env.example` | **Edita.** `RLS_PROBE_EMAIL`, `RLS_PROBE_PASSWORD` com `<...>`. |
| `scripts/visual/capture.mjs` | **Edita.** Regra 10 `forbidden-copy` no `auditPage`. |
| `docs/journeys/MAP.md` | **Edita.** Matriz §4, resumo §3, nota §0.3, registro §10.1. |
| `docs/PILOT_RUNBOOK.md` | **Edita.** §6 painel-primeiro + como vira operador; §9 inclui probe RLS; §1 variáveis novas. |

---

## Task 1: Probe de RLS ao vivo

**Decisões tomadas** (não reabrir sem motivo):

- Credenciais do usuário comum: `RLS_PROBE_EMAIL` + `RLS_PROBE_PASSWORD`
  (env), com fallback de QA em `apps/web/.env.local`. Ausentes → o probe
  responde `{ status: "not_configured" }` — o operador vê o problema de
  configuração sem depender de falha externa.
- As asserções são **fixas** (ids estáveis). O usuário comum é o membro
  verificado de Manaus (a conta que o runbook §1 já exige em produção).
- Asserções de schema `private` usam `Accept-Profile: private` via fetch cru
  contra o PostgREST — o cliente tipado só conhece o schema `public`
  (`database.generated.ts`), e o objetivo é provar que o schema privado é
  inalcançável, então o teste de verdade é no contrato HTTP.

### Files

- Create: `apps/web/lib/rls-probe.ts`
- Create: `apps/web/app/api/admin/rls-health/route.ts`
- Create: `tests/unit/admin/rls-probe.test.ts`
- Create: `tests/scope/rls-probe-contract.test.mjs`
- Edit: `apps/web/.env.example`

### Step 1: `lib/rls-probe.ts`

```ts
export type RlsCheckId =
  | "self_profile"            // positivo: membro verificado lê o próprio perfil
  | "private_verification"    // negativo: schema private inalcançável
  | "private_family"          // negativo: schema private inalcançável
  | "operators_insert"        // negativo: usuário comum não se promove
  | "is_deleted_update"       // negativo: usuário comum não oculta conteúdo
  | "foreign_notifications"   // negativo: não lê notificações de terceiros
  | "admissions_queue"        // negativo: fila de admissão é service_role-only

export type RlsCheck = { id: RlsCheckId; pass: boolean; detail?: string }
export type RlsProbeStatus = "ok" | "degraded" | "not_configured" | "error"
export type RlsProbeResult = { status: RlsProbeStatus; checks: RlsCheck[]; checked_at: string }
```

- `classifyRlsProbe(checks: RlsCheck[], error?: string): RlsProbeStatus` —
  pura, testável: sem credenciais → `not_configured`; exceção de execução →
  `error`; todos pass → `ok`; qualquer `pass: false` → `degraded`.
- `runRlsProbe(): Promise<RlsProbeResult>` — sem argumentos; lê as env vars,
  cria o client anônimo, faz `signInWithPassword`, executa as asserções.
  **Nunca lança** — qualquer falha vira status do enum.

Asserções (detalhe de implementação):

| id | execução | pass quando |
|---|---|---|
| `self_profile` | `supabase.from("profiles").select("id, display_name").limit(1)` (client autenticado como usuário comum) | resposta ok e ≥1 linha (o usuário se vê) |
| `private_verification` | `fetch` PostgREST: `GET /rest/v1/verification_outcomes?select=id&limit=1` com `Authorization: Bearer <user token>`, `apikey: <anon>`, `Accept-Profile: private` | status HTTP ≥ 400 (sem privilégio no schema `private`) |
| `private_family` | idem com `family_invitations` | status HTTP ≥ 400 |
| `operators_insert` | `supabase.from("operators").insert({ user_id: userId })` com o client do usuário comum | erro de RLS (PGRST/42501) — insert **nunca** passa; se passar, `degraded` |
| `is_deleted_update` | `supabase.from("posts").update({ is_deleted: true }).eq("user_id", userId)` (ou o próprio post, se existir) | erro de RLS/trigger — se não houver post próprio, `pass: true` com `detail: "no own post to probe"` |
| `foreign_notifications` | `supabase.from("notifications").select("id").neq("recipient_user_id", userId).limit(1)` | 0 linhas ou erro (não vê caixa alheia) |
| `admissions_queue` | `supabase.rpc("list_verification_queue")` | erro (RPC service_role-only) |

Regra de ouro na implementação: **nenhum valor de linha retornado entra na
resposta** — só `pass`/`detail` (detail é texto fixo curto, nunca dado).

### Step 2: `api/admin/rls-health/route.ts`

Cópia do padrão de `portal-health/route.ts`:

- `GET`, `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
- `Authorization: Bearer` → `supabase.auth.getUser(token)` → 401 sem sessão.
- `supabase.rpc("is_current_user_operator", { p_user_id: userId })` → 500 em
  erro, 403 se não operador.
- `const result = await runRlsProbe()`.
- `log.info("rls health probe", { status: result.status, checked_at, operatorId })`
  — **nunca** `checks` com detail nem dados.
- Resposta `NextResponse.json(result)`.

### Step 3: Testes

`tests/unit/admin/rls-probe.test.ts` (vitest, lógica pura — sem banco):

1. `classifyRlsProbe` com todas as asserções pass → `"ok"`.
2. `classifyRlsProbe` com uma `pass: false` → `"degraded"`.
3. `classifyRlsProbe` com exceção → `"error"`.
4. `runRlsProbe` sem env vars → `{ status: "not_configured", checks: [] }`
   (mockar `process.env` apenas para ausência; não tocar rede).
5. Contrato de resposta: para um resultado qualquer, `checks` só contém
   `id`, `pass`, `detail` — nenhuma outra chave (garante que dado não vaza).
6. Ids únicos e estáveis (o enum não muda sem teste).

`tests/scope/rls-probe-contract.test.mjs` (`node --test`, roda em ms):

1. `apps/web/app/api/admin/rls-health/route.ts` existe.
2. O arquivo da rota **não** contém `SERVICE_ROLE` (o probe não usa
   `service_role` — só o gate de operador pode, e isso fica em `server.ts`).
3. `apps/web/lib/rls-probe.ts` existe e exporta `runRlsProbe` +
   `classifyRlsProbe`.
4. `apps/web/.env.example` declara `RLS_PROBE_EMAIL` e `RLS_PROBE_PASSWORD`.
5. `apps/web/lib/rls-probe.ts` não contém `"select *, "` nem `"select * "` em
   contexto de devolução de dados (guarda de vazamento estrutural — ajuste a
   regex ao formato real, o objetivo é proibir a resposta de carregar linhas).

### Step 4: `.env.example`

Adicionar, junto às demais variáveis de servidor:

```
# Conta de teste usada pelo probe de RLS (usuário comum, nunca service_role)
RLS_PROBE_EMAIL="<email-de-teste>"
RLS_PROBE_PASSWORD="<senha-de-teste>"
```

### Step 5: Verificação

```bash
npx pnpm@11.18.0 gate --fast
npx pnpm@11.18.0 test:secrets
npx pnpm@11.18.0 test -- --run tests/unit/admin/rls-probe.test.ts
npx pnpm@11.18.0 test:scope
```

QA manual (stack local com seed; o runbook §1 exige as duas contas de teste —
localmente elas já existem no seed):

1. Garantir um operador no banco local (o seed não cria operadores):
   ```sql
   -- psql local ou supabase db shell
   insert into public.operators (user_id)
   select id from auth.users where email = 'visual@bivaque.example.invalid'
   on conflict do nothing;
   ```
2. `apps/web/.env.local` com `RLS_PROBE_EMAIL=visual@bivaque.example.invalid`
   e `RLS_PROBE_PASSWORD=bivaque-e2e-local`.
3. Sem token: `curl -s http://127.0.0.1:3000/api/admin/rls-health` → **401**.
4. Token de usuário comum (gerar via password grant no `/auth/v1/token`) →
   **403**.
5. Token de operador → **200** com `{ status: "ok"|"degraded", checks: [...],
   checked_at }`; conferir que `checks` não carrega nenhuma linha de dados e
   que o log do servidor não tem a senha nem o conteúdo das asserções.
6. Sem as env vars (remover do `.env.local` e reiniciar o dev server) →
   `{ status: "not_configured" }` — o endpoint responde, não estoura.

### Step 6: Commit isolado

```
feat(admin): operator-only RLS health probe with a common user
```

---

## Task 2: Regra `forbidden-copy` no auditor visual

Herda a Task 6 do plano de auditoria (2026-08-05), Step 2 — o Step 1
(`nav-active`) já foi implementado em `0f0c8c1` e está no `auditPage`.

### Files

- Edit: `scripts/visual/capture.mjs`

### Step 1: Adicionar a regra

Dentro de `auditPage()`, após a regra 9 (`nav-active`, termina na linha ~270),
adicionar a regra 10 — o mesmo vocabulário que o banco rejeita em
`post_no_forbidden_terms` (migration `20260802001300`):

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

### Step 2: Rodar e confirmar que fica em zero

```bash
node scripts/visual/loop.mjs --fast
```

Inspecionar `.visual/<run>/report.json` para a regra `forbidden-copy`:

- **Sem achados** → pronto.
- **Com achados** → é achado real (a UI está expondo vocabulário proibido na
  copy estática). Corrija a copy na tela (nunca a regra), rode de novo até
  zero. Exceção: se a ocorrência for legítima e inevitável (ex.: a página de
  políticas de privacidade citando a regra), documente no veredito da Task 5 e
  ajuste a regex **com justificativa registrada** — nunca em silêncio.

### Step 3: Verificação

```bash
rm -rf playwright-report test-results .pw-results.json
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 test:scope
```

### Step 4: Commit isolado

```
feat(visual): audit forbidden privacy copy in UI text
```

---

## Task 3: Reconciliar a matriz do MAP §4

O MAP foi escrito antes das Ondas 0-7. A inspeção de código em 2026-08-09
(branch main, `b9d30df`) produziu a tabela abaixo. Aplique os flips no
`docs/journeys/MAP.md` **com a evidência de arquivo:linha** que cada linha já
carrega — substitua a evidência antiga pelas linhas verificadas.

### Files

- Edit: `docs/journeys/MAP.md`

### Step 1: Aplicar os flips

| # | Subdivisão | Novo estado | Evidência verificada |
|---|---|---|---|
| 1a | verify CPF + done verificado | Corrigida | `(preauth)/onboarding/welcome/page.tsx:1-46`; `onboarding/page.tsx:128-130,182-186` |
| 1b | waitlist (rejected → waitlist) | Corrigida | `onboarding/page.tsx:132-137,297-300,403-434`; `onboarding/status/page.tsx:86-95` |
| 1c | pending (verificação) | Corrigida | `onboarding/status/page.tsx:43-65` |
| 1e | sessão expirada no fluxo | **Parcial** (mantém) | `onboarding/page.tsx:93-95,154-161,197-199,217-224,271-272` — toast + CPF reidratados, mas `familyToken`/e-mail não restaurados |
| 1f | fallbacks em `(preauth)` | Corrigida | `onboarding/error.tsx`, `loading.tsx`, `not-found.tsx` |
| 2c-2 | upload de avatar | Corrigida | `profile/avatar-section.tsx:35-74`; `avatar-actions.ts:52-73` |
| 2c-3 | avatar no feed | Corrigida | `components/bivaque/feed-post.tsx:274-277` |
| 2d | preferências de notificação | Corrigida | `profile/notification-preferences-section.tsx:24-86`; `notification-preferences-actions.ts:36-69` |
| 2e | configuração inicial no onboarding | Corrigida | `onboarding/welcome/page.tsx:31-46` (primeira ação sugerida leva ao perfil) |
| 2f | logout | Corrigida | `profile/page.tsx:212-223` |
| 3a | convite familiar (envio) | Corrigida | `profile/family-invite-section.tsx:59-105`; `family-invite-section-actions.ts:57-93` |
| 3b | convite familiar (revogação) | Corrigida | `family-invite-section.tsx:85-105`; `family-invite-section-actions.ts:95-118` |
| 4a | notificação de comentário navega | Corrigida | `notifications/page.tsx:121-144,357-367` |
| 4b | denunciar (superfície do operador) | Corrigida | `report-button.tsx:15-52`; `(admin)/reports/page.tsx:148-214` |
| 4c | ocultar conteúdo | Corrigida | `feed-post.tsx:119-123`; `(admin)/reports/page.tsx:69-114,187-210` |
| 4d | `?post=` deep link | Corrigida | `community/page.tsx:31-35,191-215` |
| 5a | grupos listar/entrar/sair/detalhe | Corrigida | `groups/page.tsx:223-258,597-645`; `groups/[id]/page.tsx:145-188` |
| 5b | criar grupo rico (capa/categorias) | **Parcial** (mantém) | `groups/page.tsx:540-584` — só o fluxo mínimo |
| 5c | moderar (ownership, convite, log) | **Parcial** (mantém) | `groups/[id]/page.tsx:211-235`; `groups/page.tsx:441-496` — ownership existe; convite de grupo e log de moderação não |
| 5d | feed/membros do grupo | Corrigida | `groups/[id]/page.tsx:145-252` |
| 6a | eventos criar/listar + convites | Corrigida | `events/page.tsx:415-540`; `events/event-invites-section.tsx:26-120` |
| 6b | RSVP | **Parcial** (mantém) | `events/[id]/page.tsx:161-194`; `events/page.tsx:322-338` — sem "não vou" explícito; organizador não atualiza após mudança |
| 6c | detalhe do evento | Corrigida | `events/[id]/page.tsx:78-240` |
| 6d | pós-evento | Corrigida | migration `20260806173535_event_completion.sql`; `events/[id]/page.tsx:198-212` |
| 7a | recomendações explorar | **Parcial** (mantém) | `recommendations/page.tsx:146-239,426-460` — sem personalização |
| 7b | recomendações pedir indicação | **Parcial** (mantém) | `recommendations/page.tsx:279-341` — sem ciclo de resposta visível |
| 7c | recomendações salvar | **Parcial** (mantém) | `recommendations/page.tsx:344-413` — sem notificação de resposta |
| 8a | inbox notificações | Corrigida | `notifications/page.tsx:357-367` |
| 8b | preferências | Corrigida | `profile/notification-preferences-section.tsx:54-86` |
| 9a | DM + isMobile | Corrigida | `messages/page.tsx:91-105,535-616` |
| 9b | notificação de DM abre conversa | Corrigida | `notifications/page.tsx:139-141`; `messages/page.tsx:95-115` |
| 10a | painel do operador | Corrigida | `(admin)/layout.tsx:7-47`; `(admin)/reports/page.tsx:148-214`; `(admin)/admissions/page.tsx:24-80` |
| 10b | histórico multi-ação de denúncia | **Ausente** (mantém, YAGNI) | `(admin)/reports/page.tsx:148-214` — só fila atual + ocultar/resolver; sem rota de histórico |
| 11a | re-verificação de elegibilidade | **Ausente** (mantém) | grep `reverify|re-verification|reverifica` sem resultados em `apps/web` e `supabase` |

**Não** flipar: 4e/4f (já Corrigidas), 1d/2a/2b/2c-1 (já Completas).

### Step 2: Atualizar o resumo executivo §3

Reescrever a contagem e o parágrafo de implicação com os números novos:

- **Contagem por estado:** 4 completas (1d, 2a, 2b, 2c-1), 25 corrijidas
  (inclui 4e/4f), 7 parciais (1e, 5b, 5c, 6b, 7a, 7b, 7c), 2 ausentes
  (10b, 11a) — 38 linhas com estado fechado ou documentado, 9 em aberto.
- O parágrafo "Implicação" deixa de ser "nenhuma das 11 áreas está fechada":
  hoje **8 das 11 áreas funcionais fecham o ciclo** (1, 2, 3, 4, 5, 6, 8, 9,
  10 têm o ciclo do usuário completo; a contagem de "áreas" é a do MAP — use
  a leitura do próprio MAP §3 e ajuste com honestidade, listando as que
  fecham por completo). As exceções continuam: 7 (recomendações), 11
  (re-verificação) e os refinos 1e/5b/5c/6b.

### Step 3: Registrar a UI de Comunidade como pendência explícita (§0.3)

O §0.3 hoje diz que a UI "é camada de aplicação e fica fora deste plano".
Registrar em §0.3 (ou §10, em "O que mudou"): a camada de banco da Comunidade
está fechada (migrations 019-022, 641 testes pgTAP), e **não existe UI de
comunidade** — sem seletor de vila, sem chips de filtro, sem aviso de
divulgação (verificado por glob em `apps/web/app/components/bivaque` e
`apps/web/app/(shell)` em 2026-08-09). Vira linha de pendência explícita,
prioridade P1 (é feature inteira com spec pronta:
`docs/superpowers/specs/2026-08-05-comunidade-design.md`).

### Step 4: Registrar a Onda 8 no §10.1

Bloco `_Fechada em 2026-08-09._` — probe de RLS, regra `forbidden-copy` e
reconciliação da matriz, com os commits desta onda.

### Step 5: Verificação

```bash
npx pnpm@11.18.0 gate --fast
npx pnpm@11.18.0 test:scope
```

Manual: abrir `docs/journeys/MAP.md` e conferir que a legenda continua
consistente com os flips (a legenda já define o critério de "Corrigida" —
estado descreve o que o usuário consegue fazer, não o que o schema permite;
os flips acima respeitam isso: só viraram Corrigida linhas com superfície de
usuário verificada em código).

### Step 6: Commit isolado

```
docs(journeys): reconcile the MAP matrix with the code after waves 0-7
```

---

## Task 4: Runbook §6 aponta para o painel; §9 e §1 recebem o probe

Herda o Step 2 da Task 5 do plano de observabilidade (que ficou pendente —
o §6 ainda instrui SQL cru) e o item de RLS do §9 (que hoje declara só
paridade de migration).

### Files

- Edit: `docs/PILOT_RUNBOOK.md`

### Step 1: Reconciliar com o schema antes de editar

```bash
git status --short docs/PILOT_RUNBOOK.md
```

- Se o runbook tiver edições não commitadas **da outra sessão**: pare e
  alinhe (o AGENTS.md global proíbe sobrescrever trabalho alheio). Não há
  teste que valide prosa — revisão humana obrigatória nesta task.
- O contrato `tests/unit/docs/runbook-contract.test.ts` exige que os nomes das
  seções permaneçam (ex.: `"Report resolution"`, `"Daily health checks"`) e
  que as 5 env vars continuem citadas. **Não renomear seções** — só editar
  conteúdo.

### Step 2: §6 Report resolution — painel primeiro, SQL como diagnóstico

- Substituir o checklist "No console SQL do Supabase, inspecionar o registro"
  por: **abrir o painel `(admin)/reports` autenticado como operador** (fila de
  abertos com idade, ações ocultar/resolver, trilha `resolved_by` /
  `resolved_at` / `operator_note`).
- Preservar a query de inspeção corrigida (`public.posts`, `user_id`,
  `is_deleted`) como **passo de diagnóstico** (quando o painel não bastar),
  não como primeiro passo.
- Registrar que o desfecho notifica o denunciante dentro da plataforma
  (notificação `report_resolved`, sem revelar a ação tomada — runbook já exige
  isso em "Responder ao denunciante sem revelar a acao tomada"; agora o
  próprio sistema faz).
- **Adicionar o passo faltante:** como alguém vira operador — `insert into
  public.operators (user_id) values ('<uuid-do-usuario>');` e quem autoriza
  (decisão do dono do produto; hoje o runbook não documenta nada).

### Step 3: §9 Daily health checks — incluir o probe de RLS

- No item "RLS e privacidade", além da declaração atual (test:privacy /
  test:secrets são suítes de código; garantia por paridade de migration),
  adicionar: **acessar `/api/admin/rls-health` autenticado como operador e
  confirmar `status: "ok"`** (ou `degraded` → investigar qual check falhou;
  `not_configured` → configurar `RLS_PROBE_*`).
- No item "Conexao com Portal", manter como está.

### Step 4: §1 — variáveis do operador

Adicionar à tabela de variáveis de ambiente:

| Variável | Uso | Exposição |
|---|---|---|
| `RLS_PROBE_EMAIL` | E-mail da conta de teste do probe de RLS (usuário comum) | Servidor |
| `RLS_PROBE_PASSWORD` | Senha da conta de teste do probe de RLS | Servidor — nunca cliente |

### Step 5: Verificação

```bash
npx pnpm@11.18.0 gate --fast
npx pnpm@11.18.0 test -- --run tests/unit/docs/runbook-contract.test.ts
npx pnpm@11.18.0 test:scope
```

### Step 6: Commit isolado

```
docs(runbook): point §6 at the reports panel and add the RLS probe to §9
```

---

## Task 5: Veredito da onda (captura §10.2)

A Onda 8 não cria telas novas, mas toca o tooling visual (capture.mjs) e a
regra §10.2 exige que a onda termine com evidência visual registrada.

### Files

- Run: `scripts/visual/loop.mjs`
- Edit: `docs/journeys/MAP.md` (veredito no bloco da Onda 8, §10.1)

### Step 1: Rodar o loop completo

```bash
node scripts/visual/loop.mjs
```

(Docker/Supabase local de pé; porta 3000 livre; seed aplicado.)

### Step 2: Registrar o veredito

- **Esperado:** 0 achados `forbidden-copy`; 0 achados novos introduzidos pela
  onda (as regras pré-existentes seguem com os mesmos números do backlog
  documentado — 5 HIGH preexistentes em `/community`, `/messages`,
  `/notifications`, `/login`, `/onboarding`).
- Registrar em `docs/journeys/MAP.md` §10.1, no bloco da Onda 8: run do loop,
  contagem de achados, e a referência ao veredito. Se a regra nova tiver
  disparado e sido corrigida na Task 2, registrar a evidência aqui.
- Artefato: `.visual/<run>/` (gitignored) + nota no MAP (versionado).

### Step 3: Gate final da onda

```bash
npx pnpm@11.18.0 gate
```

### Step 4: Commit isolado

```
docs(visual): record Onda 8 audit verdict
```

---

## Ordem de execução

- **Task 1 → Task 2** independentes entre si (paralelizáveis).
- **Task 3 e Task 4** dependem do estado de main (nada das Tasks 1-2), mas a
  Task 4 **não** pode rodar enquanto a outra sessão tiver edições não
  commitadas no runbook (Step 1 da Task 4 verifica).
- **Task 5** é a última — o veredito cita os commits das anteriores.

## Fora deste plano

- Fechar as linhas que permanecem Parciais/Ausentes: 1e (restaurar
  `familyToken`/e-mail), 5b (grupo rico), 5c (convite/log de moderação), 6b
  (RSVP completo), 7a/7b/7c (recomendações personalizadas), 10b (histórico
  multi-ação — YAGNI até prova em contrário), 11a (re-verificação). São onda
  própria, com decisão de produto onde o MAP pede.
- **UI de Comunidade** (seletor, chips, aviso de divulgação) — feature
  inteira, spec pronta, registrada como pendência explícita na Task 3.
- Redesign, paleta, tipografia — a rubrica mede aderência ao DESIGN_SPEC, não
  propõe outro.
- Qualquer mudança de RLS ou schema — o probe **verifica** a fronteira, não a
  altera. Se o probe expor um vazamento real (asserção negativa que passa),
  **pare**: é achado P0 de segurança, não obstáculo de teste — registre e
  suba para decisão antes de prosseguir.
