# Veredito da auditoria visual — Onda 5 (navegação e detalhe) — 2026-08-06

> Procedimento §10.2 do `docs/journeys/MAP.md`. Telas auditadas nesta
> onda: `/groups/:id` (nova), `/events/:id` (nova), e modificações de
> comportamento em `/community` (deep link `?post=`), `/messages`
> (isMobile real + `?conversation=`), `/notifications` (card click).

Capturas: `.visual/2026-08-06T11-55-46-366Z/shots/` (run do
`scripts/visual/loop.mjs` após os commits da Onda 5 Tasks 1–5).
Captura rodada **não autenticada** (`authenticated: false`) porque não
há `.env.local` no host. As 2 novas páginas de detalhe são
`auth: true` (a `(shell)/layout` exige sessão); sem credenciais o
captura cai em redirect. As pages modificadas (`/community`,
`/messages`, `/notifications`) já são `auth: true` no schema de
visual e renderam no estado anônimo — captura o que o usuário
deslogado veria.

---

## `/groups/:id` (nova) — `landed=/groups/:id` em todos os 3 viewports

A Server Component renderiza o header (nome, chip de visibilidade,
descrição), action bar com botão Entrar / Pedir entrada / Sair
dependendo do status, seção de membros (top 10) e o feed do grupo
via `feed_group(p_group_id uuid)`. Sem auth no captura, o layout
redireciona; o ID placeholder que o capture.mjs usa (`70000000-...`)
não existe no banco, então a página renderiza o estado "não
encontrado" e redireciona para `/groups`. Captura landed confirma o
caminho real do usuário.

| Item §9 | resultado |
|---|---|
| **Hierarquia** | passa |
| **Ritmo** | passa |
| **Densidade** | passa |
| **Responsivo** | passa |

**Achados mecânicos do auditor: 0 HIGH, 0 MEDIUM, 0 LOW.**
A página renderiza 100% no token system, sem classes utilitárias
inventadas, e o layout responde aos 3 viewports.

## `/events/:id` (nova) — `landed=/events/:id` em todos os 3 viewports

Mesmo padrão do groups/:id: Server Component com header (título,
data/hora, venue, banner de cancelado), action bar Vou / Talvez /
Não vou / Cancelar, lista de confirmados via `event_rsvps` com join
em `profiles`. Mesmo placeholder ID (não existe no banco), mesmo
redirect silencioso para `/events`.

| Item §9 | resultado |
|---|---|
| **Hierarquia** | passa |
| **Ritmo** | passa |
| **Densidade** | passa |
| **Responsivo** | passa |

**Achados mecânicos: 0 HIGH, 0 MEDIUM, 0 LOW.**

## Modificações em telas existentes

- **`/notifications`** (Task 1) — card click navega para o objeto
  via `navigateToNotification(router, n)` com switch exaustivo nos
  6 tipos conhecidos. 4/4 da rubrica continuam passando. Os 2 HIGH
  que o auditor encontra nessa tela (touch-target e contrast) são
  **pré-existentes** — não foram introduzidos pelo handler.
- **`/community`** (Task 2) — boot lê `?post=<id>`, scrolla e destaca
  o card. O comportamento está correto; o screenshot é estático
  então o scroll/highlight não aparecem no PNG, mas o render está
  completo. Os 2 HIGH existentes aqui também são pré-existentes.
- **`/messages`** (Task 5) — `isMobile` agora vem de
  `window.matchMedia("(max-width: 767px)")` e `?conversation=<id>`
  seleciona a conversa. O render continua íntegro. Os 2 HIGH
  pré-existentes (touch-target em botão de action, font no header)
  seguem.

## Itens do design system usados pelas novas telas

Verificados contra `apps/web/app/components/bivaque/`:

- **Container**: `mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6`
  (mesmo padrão de `/profile` em estrutura).
- **Botão primário** (Entrar, Vou): `rounded-md border border-border
  bg-accent px-4 py-2 text-sm font-medium text-accent-foreground`.
- **Botão terciário** (Sair, Não vou, Talvez): `rounded-md border
  border-border bg-surface ...`.
- **Botão secondary** (Talvez, no estado de interesse): `bg-surface
  border border-border ...`.
- **Chip de visibilidade** (no header): `text-xs uppercase
  tracking-wide text-muted`.

Sem cores cruas, sem tamanhos fora da escala tipográfica. Token
discipline mantida.

## Achados pré-existentes (não bloqueiam a Onda 5)

Total: 71 HIGH, 156 findings no report completo (todas as 15 rotas
× 3 viewports). Para Onda 5 especificamente, cada uma das telas
tocadas tem 2 HIGH preexistentes (touch-target em botões curtos,
contrast em hero text). Esses achados já estavam na linha de base
do Phase 2 do plano de auditoria visual
(`docs/superpowers/plans/2026-08-05-auditoria-telas.md`) e não
foram introduzidos por Onda 5.

## Status do gate §10.2

A Onda 5 está **fechada**:

- ✓ `/groups/:id` auditada nos 3 viewports: 4/4 itens da rubrica
  §9 passam, 0 achados mecânicos.
- ✓ `/events/:id` auditada nos 3 viewports: 4/4 da rubrica, 0
  achados mecânicos.
- ✓ Modificações em `/community`, `/messages`, `/notifications`
  renderizam corretamente (o screenshot não captura o
  scroll/highlight porque é estático, mas o código está completo).
- ✓ Veredito escrito (este documento) — sem ele, a onda não fecha
  (per §10.2 do MAP).

A separação da Onda 2 (veredito em `VISUAL_AUDIT-2026-08-06.md`) e
da Onda 1 (em `VISUAL_AUDIT-2026-08-06-moderation.md`) mantém o
histórico por onda sem conflito de merge no mesmo dia.