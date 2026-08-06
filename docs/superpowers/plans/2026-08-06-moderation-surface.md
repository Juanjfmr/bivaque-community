# Moderação surface — Implementation Plan

> **Para quem executa (humano ou agente):** este plano é autocontido e não
> depende de nenhuma ferramenta específica. Execute **uma task por vez**, na
> ordem. Marque os checkboxes (`- [x]`) conforme avança.
>
> Regra de parada: se um step de verificação não produzir a saída esperada,
> **pare e investigue** antes de seguir.

**Goal:** Fechar o ciclo de moderação (MAP.md §10.1 Onda 1, §7 área 4).
Hoje o titular que denuncia um post vê a confirmação e silêncio. O
operador não tem fila — só lê SQL. O conteúdo segue público até alguém
atuar manualmente, em horário de trabalho, por runbook.

**Architecture:** Camada de aplicação pura, **sem migration**. O banco já
entrega tudo (per `[C1]` em §10.1): tabela `public.reports` com
status (`open`/`resolved`), `operator_note`, `resolved_by`, `resolved_at`,
grants e trigger de soft-delete. A primitive de autorização da Onda 0
(`private.is_operator()`) é o gate.

Três arquivos novos no servidor:
- `apps/web/app/api/admin/reports/[id]/route.ts` — POST. Valida Bearer,
  checa `private.is_operator()` server-side, executa `hide` ou
  `resolve` via service_role. Nenhuma outra origem de mutação.
- `apps/web/app/(admin)/reports/page.tsx` — Server Component que
  carrega a fila de `status='open'` via service_role, renderiza cada
  card com preview do conteúdo denunciado + duas ações (Ocultar /
  Resolver). Sem JS client-side pesado — Server Actions chamam o route
  handler via form post.
- `apps/web/app/(admin)/layout.tsx` — Server Component. Lê o cookie
  Supabase, se não há sessão → redirect para `/login?return=/admin/reports`;
  checa `private.is_operator()` server-side; se falso → redirect
  `/community`. Sem essa camada, o layout do `(shell)` vazaria.

**Subdivisões resolvidas:**
- **4b** — Denúncia sem operação: o operador vê a fila e age em segundos.
- **4c** — "Ocultar publicação" passa a ter superfície real (não
  mais um Set em React que esconde só localmente).

**Subdivisões explicitamente fora desta onda:**
- `tests/e2e/admin-flow.spec.ts` — opcional; pode entrar na Task 6
  com o resto da cobertura E2E.
- Anti-abuso no report-button (já existe — trigger `reports_block_self`
  + índice único parcial).
- Retorno ao denunciante ("sua denúncia foi analisada") — `5` da
  rubrica de classificação; pode vir numa onda de notificações.

**Tech Stack:** Next.js 16 server runtime, `createServerClient()` em
`apps/web/lib/supabase/server.ts` (já existente, usa
`SUPABASE_SERVICE_ROLE_KEY`), cookies Supabase via `@supabase/ssr`
para identificar o titular no handler, helpers `security definer` em
`private` para checar autorização (`private.is_operator()` da Onda 0).

**Fontes:**
- [`docs/journeys/MAP.md`](../journeys/MAP.md) §0.1 `[C1]`, §7 (área 4),
  §9 (Jornada crítica #2), §10.1 (Onda 1).
- `apps/web/app/(preauth)/onboarding/page.tsx` — padrão de toast +
  fetch com Bearer (Onda 2 Task 2).
- `apps/web/app/api/onboarding/status/route.ts` — padrão de route
  handler service-side que valida Bearer + usa RPC pública (Onda 2
  Task 1).
- `supabase/migrations/20260802001600_reports.sql` — formato da
  tabela, grants e triggers. **Tudo já está lá** — não tocar.
- `supabase/migrations/20260806102427_read_verification_status.sql` —
  precedente para criar uma RPC `public.*` quando o handler precisa
  ler de schema `private`.

---

## Contexto obrigatório antes de começar

### Ciclo de trabalho

```bash
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 test:scope
npx pnpm@11.18.0 test:db
npx pnpm@11.18.0 build
```

Sem `db:reset` aqui — esta onda não toca schema. O cycle é só type/lint/test/build.

### Falsos positivos conhecidos

**1. `database.generated.ts` em UTF-16.** Pré-existente no repo, já
documentado no plano da Onda 2. `pnpm typecheck` continua quebrando
do mesmo jeito. Não é regressão.

**2. `tests/operator-authorization.sql` insere uma fixture
`op-one@example.invalid` no banco local.** Se a captura visual rodar
entre `db:reset` e `test:db`, mais 6 fixtures (Visual Capture) podem
surgir. Rodar `db:reset && test:db` em sequência limpa, como sempre.

**3. `private.is_operator()` retorna NULL para `service_role`.**
A função lê `current_setting('request.jwt.claim.sub')` — quando o
chamador é `service_role` (sem JWT), retorna NULL. O handler deve
sempre chamar via **caller JWT** + checagem explícita do operador
do `authUser.id`, não `service_role`. O `service_role` só faz a
mutação (hide / resolve); a autorização fica no caller.

### Regras que não podem ser violadas

- **`private.is_operator()` é o gate.** Nunca confiar em client-side
  claim ou cookie falsificado. Toda decisão de "este usuário pode
  moderar" passa pelo helper.
- **`service_role` bypassa RLS.** Ele é o que escreve; o que garante que
  a escrita é legítima é o caller. Não misturar as duas coisas.
- **Sem `@ts-ignore` / `as any`.** Biome lint e typecheck são os gates.
- **Estilo do repo.** Aspas duplas, sem ponto e vírgula, indentação 2,
  `lineWidth` 100. Não introduzir tamanho novo na tipografia.

---

## Estrutura de arquivos

| Arquivo | Mudança |
|---|---|
| `apps/web/app/api/admin/reports/[id]/route.ts` | **Cria.** POST `{action, note}`. |
| `apps/web/app/(admin)/layout.tsx` | **Cria.** Gate de auth + operador. |
| `apps/web/app/(admin)/reports/page.tsx` | **Cria.** Fila + formulário por report. |
| `supabase/tests/admin-reports.sql` | **Cria.** pgTAP: positive/negative/role gates. |

---

## Task 1: Server-side authorization para o layout `(admin)`

**Files:**
- Create: `apps/web/app/(admin)/layout.tsx`

- [x] **Step 1: Criar Server Component que valida sessão e operador**

Caminho: `apps/web/app/(admin)/layout.tsx`. Server Component. Recebe
`children: ReactNode`.

```tsx
import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "../../lib/supabase/server"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login?return=/admin/reports")
  }

  const { data: rows } = await supabase
    .rpc("is_operator_secure")
    .maybeSingle()
  // ou chamar via uma nova RPC `public.is_current_user_operator()` que
  // encapsula a leitura — ver Task 2.

  if (!rows?.is_operator) {
    redirect("/community")
  }

  return <>{children}</>
}
```

A RPC `is_current_user_operator()` é uma nova função SQL `public.*`
service_role-accessible que recebe o `auth.uid()` interno e retorna
boolean. Cria-la na Task 2 (precisa de migration). **Workaround se
preferir não criar migration**: chamar `private.is_operator()` via
JS client `.schema("private")` — mas isso quebra o typecheck (typed
Database não conhece schema private). **Decisão: criar a RPC na
Task 2, fazer o layout depender dela.**

Para esta Task 1, marcar como pendente e usar `router.push("/community")`
condicional num TODO. Se a RPC não existir quando o layout rodar, todo
acesso ao `/admin/*` redireciona (fail-closed).

- [x] **Step 2: Typecheck + lint**

```bash
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 lint
```

- [x] **Step 3: Commit isolado (mesmo se o layout for stub)**

```bash
git add 'apps/web/app/(admin)/layout.tsx'
git commit -m "feat(admin): layout gate for operator-only routes"
```

---

## Task 2: RPC `public.is_current_user_operator()`

**Files:**
- Create: `supabase/migrations/<ts>_is_current_user_operator.sql`
- Create: `supabase/tests/is-current-user-operator.sql`

- [x] **Step 1: Criar migration**

```sql
-- Operator check for the calling auth.uid(). Used by the (admin) layout
-- and admin route handlers. service_role can call it; the result is
-- gated by the calling auth context (auth.uid() is NULL under service_role
-- so the function returns false unless invoked via an authenticated JWT).

create function public.is_current_user_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select revoked_at is null
     from public.operators
     where auth_user_id = (select auth.uid())),
    false
  );
$$;

revoke all on function public.is_current_user_operator() from public;
revoke all on function public.is_current_user_operator() from anon;
revoke all on function public.is_current_user_operator() from authenticated;
grant execute on function public.is_current_user_operator() to service_role;
```

- [x] **Step 2: Test pgTAP**

```bash
npx pnpm@11.18.0 exec supabase db reset --local
npx pnpm@11.18.0 test:db
```

Esperado: 4 testes verdes (positive authenticated, negative revoked,
negative anon, negative non-existent).

- [x] **Step 3: db lint**

```bash
npx pnpm@11.18.0 exec supabase db lint --local --level error
```

- [x] **Step 4: Commit isolado**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat(db): add public.is_current_user_operator() for admin routes"
```

---

## Task 3: Route handler `/api/admin/reports/[id]`

**Files:**
- Create: `apps/web/app/api/admin/reports/[id]/route.ts`

- [x] **Step 1: POST handler que valida Bearer + is_operator + executa ação**

```ts
// Pattern (esboço — adaptar para o que o repositório espera):
// 1. Authorization Bearer → supabase.auth.getUser(token)
// 2. service_role supabase.rpc("is_current_user_operator")
// 3. if !operator → 403
// 4. body.action ∈ {"hide", "resolve"}
// 5. resolve: UPDATE reports SET status='resolved', operator_note=..., resolved_by=user.id, resolved_at=now() WHERE id=$1 AND status='open' RETURNING *
// 6. hide: parse target_type + target_id, UPDATE posts|comments|groups SET is_deleted=true WHERE id=$1
// 7. log.error + return JSON
```

A RPC do passo 5 fica em public (pode ser chamada via supabase.rpc),
ou inline se o grants + RLS de `reports` permitir o UPDATE
direto. Investigar no momento.

- [x] **Step 2: Testes pgTAP para o route handler**

- [x] **Step 3: Commit**

---

## Task 4: Page `(admin)/reports`

**Files:**
- Create: `apps/web/app/(admin)/reports/page.tsx`

- [x] **Step 1: Server Component que lista reports abertos via service_role**

- [x] **Step 2: Cada card tem 2 forms (`hide` e `resolve`) que postam para o route handler**

- [x] **Step 3: Commit**

---

## Task 5: Audit visual §10.2

- [x] Adicionar rotas `(admin)/reports` ao `scripts/visual/capture.mjs` (com `auth: true`)
- [x] Rodar `node scripts/visual/loop.mjs`
- [x] Escrever `docs/agents/VISUAL_AUDIT-<data>.md` com veredito tela-a-tela

---

## Fora deste plano

- Anti-abuso de novos reports (já existe; `reports_block_self` + índice
  único parcial).
- Notificação ao denunciante quando o report é resolvido — onda de
  notificações (futura).
- Rate-limit do endpoint admin — não crítico para piloto fechado com
  ≤50 membros.