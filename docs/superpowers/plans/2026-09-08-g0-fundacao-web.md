# G0 — Fundação web (navegação + telas de fundação) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Split ownership:** Tasks 1–3 e 8 são do **Claude** (mudança de contrato, roteamento, fechamento). Tasks 4–7 são contratos `RECON-*` executados pelo **qwen3.8-flash via `opencode run`**, com o Claude revisando o diff em loop.

**Goal:** Trocar a navegação do shell web para Início / Explorar / Comunidades / Perfil e entregar as telas de fundação (`01-web-inicio`, `61-web-explorar-servicos`, `60-web-estados`) mais uma página interna de demonstração de componentes.

**Architecture:** A navegação do membro é definida por `NAV_ITEMS` em `bottom-nav.tsx` e consumida também pela sidebar desktop em `app-shell.tsx`. A troca de containers é uma **mudança de contrato deliberada**: o scope test `tests/scope/navigation.test.mjs` e `DESIGN_SYSTEM.md §7.1` fixam o conjunto atual e são atualizados na mesma unidade. Duas rotas novas (`/inicio`, `/explorar`) são criadas pelo Claude como scaffold de framework; o conteúdo visual das pranchas é preenchido pelo qwen dentro do corpo dos `page.tsx`. As rotas antigas (`/localidade`, `/community`, `/groups`) continuam acessíveis — G0 não as remove nem redesenha; isso é dos grupos G2/G3.

**Tech Stack:** Next.js 16.3.x (App Router, server runtime), React 19, HeroUI v3, Tailwind 4, Biome 2.5.6, Vitest + `node:test`, Playwright. Supabase não é tocado neste grupo.

## Global Constraints

Todo task herda estas regras. Valores copiados literalmente do spec e dos `AGENTS.md`.

- **pnpm:** sempre `npx pnpm@11.18.0 <script>`. `pnpm`/`corepack` não estão no PATH. Node >= 22.
- **Gate:** `npx pnpm@11.18.0 gate --fast` (lint + typecheck) no loop de edição; `npx pnpm@11.18.0 gate` completo (lint → typecheck → test → secrets) antes de qualquer commit. Vermelho para tudo.
- **Biome:** aspas duplas, **sem ponto-e-vírgula**, indent 2 espaços, lineWidth 100. `noExplicitAny`, `noNonNullAssertion`, `noParameterAssign`, `useImportType` são **erros**.
- **Next.js 16.3.x:** runtime de servidor; `output: "export"` é proibido (scope test). Antes de usar qualquer API de framework, ler o doc correspondente em `apps/web/node_modules/next/dist/docs/01-app/` (16.3 tem breaking changes vs. treino).
- **Componentes:** HeroUI v3 é a única biblioteca. Não adicionar shadcn/Radix/Headless UI. Nunca importar HeroUI direto onde já existe wrapper em `apps/web/app/components/bivaque/` (`Card`, `Skeleton`, `EmptyState`, `ErrorState`, `FeedbackAlert`, `MemberAvatar`, `PageHeader`, `ToastProvider`/`showToast`, `SegmentLoading`/`SegmentError`/`SegmentNotFound`).
- **Cor:** deriva de `packages/tokens` — classes utilitárias de token (`bg-[var(--semantic-surface)]`, `text-muted`, `border-border`) ou `var(--semantic-*)`. Cor crua em JSX, `style` inline ou classe Tailwind de paleta (`bg-green-700`, `text-slate-500`) = **defeito**, quebra a auditoria `token-discipline`.
- **Navegação:** teto de **5 itens** (iOS HIG / Material). Regra falsificável do `ADR-20260816-shells-e-navegacao`: todo destino novo aterrissa **dentro** de um container, nunca como aba nova. Rótulos-alvo exatos: **Início / Explorar / Comunidades / Perfil** (PROCESSO-DE-CONSTRUCAO §7).
- **Estados de superfície assíncrona:** distinguir deliberadamente loading / vazio verdadeiro / negado-ou-indisponível / erro recuperável / populado com sucesso. Query que falha renderizada como lista vazia é bug, não empty state.
- **Fora de escopo do qwen (herdado por todo `RECON-*`):** autorização no servidor, `supabase/**`, `*.sql`, RPC, policy, migração, esquema de confiança, regra de visibilidade; campo/validação/mensagem de recusa que decide quem entra; prometer aprovação/prazo/SLA; ecoar identificador de formulário; família tipográfica/lib de componentes/modo escuro novos; baixar limite de teste existente; usar dado ilustrativo da prancha (datas, contadores, nomes, fotos) como fixture real.
- **`opencode run` (Tasks 4–7):** `opencode run "<mensagem>" --auto --dir "C:\Users\juana\bivaque-community" -m alibaba-token-plan/qwen3.8-flash -f "<caminho/prancha.png>"`. A **mensagem vem antes** do `-f` (yargs consome array). Continuar sessão: `-s <session-id>`. `retry_budget` = 3 por contrato; esgotado vira `HUMAN_DECISION`, nunca `PASS`.
- **Commits:** convencionais (`feat/fix/chore/docs(scope): …`), um por task, na branch `work/apos-entrada-visual`. Sem trailer `Co-Authored-By` (convenção do repo, sem `.claude/settings.json`).
- **Antes da admissão:** nenhuma tela nova mostra navegação de membro, conteúdo privado ou sucesso de participação.

---

## File Structure

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/app/(shell)/inicio/page.tsx` | Home de quem participa (prancha 01). Server component fino que compõe wrappers |
| `apps/web/app/(shell)/inicio/loading.tsx` | Fallback de segmento (`SegmentLoading`) |
| `apps/web/app/(shell)/inicio/error.tsx` | Fallback de segmento (`SegmentError`) |
| `apps/web/app/(shell)/inicio/not-found.tsx` | Fallback de segmento (`SegmentNotFound`) |
| `apps/web/app/(shell)/explorar/page.tsx` | Explorar + busca de serviços + entradas de Guia e Mercado (prancha 61) |
| `apps/web/app/(shell)/explorar/loading.tsx` | Fallback de segmento |
| `apps/web/app/(shell)/explorar/error.tsx` | Fallback de segmento |
| `apps/web/app/(shell)/explorar/not-found.tsx` | Fallback de segmento |
| `apps/web/app/dev/componentes/page.tsx` | Galeria de demonstração dos wrappers Bivaque em estados reais; `notFound()` em produção |
| `docs/agents/tasks/RECON-01-INICIO-WEB.task.yml` | Contrato da prancha 01 |
| `docs/agents/tasks/RECON-61-EXPLORAR-WEB.task.yml` | Contrato da prancha 61 |
| `docs/agents/tasks/RECON-60-ESTADOS-WEB.task.yml` | Contrato da prancha 60 |
| `docs/agents/tasks/RECON-DEMO-COMPONENTES-WEB.task.yml` | Contrato da página-demo |
| `docs/agents/VISUAL_AUDIT-2026-09-08-G0.md` | Veredito escrito da auditoria visual do grupo |

**Modificar:**

| Arquivo | Mudança |
|---|---|
| `apps/web/app/components/bivaque/bottom-nav.tsx` | `NAV_ITEMS` → 4 novos ids/hrefs/ícones/labels; comentário do bloco; `fallbackId` |
| `apps/web/app/components/bivaque/app-shell.tsx` | `fallbackId` da sidebar (linhas ~194–197); href do avatar do header já é `/profile` (mantém) |
| `apps/web/app/components/bivaque/segment-fallbacks.tsx` | `SegmentNotFound` href `/community` → `/inicio` e texto |
| `tests/scope/navigation.test.mjs` | Conjunto de ids esperado; comentário citando PROCESSO §7 |
| `docs/agents/DESIGN_SYSTEM.md` | §7.1: lista de containers em crase → `inicio`, `explorar`, `comunidades`, `perfil` |
| `docs/decisions/ADR-20260816-shells-e-navegacao.md` | Nota de supersessão no topo, apontando PROCESSO-DE-CONSTRUCAO §7 |
| `apps/web/proxy.ts` | Linha ~100: redirect de `/` autenticado+consentido → `/inicio` (era `/community`) |
| `tests/e2e/shell-navigation.spec.ts` | Labels e array de hrefs esperados |
| `tests/e2e/nav-container-invariant.spec.ts` | Fallback: `/messages` e `/notifications` ativam "Perfil" (id `perfil`) |
| `scripts/visual/capture.mjs` | Adicionar `/inicio`, `/explorar`, `/dev/componentes` à lista de rotas capturadas (se a lista for estática) |
| `docs/PRODUCT_STATUS.md` | Reconciliação na Task 8 |
| `tools/backend-kanban/*` (via `board.mjs`) | Card `RECON-G0-FUNDACAO-WEB` (criar) e `RECON-AUTH-ENTRADA-WEB` (referência) na Task 8 |

---

## Task 1: Trocar os containers de navegação

**Owner:** Claude.

**Files:**
- Modify: `tests/scope/navigation.test.mjs`
- Modify: `apps/web/app/components/bivaque/bottom-nav.tsx`
- Modify: `apps/web/app/components/bivaque/app-shell.tsx:191-201`
- Modify: `apps/web/app/components/bivaque/segment-fallbacks.tsx:40-52`
- Modify: `docs/agents/DESIGN_SYSTEM.md` (§7.1, ~linhas 345-364)
- Modify: `docs/decisions/ADR-20260816-shells-e-navegacao.md` (topo)

**Interfaces:**
- Produces: `NAV_ITEMS: NavItem[]` com ids exatamente `["inicio", "explorar", "comunidades", "perfil"]`; hrefs `/inicio`, `/explorar`, `/communities`, `/profile`. `NavItem` (interface inalterada). Consumido por `bottom-nav.tsx` (render mobile) e `app-shell.tsx` (sidebar desktop).
- Consumes: nada de tasks anteriores.

- [ ] **Step 1: Atualizar o scope test para o novo contrato (o teste é a task)**

Em `tests/scope/navigation.test.mjs`, trocar o bloco de asserção e o comentário:

```js
// PROCESSO-DE-CONSTRUCAO.md §7 — navegação-alvo da reconstrução 2026-09-06.
// Substitui os quatro containers históricos (cidade/community/groups/me) do
// ADR-20260816. Os novos containers derivam do modelo de produto da versão
// atual: Início (home de quem participa), Explorar (descoberta — inclui Guia
// e Mercado como entradas), Comunidades (minhas + descoberta), Perfil (o
// membro: perfil, conta, notificações, mensagens contextuais).
// (a) NAV_ITEMS tem exatamente esses quatro ids.
// (b) O número de itens respeita o teto de 5 (iOS HIG / Material).
// (c) NAV_ITEMS bate com DESIGN_SYSTEM.md §7.1.
```

```js
test("NAV_ITEMS is exactly the four product-model containers", () => {
  const ids = navItemIds(navSource)
  assert.deepEqual(ids, ["inicio", "explorar", "comunidades", "perfil"])
})
```

Manter o teste `"no top-level nav tab for events, messages or indications"` como está (ainda vale) e **acrescentar** `"groups"` e `"cidade"` à lista `forbidden` desse teste:

```js
  for (const forbidden of ["events", "messages", "indications", "groups", "cidade"]) {
```

Manter `"navigation item count respects the declared ceiling of five"` e `"DESIGN_SYSTEM §7.1 lists the same containers as NAV_ITEMS"` sem mudança de código (passam quando os Steps 2 e 4 fecharem).

- [ ] **Step 2: Rodar o scope test e confirmar que falha**

Run: `npx pnpm@11.18.0 test:scope`
Expected: FAIL em `navigation.test.mjs` — `deepEqual` recebe `["cidade","community","groups","me"]`, esperava `["inicio","explorar","comunidades","perfil"]`; e o cross-check da §7.1 falha para os ids novos.

- [ ] **Step 3: Trocar `NAV_ITEMS` em `bottom-nav.tsx`**

Trocar os imports de ícones (linhas 3–8) para os quatro do novo conjunto:

```tsx
import {
  HomeIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline"
import {
  HomeIcon as HomeSolid,
  MagnifyingGlassIcon as MagnifyingGlassSolid,
  UserCircleIcon as UserCircleSolid,
  UserGroupIcon as UserGroupSolid,
} from "@heroicons/react/24/solid"
```

Substituir o bloco de comentário `// ── Os containers de navegação ──` inteiro (linhas ~23–50) por:

```tsx
// ── Os containers de navegação ──────────────────────────────────────────────
//
// A navegação do shell do membro espelha o MODELO DE PRODUTO da versão de
// 2026-09-06 (docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md §7),
// que substitui os quatro containers históricos do ADR-20260816. São quatro:
//
//   - "inicio"      → home de quem participa: a chegada, o que está acontecendo
//                     na cidade e nas comunidades da pessoa (prancha 01).
//   - "explorar"    → descoberta: busca de serviços e prestadores, com entradas
//                     explícitas para Guia e Mercado (prancha 61).
//   - "comunidades" → minhas comunidades + descoberta + apresentação; grupos
//                     vivem dentro de uma comunidade, não como aba.
//   - "perfil"      → o membro: perfil, conta, notificações e a conversa
//                     contextual membro↔prestador. Não há inbox nem DM geral.
//
// REGRA FALSIFICÁVEL (ADR-20260816, regra 2, preservada): se um destino novo
// não couber em nenhum container, o destino está confuso — pare e reporte;
// NÃO adicione uma aba. Teto de cinco itens; quatro ≤ cinco.
```

Substituir o array `NAV_ITEMS` (linhas ~51–83):

```tsx
export const NAV_ITEMS: NavItem[] = [
  {
    id: "inicio",
    label: "Início",
    shortLabel: "Início",
    href: "/inicio",
    Icon: HomeIcon,
    IconActive: HomeSolid,
  },
  {
    id: "explorar",
    label: "Explorar",
    shortLabel: "Explorar",
    href: "/explorar",
    Icon: MagnifyingGlassIcon,
    IconActive: MagnifyingGlassSolid,
  },
  {
    id: "comunidades",
    label: "Comunidades",
    shortLabel: "Comunidades",
    href: "/communities",
    Icon: UserGroupIcon,
    IconActive: UserGroupSolid,
  },
  {
    id: "perfil",
    label: "Perfil",
    shortLabel: "Perfil",
    href: "/profile",
    Icon: UserCircleIcon,
    IconActive: UserCircleSolid,
  },
]
```

- [ ] **Step 4: Ajustar o `fallbackId` do `bottom-nav.tsx`**

Nas linhas ~117–121, `/messages` e `/notifications` passam a cair em `perfil`; o resto (rotas fora dos containers, ex. `/localidade`, `/community`, `/groups`, `/guide`, `/events`, `/recommendations`) cai em `inicio`:

```tsx
  const fallbackId =
    pathname.startsWith("/messages") || pathname.startsWith("/notifications")
      ? "perfil"
      : "inicio"
```

- [ ] **Step 5: Ajustar o `fallbackId` do `app-shell.tsx`**

Nas linhas ~194–197, mesma troca:

```tsx
              const fallbackId =
                pathname.startsWith("/messages") || pathname.startsWith("/notifications")
                  ? "perfil"
                  : "inicio"
```

- [ ] **Step 6: Corrigir `SegmentNotFound` em `segment-fallbacks.tsx`**

Linhas ~40–52, trocar destino e texto:

```tsx
export function SegmentNotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <EmptyState
        title="Página não encontrada"
        description="O endereço que você acessou não existe."
        action={
          <Link
            href="/inicio"
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium underline"
          >
            Voltar para o início
          </Link>
        }
      />
    </div>
  )
}
```

- [ ] **Step 7: Atualizar `DESIGN_SYSTEM.md` §7.1**

Substituir o primeiro parágrafo da §7.1 (mantendo o segundo parágrafo sobre escopo/Manaus intacto):

```markdown
### 7.1 Shell, escopo e navegação

Navegação primária responde **o que fazer**; escopo responde **onde e com quem**. O membro vê
containers estáveis para `inicio` (Início), `explorar` (Explorar), `comunidades` (Comunidades) e
`perfil` (Perfil); cada rota de detalhe mantém seu pai conceitual em todos os tamanhos. Guia e
vitrine vivem em Explorar; grupos vivem dentro de uma comunidade; conta, notificações e a conversa
contextual membro↔prestador vivem em Perfil. **Não existe inbox nem DM geral entre membros.**
Mensagens só surgem como conversa contextual membro↔prestador, no shell e permissões próprios.
Papéis privilegiados e prestador têm shells próprios. Esta lista substitui os containers históricos
do `ADR-20260816-shells-e-navegacao` por autorização do PROCESSO-DE-CONSTRUCAO §7 (2026-09-06).
```

- [ ] **Step 8: Nota de supersessão no ADR-20260816**

Logo abaixo do cabeçalho / linha de status do `docs/decisions/ADR-20260816-shells-e-navegacao.md`, inserir:

```markdown
> **Supersessão parcial — 2026-09-06.** Os quatro containers nomeados neste ADR
> (`cidade`/`community`/`groups`/`me`) foram substituídos por `inicio`/`explorar`/
> `comunidades`/`perfil` sob autorização do
> [`PROCESSO-DE-CONSTRUCAO.md`](../design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md) §7.
> **A regra 2 (destino novo entra num container, nunca vira aba; teto de cinco;
> regra falsificável) permanece válida e é o motivo de o novo conjunto também
> ter quatro itens.** A mecânica de shells por papel (membro / prestador /
> operador) não muda.
```

- [ ] **Step 9: Rodar o scope test e confirmar que passa**

Run: `npx pnpm@11.18.0 test:scope`
Expected: PASS — `navigation.test.mjs` verde (ids novos, teto ok, §7.1 cruza).

- [ ] **Step 10: Gate rápido**

Run: `npx pnpm@11.18.0 gate --fast`
Expected: lint + typecheck verdes. (Typecheck ainda não reclama de `/inicio` e `/explorar` inexistentes — são strings de href, não imports.)

- [ ] **Step 11: Commit**

```bash
git add tests/scope/navigation.test.mjs apps/web/app/components/bivaque/bottom-nav.tsx apps/web/app/components/bivaque/app-shell.tsx apps/web/app/components/bivaque/segment-fallbacks.tsx docs/agents/DESIGN_SYSTEM.md docs/decisions/ADR-20260816-shells-e-navegacao.md
git commit -m "feat(web): troca os containers de nav para Inicio/Explorar/Comunidades/Perfil

PROCESSO-DE-CONSTRUCAO §7 substitui os quatro containers do ADR-20260816.
Scope test e DESIGN_SYSTEM §7.1 atualizados na mesma unidade; regra
falsificavel do ADR preservada. Rotas /inicio e /explorar entram na Task 2-3."
```

---

## Task 2: Rota `/inicio` e repontar o redirect raiz

**Owner:** Claude.

**Files:**
- Create: `apps/web/app/(shell)/inicio/page.tsx`
- Create: `apps/web/app/(shell)/inicio/loading.tsx`
- Create: `apps/web/app/(shell)/inicio/error.tsx`
- Create: `apps/web/app/(shell)/inicio/not-found.tsx`
- Modify: `apps/web/proxy.ts` (~linha 100)
- Modify: `tests/e2e/shell-navigation.spec.ts` (~linhas 22–43, 135)
- Modify: `tests/e2e/nav-container-invariant.spec.ts` (~linhas 95–120)

**Interfaces:**
- Consumes: `NAV_ITEMS` da Task 1 (href `/inicio` já aponta aqui).
- Produces: rota `/inicio` renderizável dentro de `(shell)` (herda `ShellLayout` → `AppShell`). `page.tsx` exporta `default function InicioPage()`. O corpo visual é preenchido na Task 4 — aqui é **scaffold**.

- [ ] **Step 1: Ler o doc de páginas do Next 16**

Run: `sed -n '1,120p' apps/web/node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` (ou o arquivo equivalente listado em `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/`).
Confirmar a convenção de `page.tsx` (export default), `loading.tsx`, `error.tsx` (`"use client"` + prop `reset`), `not-found.tsx` na versão instalada. Não presumir da memória.

- [ ] **Step 2: Criar o scaffold da página**

`apps/web/app/(shell)/inicio/page.tsx`:

```tsx
import { PageHeader } from "../../components/bivaque/page-header"

export default function InicioPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <PageHeader title="Início" />
      <p className="text-muted text-sm">
        Home de quem participa. Conteúdo em construção (prancha 01).
      </p>
    </div>
  )
}
```

> Se `PageHeader` exigir props além de `title`, checar `apps/web/app/components/bivaque/page-header.tsx` e passar o mínimo. Se não existir, usar um `<h1 className="text-2xl font-semibold">Início</h1>` — a Task 4 substitui o corpo inteiro.

- [ ] **Step 3: Criar os fallbacks de segmento**

`apps/web/app/(shell)/inicio/loading.tsx`:

```tsx
import { SegmentLoading } from "../../components/bivaque/segment-fallbacks"

export default function Loading() {
  return <SegmentLoading />
}
```

`apps/web/app/(shell)/inicio/error.tsx`:

```tsx
"use client"

import { SegmentError } from "../../components/bivaque/segment-fallbacks"

export default function Error({ reset }: { error: unknown; reset: () => void }) {
  return <SegmentError onRetry={reset} />
}
```

`apps/web/app/(shell)/inicio/not-found.tsx`:

```tsx
import { SegmentNotFound } from "../../components/bivaque/segment-fallbacks"

export default function NotFound() {
  return <SegmentNotFound />
}
```

> Conferir contra um par existente (`apps/web/app/(shell)/community/error.tsx` etc.) e **copiar a assinatura exata** que já passa no typecheck neste repo — se o `error.tsx` de `community` tipa `error: Error & { digest?: string }`, usar igual.

- [ ] **Step 4: Repontar o redirect raiz em `proxy.ts`**

Linha ~100, trocar o destino do usuário autenticado com consentimento:

```ts
    return NextResponse.redirect(new URL(hasConsent ? "/inicio" : "/onboarding", request.url))
```

- [ ] **Step 5: Atualizar `tests/e2e/shell-navigation.spec.ts`**

Trocar os labels esperados (linhas ~22–43) de `["Cidade", "Comunidade", "Grupos", "Eu"]` para `["Início", "Explorar", "Comunidades", "Perfil"]` e o array de hrefs (linha ~135) de `["/localidade", "/community", "/groups", "/profile"]` para `["/inicio", "/explorar", "/communities", "/profile"]`. Ajustar qualquer asserção de `aria-current`/rota ativa que dependa de `/community` ser a home.

- [ ] **Step 6: Atualizar `tests/e2e/nav-container-invariant.spec.ts`**

Onde asserta que `/messages` e `/notifications` ativam o container "Eu"/"Comunidade" (linhas ~95–120), trocar para o container **"Perfil"** (id `perfil`).

- [ ] **Step 7: Typecheck + lint**

Run: `npx pnpm@11.18.0 gate --fast`
Expected: verde. `/inicio` resolve como rota; imports dos fallbacks batem.

- [ ] **Step 8: Prova de runtime da navegação (browser)**

Subir o dev server e verificar no navegador (Browser pane / `scripts/visual/loop.mjs --fast` contra dev server já rodando):
- `/inicio` renderiza dentro do shell (header + sidebar/bottom-nav visíveis).
- Bottom-nav a 375px mostra Início / Explorar / Comunidades / Perfil, nessa ordem, e Início fica `aria-current="page"` em `/inicio`.
- `/` autenticado+consentido redireciona para `/inicio` (checar `read_network_requests` ou o location final).
- Nenhum link morto: clicar Comunidades vai a `/communities`, Perfil a `/profile`.

Registrar a evidência (screenshot 375 + 1440) para a Task 8.

- [ ] **Step 9: Commit**

```bash
git add "apps/web/app/(shell)/inicio" apps/web/proxy.ts tests/e2e/shell-navigation.spec.ts tests/e2e/nav-container-invariant.spec.ts
git commit -m "feat(web): rota /inicio e redirect raiz autenticado para /inicio

Scaffold da home de quem participa dentro do (shell); proxy passa a
mandar o membro consentido para /inicio. Specs E2E de navegacao
realinhados aos novos containers e hrefs. Corpo visual da prancha 01
entra na Task 4."
```

---

## Task 3: Rota `/explorar`

**Owner:** Claude.

**Files:**
- Create: `apps/web/app/(shell)/explorar/page.tsx`
- Create: `apps/web/app/(shell)/explorar/loading.tsx`
- Create: `apps/web/app/(shell)/explorar/error.tsx`
- Create: `apps/web/app/(shell)/explorar/not-found.tsx`

**Interfaces:**
- Consumes: `NAV_ITEMS` da Task 1 (href `/explorar`).
- Produces: rota `/explorar` renderizável dentro de `(shell)`. `page.tsx` exporta `default function ExplorarPage()`. Corpo visual preenchido na Task 5.

- [ ] **Step 1: Criar o scaffold**

`apps/web/app/(shell)/explorar/page.tsx`:

```tsx
import { PageHeader } from "../../components/bivaque/page-header"

export default function ExplorarPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <PageHeader title="Explorar" />
      <p className="text-muted text-sm">
        Busca de serviços e prestadores, com entradas para Guia e Mercado.
        Conteúdo em construção (prancha 61).
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Criar os fallbacks de segmento**

Mesmos três arquivos da Task 2 Step 3, trocando o diretório para `explorar/` e o import path continua `../../components/bivaque/segment-fallbacks`. Copiar a assinatura de `error.tsx` do par que já passa no typecheck.

- [ ] **Step 3: Typecheck + lint**

Run: `npx pnpm@11.18.0 gate --fast`
Expected: verde.

- [ ] **Step 4: Prova de runtime**

`/explorar` renderiza dentro do shell; Explorar fica `aria-current="page"` na bottom-nav e na sidebar. Screenshot 375 + 1440 para a Task 8.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(shell)/explorar"
git commit -m "feat(web): rota /explorar scaffold dentro do (shell)

Destino do container Explorar da nova navegacao. Corpo visual da
prancha 61 entra na Task 5."
```

---

## Task 4: Prancha 01 → `/inicio` (contrato RECON-01-INICIO-WEB, executado pelo qwen)

**Owner:** Claude escreve o contrato e revisa; qwen implementa via `opencode run`.

**Files:**
- Create: `docs/agents/tasks/RECON-01-INICIO-WEB.task.yml`
- Modify (pelo qwen): `apps/web/app/(shell)/inicio/page.tsx` e, se necessário, componentes novos em `apps/web/app/components/bivaque/` para o conteúdo da home.
- Reference: `docs/design/visual-guide-2026-09-06/01-web-inicio.png`

**Interfaces:**
- Consumes: rota `/inicio` (Task 2), `NAV_ITEMS` (Task 1), wrappers Bivaque (`Card`, `EmptyState`, `Skeleton`, `PageHeader`, `MemberAvatar`), `useLocalityContext` (`apps/web/app/lib/locality-context`).
- Produces: `/inicio` com composição fiel à prancha 01, fechando loading / vazio / erro / populado.

- [ ] **Step 1: Escrever o contrato**

`docs/agents/tasks/RECON-01-INICIO-WEB.task.yml`:

```yaml
task_id: RECON-01-INICIO-WEB

objective: >
  A rota /inicio deixa de ser scaffold e passa a ser a "home de quem participa"
  fiel à prancha 01-web-inicio: composição em superfícies claras e verde profundo,
  derivada dos wrappers Bivaque e dos tokens, fechando os estados de carregamento,
  vazio verdadeiro, erro recuperável e populado.

authority:
  - docs/design/visual-guide-2026-09-06/01-web-inicio.png — referência de aparência e conteúdo
  - docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md §7 — /inicio é o container "Início"
  - docs/agents/DESIGN_SYSTEM.md §5 (cor/tipografia/espaço), §7.1 (shell), §9.1 (WCAG 2.2 AA)
  - manifest.json: reviewNotes de 01-web-inicio = [] (sem correção pendente registrada)

baseline:
  status: SCAFFOLD
  evidence: >
    apps/web/app/(shell)/inicio/page.tsx contém apenas PageHeader + parágrafo de
    construção (Task 2 deste plano). Nenhuma composição da prancha.

allowed_paths:
  - apps/web/app/(shell)/inicio/page.tsx
  - apps/web/app/components/bivaque/
  - docs/agents/tasks/RECON-01-INICIO-WEB.task.yml

forbidden:
  - criar rota nova, layout novo, ou tocar proxy.ts / (shell)/layout.tsx
  - importar HeroUI direto onde já há wrapper Bivaque
  - cor crua em JSX, style inline ou classe Tailwind de paleta
  - inventar backend: nenhuma chamada Supabase nova sem RPC já existente; se precisar de dados que não existem, renderizar o estado vazio verdadeiro, não um mock
  - usar nomes, fotos, datas ou contadores da prancha como dado real — são ilustrativos
  - família tipográfica, biblioteca de componentes ou modo escuro novos
  - prometer, em texto, participação, aprovação, prazo ou entrega que o servidor não garante
  - navegação de membro visível para quem não está admitido (não aplicável aqui, mas não introduzir bypass)

acceptance:
  - /inicio compõe a home da prancha 01 (chegada + o que acontece na cidade/comunidades) usando Card/PageHeader/EmptyState/Skeleton/MemberAvatar e tokens
  - os quatro estados são deliberados: skeleton no carregamento, EmptyState no vazio verdadeiro, ErrorState com retry no erro recuperável, conteúdo no populado — nenhum swallow de erro
  - contraste ≥ 4,5:1 em texto normal e ≥ 3:1 em foco/limite de controle; alvos ≥ 44×44
  - nenhuma promessa comercial ou de participação não sustentada por dado real
  - a auditoria visual de /inicio em 375/768/1440 não introduz finding de severidade high
  - npx pnpm@11.18.0 gate verde

proof:
  - node scripts/agents/task-contract.mjs docs/agents/tasks/RECON-01-INICIO-WEB.task.yml
  - npx pnpm@11.18.0 gate
  - node scripts/visual/loop.mjs

risk: apresentação da home autenticada
risk_level: R1
reviewer_must_differ_from_executor: true
retry_budget: 3
on_budget_exhausted: HUMAN_DECISION
closure:
  requires_runtime_evidence: true
```

- [ ] **Step 2: Validar o contrato**

Run: `node scripts/agents/task-contract.mjs docs/agents/tasks/RECON-01-INICIO-WEB.task.yml`
Expected: válido. Corrigir o que o validador apontar antes de seguir.

- [ ] **Step 3: Passo 0 do protocolo — descrição pelo modelo**

```bash
opencode run "Você recebeu a prancha 01-web-inicio. SEM escrever código: liste as seções da tela, os componentes visíveis, o público, e os estados (carregando/vazio/erro/populado) que a prancha sugere. Seja breve." --dir "C:\Users\juana\bivaque-community" -m alibaba-token-plan/qwen3.8-flash -f "docs/design/visual-guide-2026-09-06/01-web-inicio.png"
```
Confirmar que a descrição bate com a prancha. Se o modelo não enxergar, parar e reportar.

- [ ] **Step 4: Disparar a implementação**

```bash
opencode run "Implemente o contrato docs/agents/tasks/RECON-01-INICIO-WEB.task.yml. A prancha de referência está anexada. Só toque os allowed_paths. Não crie rota nem toque proxy.ts. Use os wrappers em apps/web/app/components/bivaque/ e tokens (var(--semantic-*)). Feche loading/vazio/erro/populado. Rode 'npx pnpm@11.18.0 gate --fast' antes de terminar e me diga o resultado." --auto --dir "C:\Users\juana\bivaque-community" -m alibaba-token-plan/qwen3.8-flash -f "docs/design/visual-guide-2026-09-06/01-web-inicio.png"
```
Anotar o `session-id` que o `opencode run` imprime.

- [ ] **Step 5: Revisar o diff (revisão adversarial)**

Run: `git --no-pager diff`
Checar, nesta ordem:
1. **Contrato:** só `allowed_paths` tocados? Os quatro estados presentes? Fiel à prancha 01?
2. **Bordas:** o `page.tsx` continua server component (sem `"use client"` desnecessário)? Se virou client, há motivo (interação)? Imports resolvem?
3. **Disciplina:** Biome (sem `;`, aspas duplas)? Zero cor crua? Zero import HeroUI onde há wrapper? Alvos ≥ 44px?
4. **Fronteiras:** nenhuma chamada Supabase nova, nenhum `*.sql`, nenhum mock passando por dado real?
5. **Correções do dono:** N/A para a prancha 01 (reviewNotes vazio), mas conferir que não há promessa de participação/prazo.

- [ ] **Step 6: Loop de refinamento**

Para cada finding, escrever nota objetiva e:
```bash
opencode run "<notas de refinamento, uma por linha>" --auto --dir "C:\Users\juana\bivaque-community" -m alibaba-token-plan/qwen3.8-flash -s <session-id>
```
Repetir Steps 5–6 até o diff passar. `retry_budget` 3 → se estourar, `HUMAN_DECISION`.

- [ ] **Step 7: Gate completo**

Run: `npx pnpm@11.18.0 gate`
Expected: verde.

- [ ] **Step 8: Commit**

```bash
git add "apps/web/app/(shell)/inicio/page.tsx" apps/web/app/components/bivaque/ docs/agents/tasks/RECON-01-INICIO-WEB.task.yml
git commit -m "feat(web): /inicio fiel a prancha 01-web-inicio

Home de quem participa: composicao em Card/PageHeader/EmptyState/Skeleton
sobre tokens, quatro estados deliberados. Sem backend novo. Contrato
RECON-01-INICIO-WEB. Revisao independente pendente."
```

---

## Task 5: Prancha 61 → `/explorar` (contrato RECON-61-EXPLORAR-WEB, executado pelo qwen)

**Owner:** Claude escreve o contrato e revisa; qwen implementa.

**Files:**
- Create: `docs/agents/tasks/RECON-61-EXPLORAR-WEB.task.yml`
- Modify (pelo qwen): `apps/web/app/(shell)/explorar/page.tsx` (+ componentes de apoio em `components/bivaque/` se preciso).
- Reference: `docs/design/visual-guide-2026-09-06/61-web-explorar-servicos.png`

**Interfaces:**
- Consumes: rota `/explorar` (Task 3), wrappers Bivaque, `SearchField` do HeroUI (não há wrapper próprio — uso direto é aceitável).
- Produces: `/explorar` com o campo de busca acessível, os resultados de serviços e as entradas de Guia e Mercado, fechando loading / sem resultados / erro / populado.

- [ ] **Step 1: Escrever o contrato**

`docs/agents/tasks/RECON-61-EXPLORAR-WEB.task.yml` (mesma forma da Task 4; pontos específicos abaixo):

```yaml
task_id: RECON-61-EXPLORAR-WEB

objective: >
  A rota /explorar deixa de ser scaffold e passa a ser Explorar + busca de
  serviços fiel à prancha 61-web-explorar-servicos: campo de busca acessível,
  resultados de serviços/prestadores e entradas explícitas para Guia e Mercado,
  fechando carregamento, sem-resultados, erro recuperável e populado.

authority:
  - docs/design/visual-guide-2026-09-06/61-web-explorar-servicos.png
  - docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md §7 — /explorar é o container "Explorar"; Guia e Mercado são entradas explícitas aqui
  - manifest.json reviewNotes de 61-web-explorar-servicos:
      "Busca precisa ser um campo acessível. Remover promessas comerciais não sustentadas por dados."
  - docs/agents/DESIGN_SYSTEM.md §5, §7.1, §9.1

allowed_paths:
  - apps/web/app/(shell)/explorar/page.tsx
  - apps/web/app/components/bivaque/
  - docs/agents/tasks/RECON-61-EXPLORAR-WEB.task.yml

forbidden:
  - criar rota nova, layout novo, ou tocar proxy.ts / (shell)/layout.tsx
  - campo de busca só com placeholder — precisa de <label>/nome acessível associado
  - qualquer texto de SLA, garantia de resposta, "conecte-se com N prestadores em X h" ou promessa comercial sem dado que a sustente
  - importar HeroUI direto onde há wrapper Bivaque (SearchField do HeroUI é permitido: não há wrapper)
  - cor crua; família/lib/modo escuro novos
  - inventar backend: usar RPC de busca de prestador já existente se houver (pg_trgm — ver docs/PRODUCT_STATUS.md §7); senão, estado vazio verdadeiro, sem mock como dado real
  - entradas de Guia e Mercado que naveguem para rota inexistente sem tratamento: Guia → /guide (existe); Mercado ainda não tem rota — a entrada pode existir desabilitada ou levar a um estado "em breve" honesto, nunca a um 404

acceptance:
  - campo de busca é <input>/SearchField com nome acessível (não só placeholder), operável por teclado
  - resultados de serviços fiéis à prancha; Guia e Mercado presentes como entradas explícitas
  - nenhuma promessa comercial não sustentada por dado
  - quatro estados deliberados (carregando / sem resultados / erro recuperável / populado); erro não vira lista vazia
  - contraste e alvos conforme §9.1; foco visível (anel duplo)
  - auditoria visual de /explorar em 375/768/1440 sem finding high
  - npx pnpm@11.18.0 gate verde

proof:
  - node scripts/agents/task-contract.mjs docs/agents/tasks/RECON-61-EXPLORAR-WEB.task.yml
  - npx pnpm@11.18.0 gate
  - node scripts/visual/loop.mjs

risk: apresentação de Explorar + busca
risk_level: R1
reviewer_must_differ_from_executor: true
retry_budget: 3
on_budget_exhausted: HUMAN_DECISION
closure:
  requires_runtime_evidence: true
```

- [ ] **Step 2: Validar o contrato** — `node scripts/agents/task-contract.mjs docs/agents/tasks/RECON-61-EXPLORAR-WEB.task.yml`

- [ ] **Step 3: Passo 0 — descrição pelo modelo**

```bash
opencode run "Você recebeu a prancha 61-web-explorar-servicos. SEM escrever código: descreva o campo de busca, os filtros, os cartões de resultado, e onde aparecem Guia e Mercado. Liste os estados (carregando/sem resultados/erro/populado). Seja breve." --dir "C:\Users\juana\bivaque-community" -m alibaba-token-plan/qwen3.8-flash -f "docs/design/visual-guide-2026-09-06/61-web-explorar-servicos.png"
```

- [ ] **Step 4: Disparar a implementação**

```bash
opencode run "Implemente o contrato docs/agents/tasks/RECON-61-EXPLORAR-WEB.task.yml. Prancha anexada. Só allowed_paths. Campo de busca com nome acessível, não só placeholder. Nada de promessa comercial. Guia -> /guide; Mercado sem rota ainda -> entrada honesta 'em breve', nunca 404. Feche carregando/sem-resultados/erro/populado. Rode 'npx pnpm@11.18.0 gate --fast' antes de terminar." --auto --dir "C:\Users\juana\bivaque-community" -m alibaba-token-plan/qwen3.8-flash -f "docs/design/visual-guide-2026-09-06/61-web-explorar-servicos.png"
```

- [ ] **Step 5: Revisar o diff**

Além do checklist da Task 4 Step 5:
- o campo de busca tem `aria-label` ou `<label htmlFor>` — não só `placeholder`.
- procurar strings de promessa: "24h", "garantido", "resposta rápida", "em até", números de prestadores inventados — devem sumir.
- entrada de Mercado não leva a 404.

- [ ] **Step 6: Loop de refinamento** — como Task 4 Step 6, `-s <session-id>`.

- [ ] **Step 7: Gate completo** — `npx pnpm@11.18.0 gate`

- [ ] **Step 8: Commit**

```bash
git add "apps/web/app/(shell)/explorar/page.tsx" apps/web/app/components/bivaque/ docs/agents/tasks/RECON-61-EXPLORAR-WEB.task.yml
git commit -m "feat(web): /explorar fiel a prancha 61-web-explorar-servicos

Busca acessivel (nome associado, nao so placeholder), resultados de
servicos, entradas de Guia e Mercado. Sem promessa comercial. Sem
backend novo. Contrato RECON-61-EXPLORAR-WEB. Revisao independente pendente."
```

---

## Task 6: Prancha 60 → estados compartilhados web (contrato RECON-60-ESTADOS-WEB, executado pelo qwen)

**Owner:** Claude escreve o contrato e revisa; qwen implementa.

**Files:**
- Create: `docs/agents/tasks/RECON-60-ESTADOS-WEB.task.yml`
- Modify (pelo qwen): `apps/web/app/components/bivaque/segment-fallbacks.tsx`, `apps/web/app/components/bivaque/error-state.tsx`, `apps/web/app/components/bivaque/empty-state.tsx` — **só refino de aparência/contraste**, sem mudar API.
- Reference: `docs/design/visual-guide-2026-09-06/60-web-estados.png`

**Interfaces:**
- Consumes: os wrappers de estado existentes (`ErrorState`, `EmptyState`, `SegmentError`, `SegmentLoading`, `SegmentNotFound`).
- Produces: os estados "acesso indisponível" e "falha de conexão e retomada" fiéis à prancha 60, com contraste garantido nos controles desabilitados.

- [ ] **Step 1: Escrever o contrato**

```yaml
task_id: RECON-60-ESTADOS-WEB

objective: >
  Os estados compartilhados web — acesso indisponível, falha de conexão com
  retomada — ganham a aparência da prancha 60-web-estados sem mudar a API dos
  wrappers, com contraste garantido nos controles desabilitados e sem anunciar
  rascunho que não foi persistido.

authority:
  - docs/design/visual-guide-2026-09-06/60-web-estados.png
  - manifest.json reviewNotes de 60-web-estados:
      "Garantir contraste nos controles desabilitados. Rascunho local só pode ser anunciado se realmente persistido."
  - docs/agents/DESIGN_SYSTEM.md §9.1 (WCAG 2.2 AA), §5 (tokens)

baseline:
  status: EXISTS-UNSTYLED
  evidence: >
    ErrorState, EmptyState e segment-fallbacks já existem e são usados; a
    aparência não foi conferida contra a prancha 60. Botão disabled do HeroUI
    pode cair abaixo de 4,5:1.

allowed_paths:
  - apps/web/app/components/bivaque/segment-fallbacks.tsx
  - apps/web/app/components/bivaque/error-state.tsx
  - apps/web/app/components/bivaque/empty-state.tsx
  - docs/agents/tasks/RECON-60-ESTADOS-WEB.task.yml

forbidden:
  - mudar a assinatura/props de qualquer wrapper (só aparência e classes de token)
  - remover o onRetry opcional ou mudar o comportamento de retomada
  - anunciar "rascunho salvo" sem persistência real por trás
  - cor crua; usar token de cor para o texto do controle desabilitado (não opacity que derrube o contraste abaixo de 4,5:1)
  - tocar rota, layout, proxy, Supabase

acceptance:
  - "acesso indisponível" e "falha de conexão + retomada" batem com a prancha 60
  - todo controle desabilitado tem texto com contraste ≥ 4,5:1 sobre a superfície (medido, não presumido)
  - nenhum texto afirma rascunho persistido quando não há persistência
  - API dos wrappers inalterada — nenhum consumidor existente quebra (typecheck + testes verdes)
  - auditoria visual dos estados em 375/768/1440 sem finding high (em especial contraste)
  - npx pnpm@11.18.0 gate verde

proof:
  - node scripts/agents/task-contract.mjs docs/agents/tasks/RECON-60-ESTADOS-WEB.task.yml
  - npx pnpm@11.18.0 gate
  - node scripts/visual/loop.mjs

risk: aparência dos estados compartilhados
risk_level: R1
reviewer_must_differ_from_executor: true
retry_budget: 3
on_budget_exhausted: HUMAN_DECISION
closure:
  requires_runtime_evidence: true
```

- [ ] **Step 2: Validar o contrato** — `node scripts/agents/task-contract.mjs docs/agents/tasks/RECON-60-ESTADOS-WEB.task.yml`

- [ ] **Step 3: Passo 0 — descrição pelo modelo**

```bash
opencode run "Você recebeu a prancha 60-web-estados. SEM escrever código: descreva os dois estados mostrados (acesso indisponível; falha de conexão e retomada), os textos, os botões e o estado visual dos controles desabilitados. Seja breve." --dir "C:\Users\juana\bivaque-community" -m alibaba-token-plan/qwen3.8-flash -f "docs/design/visual-guide-2026-09-06/60-web-estados.png"
```

- [ ] **Step 4: Disparar a implementação**

```bash
opencode run "Implemente o contrato docs/agents/tasks/RECON-60-ESTADOS-WEB.task.yml. Prancha anexada. NÃO mude a API dos wrappers — só aparência e classes de token. Texto de controle desabilitado precisa de contraste >= 4,5:1 (cor de token, não opacity que derrube). Nada de anunciar rascunho não persistido. Rode 'npx pnpm@11.18.0 gate --fast' antes de terminar." --auto --dir "C:\Users\juana\bivaque-community" -m alibaba-token-plan/qwen3.8-flash -f "docs/design/visual-guide-2026-09-06/60-web-estados.png"
```

- [ ] **Step 5: Revisar o diff**

- nenhuma mudança de props/assinatura — `git --no-pager diff` só mostra classes/markup.
- o texto do botão disabled usa um token de cor legível (ex. `text-[var(--semantic-text-secondary)]`), não `opacity-40`.
- nenhum consumidor de `ErrorState`/`EmptyState` precisa mudar.
- procurar "rascunho salvo" / "salvo automaticamente" sem persistência.

- [ ] **Step 6: Loop de refinamento** — `-s <session-id>`.

- [ ] **Step 7: Gate completo** — `npx pnpm@11.18.0 gate` (roda a suíte inteira — pega qualquer consumidor quebrado).

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/components/bivaque/segment-fallbacks.tsx apps/web/app/components/bivaque/error-state.tsx apps/web/app/components/bivaque/empty-state.tsx docs/agents/tasks/RECON-60-ESTADOS-WEB.task.yml
git commit -m "fix(web): estados compartilhados fieis a prancha 60-web-estados

Contraste garantido nos controles desabilitados (cor de token, nao
opacity); sem anunciar rascunho nao persistido. API dos wrappers
inalterada. Contrato RECON-60-ESTADOS-WEB. Revisao independente pendente."
```

---

## Task 7: Página de demonstração de componentes (contrato RECON-DEMO-COMPONENTES-WEB, executado pelo qwen)

**Owner:** Claude escreve o contrato + o guard de rota; qwen preenche a galeria.

**Files:**
- Create: `apps/web/app/dev/componentes/page.tsx` (Claude cria com o guard; qwen preenche o corpo)
- Create: `docs/agents/tasks/RECON-DEMO-COMPONENTES-WEB.task.yml`
- Modify: `scripts/visual/capture.mjs` (adicionar `/dev/componentes` à lista de rotas, se estática)

**Interfaces:**
- Consumes: todos os wrappers em `apps/web/app/components/bivaque/`.
- Produces: `/dev/componentes` — uma página só de leitura que renderiza cada wrapper em seus estados essenciais (`default`, `hover` documentado, `disabled`, `loading`, `invalid`, `selected` onde couber). `notFound()` quando `process.env.NODE_ENV === "production"`.

- [ ] **Step 1: Claude cria o arquivo com o guard**

`apps/web/app/dev/componentes/page.tsx`:

```tsx
import { notFound } from "next/navigation"

export default function ComponentesDemoPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Componentes — demonstração</h1>
      <p className="text-muted text-sm">Galeria em construção.</p>
    </main>
  )
}
```

Confirmar contra `apps/web/node_modules/next/dist/docs/01-app/` que `notFound()` de `next/navigation` é a API corrente na 16.3 e que uma rota fora de `(shell)`/`(preauth)` não herda gate de auth (é o caso — `proxy.ts` `PUBLIC_PATHS` não cobre `/dev`, mas a página não faz chamada autenticada; se o `proxy.ts` bloquear `/dev` para não-autenticado, adicionar `/dev` a `PUBLIC_PATHS` **apenas** com comentário de que é rota de desenvolvimento sem dado).

- [ ] **Step 2: Escrever o contrato**

```yaml
task_id: RECON-DEMO-COMPONENTES-WEB

objective: >
  /dev/componentes passa a renderizar cada wrapper Bivaque em seus estados
  essenciais, como referência viva do sistema (PROCESSO-DE-CONSTRUCAO §7 etapa 1),
  sem chamada de rede e sem dado real.

authority:
  - docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md §7 etapa 1 — "página interna de demonstração com estados reais"
  - docs/agents/DESIGN_SYSTEM.md — estados essenciais por componente (default, hover, pressed, focus-visible, disabled, loading, invalid, selected)

baseline:
  status: SCAFFOLD
  evidence: apps/web/app/dev/componentes/page.tsx tem só o guard de produção e um título.

allowed_paths:
  - apps/web/app/dev/componentes/page.tsx
  - docs/agents/tasks/RECON-DEMO-COMPONENTES-WEB.task.yml

forbidden:
  - remover o guard notFound() de produção
  - qualquer fetch, chamada Supabase, Server Action ou dado real — só props estáticas
  - importar HeroUI direto onde há wrapper Bivaque
  - cor crua; família/lib/modo escuro novos
  - virar rota de membro (fora de (shell), sem nav de membro)

acceptance:
  - a página lista, com título por seção, os wrappers: Card, Skeleton, EmptyState, ErrorState, FeedbackAlert (info/success/warning/danger), MemberAvatar, PageHeader, e os botões/campos HeroUI usados nos wrappers
  - cada componente aparece nos estados essenciais aplicáveis
  - nenhuma chamada de rede; nenhum dado de pessoa real (usar "Ana Ribeiro" / example.invalid como no seed de teste, marcados como ilustrativos)
  - a página some em produção (notFound)
  - auditoria visual de /dev/componentes em 375/768/1440 sem finding high
  - npx pnpm@11.18.0 gate verde

proof:
  - node scripts/agents/task-contract.mjs docs/agents/tasks/RECON-DEMO-COMPONENTES-WEB.task.yml
  - npx pnpm@11.18.0 gate
  - node scripts/visual/loop.mjs

risk: página de desenvolvimento sem dado
risk_level: R1
reviewer_must_differ_from_executor: true
retry_budget: 3
on_budget_exhausted: HUMAN_DECISION
closure:
  requires_runtime_evidence: true
```

- [ ] **Step 3: Validar o contrato** — `node scripts/agents/task-contract.mjs docs/agents/tasks/RECON-DEMO-COMPONENTES-WEB.task.yml`

- [ ] **Step 4: Disparar a implementação (sem `-f` — não há prancha)**

```bash
opencode run "Implemente o contrato docs/agents/tasks/RECON-DEMO-COMPONENTES-WEB.task.yml. Só apps/web/app/dev/componentes/page.tsx. Mantenha o guard notFound() de produção. Renderize cada wrapper de apps/web/app/components/bivaque/ nos estados essenciais, com props estáticas, SEM fetch e SEM dado real. Rode 'npx pnpm@11.18.0 gate --fast' antes de terminar." --auto --dir "C:\Users\juana\bivaque-community" -m alibaba-token-plan/qwen3.8-flash
```

- [ ] **Step 5: Revisar o diff**

- guard `notFound()` intacto.
- zero `fetch`/`createBrowserClient`/`createServerClient`/Server Action.
- todos os wrappers da tabela do `AGENTS.md` presentes.
- Biome, tokens, sem HeroUI cru onde há wrapper.

- [ ] **Step 6: Loop de refinamento** — `-s <session-id>`.

- [ ] **Step 7: Adicionar a rota à captura visual**

Se `scripts/visual/capture.mjs` tiver lista estática de rotas, acrescentar `/dev/componentes` (e confirmar `/inicio`, `/explorar` já lá — senão acrescentar). Se a lista for derivada do filesystem, nada a fazer.

- [ ] **Step 8: Gate completo** — `npx pnpm@11.18.0 gate`

- [ ] **Step 9: Commit**

```bash
git add apps/web/app/dev/componentes/page.tsx docs/agents/tasks/RECON-DEMO-COMPONENTES-WEB.task.yml scripts/visual/capture.mjs
git commit -m "feat(web): pagina interna /dev/componentes de demonstracao dos wrappers

Referencia viva do sistema (PROCESSO-DE-CONSTRUCAO etapa 1). Sem rede,
sem dado real, some em producao. Contrato RECON-DEMO-COMPONENTES-WEB."
```

---

## Task 8: Fechamento do grupo G0 — auditoria visual, veredito, reconciliação

**Owner:** Claude.

**Files:**
- Create: `docs/agents/VISUAL_AUDIT-2026-09-08-G0.md`
- Modify: `docs/PRODUCT_STATUS.md`
- Modify: board via `node tools/backend-kanban/src/board.mjs` (card `RECON-G0-FUNDACAO-WEB`)

**Interfaces:**
- Consumes: o estado do repo após Tasks 1–7.
- Produces: o veredito que libera (ou não) o G1.

- [ ] **Step 1: Rodar a auditoria visual completa**

Garantir que não há dev server na :3000 e nenhum `dev-server.pid` stale (`rm -f dev-server.pid dev-server.log`).
Run: `node scripts/visual/loop.mjs`
Expected: exit 0 — todos os gates verdes **e** zero finding de severidade high. Se exit ≠ 0, ler `.visual/<run>/ITERATION.md` e `report.md`, classificar (armadilha conhecida vs. regressão real vs. finding legítimo), corrigir na tela de origem (novo disparo qwen para as telas 01/61/60/demo; edição direta para nav) e repetir.

- [ ] **Step 2: Task 7 da auditoria de telas — revisão de julgamento**

Para `/inicio`, `/explorar`, os estados da prancha 60 e `/dev/componentes`, nos 3 viewports (375/768/1440), responder por escrito em `docs/agents/VISUAL_AUDIT-2026-09-08-G0.md`:
1. ação primária achável em < 1s?
2. gaps 12–16px entre unidades, padding 16px, sem deriva de alinhamento?
3. lista coesa, sem parede de texto nem objeto solto?
4. 375 é desenho próprio (não 1440 espremido); 1440 usa a largura sem margem morta?

Mais: quais superfícies, estados e dados foram exercitados; diferenças **intencionais** em relação a cada prancha, explicadas; o que a auditoria mecânica reportou e o que foi feito. Veredito por tela: **passa / não passa**. Cada "não passa" vira tarefa própria (não corrigir dentro desta Task).

- [ ] **Step 3: Reconciliar `docs/PRODUCT_STATUS.md`**

- Trocar a navegação descrita (seção 4 e onde citar "Cidade / Minha comunidade / Grupos / Eu") para Início / Explorar / Comunidades / Perfil, com `file:line` de `bottom-nav.tsx`.
- Acrescentar linhas para `/inicio`, `/explorar` e `/dev/componentes` com o estado real: **UI entregue (web); revisão independente e E2E pendentes** (a CI externa está bloqueada por pagamento desde 2026-08-31; E2E precisa de humano — banco com/sem seed).
- Uma linha só sai de `PRODUCT_STATUS.md` quando o ciclo do usuário fecha. `/inicio` e `/explorar` **não fecham ciclo sozinhos** (dependem de conteúdo dos grupos seguintes) — registrar como parcial, não como fechado.

- [ ] **Step 4: Reconciliar o board**

```bash
node tools/backend-kanban/src/board.mjs --search "recon nav fundacao web"
```
Se não houver card, criar `RECON-G0-FUNDACAO-WEB` (P1, categoria frontend/reconstrução, status conforme resultado da auditoria, `sourceRevision` = HEAD, checklist = as 8 tasks, `dependencies` = nenhuma) na mesma leva; referenciar `RECON-AUTH-ENTRADA-WEB` e `DS-001-DESIGN-SYSTEM` como relacionados. Regenerar o resumo:
```bash
node tools/backend-kanban/src/board.mjs --write-summary
```
Não editar `BOARD.md` à mão.

- [ ] **Step 5: Gate final do grupo**

Run: `npx pnpm@11.18.0 gate`
Expected: verde. (E2E não roda aqui — registrar como pendente no veredito, conforme o contrato do repo permite fechar onda com E2E pendente se a linha disser isso.)

- [ ] **Step 6: Commit do fechamento**

```bash
git add docs/agents/VISUAL_AUDIT-2026-09-08-G0.md docs/PRODUCT_STATUS.md tools/backend-kanban/
git commit -m "docs: fechamento do G0 — auditoria visual, PRODUCT_STATUS e board

Veredito da auditoria visual de /inicio, /explorar, estados da prancha
60 e /dev/componentes nos 3 viewports. PRODUCT_STATUS reconciliado
(nav nova; telas parciais, revisao independente e E2E pendentes).
Card RECON-G0-FUNDACAO-WEB."
```

- [ ] **Step 7: Relatar o status do grupo**

Reportar ao responsável: o que passou (gate local, auditoria visual local), o que ficou pendente (revisão independente de código, E2E, CI externa), e cada "não passa" da Task 7 como tarefa aberta. G1 só começa depois deste veredito.

---

## Self-Review

**1. Spec coverage** (contra `docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md`):
- §4 G0 = nav + `01` + `61` + `60` + demo → Tasks 1–3 (nav + rotas), 4 (`01`), 5 (`61`), 6 (`60`), 7 (demo). ✅
- D5 (Claude faz a nav) → Tasks 1–3 marcadas Owner: Claude. ✅
- D2 (contrato por tela) → `RECON-*.task.yml` nas Tasks 4–7. ✅
- D4 (auditoria fecha o grupo, veredito escrito) → Task 8. ✅
- D8 / §5 ("pronto" = 7 critérios) → refletido nos `acceptance` dos contratos e na Task 8 Step 2. ✅
- §3 fronteiras herdadas → bloco Global Constraints + `forbidden` de cada contrato. ✅
- §7 honestidade de verificação → Task 4/5/6 commit "revisão independente pendente"; Task 8 Step 3/7 registram E2E e CI pendentes. ✅
- §6 loop (Passo 0 → contrato → run → review → refino → gate → audit) → Tasks 4–7 Steps 3–7. ✅
- Gap conhecido: o spec cita `apps/mobile` fora de escopo — este plano não o toca. ✅ (intencional)

**2. Placeholder scan:** sem "TBD"/"TODO"/"handle edge cases". Os corpos visuais das Tasks 4–7 são deliberadamente delegados ao qwen via contrato — o contrato tem `acceptance` concreto, não é placeholder. Os `sed -n`/paths do Next doc são "leia o arquivo instalado" porque a versão 16.3 diverge do treino — instrução, não lacuna.

**3. Type consistency:** `NAV_ITEMS` ids `["inicio","explorar","comunidades","perfil"]` usados igual em Task 1 (bottom-nav, scope test, DESIGN_SYSTEM), Task 2 (fallback `perfil`/`inicio`), E2E specs. `SegmentLoading`/`SegmentError`/`SegmentNotFound` — nomes conferidos contra `segment-fallbacks.tsx` real. `error.tsx` assina `{ error, reset }` — Step nota para copiar a assinatura exata do par `community/error.tsx` que já tipa no repo. `PageHeader` — Step 2 da Task 2 tem fallback se a API diferir. `notFound` de `next/navigation` — Task 7 Step 1 manda confirmar na doc instalada.

Gaps corrigidos inline: adicionada a modificação de `scripts/visual/capture.mjs` (Task 7 Step 7) e de `tests/e2e/nav-container-invariant.spec.ts` (Task 2 Step 6), que o mapa de blast radius apontou e a primeira versão da lista de arquivos não trazia.
