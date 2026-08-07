# Observabilidade do produto — Implementation Plan

> **Para quem executa (humano ou agente):** este plano é autocontido e não
> depende de nenhuma ferramenta específica. Execute **uma task por vez**, na
> ordem. Marque os checkboxes (`- [x]`) conforme avança.
>
> Regra de parada: se um step de verificação não produzir a saída esperada,
> **pare e investigue** antes de seguir. As Tasks 1→3 são estritamente
> sequenciais: cada uma depende do estado que a anterior deixou.

**Goal:** Restaurar a capacidade de **ver o produto rodando**. Hoje os dois
únicos loops de verificação que olham para o app em execução — a suíte e2e e a
captura visual do §10.2 — estão cegos, e foi por isso que sete ondas foram
fechadas sobre um shell que renderizava `<body>` vazio (corrigido em `f9f7c3f`).

Este plano não entrega feature nenhuma. Ele entrega: e2e verde no CI, captura
visual que falha quando não consegue autenticar, e um banco local com conteúdo
suficiente para que qualquer julgamento de densidade signifique alguma coisa.

**Architecture:** Três camadas, nenhuma delas de produção.

1. **CI** — o workflow nunca injetou `NEXT_PUBLIC_SUPABASE_*`, então o `build`
   produz um bundle sem credenciais e o middleware lança
   `"NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set"`
   em toda requisição não-pública. Nada em e2e podia passar.
2. **Seed** — `supabase/seed.sql` tem duas linhas de comentário declarando que
   fixtures de usuário vivem só em `supabase/tests` e sofrem rollback por teste.
   Essa regra é correta para pgTAP e deixa e2e, captura visual e o operador sem
   nada. A resolução é separar os dois conceitos: **fixture de teste** (pgTAP,
   transacional) continua onde está; **seed de desenvolvimento** (durável,
   local) passa a existir.
3. **Specs** — com um usuário durável, os testes que hoje simulam sessão com
   cookie de consent passam a autenticar de verdade.

**Subdivisões resolvidas (per MAP §4):** nenhuma. Este plano é infraestrutura de
verificação; ele **desbloqueia** o julgamento das linhas existentes sem fechar
nenhuma. O pré-requisito §1 do `PILOT_RUNBOOK.md` ("pelo menos duas contas de
teste com perfis em Manaus, uma verificada e uma `rejected`") é satisfeito pela
Task 2.

**Tech Stack:** Supabase CLI 2.107.0 (`supabase status -o env`), Playwright
1.51.1, Next.js 16, pnpm 11.18.0, Node ≥ 22.

**Fontes:**
- `docs/journeys/MAP.md` §0 (declara `tests/e2e/*` como não verificado), §10.2
  (a auditoria visual bloqueia a onda seguinte).
- `docs/PILOT_RUNBOOK.md` §1 (contas de teste), §9 (check diário exige pipeline
  verde incluindo `test:e2e`).
- `.github/workflows/pull-request-ci.yml` — sem bloco `env:`.
- `tests/e2e/helpers/session.ts` — helper criado em `1361b09`.
- `supabase/config.toml` `[db.seed]` — já aponta para `./seed.sql`.

---

## Contexto obrigatório antes de começar

### Ciclo de trabalho

```bash
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 test:secrets
```

Tasks que tocam schema/seed adicionam:

```bash
npx pnpm@11.18.0 db:reset
npx pnpm@11.18.0 test:db
npx pnpm@11.18.0 db:lint
```

E2E (Docker + Supabase local de pé):

```bash
npx pnpm@11.18.0 test:e2e
```

### Estado inicial verificado (2026-08-06)

Rodado nesta máquina, com `apps/web/.env.local` presente:

| Métrica | Valor |
|---|---|
| Testes coletados | 333 (111 × 3 projects) |
| Passando | 294 |
| Falhando | 42 (14 únicos × 3 projects) |

As 14 falhas únicas se dividem em três grupos, todos endereçados na Task 3.

### Falsos positivos conhecidos

**1. `BIVAQUE_AUTH_BYPASS`.** `apps/web/.env.local` (gitignored) tem a flag, hoje
em `false`. Se estiver `true`, o middleware desliga o gate de auth e consent, e
`middleware-session-gate.spec.ts` falha enquanto ~12 outros testes passam
vacuamente. **Confirme que está `false` antes de qualquer medição.**

**2. `.pw-results.json` no lint.** Artefato de execução com reporter JSON excede
o `files.maxSize` do Biome e gera 1 warning. Apague antes de rodar `lint`.

**3. Servidor órfão na porta 3000.** `playwright.config.ts` usa
`reuseExistingServer: !CI`. Um `next start` sobrevivente faz o Playwright
reaproveitar um build velho e mascarar a mudança. Antes de medir, confirme que
a porta está livre.

### Regras que não podem ser violadas

- **O seed é local.** `supabase/seed.sql` roda em `supabase db reset --local`.
  Nenhum comando deste plano pode ser executado com `--linked` ou contra o
  projeto de produção. Qualquer step que peça `db:reset` é local por definição.
- **Credenciais do seed são fixas e públicas.** Elas existem no repositório de
  propósito, para que o CI funcione sem `.env.local`. Não reutilize nenhuma
  senha real. Rode `test:secrets` depois de escrever o seed.
- **Não altere `supabase/tests/*`.** As fixtures pgTAP continuam transacionais.
  O seed é um conceito paralelo, não um substituto.
- **Não mexa em policy de RLS.** Este plano não toca autorização. Se um teste
  falhar por RLS, pare — é achado, não obstáculo.

---

## Estrutura de arquivos

| Arquivo | Mudança |
|---|---|
| `.github/workflows/pull-request-ci.yml` | **Edita.** Reordena e injeta env. |
| `apps/web/app/(admin)/reports/page.tsx` | **Edita.** `dynamic = "force-dynamic"`. |
| `supabase/seed.sql` | **Reescreve.** Fixtures duráveis de Manaus. |
| `tests/e2e/helpers/session.ts` | **Edita.** Defaults das credenciais do seed. |
| `tests/e2e/manaus-pilot-full-journey.spec.ts` | **Edita.** 9 testes autenticam. |
| `tests/e2e/manaus-pilot-denials.spec.ts` | **Edita.** 2 testes autenticam. |
| `tests/e2e/onboarding-holder-family.spec.ts` | **Edita.** Texto do botão Google. |
| `scripts/visual/capture.mjs` | **Edita.** Aborta sem autenticação. |
| `docs/journeys/MAP.md` | **Edita.** Reconcilia 3 premissas falsas. |
| `docs/PILOT_RUNBOOK.md` | **Edita.** §6 aponta para o painel; §9 perde o placebo. |
| `apps/web/lib/support.ts` | **Cria.** Canal de suporte + guarda de placeholder. |
| `tests/scope/support-channel.test.mjs` | **Cria.** Falha se o placeholder vazar. |
| `apps/web/app/(preauth)/onboarding/status/page.tsx` | **Edita.** Mata o `suporte@bivaque.local`. |
| `apps/web/app/(preauth)/onboarding/page.tsx` | **Edita.** Canal e cópia de erro transitório. |
| `apps/web/app/components/bivaque/report-button.tsx` | **Edita.** Confirmação aponta para a notificação. |
| `apps/web/app/components/bivaque/bottom-nav.tsx` | **Edita.** Cinco destinos. |
| `apps/web/app/components/bivaque/app-shell.tsx` | **Edita.** Avatar vira link. |
| `apps/web/app/api/admin/portal-health/route.ts` | **Cria.** Probe server-side. |
| `apps/web/app/api/admin/admissions/route.ts` | **Cria.** Fila de admissão. |
| `apps/web/app/(admin)/admissions/page.tsx` | **Cria.** Painel da fila. |
| `apps/web/app/api/admin/reports/[id]/route.ts` | **Edita.** Emite `report_resolved`. |
| `supabase/migrations/<ts>_report_resolved_notification.sql` | **Cria.** Novo tipo no enum. |

---

## Task 1: Destravar o pipeline — o CI falha no build, não no e2e

**Por quê:** verificado no
[run de 2026-08-07](https://github.com/Juanjfmr/bivaque-community/actions/runs/31144924193).
O CI **não chega ao
e2e**. Ele morre no passo 6 de ~14, `Build web app`:

```
Error occurred prerendering page "/reports"
Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required
Export encountered an error on /(admin)/reports/page: /reports, exiting the build.
```

Duas causas somadas:

1. **O workflow nunca injetou o ambiente.** Não há bloco `env:`, e
   `pnpm build` roda **antes** de `supabase start`. O Next inlineia
   `NEXT_PUBLIC_*` em tempo de build.
2. **`(admin)/reports/page.tsx` é prerenderizado.** Não declara
   `dynamic = "force-dynamic"`, então o Next tenta gerá-la estaticamente no
   build; ela constrói cliente Supabase e lança. Uma página que exige sessão
   de operador nunca deveria ser estática — isso é bug de arquitetura,
   independente do CI.

O painel entrou em `78d4318` (Onda 1 Task 4). **O CI está vermelho desde
então**, e as Ondas seguintes foram fechadas por cima disso — enquanto o §9 do
runbook manda, diariamente, *"verificar que o ultimo pipeline esta verde (lint,
typecheck, test, test:db, test:e2e)"*.

Consequência a registrar: nada depois do build jamais rodou no CI. `test:db`,
`db:lint` e `test:e2e` não estão "falhando" — estão **inalcançáveis**. Não há
evidência de que passem.

- [x] **Step 0: Marcar as rotas `(admin)` como dinâmicas**

  Em `apps/web/app/(admin)/reports/page.tsx` (e no `(admin)/layout.tsx`, se o
  Next ainda tentar prerenderizar), declarar:

  ```ts
  export const dynamic = "force-dynamic"
  ```

  Isto é correção de arquitetura, não contorno de CI: a página lê via
  `service_role` atrás de `is_current_user_operator` e não tem versão estática
  possível. Aplique o mesmo à `(admin)/admissions` da Task 9.

  Verificação: `npx pnpm@11.18.0 build` precisa passar **sem** `.env.local`
  presente. Renomeie o arquivo temporariamente para confirmar.

- [x] **Step 1: Reordenar o workflow**

  Em `.github/workflows/pull-request-ci.yml`, mover o step
  `Start local Supabase` (`pnpm exec supabase start`) para **antes** do step
  `Build web app`. A ordem final relevante é:

  ```
  Install → Lint → Typecheck → Unit tests → Secrets scan
  → Start local Supabase → Write env → Build web app
  → Check types drift → Reset database → DB tests → Schema lint
  → Install Playwright → Root E2E tests
  ```

- [x] **Step 2: Adicionar o step que escreve o env**

  Logo após `Start local Supabase`:

  ```yaml
  - name: Write local Supabase env
    run: |
      supabase status -o env > /tmp/supabase.env
      . /tmp/supabase.env
      {
        echo "SUPABASE_URL=$API_URL"
        echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
        echo "NEXT_PUBLIC_SUPABASE_URL=$API_URL"
        echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
      } > apps/web/.env.local
  ```

  Os nomes emitidos por `supabase status -o env` variam entre versões da CLI.
  **Rode `supabase status -o env` localmente primeiro** e confirme as chaves
  exatas antes de escrever o YAML. Não invente nomes.

  **Nunca** escreva `BIVAQUE_AUTH_BYPASS` nesse arquivo. O CI tem que exercitar
  o gate de verdade.

- [ ] **Step 3: Verificação**

  ```bash
  npx pnpm@11.18.0 lint
  ```

  O YAML não é coberto por teste. A verificação real é o CI da PR: o step
  `Root E2E tests` precisa **chegar a executar** (pode falhar em asserção nesta
  Task — não pode falhar em coleta nem em erro de ambiente).

- [x] **Step 4: Commit isolado**

  ```
  ci: provision local Supabase env before the web build
  ```

---

## Task 2: Seed de desenvolvimento com fixtures duráveis de Manaus

**Por quê:** três consumidores diferentes precisam de um banco não-vazio e hoje
nenhum tem: (a) `PILOT_RUNBOOK.md` §1 exige duas contas de teste com perfil em
Manaus; (b) `tests/e2e/helpers/session.ts` precisa de um usuário para o password
grant; (c) toda auditoria visual até hoje julgou densidade e ritmo contra telas
com zero conteúdo.

**Contexto de schema (verificado nas migrations):**

- A localidade Manaus **já é inserida pela migration**
  `20260802000100_locality_profile_foundation.sql`. Não recrie — referencie.
  O UUID do piloto é `00000000-0000-4000-8000-000000000001`
  (`apps/web/lib/locality.ts`, `FALLBACK_LOCALITY_ID`).
- `public.profiles`: `user_id`, `display_name`, `locality_id`, `visibility`.
- `public.locality_memberships`: só ganha linha quando o resultado é
  `verified` (per MAP §4 linha 1c). O estado de verificação vive em
  `private.verification_outcomes`.
- `public.posts`: `user_id` (**não** `author_id`), `locality_id`, `group_id`,
  `post_type` (enum `public.post_type`: `text`, `photo`, `link`, …),
  `content` (`char_length between 1 and 2000`), `is_deleted`.
  Constraint `post_photo_requires_photo_type`: `photo_path` só com
  `post_type = 'photo'`. Use `text` para o volume.

- [x] **Step 1: Criar os dois usuários exigidos pelo runbook**

  Reescrever `supabase/seed.sql` preservando o comentário sobre Manaus ser
  dado de referência da migration, e **substituindo** a regra atual sobre
  fixtures. O novo cabeçalho deve explicar a distinção:

  ```sql
  -- Fixtures duráveis de DESENVOLVIMENTO LOCAL.
  --
  -- Não confundir com as fixtures de supabase/tests/*, que são transacionais
  -- e sofrem rollback por teste — aquelas continuam sendo a regra para pgTAP.
  -- Este arquivo existe porque três consumidores precisam de um banco estável:
  -- o operador (PILOT_RUNBOOK §1), a suíte e2e e a captura visual do §10.2.
  --
  -- Roda apenas em `supabase db reset --local`. Credenciais são públicas e
  -- descartáveis por design.
  ```

  Criar em `auth.users` (com `encrypted_password` via `crypt(..., gen_salt('bf'))`,
  `email_confirmed_at` preenchido, `aud`/`role` = `authenticated`):

  | Papel | E-mail | Senha | Estado esperado |
  |---|---|---|---|
  | Titular verificado | `visual@bivaque.example.invalid` | `bivaque-e2e-local` | `profiles` + `locality_memberships` em Manaus |
  | Rejeitado | `rejected@bivaque.example.invalid` | `bivaque-e2e-local` | **sem** `locality_memberships` |

  O e-mail do titular **precisa** ser `visual@bivaque.example.invalid` — é o
  default já usado por `tests/e2e/helpers/session.ts` e por
  `persistent-login.spec.ts`.

  O titular precisa de `display_name` legível (ex.: `"Ana Verificada"`), não
  `"Novo membro"`, porque a auditoria visual julga o header do perfil.

- [ ] **Step 2: Volume de conteúdo para julgar densidade**

  Ainda em `seed.sql`, gerar conteúdo suficiente para que o feed pareça uma
  comunidade viva e não uma tela de estado vazio:

  **O piloto abre com ~300 militares mais dependentes** (ver §Escala). O seed
  precisa modelar essa ordem de grandeza, não uma fração dela — o objetivo é
  julgar densidade e carga de moderação na escala real.

  - **~300 membros** em Manaus (`auth.users` + `profiles` +
    `locality_memberships`), nomes plausíveis em pt-BR, mais ~60 dependentes
    via `family_account_links` para exercitar o vínculo familiar.
  - **~400 posts `text`** distribuídos ao longo dos últimos 30 dias
    (`created_at` variando — use `generate_series` com offsets), autoria
    espalhada seguindo distribuição desigual (poucos muito ativos, cauda
    longa silenciosa — é como comunidade real se comporta), comprimentos
    entre 40 e 600 caracteres. Uma fração com reações e comentários.
  - 8 grupos (ao menos 2 privados) com membros sobrepostos.
  - 4 eventos passados e 6 futuros.
  - **~15 `reports` com `status = 'open'`**, para que a fila de
    `(admin)/reports` seja avaliada com volume — um operador único olhando
    15 denúncias abertas é um teste de usabilidade diferente de olhar 2.

  Gere proceduralmente com `generate_series`; não escreva 300 INSERTs à mão.

  **Critério de aceitação subjetivo mas obrigatório:** ao abrir `/community`
  em 375px, a primeira dobra tem que estar cheia e precisar de scroll. Se
  couber tudo na tela, o volume está baixo demais para auditar densidade.

- [x] **Step 3: Verificação**

  ```bash
  npx pnpm@11.18.0 db:reset
  npx pnpm@11.18.0 test:db
  npx pnpm@11.18.0 db:lint
  npx pnpm@11.18.0 test:secrets
  ```

  `test:db` (pgTAP, ~595 asserts) **não pode regredir** — se alguma fixture do
  seed vazar para uma expectativa de teste, o seed está errado, não o teste.

  Confirme o password grant manualmente:

  ```bash
  curl -s -X POST "http://127.0.0.1:55321/auth/v1/token?grant_type=password" \
    -H "apikey: <ANON_KEY>" -H "Content-Type: application/json" \
    -d '{"email":"visual@bivaque.example.invalid","password":"bivaque-e2e-local"}' \
    | head -c 200
  ```

  Espere HTTP 200 com `access_token`. Se vier 400, o hash da senha está errado.

- [x] **Step 4: Commit isolado**

  ```
  feat(db): durable local seed with Manaus fixtures
  ```

---

## Task 3: Suíte e2e verde

**Por quê:** as 14 falhas únicas restantes são três problemas distintos, e dois
deles só podem ser resolvidos depois da Task 2.

**Grupo A — 12 testes que simulam sessão com cookie de consent (9 em
`manaus-pilot-full-journey.spec.ts`, 2 em `manaus-pilot-denials.spec.ts`, 1 em
`onboarding-holder-family.spec.ts`).** Eles setam só `bivaque-consent-version` e
esperam conteúdo do shell. Com o gate ativo isso redireciona para `/login`.
Esses testes contradizem diretamente `middleware-session-gate.spec.ts`, que
exige o redirect — **não existe configuração em que ambos passem**. O gate está
certo: o produto é uma comunidade privada verificada. Os testes é que precisam
autenticar.

**Grupo B — texto do botão Google.** Os testes esperam `"Entrar com Google"`; o
app diz `"Continuar com Google"`
(`apps/web/app/(preauth)/login/components/bivaque-sign-in.tsx:323`).

**Grupo C — `persistent-login.spec.ts:233` (Cenário 3).** Falha porque
`/profile` renderiza `"Perfil não encontrado."` — o usuário não tinha linha em
`profiles`. A Task 2 resolve sem tocar no spec.

- [ ] **Step 1: Defaults no helper para o CI funcionar sem `.env.local`**

  Em `tests/e2e/helpers/session.ts`, `requireEnv()` hoje lança se
  `USER_PASSWORD` não resolver. Como o seed passa a garantir credenciais
  conhecidas, adicionar default:

  ```ts
  const password =
    process.env["USER_PASSWORD"] ??
    readEnvLocal("BIVAQUE_VISUAL_PASSWORD") ??
    "bivaque-e2e-local"
  ```

  Fazer o mesmo em `tests/e2e/persistent-login.spec.ts`, que hoje lança em
  tempo de import quando `USER_PASSWORD` falta — é essa exceção que derruba a
  **coleta inteira** da suíte no CI, não só aquele arquivo.

  Manter a resolução por env/`.env.local` na frente do default, para que uma
  máquina com credenciais próprias continue mandando.

- [ ] **Step 2: Grupo A — autenticar em vez de simular**

  Nos 12 testes, trocar a chamada a `setConsentCookie(page)` por
  `await seedSession(context)` (o helper já instala **os dois** cookies:
  sessão e consent). Isso exige receber `context` na fixture do teste:

  ```ts
  test("...", async ({ page, context }) => {
    await seedSession(context)
    await page.goto("/community")
    // asserções inalteradas
  })
  ```

  **Não relaxe as asserções.** Se um teste esperava
  `heading "Minha comunidade"` e a página autenticada não mostra isso, é
  achado — pare e registre, não troque o locator para o que estiver na tela.

  Se `setConsentCookie` ficar sem uso, remova-o.

- [ ] **Step 3: Grupo B — alinhar o texto ao app**

  Trocar `"Entrar com Google"` por `"Continuar com Google"` em
  `manaus-pilot-full-journey.spec.ts` e `onboarding-holder-family.spec.ts`.

  Antes de trocar, confira `docs/agents/DESIGN_SPEC.md`. Se o spec de design
  disser `"Entrar com Google"`, então **o app é que está errado** e a correção
  é no componente, não no teste. Registre qual dos dois você seguiu.

- [ ] **Step 4: Verificação**

  Com a porta 3000 livre e `BIVAQUE_AUTH_BYPASS=false`:

  ```bash
  rm -f .pw-results.json
  npx pnpm@11.18.0 test:e2e
  ```

  Alvo: **333 passando, 0 falhando**. Qualquer teste restante em vermelho é
  achado novo — documente antes de mexer.

- [ ] **Step 5: Commit isolado**

  ```
  test(e2e): authenticate the specs that assert shell content
  ```

---

## Task 4: Fechar o buraco do portão §10.2

**Por quê:** `docs/agents/VISUAL_AUDIT-2026-08-06-navigation.md` registra, com
todas as letras, *"Captura rodada não autenticada (`authenticated: false`)
porque não há `.env.local` no host"* — e mesmo assim grada Hierarquia, Ritmo,
Densidade e Responsivo como "passa", com 0 achados. Auditou-se a densidade de
uma página de redirect. É essa ressalva-que-não-bloqueia que deixou sete ondas
passarem sobre um shell vazio.

- [ ] **Step 1: Abortar quando a captura não puder autenticar**

  Em `scripts/visual/capture.mjs`, hoje o resultado só registra
  `authenticated: true|false` e o markdown emite
  `"no (gated routes show the signed-out state)"`.

  Mudar para: se **qualquer** rota do schema tem `auth: true` e a captura não
  autenticou, o processo termina com **exit code diferente de zero** e mensagem
  explícita:

  ```
  ABORT: 12 rotas exigem sessão e a captura não autenticou.
  O veredito seria emitido sobre redirects. Configure apps/web/.env.local
  (ou rode `pnpm db:reset` para provisionar o usuário do seed) e repita.
  ```

  Só permita captura não autenticada se **nenhuma** rota do run exigir sessão
  (ex.: um run só de preauth), ou sob flag explícita `--allow-unauthenticated`
  que estampe o aviso no topo do markdown gerado.

- [ ] **Step 2: Usar as credenciais do seed como default**

  A captura deve conseguir autenticar sozinha depois de um `db:reset`, com as
  mesmas credenciais da Task 2 e a mesma ordem de resolução
  (env → `.env.local` → default).

- [ ] **Step 3: Verificação**

  ```bash
  npx pnpm@11.18.0 db:reset
  node scripts/visual/loop.mjs
  ```

  Espere: `authenticated: yes`, e as rotas do `(shell)` mostrando **conteúdo
  real** — feed com posts, grupos com membros, eventos na lista. Se alguma
  rota `auth: true` ainda cair em redirect, o run tem que falhar.

  Teste o guarda-rail: mova `apps/web/.env.local` temporariamente e confirme
  que o run **aborta** em vez de emitir veredito.

- [ ] **Step 4: Commit isolado**

  ```
  fix(visual): abort the capture when gated routes cannot authenticate
  ```

---

## Task 5: Reconciliar MAP e runbook com o schema atual

**Por quê:** o MAP se declara *"ponto de entrada do repositório, o primeiro
documento a ser lido em qualquer sessão — humana ou de agente"*, e o
`AGENTS.md` aponta para lá. Três afirmações dele são falsas hoje, e uma delas
**rebaixou uma prioridade**. Um mapa que todo agente é instruído a tratar como
verdade custa mais caro errado do que ausente.

**Só corrija o que está listado abaixo.** Não reescreva prioridades, não
re-derive a matriz, não toque em linhas que este plano não cita.

- [ ] **Step 1: Corrigir as três premissas falsas no MAP**

  | Onde | Afirmação atual | Realidade verificada |
  |---|---|---|
  | `[C4]` (§0.1, §4 linha 10a, §5) | *"não existe conceito de operador no schema. Só `group_membership_role`"* | `public.operators` existe (`granted_by`, `granted_at`, `revoked_at`, `revoked_by`, índice parcial de ativos, RLS) — migration `20260806040949_operator_authorization.sql`. E `public.is_current_user_operator(uuid)` — `20260806111744` |
  | §4 linhas 2d e 8b | *"sem tabela `notification_preferences` em migrations"* | Existe — `20260806165606_notification_preferences.sql` |
  | §4 linha 4b, §5 P0 nº 2 | *"Falta exclusivamente a superfície do operador — nenhuma rota consome a fila"* | A superfície existe: `apps/web/app/(admin)/layout.tsx`, `(admin)/reports/page.tsx`, `api/admin/reports/[id]/route.ts` com ações `hide` e `resolve` |
  | §5, item rebaixado nº 1 | *"Painel administrativo… É P0 só se o piloto for grande. Para piloto fechado com ≤50 membros, o runbook com SQL/Dashboard é viável"* | **A premissa caiu.** O piloto abre com ~300 militares mais dependentes. O próprio MAP condicionou: *"Se o piloto crescer, vira P0 retroativamente"* — a condição disparou. Ver §Escala e Tasks 9 e 10 |

  Marque as correções inline no padrão que o documento já usa (`**[C6]**`,
  `**[C7]**`, `**[C8]**`) e registre-as numa subseção nova de §0, seguindo o
  formato de §0.1.

  **Não decida** se 4b deixa de ser P0. O software mudou; a decisão de
  prioridade é do dono do produto. Registre o fato e deixe a prioridade como
  está, com nota apontando que a premissa mudou.

- [ ] **Step 2: Apontar o runbook §6 para o painel**

  `docs/PILOT_RUNBOOK.md` §6 instrui SQL cru no console do Supabase. O painel
  `(admin)/reports` agora faz exatamente isso com autorização, trilha
  (`resolved_by`, `resolved_at`, `operator_note`) e as duas ações certas.

  Reescrever o checklist para: **painel primeiro, SQL como diagnóstico**.
  A query de inspeção já foi corrigida (`public.posts`, `user_id`,
  `is_deleted`) — preserve-a como passo de diagnóstico.

  Adicionar um passo faltante: **como alguém vira operador.** Não há UI para
  isso; é `insert into public.operators`. Documente o comando e quem autoriza.

- [ ] **Step 3: Verificação**

  ```bash
  npx pnpm@11.18.0 lint
  ```

  Revisão humana obrigatória nesta task — não há teste que valide prosa.

- [ ] **Step 4: Commit isolado**

  ```
  docs: reconcile MAP and runbook with the current schema
  ```

---

## Task 6: Canal de suporte — fechar os dois P0 com uma promessa cumprível

**Decisão tomada.** O canal existe na UI e **aponta para um endereço morto**:
`(preauth)/onboarding/status/page.tsx:60` linka `suporte@bivaque.local`. `.local`
é TLD reservado de mDNS — mensagem enviada para lá não chega a lugar nenhum.
Isso é pior que ausência: a tela faz a promessa e o usuário acredita nela.

O runbook §6 agrava: abre com *"Denuncias de conteudo chegam via canal de
suporte"* e manda *"Responder ao denunciante com confirmação de recebimento"*,
sem que esse canal esteja definido em lugar nenhum.

Também nota: `status/page.tsx:13` só aceita `pending` e `rejected`. O estado
`temporary_error` não tem tela — quem cai nele fica no passo de verificação com
a mensagem crua (ver Task 10).

Os dois P0 do MAP são a mesma falha: **o produto faz uma promessa que não tem
como cumprir.** "Sua verificação está pendente" e nada acontece; "Denunciar" e
ninguém responde. Para ≤50 militares recrutados por indicação, um "me cadastrei
e nunca responderam" contamina a rede inteira — o custo não é linear no número
de afetados.

Isso não se fecha com schema nem com painel (o painel já existe). Fecha-se com
**um endereço real e um prazo declarado**, nas três telas terminais.

- [ ] **Step 1: Fonte única do canal, com guarda**

  Criar `apps/web/lib/support.ts`:

  ```ts
  /**
   * Canal de suporte do piloto. Único lugar onde o contato é declarado.
   *
   * E-mail é o único canal externo, por decisão: ver §Canal de suporte.
   * Quem já está dentro da plataforma é atendido pela própria plataforma
   * (Task 11), não por canal externo.
   *
   * O placeholder abaixo NÃO pode chegar em produção: tests/scope/
   * support-channel.test.mjs falha enquanto ele estiver presente.
   */
  export const SUPPORT_EMAIL = process.env["NEXT_PUBLIC_SUPPORT_EMAIL"] ?? "<<DEFINIR>>"
  export const SUPPORT_SLA_HOURS = 48
  ```

  48h não é número inventado: é o ritmo que o runbook já opera
  (§3 "convites emitidos há mais de 48h", §9 check diário). E é um prazo que
  o e-mail sustenta com honestidade — no WhatsApp, 48h é sinônimo de ter sido
  ignorado.

- [ ] **Step 2: A guarda que impede o esquecimento**

  Criar `tests/scope/support-channel.test.mjs` (roda em `pnpm test:scope`,
  que já está no `pnpm test`): falha se `<<DEFINIR>>` aparecer em
  `apps/web/lib/support.ts` **e** nenhuma env var correspondente estiver
  definida. Mensagem de erro explícita:

  ```
  Canal de suporte não configurado. Defina NEXT_PUBLIC_SUPPORT_EMAIL antes de
  operar o piloto — PILOT_RUNBOOK §6 pressupõe esse canal e as telas de
  pendente/waitlist o exibem.
  ```

  Em desenvolvimento o teste deve **passar** com o placeholder (senão ninguém
  consegue trabalhar); ele só é obrigatório quando `NODE_ENV === "production"`.
  Isso converte "alguém precisa lembrar" em "o build te impede".

- [ ] **Step 3: Exibir nas três telas terminais**

  1. **`onboarding/status/page.tsx:60`** — trocar o `mailto:suporte@bivaque.local`
     hardcoded pelos valores de `lib/support.ts`. Este é o endereço morto;
     é a correção mais urgente da task.
  2. **Onboarding, estado `waitlist`** (`page.tsx:144-149`): acrescentar canal e
     prazo. Atenção ao §5.1 do MAP — waitlist é candidatura a **outras
     localidades**, não fila para Manaus. A cópia não pode prometer "sua vez
     chega".
  3. **Confirmação de denúncia** (`report-button.tsx`): informar que a análise
     acontece e que o resultado **chega como notificação no app** (Task 11).
     Não mande o denunciante para e-mail: ele já está dentro da plataforma.

  Cópia sugerida para o pending:

  > Sua verificação está em análise. Respondemos em até 48 horas úteis.
  > Se passar disso, escreva para {SUPPORT_EMAIL}.

- [ ] **Step 4: Verificação**

  ```bash
  npx pnpm@11.18.0 typecheck
  npx pnpm@11.18.0 lint
  npx pnpm@11.18.0 test
  npx pnpm@11.18.0 test:secrets
  ```

  Manual: percorrer os três estados e confirmar que o canal aparece.

- [ ] **Step 5: Commit isolado**

  ```
  feat(support): declare a reachable support channel on terminal states
  ```

---

## Task 7: Cinco destinos — Mensagens entra, Perfil sai do bottom nav

**Decisão tomada.** `Mensagens` é P1, está construída e funcionando (lista,
conversa, bloquear, iniciar conversa) e **não tem nenhuma entrada de
navegação** — só é alcançável por URL ou deep link de notificação. `Indicações`
é P2 e o MAP diz *"não aparece na primeira sessão do piloto"*, mas ocupa a
quinta vaga desde `cf3f21e`.

A saída não é escolher entre as duas. É notar que **`Perfil` ocupa uma vaga que
não precisa**: ele já tem entrada no header (o avatar) e é uma tela de
configuração — nome, visibilidade, avatar, convites de família, preferências,
sair — não um destino de conteúdo. A convenção de mercado põe configuração no
avatar do header, não na barra inferior.

Destinos finais do bottom nav: **Comunidade, Grupos, Eventos, Indicações,
Mensagens**.

- [ ] **Step 1: O avatar do header precisa virar link primeiro**

  **Faça este step antes do Step 2.** Em `app-shell.tsx`, o botão do avatar é
  hoje um `<button aria-label="Perfil">` **sem `onClick`** — decorativo. Se
  `Perfil` sair do bottom nav antes disso, o perfil fica **inalcançável no
  mobile**, e junto com ele o "Sair da conta".

  Trocar por um link para `/profile`, preservando `aria-label`, o alvo de 44px
  e o anel de foco.

- [ ] **Step 2: Adicionar Mensagens e tirar Perfil do bottom nav**

  Em `bottom-nav.tsx`, acrescentar a `NAV_ITEMS` a entrada `messages`
  (`label: "Mensagens"`, `href: "/messages"`, ícone de balão do
  `@heroicons/react/24/outline` + variante solid, seguindo o pattern das
  outras). A sidebar do desktop passa a ter seis entradas — ela tem espaço.

  No `BottomNav`, filtrar `profile` com comentário explicando o porquê:

  ```tsx
  // Perfil sai do bottom nav: é tela de configuração e já tem entrada
  // permanente no avatar do header. As cinco vagas ficam para destinos
  // de conteúdo — cinco é o teto do iOS HIG e do Material.
  const items = NAV_ITEMS.filter((item) => item.id !== "profile")
  ```

- [ ] **Step 3: Atualizar os specs**

  `tests/e2e/shell-navigation.spec.ts` e `shell-accessibility-denials.spec.ts`
  assumem os cinco atuais. Atualizar rótulos, ordem e `expectedHrefs`
  (`/community`, `/groups`, `/events`, `/recommendations`, `/messages`).
  Acrescentar um teste: **o avatar do header navega para `/profile` no mobile**
  — é a regressão que este plano pode causar.

- [ ] **Step 4: Verificação**

  ```bash
  npx pnpm@11.18.0 typecheck && npx pnpm@11.18.0 lint
  npx pnpm@11.18.0 test:e2e
  ```

  Manual em 375px: as cinco tabs cabem, cada uma ≥44px, sem overflow
  horizontal, e `/profile` é alcançável pelo avatar.

- [ ] **Step 5: Commit isolado**

  ```
  feat(shell): put Mensagens in the bottom nav and move Perfil to the header
  ```

---

## Task 8: Tirar a chave de produção do laptop e matar o check placebo

**Decisão tomada.** Duas correções distintas no §9 do runbook.

**(a) A chave do Portal.** §2 diz que `PORTAL_DADOS_API_KEY` é *"o segredo
operacional mais sensivel do piloto"* e que comprometê-la *"expõe todos os CPFs
verificados"*. E aí §1 exige acesso ao `.env` de produção e §9 manda,
**diariamente**, testar o Portal com a chave de produção localmente. Por
desenho, o segredo mais sensível do sistema vive num laptop.

**(b) O check placebo.** §9 manda *"RLS e privacidade: Executar localmente
contra o banco de producao: `test:privacy` / `test:secrets`"*. **Esses testes
não abrem conexão com banco nenhum** — verificado: `tests/privacy/*` são seis
suítes vitest de lógica pura (redação de PII, formatos, invariantes), sem
`SUPABASE_URL`, sem cliente, sem host. O operador marca a caixa acreditando ter
verificado a RLS de produção e nada foi verificado. É a mesma classe de falha
da auditoria visual: um controle que reporta sucesso sem fazer o trabalho.

- [ ] **Step 1: Probe server-side do Portal**

  Criar `apps/web/app/api/admin/portal-health/route.ts`, protegido por
  `is_current_user_operator` — mesmo pattern de
  `api/admin/reports/[id]/route.ts`, que já valida Bearer + operador.

  Faz uma requisição mínima ao Portal e devolve **apenas** um enum:

  ```json
  { "status": "ok" | "invalid_key" | "rate_limited" | "timeout" | "http_error" | "schema_drift",
    "checked_at": "<iso>" }
  ```

  **Nunca** devolva a chave, o corpo da resposta do Portal, nem qualquer CPF.
  Os códigos são os mesmos que §4 do runbook já cataloga — mantenha os nomes.

  Precisa ser autorizado, e não público, para não virar um oráculo externo
  sobre a validade da chave.

- [ ] **Step 2: Reescrever §9 do runbook**

  - Trocar *"Testar manualmente uma requisicao ao Portal com a chave de
    producao (via script de teste local com `.env` de producao)"* por: acessar
    `/api/admin/portal-health` autenticado como operador.
  - Corrigir o item de RLS/privacidade: declarar que `test:privacy` e
    `test:secrets` são suítes de **código**, cobertas pelo CI a cada PR, e que
    **não verificam produção**. Remover "executar contra o banco de producao".
  - Registrar que a garantia de RLS em produção hoje vem de **paridade de
    migration** — `test:db` (pgTAP) roda contra um banco local com as mesmas
    migrations no CI.
  - Rever §1: se o probe cobre o uso diário, o pré-requisito *"acesso de
    leitura ao `.env` de producao"* deixa de ser rotina e vira exceção de
    incidente.

- [ ] **Step 3: Verificação**

  ```bash
  npx pnpm@11.18.0 typecheck && npx pnpm@11.18.0 lint
  npx pnpm@11.18.0 test:secrets
  ```

  Manual: chamar o endpoint sem sessão → 401; com sessão não-operadora → 403;
  como operador → JSON de status. Confirmar que a chave não aparece na
  resposta nem em log.

- [ ] **Step 4: Commit isolado**

  ```
  feat(admin): operator-only Portal health probe; docs: fix the placebo RLS check
  ```

---

## Escala: o piloto abre com ~300, não com ≤50

Todo o §5 do MAP calibra prioridade em *"piloto fechado com ≤50 membros"*. A
abertura real é de **~300 militares mais dependentes** — ordem de 350 a 400
contas. Isso não é um ajuste de número: dispara a condição que o próprio MAP
escreveu (*"se o piloto crescer, vira P0 retroativamente"*) e muda três coisas.

**1. Um operador único vira o gargalo.** O runbook dimensiona *"1-2
operadores"* para 50 pessoas. Com 350 contas e um operador, 5% precisando de
suporte já são ~18 atendimentos, concentrados nos primeiros três dias. É por
isso que o canal escolhido precisa ser aquele cuja expectativa o operador
consegue honrar, e que o máximo possível seja resolvido pela própria
plataforma (Tasks 9, 10 e 11).

**2. O rate limit do Portal deixa de ser hipótese.** §4 do runbook cataloga
`RATE_LIMITED` (429) como cenário. Com 50 cadastros você nunca chega lá; com
300 numa janela de lançamento, chega. A verificação é síncrona no fluxo de
onboarding, então o limite estoura na cara do usuário. Ver Task 10.

**3. A superfície de operador cobre denúncia, mas não admissão.** O painel
`(admin)/reports` existe e funciona. **Admissão não tem painel nenhum** — e é
exatamente ali que os 300 aterrissam. Com 50 você inspeciona
`private.verification_outcomes` no SQL; com 300 em `pending`/`temporary_error`
espalhados, não. Ver Task 9.

**Recomendação de lançamento: abrir em coortes, não de uma vez.** Sugiro
50 → 100 → 150 em três semanas. Custa zero em engenharia e protege as três
frentes simultaneamente: distribui a carga do operador único, mantém o Portal
abaixo do rate limit, e — o mais importante — dá chance de as normas de
convivência e moderação se formarem com 50 pessoas antes de valerem para 300.
Comunidade que abre cheia sem norma estabelecida herda o tom dos primeiros
barulhentos. Esta é a recomendação que eu defenderia com mais convicção neste
documento inteiro, e ela não depende de nenhuma task.

---

## Task 9: Fila de admissão no painel do operador

**Por quê:** §Escala item 3. `private.verification_outcomes` é
deliberadamente inacessível ao cliente (per MAP §0.1 [C2]), então não existe
forma de ver quem está travado sem abrir o console SQL. Com ~300 entrando,
o operador precisa de uma lista, não de uma query.

- [ ] **Step 1: Route handler de leitura**

  Criar `apps/web/app/api/admin/admissions/route.ts` no mesmo pattern de
  `api/admin/reports/[id]/route.ts`: valida Bearer + `is_current_user_operator`,
  usa `service_role` para ler `private.verification_outcomes` agregado com
  `profiles`. Filtro por status (`pending`, `temporary_error`, `rejected`) e
  ordenação por mais antigo primeiro — quem está esperando há mais tempo é
  quem corre risco de desistir.

  **Nunca** devolva CPF, nem hash de CPF, nem o payload do Portal. Devolva
  `user_id`, `display_name`, `status`, `created_at` e o código de erro quando
  houver.

- [ ] **Step 2: Página `(admin)/admissions`**

  Server Component listando a fila, com destaque para quem passou das 48h — o
  SLA que a Task 6 publica. Sem ações de escrita nesta task: ver e priorizar
  já resolve o problema operacional.

- [ ] **Step 3: Verificação**

  ```bash
  npx pnpm@11.18.0 typecheck && npx pnpm@11.18.0 lint && npx pnpm@11.18.0 test:secrets
  ```

  Manual: sem sessão → 401; sessão comum → 403; operador → fila. Com o seed da
  Task 2, a lista precisa ter volume suficiente para revelar se a ordenação e
  a densidade aguentam ~300.

- [ ] **Step 4: Commit isolado**

  ```
  feat(admin): admissions queue for the operator
  ```

---

## Task 10: Sobreviver ao pico de lançamento na verificação

**Por quê:** §Escala item 2. Hoje `onboarding/page.tsx:188-190` renderiza
`"Erro temporário na verificação: {reason}"`, e `reason` é o código cru —
`RATE_LIMITED`, `TIMEOUT`, `SCHEMA_DRIFT`. Numa janela de lançamento com 300
cadastros, essa é a mensagem que muita gente vai ver, e ela não diz o que
fazer. Pior: quem não entende a diferença entre "erro temporário" e "você não
é elegível" desiste achando que foi rejeitado.

Vale registrar a distinção que o runbook faz e que precisa ser preservada:
*"NUNCA informar ao usuario o motivo exato da rejeicao (dado sensivel de
elegibilidade)"*. Isso vale para **rejeição**. `RATE_LIMITED` e `TIMEOUT` não
são sinal de elegibilidade — são falha de infraestrutura, e esconder a natureza
delas só transforma um erro transitório em rejeição aparente.

- [ ] **Step 1: Mensagem humana por classe de erro**

  Mapear os códigos de `lib/portal/client.ts` para cópia em pt-BR, sem vazar
  código nem detalhe de infraestrutura:

  | Código | Mensagem ao usuário |
  |---|---|
  | `RATE_LIMITED` | "Estamos com muitos cadastros agora. Tente de novo em alguns minutos — seus dados não foram perdidos." |
  | `TIMEOUT`, `HTTP_ERROR` | "A consulta demorou mais que o esperado. Tente de novo." |
  | `INVALID_KEY`, `SCHEMA_DRIFT` | "Estamos com uma instabilidade. Já fomos avisados — tente mais tarde ou fale com a gente: {canal}." |

  As duas últimas classes são falha nossa, não do usuário: exiba o canal da
  Task 6 junto.

- [ ] **Step 2: Preservar o CPF digitado no retry**

  O componente já usa `sessionStorage` para o CPF no caminho de sessão
  expirada (`page.tsx:154`). Aplicar o mesmo no erro temporário — repetir a
  digitação de CPF depois de uma falha que não foi culpa do usuário é onde as
  desistências acontecem.

- [ ] **Step 3: Tela para `temporary_error`**

  `onboarding/status/page.tsx:13` só aceita `pending` e `rejected`. Aceitar
  `temporary_error` com sua própria cópia e caminho de retry, para que o
  usuário que sai e volta não caia num estado sem explicação.

- [ ] **Step 4: Verificação**

  ```bash
  npx pnpm@11.18.0 typecheck && npx pnpm@11.18.0 lint && npx pnpm@11.18.0 test
  ```

  Teste unitário do mapeamento código → cópia, garantindo que **nenhum código
  cru** chega à UI. Manual: forçar `RATE_LIMITED` (mock) e confirmar a
  mensagem, o CPF preservado e o retry funcionando.

- [ ] **Step 5: Commit isolado**

  ```
  feat(onboarding): humane copy and retry for transient verification failures
  ```

---

## Task 11: A plataforma responde a denúncia, não um canal externo

**Por quê:** o denunciante **já está dentro do produto**. Mandá-lo para e-mail
para saber o desfecho de uma denúncia é converter uma interação que o sistema
resolve sozinho em trabalho manual do operador — com ~350 contas e um operador,
isso não escala e nem precisa.

O caminho certo é notificação: o operador clica `resolve` no painel que já
existe, e o denunciante recebe aviso no app. Automático, sem consumir tempo de
ninguém, e sem revelar a ação tomada (o runbook §6 exige *"sem revelar a acao
tomada"* — a notificação confirma a análise, não o desfecho do conteúdo).

Detalhe que torna isso barato: `notifications/page.tsx:60` tem
`default: return "alertas"`, e **nenhum tipo atual cai nesse branch**. A aba de
alertas existe na UI e nunca recebeu nada. A infraestrutura está pronta e
esperando exatamente esta classe de evento.

- [ ] **Step 1: Novo tipo de notificação**

  Migration acrescentando `'report_resolved'` ao enum
  `public.notification_type` (hoje: `comment`, `group_admission`,
  `invitation_accepted`, `event_rsvp`, `event_change`, `direct_message`).

  `alter type ... add value` não roda dentro de bloco transacional em algumas
  versões do Postgres — verifique se a migration precisa ficar isolada.

- [ ] **Step 2: Emitir na resolução**

  Em `api/admin/reports/[id]/route.ts`, na ação `resolve`, criar a notificação
  para `reports.reporter_user_id`.

  **Não inclua** o conteúdo denunciado, o autor dele, nem a ação tomada. A
  notificação diz que a denúncia foi analisada — nada além disso. Vale um
  teste de privacidade em `tests/privacy/` fixando essa restrição, no padrão
  das seis suítes que já existem.

- [ ] **Step 3: Classificação**

  Confirmar que `report_resolved` cai em `"alertas"`. Como o `switch` já tem
  `default`, pode não exigir mudança — mas torne explícito em vez de depender
  do fallback.

- [ ] **Step 4: Verificação**

  ```bash
  npx pnpm@11.18.0 db:reset && npx pnpm@11.18.0 test:db && npx pnpm@11.18.0 db:lint
  npx pnpm@11.18.0 typecheck && npx pnpm@11.18.0 lint && npx pnpm@11.18.0 test
  ```

  Manual: denunciar como membro, resolver como operador, confirmar que a
  notificação chega na aba de alertas e que não vaza nada do conteúdo.

- [ ] **Step 5: Commit isolado**

  ```
  feat(reports): notify the reporter when a report is resolved
  ```

---

## Canal de suporte: valores e a ressalva

**Operador designado:** o dono do produto, em regime de operador único.

**O contato vai em `.env`, nunca no repositório.** A Task 6 lê de
`NEXT_PUBLIC_SUPPORT_EMAIL`; `.env.example` recebe só o placeholder. Não
commite o endereço em nenhum arquivo rastreado.

### Decisão: e-mail é o único canal externo

Eu havia recomendado WhatsApp como canal primário. **Estava errado**, e a
correção veio da pergunta certa: por que um canal externo, se a plataforma
resolve?

O raciocínio que me convenceu, em ordem de peso:

1. **O produto já depende de e-mail para autenticar.** O login é por magic
   link. Sustentar que "e-mail tem taxa de resposta baixa demais" seria dizer
   que o fluxo de autenticação é frágil — não dá para acreditar nas duas
   coisas ao mesmo tempo. Se o e-mail chega para autenticar, chega para
   suportar.
2. **Para o operador único, resposta lenta é recurso, não defeito.** WhatsApp
   cria expectativa de resposta em minutos; e-mail sustenta 48h sem que
   ninguém se sinta ignorado. Com ~350 contas e uma pessoa, o canal precisa
   ser aquele cuja expectativa o operador consegue honrar.
3. **O público é militar federal.** Lida com canal institucional por ofício.
   Meu instinto de "brasileiro não responde e-mail" é heurística de app de
   consumo e não se aplica a um processo de verificação de elegibilidade.
4. **A separação de populações é limpa.** Quem está travado na admissão está
   **fora do portão** — não tem plataforma nenhuma, e-mail é o único caminho.
   Quem denuncia está **dentro** — e é atendido pela plataforma (Task 11).
   Não há terceiro caso que justifique um terceiro canal.

**Canal final:** e-mail, mais notificação in-app para quem já é membro.

### A ressalva que permanece

Ela é independente de WhatsApp vs e-mail: **use um endereço de papel, não o
Gmail pessoal.**

O operador rejeita elegibilidade e remove conteúdo. Vincular essas ações a uma
identidade pessoal expõe o operador justamente a quem ele acabou de negar —
num público militar da mesma praça, isso não é abstrato. E um endereço pessoal
não é transferível: no dia em que houver um segundo operador, ou em que você
quiser sair da linha de frente, o canal publicado continua sendo o seu.

`suporte@<domínio-bivaque>` se o domínio já existir; um Gmail dedicado
(`bivaque.suporte@…`) como ponte enquanto não existir. Custa minutos.

O valor entra em `NEXT_PUBLIC_SUPPORT_EMAIL` no `.env` — nunca no repositório.

---

## Ordem de execução

Tasks 1→3 são estritamente sequenciais e bloqueiam todo o resto: sem elas
nenhuma mudança pode ser verificada. Depois disso:

- **Task 4** (portão visual) depende da 2. **Task 9** depende da 2 para ter
  volume na fila.
- **Tasks 5, 6, 7, 8, 9, 10** são independentes entre si e paralelizáveis.

**Bloqueiam o lançamento** (não deveriam ver 300 usuários sem estarem prontas):

| Task | Por quê |
|---|---|
| **6** — canal de suporte | Hoje o app promete `suporte@bivaque.local`, endereço morto. É a promessa quebrada mais visível do produto |
| **10** — pico de verificação | Com 300 cadastros numa janela, o rate limit do Portal estoura na cara do usuário com código cru |
| **9** — fila de admissão | Operador único sem lista não consegue sustentar 48h em ~300 admissões |
| **11** — denúncia responde no app | Sem isso, todo desfecho de denúncia vira atendimento manual do operador único |

As Tasks 1–3 não bloqueiam o lançamento em si, mas bloqueiam a **capacidade de
verificar** que 6, 9 e 10 funcionam. Na prática vêm antes.

**Nada disso substitui a recomendação de abrir em coortes** (ver §Escala). Ela
reduz o risco das três tasks acima simultaneamente e não custa engenharia
nenhuma.

**Não faça push do branch `fix/shell-blank-toast-provider` antes da Task 2.**
Os três commits já feitos (`eb61f42`, `cf3f21e`, `1361b09`) dependem do usuário
do seed: `tests/e2e/helpers/session.ts` faz password grant, e sem o seed o CI
falha. Push depois de 1+2, com o CI verde.

---

## Fora deste plano

- Qualquer feature nova. Nenhuma linha da matriz §4 do MAP é fechada aqui.
- Policies de RLS e autorização.
- O painel `(admin)` além de documentá-lo — ele já existe e funciona.
- Os `aria-label` duplicados entre sidebar e BottomNav: já resolvidos em
  `1361b09` pelo alinhamento de breakpoint.
- Decidir prioridade de 4b após a reconciliação do MAP.
- **Probe de RLS ao vivo em produção.** A Task 8 corrige a falsa garantia e
  registra que hoje a cobertura vem de paridade de migration. Um probe real —
  um punhado de asserções de RLS executadas server-side com um usuário comum,
  não `service_role` — é a resposta certa, mas é subsistema novo e não cabe
  aqui.
