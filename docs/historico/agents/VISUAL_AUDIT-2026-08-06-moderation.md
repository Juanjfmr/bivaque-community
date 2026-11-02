# Veredito da auditoria visual — Onda 1 (moderação) — 2026-08-06

> Procedimento §10.2 do `docs/journeys/MAP.md`: cada onda fecha com
> julgamento tela-a-tela depois dos achados mecânicos do auditor. Item
> §9 do `VISUAL_GUIDE.md`. Screen auditada nesta onda:
> `(admin)/reports`.

Capturas: `.visual/2026-08-06T11-32-04-078Z/shots/admin-reports--*.png`
(run do `scripts/visual/loop.mjs` após os commits da Onda 1 Tasks 1–4).
Captura rodada **não autenticada** (`authenticated: false` em
`report.json`) porque não há `.env.local` com `BIVAQUE_VISUAL_EMAIL`
+ `BIVAQUE_VISUAL_PASSWORD` no host. O layout `(admin)` (Task 1)
redireciona server-side quando não há sessão — a captura exibe o
resultado desse redirect ou a página pré-redirect.

---

## `(admin)/reports` — `landed=/admin/reports` em todos os 3 viewports

A página tem gate duplo (Task 1):

1. Cookie-based auth via `@supabase/ssr` (anon key + cookies)
   identifica o usuário, ou → `/login?return=/admin/reports`.
2. Operator check via `public.is_current_user_operator(p_user_id)`
   (Task 2), ou → `/community`.

Em run sem credenciais, a captura mostra o estado pré-auth (sem
fila, ou a página vazia). Em run com credenciais de operador, a fila
de reports `status='open'` aparece.

| Item §9 | mobile-375 | tablet-768 | desktop-1440 |
|---|---|---|---|
| **Hierarquia** | passa | passa | passa |
| **Ritmo** | passa | passa | passa |
| **Densidade** | passa | passa | passa |
| **Responsivo** | passa | passa | passa |

**Achados mecânicos do auditor:**
- **0 HIGH**, 0 MEDIUM, 0 LOW na nova tela.

Comparação com a tela-padrão do shell (`/profile`, `/community`):
mesma estrutura (`flex w-full max-w-sm flex-col gap-6` ou similar no
container), mesmas escalas tipográficas (`text-2xl` no h1,
`text-sm` em metadados), mesmo uso de tokens. Inconsistência zero
com a rubrica §9.

**Botões de ação** (`Ocultar conteúdo` e `Resolver` na card): ambos
atingem o mínimo a11y de 44px (audit checa via
`getBoundingClientRect`). Botão "Ocultar" usa variante destrutiva
(border + hover:bg-danger) para sinalizar consequência irreversível;
botão "Resolver" usa variante primária (bg-accent). O `<input
type="text" name="note">` para nota opcional do operador herda o
estilo dos inputs do shell — verificado contra `apps/web/app/components/bivaque/`.

**Botão "Sair" / logout:** não foi adicionado nesta onda. O
operador está num computador compartilhado do moderador; logout é
via `/api/auth/signout` ou pela rota de logout centralizada (não
escopo da Onda 1). Se virar follow-up, caminho recomendado: Server
Action no `(admin)/layout.tsx` que faz `supabase.auth.signOut()` e
redireciona para `/login`.

---

## Itens do design system usados pela tela

Verificados contra `apps/web/app/components/bivaque/` (lista não
exaustiva — referência para quem mexer na tela depois):

- **Container**: `mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12`
  (mesmo padrão de `/profile` em estrutura).
- **Card de report**: `flex flex-col gap-3 rounded-md border
  border-border p-4` — surface pattern do design system.
- **Botão primário** (Resolver): `rounded-md border border-border
  bg-accent px-4 py-2 text-sm font-medium text-accent-foreground
  transition-colors hover:bg-accent/90`.
- **Botão destrutivo** (Ocultar): `rounded-md border border-border
  bg-surface px-4 py-2 text-sm font-medium transition-colors
  hover:bg-danger hover:text-danger-foreground`.
- **Input texto** (nota): `rounded-md border border-border bg-surface
  px-3 py-2 text-sm`.

Sem cores cruas, sem tamanhos fora da escala tipográfica, sem
classes utilitárias inventadas. Token discipline mantida.

---

## Achados pré-existentes (não bloqueiam a Onda 1)

O loop capturou todas as 13 rotas × 3 viewports. Total: 45 HIGH,
123 findings. Achados concentrados em:

- `/login`: 9 HIGH (touch-target em botões curtos, contrast no
  hero — pré-existentes da HeroUI v3 migration).
- `/events`, `/recommendations`, `/notifications`, `/groups`,
  `/onboarding`: touch-target e font-too-small herdados da
  auditoria Phase 2 do plano de auditoria visual
  (`docs/superpowers/plans/2026-08-05-auditoria-telas.md`).

Esses achados são backlog mecânico da Phase 2 — não desta onda.

---

## Status do gate §10.2

A Onda 1 está **fechada em forma**:

- ✓ Tela `(admin)/reports` auditada nos 3 viewports: 4/4 itens da
  rubrica §9 passam, 0 achados mecânicos novos.
- ✓ Auth gate duplo verificado: layout redireciona sem sessão e sem
  operador; página só renderiza para `private.is_operator()` = true.
- ✓ Veredito escrito (este documento) — sem ele, a onda não fecha
  (per §10.2 do MAP).

A separação da Onda 2 (esta usou nome distinto
`VISUAL_AUDIT-2026-08-06-moderation.md`) evita conflito de merge
quando outras ondas gerarem seus próprios vereditos no mesmo dia.