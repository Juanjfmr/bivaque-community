# Preauth robustness — Implementation Plan

> **Para quem executa (humano ou agente):** este plano é autocontido e não
> depende de nenhuma ferramenta específica. Execute **uma task por vez**, na
> ordem. Marque os checkboxes (`- [ ]`) conforme avança.
>
> Regra de parada: se um step de verificação não produzir a saída esperada,
> **pare e investigue** antes de seguir.

**Goal:** Fechar o ciclo de robustez do preauth. Hoje as rotas em
`(preauth)/` renderizam sem `error.tsx`/`loading.tsx`/`not-found.tsx` —
um throw na render ou um redirect para uma rota inexistente dentro
de `(preauth)/` cai em erro genérico do Next.js ou em página em
branco, sem o skeleton do design system. O `(shell)/` já tem o
pattern completo; este plano replica para `(preauth)/`.

**Architecture:** Camada de apresentação pura, **sem migration**.
Os componentes `SegmentError`/`SegmentLoading`/`SegmentNotFound` já
existem em `apps/web/app/components/bivaque/segment-fallbacks.tsx` e
são reusados pelo `(shell)/`. Esta onda apenas cria 9 arquivos
pequenos (3 rotas × 3 arquivos) que importam o componente certo para
o tipo de fallback.

**Subdivisões resolvidas (per MAP §4):**
- **1f** — Rotas em `(preauth)/` (login, consent, onboarding) sem
  `error.tsx`/`loading.tsx`/`not-found.tsx`. O shell layout
  bloqueia rota protegida e o preauth layout não tem o pattern.

**Tech Stack:** Next.js 16 App Router conventions (error.tsx
recebe `error` + `reset` props; loading.tsx/not-found.tsx recebem
nada; todos exportam `default`).

**Fontes:**
- [`docs/journeys/MAP.md`](../journeys/MAP.md) §4 linha 1f, §10.1
  (Onda 6).
- `apps/web/app/(shell)/community/{error,loading,not-found}.tsx` —
  pattern de referência.
- `apps/web/app/components/bivaque/segment-fallbacks.tsx` — os
  componentes compartilhados.

---

## Contexto obrigatório antes de começar

### Ciclo de trabalho

```bash
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 lint
```

Sem `db:reset` aqui — esta onda não toca schema. Cycle é só type/lint.

### Falsos positivos conhecidos

**1. `database.generated.ts` em UTF-16.** Pré-existente. typecheck
vermelho no `database.generated.ts(5,60)` é conhecido, não regressão.

**2. `SegmentError` requer `"use client"`.** `loading.tsx` e
`not-found.tsx` são Server Components (sem directive). O exemplo
em `(shell)/community/` segue esse pattern — copiar literalmente.

---

## Estrutura de arquivos

| Arquivo | Mudança |
|---|---|
| `apps/web/app/(preauth)/login/error.tsx` | **Cria.** |
| `apps/web/app/(preauth)/login/loading.tsx` | **Cria.** |
| `apps/web/app/(preauth)/login/not-found.tsx` | **Cria.** |
| `apps/web/app/(preauth)/consent/error.tsx` | **Cria.** |
| `apps/web/app/(preauth)/consent/loading.tsx` | **Cria.** |
| `apps/web/app/(preauth)/consent/not-found.tsx` | **Cria.** |
| `apps/web/app/(preauth)/onboarding/error.tsx` | **Cria.** |
| `apps/web/app/(preauth)/onboarding/loading.tsx` | **Cria.** |
| `apps/web/app/(preauth)/onboarding/not-found.tsx` | **Cria.** |

---

## Task 1: error.tsx em `/login`, `/consent`, `/onboarding`

**Files:**
- Create: 3 files

- [ ] **Step 1: Criar `(preauth)/login/error.tsx`**

```tsx
"use client"

import { SegmentError } from "../../components/bivaque/segment-fallbacks"

export default function SegmentErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SegmentError onRetry={reset} />
}
```

- [ ] **Step 2: Criar `(preauth)/consent/error.tsx`** — idêntico, mesmo
  import path.

- [ ] **Step 3: Criar `(preauth)/onboarding/error.tsx`** — idêntico,
  com import path um nível acima: `../../../components/...`

- [ ] **Step 4: Typecheck + lint**

```bash
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 lint
```

- [ ] **Step 5: Commit**

```bash
git add 'apps/web/app/(preauth)/login/error.tsx' \
        'apps/web/app/(preauth)/consent/error.tsx' \
        'apps/web/app/(preauth)/onboarding/error.tsx'
git commit -m "feat(preauth): error boundary on login, consent, onboarding"
```

---

## Task 2: loading.tsx em `/login`, `/consent`, `/onboarding`

**Files:**
- Create: 3 files

- [ ] **Step 1: Criar `(preauth)/login/loading.tsx`**

```tsx
import { SegmentLoading } from "../../components/bivaque/segment-fallbacks"

export default function Loading() {
  return <SegmentLoading />
}
```

- [ ] **Step 2: Criar `(preauth)/consent/loading.tsx`** — idêntico.

- [ ] **Step 3: Criar `(preauth)/onboarding/loading.tsx`** — idêntico,
  com import path um nível acima.

- [ ] **Step 4: Typecheck + lint + commit**

```bash
git add 'apps/web/app/(preauth)/login/loading.tsx' \
        'apps/web/app/(preauth)/consent/loading.tsx' \
        'apps/web/app/(preauth)/onboarding/loading.tsx'
git commit -m "feat(preauth): loading state on login, consent, onboarding"
```

---

## Task 3: not-found.tsx em `/login`, `/consent`, `/onboarding`

**Files:**
- Create: 3 files

- [ ] **Step 1: Criar `(preauth)/login/not-found.tsx`**

```tsx
import { SegmentNotFound } from "../../components/bivaque/segment-fallbacks"

export default function NotFound() {
  return <SegmentNotFound />
}
```

- [ ] **Step 2: Criar `(preauth)/consent/not-found.tsx`** — idêntico.

- [ ] **Step 3: Criar `(preauth)/onboarding/not-found.tsx`** — idêntico,
  com import path um nível acima.

- [ ] **Step 4: Typecheck + lint + commit**

```bash
git add 'apps/web/app/(preauth)/login/not-found.tsx' \
        'apps/web/app/(preauth)/consent/not-found.tsx' \
        'apps/web/app/(preauth)/onboarding/not-found.tsx'
git commit -m "feat(preauth): not-found page on login, consent, onboarding"
```

---

## Task 4: Audit visual §10.2

- [ ] Adicionar as 3 rotas em `scripts/visual/capture.mjs`
  (com `auth: false` — preauth é público).
- [ ] Rodar `node scripts/visual/loop.mjs`.
- [ ] Escrever `docs/agents/VISUAL_AUDIT-<data>-preauth.md` com
  veredito por tela.

---

## Fora deste plano

- Substituir o conteúdo de `SegmentError`/`SegmentLoading`/
  `SegmentNotFound` — fora do escopo desta onda, que é só replicar
  o pattern.
- Aplicar o mesmo pattern em `(preauth)/onboarding/status/` e
  `(preauth)/onboarding/welcome/` — essas rotas são acessíveis só com
  sessão, não são "preauth públicas", e o capture.mjs trata
  `auth: true`.