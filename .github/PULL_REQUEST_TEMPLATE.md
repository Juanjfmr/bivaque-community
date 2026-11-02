## What
<!-- One-sentence summary of the change. -->

## Why
<!-- Name the board card (and the docs/LANCAMENTO.md item) this closes. -->

## Scope
<!-- Files touched, surfaces affected (UI, DB, API, CI). One line per area. -->

## Gate evidence
<!-- Green output of `npx pnpm@11.18.0 gate` from the last run, with the revision. -->
<!-- If only `--fast` ran, say so and why it is enough for this change. -->

## Tests
<!-- What was added or updated, and where. RED → GREEN proof for any behavior change. -->
<!-- pgTAP: `npx pnpm@11.18.0 test:db` excerpt. E2E: specs, viewports and themes. -->

## Visual impact
<!-- Screens touched: captures at 375/768/1440, light and dark, under `.visual/<run>/`, and the Nextdoor bar verdict. -->

## Privacy and trust boundary
<!-- Required when touching auth, RLS, the `private` schema, verification, family accounts, or anything that reads or writes CPF, Portal data, military organization, rank, address or documents. -->
<!-- Confirm the scope column and its policies landed in the same migration, with positive and negative tests. -->
<!-- R3 decided by delegation: link the ADR and its row in docs/decisions/RATIFICACAO.md. -->

## Risks
<!-- Anything reviewers should scrutinize: migration safety, ordering, backfill, lock scope. -->

## Out of scope
<!-- Anything intentionally left for follow-up, with its board card. -->
