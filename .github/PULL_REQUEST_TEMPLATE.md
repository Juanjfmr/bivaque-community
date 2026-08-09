## What
<!-- One-sentence summary of the change. -->

## Why
<!-- Link the issue, spec, or plan that motivates this. If a plan exists under `docs/superpowers/plans/`, link it. If this closes a row on `docs/journeys/MAP.md`, name it. -->

## Scope
<!-- Files touched, surfaces affected (UI, DB, edge, CI). One-line per area. -->

## Gate evidence
<!-- Paste the green output of `npx pnpm@11.18.0 gate` from the last run. -->
<!-- If you only ran `--fast`, say so explicitly and explain why `--fast` is sufficient for this change. -->

## Tests
<!-- What you added or updated, and where. -->
<!-- RED → GREEN proof for any behavior change: test runner output before AND after. -->
<!-- pgTAP changes: paste `npx pnpm@11.18.0 test:db` excerpt. -->
<!-- E2E: which spec(s) and which viewports. -->

## Visual impact
<!-- If a screen was created, redesigned, or touched, link the visual audit run under `docs/agents/`. -->
<!-- Phase 1 (accessibility) and Phase 2 (critical visual bugs) may run at any time. -->
<!-- Everything else cosmetic waits its wave — see MAP §10.2. -->

## Privacy and trust boundary
<!-- Required when touching: auth, RLS, the `private` schema, the verification flow, family accounts, or anything that reads/writes CPF / Portal / military org / rank / residential address / documents. -->
<!-- Confirm the scope column + its policies landed in the same migration (MAP Padrão 6). -->

## Risks
<!-- Anything reviewers should scrutinize. Migration safety, ordering, backfill semantics, lock scope. -->

## Out of scope
<!-- Anything intentionally left for follow-up, with a pointer (issue, plan, MAP row). -->

## Conventional commit
<!-- `feat|fix|chore|test(scope): …` -->
<!-- One commit per todo. Implementation and test are ONE todo. -->
