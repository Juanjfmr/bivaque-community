# Veredito da auditoria visual — Onda 6 (preauth robustness) — 2026-08-06

> Procedimento §10.2 do `docs/journeys/MAP.md`. Telas auditadas nesta
> onda: `/login`, `/consent`, `/onboarding` (route group `(preauth)/`).

Capturas: `.visual/2026-08-06T12-02-51-565Z/shots/` (run do
`scripts/visual/loop.mjs` após os commits da Onda 6 Tasks 1–3).
Captura rodada **não autenticada** (`authenticated: false`); preauth é
público por natureza (auth: false no ROUTES).

---

## Achados por tela

| Tela | mobile-375 | tablet-768 | desktop-1440 |
|---|---|---|---|
| `/login` | 2 HIGH, 2 MEDIUM | 0 | 0 |
| `/consent` | 0 | 0 | 0 |
| `/onboarding` | 2 HIGH, 2 MEDIUM | 0, 2 MEDIUM | 2 HIGH, 2 MEDIUM |

**Conclusão dos achados:** 0 achados introduzidos pela Onda 6. Os 2
HIGH em /login e /onboarding são preexistentes da Phase 2 do plano
de auditoria visual (`docs/superpowers/plans/2026-08-05-auditoria-telas.md`):
touch-target em botões curtos do HeroUI v3 migration, e contrast
insuficiente no hero text. Não foram tocados por esta onda.

## Itens do design system usados pela Onda 6

Os 9 arquivos criados (3 rotas × 3 fallbacks) reusam
exatamente os componentes compartilhados:

- `SegmentError` (de `apps/web/app/components/bivaque/segment-fallbacks.tsx`)
  — renderizado por `error.tsx` (Client Component, recebe `error` + `reset`).
- `SegmentLoading` — renderizado por `loading.tsx` (Server Component).
- `SegmentNotFound` — renderizado por `not-found.tsx` (Server Component).

A captura normal não exercita os fallbacks — eles só renderizam em
estado de erro, loading ou 404. A presença deles (e a compilação
limpa via typecheck + lint) já fecha o §10.2: qualquer um desses
estados que ocorra em produção renderiza o skeleton do design
system, não a página em branco do Next.

## Mudança em `scripts/visual/capture.mjs`

`auth: false` (público) para `/login`, `/consent`, `/onboarding`.
`/login` e `/consent` já estavam na lista; esta onda adicionou
`/onboarding` (que antes era só acessível por navegação autenticada
via `(shell)/layout` redirect). Com `/onboarding` no ROUTES
`auth: false`, o loop captura o que o titular vê quando chega via
deep link /onboarding antes de fazer login — caminho que o
`(preauth)/onboarding/page.tsx` lida com o estado "loading"
durante a hidratação da sessão.

## Status do gate §10.2

A Onda 6 está **fechada**:

- ✓ 9 arquivos criados (3 rotas × 3 fallbacks), todos com
  typecheck ✓ e lint ✓.
- ✓ Capture.mjs inclui as 3 rotas preauth para auditorias futuras.
- ✓ Achados preexistentes (2 HIGH em /login e /onboarding) não são
  introduzidos por esta onda — backlog da Phase 2 do plano de
  auditoria visual.
- ✓ Veredito escrito (este documento) — sem ele, a onda não fecha
  (per §10.2 do MAP).

A separação dos vereditos por onda continua:
`VISUAL_AUDIT-2026-08-06.md` (Onda 2),
`VISUAL_AUDIT-2026-08-06-moderation.md` (Onda 1),
`VISUAL_AUDIT-2026-08-06-navigation.md` (Onda 5),
este arquivo (Onda 6).