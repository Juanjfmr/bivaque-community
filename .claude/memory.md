# Project Memory — Bivaque Community

This file is the durable project memory index. The actual memory lives in `docs/`; this index points to it.

## Read first

- **[`docs/BIVAQUE.md`](../docs/BIVAQUE.md)** — what the product **must be**: vision, roles, decisions, monetisation, sequencing.
- **[`docs/PRODUCT_STATUS.md`](../docs/PRODUCT_STATUS.md)** — what the code **does today**, with file:line evidence and the gap to the target.
- **[`AGENTS.md`](../AGENTS.md)** — repo rules, gate commands, known traps, scope contracts enforced by `tests/scope/`.

Never infer one of the first two from the other. `docs/journeys/MAP.md` is **historical** (superseded 2026-08-11) — an earlier revision of this file opened by pointing at it, which is exactly how a session ends up reading a decision as a delivered feature.

## Harness (agents, skills, contracts)

- **[`docs/agents/AGENT_ARCHITECTURE.md`](../docs/agents/AGENT_ARCHITECTURE.md)** — the seven roles, the execution loop, the composition patterns, risk routing.
- **[`docs/agents/TASK_CONTRACT.md`](../docs/agents/TASK_CONTRACT.md)** — the unit of execution. Contracts live in `docs/agents/tasks/`, validated by `node scripts/agents/task-contract.mjs`.
- **`.claude/skills/`** — the procedures are versioned in this repository, not on a developer's machine: `execute-task`, `adversarial-review`, `runtime-proof`, `gate-before-done`, `plan-execution`, `experiment-protocol`, `visual-system-experiment`.

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
