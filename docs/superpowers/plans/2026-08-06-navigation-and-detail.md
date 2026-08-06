# Navigation and detail — Implementation Plan

> **Para quem executa (humano ou agente):** este plano é autocontido e não
> depende de nenhuma ferramenta específica. Execute **uma task por vez**, na
> ordem. Marque os checkboxes (`- [x]`) conforme avança.
>
> Regra de parada: se um step de verificação não produzir a saída esperada,
> **pare e investigue** antes de seguir.

**Goal:** Fechar o ciclo de "ver e ir até" em todas as superfícies
do shell. Hoje o titular recebe notificações que não navegam, posts com
deep link construído mas sem handler, grupos e eventos sem página de
detalhe, e mensagens com bug de `isMobile` hardcoded. Esta onda
implementa os 7 handlers/detalhes que faltam.

**Architecture:** Camada de aplicação pura, **sem migration**. O
schema já tem todas as foreign keys e índices. Cada notificação
carrega `entity_type` + `entity_id` que o handler usa para
construir a URL. O `_id` dinâmico das novas páginas é resolvido via
`searchParams` do Next.js.

**Subdivisões resolvidas (per MAP §4):**
- **4a** — Notificação de comentário não navega para o post.
- **4d** — Deep link `?post=<id>` construído no overflow menu do post
  mas `/community?post=<id>` não trata.
- **5a** — Grupo sem página de detalhe (entrar/sair já funciona, falta
  a página `/groups/:id`).
- **5d** — Feed dentro do grupo (página `/groups/:id` mostra a
  descrição, membros, e os posts do grupo).
- **6c** — Evento sem página de detalhe (sem `/events/:id` com
  descrição completa, lista de confirmados, comentários).
- **8a** — Notificação em geral não navega para o objeto.
- **9b** — Notificação de DM reconhecida, mas card sem handler de
  clique para abrir a conversa.

**Subdivisões explicitamente fora desta onda:**
- **9a** (messages: indicador de online, busca dentro da conversa) —
  P1 mas foge do escopo desta onda; pode entrar em uma onda dedicada
  de messages.
- `isMobile = true` hardcoded em `messages/page.tsx:444` — corrigido
  dentro do Task 5 desta onda (relacionado ao handler de clique).

**Tech Stack:** Next.js 16 server runtime, App Router com
`searchParams` assíncrono, `useRouter` do `next/navigation` para
clientes, Server Components para as novas páginas, hooks existentes
para fetch de dados (`useFeed`, `useGroup`, etc., já disponíveis).

**Fontes:**
- [`docs/journeys/MAP.md`](../journeys/MAP.md) §4 (matriz 41 linhas),
  §10.1 (Onda 5).
- `apps/web/app/(shell)/notifications/page.tsx` — feed de notificações
  atual (precisa do handler).
- `apps/web/app/(shell)/community/page.tsx` — feed de posts (precisa
  do `?post=` handler).
- `apps/web/app/components/bivaque/feed-post.tsx` — onde o deep link
  é construído (linha 485).
- `apps/web/app/(shell)/messages/page.tsx` — `isMobile = true`
  hardcoded na linha 444.

---

## Contexto obrigatório antes de começar

### Ciclo de trabalho

```bash
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 test:scope
```

Sem `db:reset` aqui — esta onda não toca schema. O cycle é só type/lint/test.

### Falsos positivos conhecidos

**1. `database.generated.ts` em UTF-16.** Pré-existente no repo
(já documentado no plano da Onda 2). `pnpm typecheck` continua
vermelho do mesmo jeito. Não é regressão.

**2. `tests/operator-authorization.sql` insere fixtures no banco
local.** A captura visual deixa `Visual Capture` no banco. Se rodar
captura entre `db:reset` e `test:db`, 6 asserts falham por motivo
conhecido. Rodar `db:reset && test:db` em sequência limpa.

**3. `useRouter` em Server Component.** As novas páginas `/groups/:id`
e `/events/:id` são Server Components. Não usam `useRouter`. O
handler de clique no notifications (Client Component) usa
`useRouter` normalmente.

### Regras que não podem ser violadas

- **Deep link não pode quebrar o feed.** Se `/community?post=<id>`
  é inválido (post não existe ou soft-deleted), a página cai no feed
  normal sem erro.
- **Notificações de tipos desconhecidos não podem crashar.** O handler
  usa `switch` exaustivo; tipos não mapeados caem em "fallback:
  não navegar".
- **Páginas de detalhe não devem vazar dados soft-deleted.** O post
  com `is_deleted = true` (escondido pela Onda 1) não deve renderizar
  na página de detalhe. Use a query existente (que já filtra
  `is_deleted`) — não crie uma nova query que poderia vazar.

---

## Estrutura de arquivos

| Arquivo | Mudança |
|---|---|
| `apps/web/app/(shell)/notifications/page.tsx` | Adiciona click handler no card. |
| `apps/web/app/(shell)/community/page.tsx` | Adiciona tratamento de `?post=<id>`. |
| `apps/web/app/(shell)/groups/[id]/page.tsx` | **Cria.** Detalhe do grupo. |
| `apps/web/app/(shell)/events/[id]/page.tsx` | **Cria.** Detalhe do evento. |
| `apps/web/app/(shell)/messages/page.tsx` | Fix `isMobile` + handler DM notification. |
| `scripts/visual/capture.mjs` | Adiciona as 2 novas rotas. |
| `docs/agents/VISUAL_AUDIT-<data>-navigation.md` | **Cria.** Veredito. |

---

## Task 1: Notification click handler

**Files:**
- Modify: `apps/web/app/(shell)/notifications/page.tsx`

- [x] **Step 1: Mapear tipos de notificação para URLs**

Ler o componente de notificação e o type/helper que classifica
`type` (campo da tabela `notifications`). Tipos esperados:
`comment_reply`, `post_reaction`, `group_admission`, `event_rsvp`,
`event_change`, `direct_message`. Cada um mapeia para uma URL:
- `comment_reply` → `/community?post=<post_id>` (ou com
  comment focus, fora do escopo)
- `post_reaction` → `/community?post=<post_id>`
- `group_admission` → `/groups/<group_id>`
- `event_rsvp` → `/events/<event_id>` (Task 4 cria a rota)
- `event_change` → `/events/<event_id>`
- `direct_message` → `/messages?conversation=<conversation_id>`
  (Task 5 adiciona o suporte)

- [x] **Step 2: Adicionar `onClick` no card**

```tsx
<article
  key={notification.id}
  onClick={() => navigateTo(notification)}
  onKeyDown={(e) => { if (e.key === "Enter") navigateTo(notification) }}
  role="button"
  tabIndex={0}
  className="cursor-pointer ..."
>
```

- [x] **Step 3: Função `navigateTo` com `switch` exaustivo**

```tsx
function navigateTo(n: Notification): void {
  switch (n.type) {
    case "comment_reply":
      router.push(`/community?post=${n.entity_id}`)
      return
    case "post_reaction":
      router.push(`/community?post=${n.entity_id}`)
      return
    case "group_admission":
      router.push(`/groups/${n.entity_id}`)
      return
    case "event_rsvp":
    case "event_change":
      router.push(`/events/${n.entity_id}`)
      return
    case "direct_message":
      router.push(`/messages?conversation=${n.entity_id}`)
      return
    default:
      return
  }
}
```

- [x] **Step 4: Garantir acessibilidade (Enter / Space)**

`onKeyDown` deve disparar a navegação com Enter ou Space.

- [x] **Step 5: Typecheck + lint**

```bash
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 lint
```

- [x] **Step 6: Commit**

```bash
git add 'apps/web/app/(shell)/notifications/page.tsx'
git commit -m "feat(notifications): card click navigates to the target object"
```

---

## Task 2: Deep link `?post=<id>` em `/community`

**Files:**
- Modify: `apps/web/app/(shell)/community/page.tsx`

- [x] **Step 1: No boot do componente, ler `searchParams.post`**

```tsx
const postId = searchParams.get("post")
```

- [x] **Step 2: Após o feed carregar, se `postId` está presente,
  rolar até o card e destacá-lo**

- Encontrar o post na lista (já carregada).
- Se encontrado: `scrollIntoView({ behavior: "smooth", block: "center" })`
  + adicionar classe de destaque (ex: `ring-2 ring-accent` por
  2-3s).
- Se NÃO encontrado (post soft-deleted, ou ID inválido): não fazer
  nada (silencioso). O feed continua visível.

- [x] **Step 3: Typecheck + lint + commit**

```bash
git add 'apps/web/app/(shell)/community/page.tsx'
git commit -m "feat(community): open ?post=<id> deep link and highlight the card"
```

---

## Task 3: `/groups/:id` detail page

**Files:**
- Create: `apps/web/app/(shell)/groups/[id]/page.tsx`

- [x] **Step 1: Server Component. Params: `{ id: string }`.**

- Buscar o grupo via `supabase.from("groups").select(...).eq("id", id).single()`.
  Se não existe ou `is_deleted = true`, redirect para `/groups` (a
  list page).
- Buscar membership do caller: `from("group_memberships").select("role,
  status").eq("group_id", id).eq("user_id", user.id).maybeSingle()`.
- Buscar membros (count, top 10): `from("group_memberships").select(...).eq("group_id",
  id).eq("status", "approved").limit(10)`.
- Buscar posts do grupo: usar `feed_group(p_group_id uuid)` (RPC da
  Onda 0, expansion community).

- [x] **Step 2: Layout**

- Header: nome do grupo, descrição, visibilidade (public/private).
- Action bar:
  - Se caller é membro approved: botão "Sair" (que chama uma action
    server-side que deleta a membership).
  - Se não é membro: botão "Entrar" (que chama a RPC
    `public.join_group` ou insere em `group_memberships` com
    `status='pending'`).
  - Se grupo é private: "Pedir entrada" ao invés de "Entrar".
- Seção "Membros" (top 10 + "ver todos").
- Seção "Posts": feed_group do grupo, com o componente `feed-post`
  reutilizado.

- [x] **Step 3: Typecheck + lint + commit**

```bash
git add 'apps/web/app/(shell)/groups/[id]/page.tsx'
git commit -m "feat(groups): detail page with header, members, and group feed"
```

---

## Task 4: `/events/:id` detail page

**Files:**
- Create: `apps/web/app/(shell)/events/[id]/page.tsx`

- [x] **Step 1: Server Component. Params: `{ id: string }`.**

- Buscar o evento via `supabase.from("events").select(...).eq("id", id).single()`.
  Se não existe ou `is_deleted = true`, redirect para `/events`.
- Buscar RSVP do caller: `from("event_rsvps").select("status").eq("event_id",
  id).eq("user_id", user.id).maybeSingle()`.
- Buscar lista de confirmados (count + top 20): `from("event_rsvps").select(...).eq("event_id",
  id).eq("status", "going").limit(20)`.

- [x] **Step 2: Layout**

- Header: título, data/hora, local, descrição completa.
- Action bar:
  - Se caller não confirmou: botões "Vou" (going) e "Talvez" (interested).
  - Se caller já confirmou: botão "Não vou" (cancelar).
- Seção "Quem vai" (top 20).
- Seção "Comentários" (placeholder — fora do escopo, mas reservada
  para onda futura).

- [x] **Step 3: Typecheck + lint + commit**

```bash
git add 'apps/web/app/(shell)/events/[id]/page.tsx'
git commit -m "feat(events): detail page with header, RSVP, and attendees"
```

---

## Task 5: Messages improvements

**Files:**
- Modify: `apps/web/app/(shell)/messages/page.tsx`

- [x] **Step 1: Fix `isMobile` hardcoded**

Substituir `const isMobile = true` (linha 444) por detecção real via
hook `useMediaQuery` (Tailwind) ou window.matchMedia. Padrão
preferido: hook próprio em `apps/web/lib/media-query.ts` que retorna
`boolean` e reage ao resize.

- [x] **Step 2: Adicionar `onClick` nos cards de DM (se vier via
  notification)**

A notificação de DM tem `type='direct_message'` e
`entity_id=conversation_id`. O handler do Task 1 (notificações)
faz `router.push('/messages?conversation=<id>')`. O componente
messages deve ler o query param, encontrar a conversa e abrir o
chat.

- [x] **Step 3: Typecheck + lint + commit**

```bash
git add 'apps/web/app/(shell)/messages/page.tsx'
git commit -m "fix(messages): real isMobile detection and DM deep-link open"
```

---

## Task 6: Audit visual §10.2

- [x] Adicionar `/groups/:id` e `/events/:id` em
  `scripts/visual/capture.mjs` (com `auth: true`).
- [x] Rodar `node scripts/visual/loop.mjs`.
- [x] Escrever `docs/agents/VISUAL_AUDIT-<data>-navigation.md` com
  veredito por tela, focado nas 2 novas páginas (`/groups/:id`,
  `/events/:id`) e nas modificações de comportamento das existentes
  (notifications, community, messages).

---

## Fora deste plano

- Notificações push (browser) — não está no escopo do piloto.
- Comentários em eventos (reservado em §6c) — onda futura.
- Online/status em messages (9a) — onda dedicada de messages.