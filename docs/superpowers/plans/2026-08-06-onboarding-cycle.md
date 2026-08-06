# Onboarding cycle — Implementation Plan

> **Para quem executa (humano ou agente):** este plano é autocontido e não
> depende de nenhuma ferramenta específica. Execute **uma task por vez**, na
> ordem. Marque os checkboxes (`- [ ]`) conforme avança.
>
> Regra de parada: se um step de verificação não produzir a saída esperada,
> **pare e investigue** antes de seguir.

**Goal:** Fechar o ciclo de admissão do titular (MAP.md §10.1 Onda 2, §8
Jornada crítica #1). Hoje três caminhos de entrada terminam sem canal:
`pending` mostra "verificação pendente" e para; `waitlist` (candidatura a
outras localidades) mostra "pedido enviado" e para; `verified` empurra
direto para `/community` sem boas-vindas. Em qualquer um deles o produto
fica mudo para o titular que está nele.

**Architecture:** Camada de aplicação, sem schema. Server-side route handler
em `apps/web/app/api/onboarding/status/route.ts` lê `private.verification_outcomes`
via `service_role` (o schema `private` não é exposto pela Data API — `[C2]`).
A página `/onboarding/page.tsx` deixa de empurrar o usuário para `done`
mudo: no boot, lê o status real e roteia para um dos três caminhos
(caneta de boas-vindas, tela de status pendente, tela de status
rejeitado). `[C5]` Mensagens de waitlist nunca prometem posição de fila:
a tabela `waitlist` só guarda `email`, e §5.1 do MAP já estabelece que
waitlist é candidatura a outras localidades.

**Subdivisões resolvidas:**
- **1a** — Tela de boas-vindas após verify OK com primeira ação sugerida.
- **1b** — waitlist honesta (sem número de posição, com canal de
  reconsideração se a expansão abrir Manaus).
- **1c** — Tela de status `pending` com canal explícito e prazo médio.
- **1e (parcial)** — Toast em vez de `router.push("/login")` silencioso nos
  três handlers que verificam sessão; estado do formulário preservado
  via `sessionStorage` para o caminho verify-CPF.

**Subdivisões explicitamente fora desta onda (mesmo parente):**
- **1f** — `error.tsx`/`loading.tsx`/`not-found.tsx` em `(preauth)/` é a
  Onda 6 inteira (MAP §10.1).

**Tech Stack:** Next.js 16 server runtime, HeroUI v3, `createServerClient()`
em `apps/web/lib/supabase/server.ts` (já existente, usa
`SUPABASE_SERVICE_ROLE_KEY`), cookies Supabase via `@supabase/ssr`
para identificar o titular no handler. Sem migration nova, sem
dependência externa.

**Fontes:**
- [`docs/journeys/MAP.md`](../journeys/MAP.md) §0.1 `[C2]` e `[C5]`, §5.1,
  §8 (Jornada crítica #1), §10.1 (Onda 2).
- `apps/web/app/(preauth)/onboarding/page.tsx` — estado atual.
- `apps/web/lib/onboarding/verifyAndProvision.ts` — fluxo server-side
  atual que vai ganhar um endpoint de leitura-irmão.
- `supabase/migrations/20260802000200_private_trust_family_foundation.sql`
  — formato da tabela `private.verification_outcomes` (status, checked_at,
  updated_at, eligibility_class).
- `apps/web/app/components/bivaque/toast.tsx` — provider global, mounted
  no shell layout, helper `toast.warning()` reutilizável.

---

## Contexto obrigatório antes de começar

### Ciclo de trabalho

```bash
npx pnpm@11.18.0 typecheck   # gate antes de commit
npx pnpm@11.18.0 lint        # biome check .
npx pnpm@11.18.0 test        # test:unit + test:scope
npx pnpm@11.18.0 test:e2e    # playwright (depois da Task 3, que toca UI)
```

Sem `db:reset` aqui — esta onda não toca schema. O cycle é só type/lint/test.

### Falsos positivos conhecidos

**1. `database.generated.ts` está em UTF-16 LE.** Pré-existente no
repositório (commit `5d0dc62`). Typecheck falha ao parsear a primeira
linha do `database.generated.ts`. Aparece como `apps/web typecheck:
../../supabase/database.generated.ts(5,60): error TS1434`. Confirmado
em main limpo. **Não** é regressão desta onda — `pnpm typecheck` continua
vermelho do mesmo jeito. Não toque.

**2. `ToastProvider` precisa estar montado.** Já está em
`apps/web/app/(shell)/layout.tsx`. Se uma Task refatorar esse layout e
remover o provider, `toast.warning()` cai no vazio (era o bug que fez
esses helpers ficarem dormindo por meses). Preserve o provider.

**3. `private.verification_outcomes` é inacessível pelo cliente.**
`authenticated` não tem privilégio de SELECT nessa tabela. Toda leitura
dela acontece via `service_role` no route handler. Logs do Next vão
mostrar `permission denied` se um teste usar `createBrowserClient()`
para consultar diretamente — o teste está errado, não o schema.

### Regras que não podem ser violadas

- **Não inventar posição de fila.** Mensagens para `waitlist` dizem
  "estamos expandindo", não "sua vez está próxima".
- **Sem `as any`, `@ts-ignore`.** Biome lint está em zero (style) e typecheck
  é o gate real. Tipos têm que fechar.
- **Token-driven, não cookie-driven.** O route handler usa o cookie
  Supabase (vindo do `@supabase/ssr`) para identificar `auth.uid()`;
  nunca confiar em `userId` enviado pelo browser.
- **`set search_path = ''` em qualquer helper novo em `private`.** Esta onda
  não cria helper nenhum (só lê via service_role no Next), mas é a
  convenção. Se a Task 1 terminar precisando de um helper SQL, ele
  segue a regra.

---

## Estrutura de arquivos

| Arquivo | Mudança |
|---|---|
| `apps/web/app/api/onboarding/status/route.ts` | **Cria.** GET server-side. |
| `apps/web/app/(preauth)/onboarding/page.tsx` | Modifica boot logic + 3 handlers para toast. |
| `apps/web/app/(preauth)/onboarding/status/page.tsx` | **Cria.** Tela `pending` / `rejected`. |
| `apps/web/app/(preauth)/onboarding/welcome/page.tsx` | **Cria.** Tela pós-verify. |
| `tests/e2e/onboarding-cycle.spec.ts` | **Cria.** Smoke Playwright. |

---

## Task 1: Ler o status real do titular

**Files:**
- Create: `apps/web/app/api/onboarding/status/route.ts`

- [ ] **Step 1: Criar o arquivo**

Caminho completo: `apps/web/app/api/onboarding/status/route.ts`. Export
`GET` que:

1. Lê cookies Supabase via `createServerClient()` (já existente em
   `apps/web/lib/supabase/server.ts`).
2. Se não há sessão: responde 401 com corpo `{ error: "unauthenticated" }`.
3. Se há sessão: faz `createServerClient()` (a que usa `service_role`)
   e consulta `private.verification_outcomes` filtrando por
   `user_id = (select auth.uid())`. Lê também
   `public.locality_memberships` para saber se já é membro.
4. Responde 200 com:
   ```ts
   {
     status: "verified" | "pending" | "rejected",
     checked_at: string | null,   // ISO
     updated_at: string | null,   // ISO
     eligibility_class: string | null,
     localityMember: boolean,
   }
   ```
   Se não há linha em `private.verification_outcomes`, responde
   `{ status: null, localityMember: false }`.

O acesso a `private.verification_outcomes` pelo `service_role` é
trivial: a role tem ALL na tabela (migration `003`).

- [ ] **Step 2: Garantir tipagem**

```ts
import "server-only"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createServerClient as createAnon } from "@supabase/ssr"  // ou o wrapper que o projeto já usa
import { createServerClient } from "@/lib/supabase/server"
```

(Adapte conforme o padrão do repo. Olhe `apps/web/app/api/onboarding/route.ts`
existente — se houver — para ver como autentica hoje.)

- [ ] **Step 3: Testar manualmente**

```bash
# Stack deve estar UP.
npx pnpm@11.18.0 exec supabase start
# Em outro shell, com cookies de um usuário real do stack local:
curl -i http://localhost:3000/api/onboarding/status -b "$(cat .cookiejar)"
```

Esperado: 401 sem cookie; 200 com `{ status: null }` para usuário que
ainda não verificou; 200 com `{ status: "pending" }` para quem está na fila.

- [ ] **Step 4: Typecheck + lint**

```bash
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 lint
```

Esperado: nenhum erro novo. O erro pré-existente em
`database.generated.ts` continua — não é regressão.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/onboarding/status/route.ts
git commit -m "feat(onboarding): server-side endpoint reading verification status"
```

---

## Task 2: Boot logic do `/onboarding`

**Files:**
- Modify: `apps/web/app/(preauth)/onboarding/page.tsx`

- [ ] **Step 1: No `useEffect` de boot, após `checkSession`, fazer
  `fetch('/api/onboarding/status')` e rotear**

- Se `status === "verified"` ou `localityMember === true`: `router.replace("/community")`.
- Se `status === "pending"`: `router.replace("/onboarding/status?state=pending")`.
- Se `status === "rejected"`: `router.replace("/onboarding/status?state=rejected")`.
- Se `status === null`: manter o fluxo atual (form de CPF).

- [ ] **Step 2: Substituir `router.push("/login")` silencioso por
  `toast.warning(...)` + preservação de estado**

Três lugares: `handleVerifyCpf`, `handleAcceptFamilyInvite`,
`handleJoinWaitlist`. Cada um:

```ts
toast.warning("Sua sessão expirou. Vamos levar você de volta ao login.")
sessionStorage.setItem("onboarding:cpf", cpf)  // ou familyToken, ou email
router.push("/login?return=/onboarding")
```

- [ ] **Step 3: No fluxo `verify-cpf` (`handleVerifyCpf`), quando o
  outcome volta `pending`, NÃO chamar `router.push("/community")` —
  ir para `/onboarding/status?state=pending`**

- [ ] **Step 4: Typecheck + lint + manual**

```bash
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 lint
# Manual: login fresh → /onboarding → verify → deve cair em /onboarding/status
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(preauth\)/onboarding/page.tsx
git commit -m "feat(onboarding): route by real status; replace silent login with toast"
```

---

## Task 3: Tela `/onboarding/status`

**Files:**
- Create: `apps/web/app/(preauth)/onboarding/status/page.tsx`

- [ ] **Step 1: Server Component que lê `searchParams.state`**

Renderiza duas variantes: `pending` e `rejected`. Conteúdo vem do
`private.verification_outcomes` via fetch do próprio endpoint
(cuidado: Server Component pode ler diretamente via service_role — mais
limpo que fetch de Server Component para si mesmo).

- [ ] **Step 2: Layout**

- Pending: hero "Sua verificação está em andamento", texto "Prazo
  médio: 24h em dias úteis", link de suporte (mailto:bivaque@…).
- Rejected: hero "Você não atende aos critérios de Manaus neste
  momento", texto sobre candidatura a outras localidades, link de
  reconsideração. **Sem número de fila.**
- Em ambos: CTA secundário "Sair" que faz `signOut()`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(preauth\)/onboarding/status/page.tsx
git commit -m "feat(onboarding): status screen with explicit channel for pending and rejected"
```

---

## Task 4: Tela `/onboarding/welcome`

**Files:**
- Create: `apps/web/app/(preauth)/onboarding/welcome/page.tsx`

- [ ] **Step 1: Server Component, primeira ação sugerida**

Render: hero "Bem-vindo à comunidade de Manaus", três cards de ação:
"Entrar em um grupo público", "Ver recomendações", "Completar perfil"
(completa perfil é parte da Onda 4 — se ainda não implementada, link
para `/profile` em vez de CTA novo).

- [ ] **Step 2: CTA primário "Ir para a comunidade" → `/community`**

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(preauth\)/onboarding/welcome/page.tsx
git commit -m "feat(onboarding): welcome screen with three first-action suggestions"
```

---

## Task 5: Atualizar `handleVerifyCpf` para rotear pós-success

**Files:**
- Modify: `apps/web/app/(preauth)/onboarding/page.tsx`

- [ ] **Step 1: Quando `data.localityMember === true`, chamar
  `router.push("/onboarding/welcome")` em vez de `/community`**

- [ ] **Step 2: Commit (junto com a Task 4 ou separado, decisão do executor)**

---

## Task 6: Testes E2E + auditoria visual

**Files:**
- Create: `tests/e2e/onboarding-cycle.spec.ts`

- [ ] **Step 1: Smoke Playwright cobrindo os 4 caminhos**

- Login fresh → /onboarding → verify CPF válido → cai em /onboarding/welcome.
- Logout → login → /onboarding → verify CPF rejeitado (stub do Portal da
  Transparência com fixture `rejected`) → cai em /onboarding/status?state=rejected.
- Mesmo cenário, status=pending (stub do Portal com fixture `pending`).
- Sessão expirada durante verify → toast aparece, formulário preservado.

- [ ] **Step 2: Rodar auditoria visual nas novas telas**

```bash
node scripts/visual/loop.mjs --fast
```

Critério §9 do `VISUAL_GUIDE.md`. Sem achados mecânicos novos.

- [ ] **Step 3: CI gates verdes**

```bash
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 test
npx pnpm@11.18.0 test:e2e
```

- [ ] **Step 4: Atualizar MAP.md**

Marcar 1a, 1b, 1c, 1e como Corrigidas na matriz §4 e atualizar §10.1
para marcar a Onda 2 como concluída.

---

## Fora deste plano

- Onboarding de família (3a/3b) — depende da Onda 3, ainda em aberto.
- Profile setup (2e) — Onda 4.
- Hardening do `private.verification_outcomes` (expor nada a `authenticated`)
  — já está assim por design (migration 002), nada a fazer aqui.
- Audit task (rubrica item 4, 8) — Phase 3 da auditoria visual, plano
  separado.