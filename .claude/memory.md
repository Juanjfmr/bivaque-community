# Project Memory — Bivaque Community

This file is the durable project memory index. The actual memory lives in `docs/`; this index points to it.

## Read first

- **[`docs/journeys/MAP.md`](../docs/journeys/MAP.md)** — entry point. Functional state of every area, what is prioritised, sequencing rules that decide whether work is legitimate.
- **[`AGENTS.md`](../AGENTS.md)** — repo rules, gate commands, known traps, scope contracts enforced by `tests/scope/`.

## Visual language

- **[`docs/agents/DESIGN_SPEC.md`](../docs/agents/DESIGN_SPEC.md)** — visual language, source of truth for tokens.
- **[`docs/agents/VISUAL_GUIDE.md`](../docs/agents/VISUAL_GUIDE.md)** — audit rubric (§9).
- **[`docs/agents/QWEN_BUILD_PROMPT.md`](../docs/agents/QWEN_BUILD_PROMPT.md)** — driving prompt for visual build loop.

## Approved designs and executable plans

- **`docs/superpowers/specs/`** — approved designs. Dated conflicts are recorded rather than hidden.
- **`docs/superpowers/plans/`** — executable plans derived from those specs.

## Operator runbook

- **[`docs/PILOT_RUNBOOK.md`](../docs/PILOT_RUNBOOK.md)** — operator-facing procedures (local stack, db resets, visual loop).

## Privacy boundary (recap)

- `private` schema (`verification_outcomes`, `family_invitations`, `family_account_links`) is **never** exposed via the Data API. `anon`/`authenticated` have no table privileges there — only `private.is_locality_member(uuid)` execution.
- RLS is enabled **and** forced on every public table.
- Never persist: raw CPF, Portal payload, military organisation, rank, residential address, documents, or a public verification badge.

## Padrão 6 (failure mode this repo keeps repeating)

A scope column shipped without the policies that read it. If you add a scope column, the policies that read it land in the **same migration** — never "in future".
