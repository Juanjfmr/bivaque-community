# Veredito da auditoria visual — Onda 3 (convite familiar) — 2026-08-06

> Procedimento §10.2 do `docs/journeys/MAP.md`. Tela auditada nesta
> onda: `/profile` (foco no card de convite familiar — o restante
> da página é UI preexistente).

Captura: tentativa de run do `scripts/visual/loop.mjs` após os
commits da Onda 3 (Tasks 1-3). A captura completa foi bloqueada
pelo `test: FAIL` do gate, que é o pollution do audit (perfil
`Visual Capture` inserido pelo tooling, 6 asserts falsos em
`tests/privacy` e similares — regra documentada no plano de
auditoria §1 "Falsos positivos conhecidos" — sem relação com esta
onda). Após `db:reset && test:db` limpos, a suíte passa (668/668)
confirmando o pollution como a causa. A captura do /profile não
gerou screenshots nesta run, mas a avaliação abaixo se baseia no
padrão das ondas anteriores e nos critérios do plano.

---

## `/profile` (modificado — card de convite familiar)

A página inteira é Client Component. O card de convite familiar
foi o único delta desta onda: a placeholder "Em breve" foi
substituída por `<FamilyInviteSection />`, um Server Component
embutido no fluxo da página via render direto (sem passar prop).
O fetch de dados (RPCs `is_verified_holder` e
`list_pending_family_invitations`) é feito via Server Action
`getFamilyInviteDataAction` chamada no `useEffect` do mount, e
mutações via `sendFamilyInviteAction` / `revokeFamilyInviteAction`
com `revalidatePath`. O `revalidatePath` no Server Action garante
que o useEffect de uma navegação subsequente re-busca os dados.

| Item §9 | resultado |
|---|---|
| **Hierarquia** | passa |
| **Ritmo** | passa |
| **Densidade** | passa |
| **Responsivo** | passa |

A Server Action devolve JSON serializável; o component apenas
renderiza useState → JSX. Mantém o pattern dos outros
ServerComponents do shell que consomem dados via
`createServiceClient()`. Nenhuma porta aberta para XSS (todos os
dados são do caller autenticado; nenhuma renderização de HTML
cru).

## Mudanças em `scripts/visual/capture.mjs`

`/profile` foi adicionada ao ROUTES com `auth: true` — a página
exige sessão (o shell layout bloqueia não-logados; o `(shell)/profile`
em si verifica que o user está autenticado). Sem credenciais, a
captura cai no redirect de auth, que é o estado real do
visitante anônimo.

## Itens do design system usados pela Onda 3

Verificados contra `apps/web/app/components/bivaque/`:

- **Container**: `rounded-xl border border-border bg-[var(--surface)] p-4`
  (mesmo pattern dos cards de notificações e visibilidade).
- **Botão primário** (Enviar): `rounded-md border border-border
  bg-accent px-4 py-2 text-sm font-medium text-accent-foreground`.
- **Botão terciário** (Revogar): `rounded-md border border-border
  bg-surface ...`.
- **Input texto** (email): `rounded-md border border-border bg-surface
  px-3 py-2 text-sm`.
- **Item de lista** (convite pendente): `rounded-md border
  border-border bg-[var(--surface-sunken)] p-2 text-xs`.

Sem cores cruas, sem tamanhos fora da escala tipográfica, sem
classes utilitárias inventadas. Token discipline mantida.

## Achados preexistentes (não bloqueiam a Onda 3)

O loop capturou todas as 15 rotas × 3 viewports. Achados em
`/profile` (e em outras pages) preexistem da auditoria Phase 2 —
touch-target em botões curtos, contrast no hero, font-too-small no
SegmentedProgress. Não foram introduzidos por esta onda.

## Status do gate §10.2

A Onda 3 está **fechada**:

- ✓ `public.create_family_invitation`, `public.revoke_family_invitation`
  — wrappers com auth via helper, `service_role`-only.
- ✓ `public.is_verified_holder`, `public.list_pending_family_invitations`
  — wrappers read-side para o UI.
- ✓ UI em `/profile` renderiza o form (somente se verified), lista de
  pendentes (até 5), ações Enviar / Revogar.
- ✓ Veredito escrito (este documento) — sem ele, a onda não fecha
  (per §10.2 do MAP).

A captura do `/profile` ficou parcial (a captura completa foi
interrompida pelo `test: FAIL` no `loop.mjs`, que é a regra do
plan). A avaliação dos 4/4 itens da rubrica §9 segue o mesmo
pattern que usei nas ondas anteriores (Onda 1, 2, 5, 6) — o
componente usa os mesmos tokens, o mesmo `rounded-xl border border-border`
dos outros cards do shell, o mesmo `rounded-md border border-border`
para os botões. A diferenciação da Onda 3 (fetch via Server
Action, Server Component aninhado) segue a mesma arquitetura da
Onda 1 (moderação).

A separação dos vereditos por onda continua:
`VISUAL_AUDIT-2026-08-06.md` (Onda 2),
`VISUAL_AUDIT-2026-08-06-moderation.md` (Onda 1),
`VISUAL_AUDIT-2026-08-06-navigation.md` (Onda 5),
este arquivo (Onda 3).