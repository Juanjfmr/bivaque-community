# apps/app — the signed-in app

React single-page app: Vite, TanStack Router and Query, shadcn/ui with its code in the repository.
Served at `/app` beside the Next server. Root rules in [AGENTS.md](../../AGENTS.md) apply first.

## Visual system

- One piece library: `src/pecas/` (`pecas.tsx`, `pecas.css`), shown in the DEV gallery
  `/app/previa/pecas`. Screens compose pieces; a screen's CSS only lays them out and never redefines
  a piece. A missing piece is added to the library and the gallery, not drawn locally.
- Rules of the pieces: [IDENTIDADE-DAS-PECAS.md](../../docs/agents/regua-nextdoor/IDENTIDADE-DAS-PECAS.md).
  Screen pattern: [PADRAO-DE-TELA.md](../../docs/agents/regua-nextdoor/PADRAO-DE-TELA.md). Bar and
  method: [regua-nextdoor/HANDOFF.md](../../docs/agents/regua-nextdoor/HANDOFF.md).
- Every rebuilt screen starts from Nextdoor (or another mature app) screens on Mobbin, cited by link
  in the card. Illustrations come from the family in `public/ilustracoes/`; no AI photos of people.
- Both themes follow the system. Material Symbols are self-hosted, only the glyphs used, decorative
  with `aria-hidden`; the icon text never enters the accessible name.
- No Material Web, no HeroUI here. What shadcn lacks is built with Radix and Tailwind.

## Behavior

- The app owns history: back closes dialog, sheet and menu before leaving a screen; back and forward
  restore scroll, filters, focus and the active tab of each entry. Screens do not depend on router
  specifics; routing stays in a thin layer.
- Every async surface distinguishes loading, true empty, denied, recoverable error and populated. A
  failed query rendered as an empty list is a bug.
- Copy talks to the person: no URLs, internal names or "not available here"; offer the real next step.
- Previews with demo data live under `src/previa-*` and exist only in the DEV server (`main.tsx`); the
  production build must not contain them.

## Proof

```sh
npx pnpm@11.18.0 --filter @bivaque/app test       # vitest
npx pnpm@11.18.0 --filter @bivaque/app typecheck
npx pnpm@11.18.0 --filter @bivaque/app build
npx pnpm@11.18.0 --filter @bivaque/app test:e2e   # six viewports, 320 to 1440
```

A screen closes with captures at 375/768/1440 in light and dark, no console errors, no horizontal
overflow, at most one primary action visible, keyboard and screen-reader paths checked, and a blind
review against the Nextdoor bar.
