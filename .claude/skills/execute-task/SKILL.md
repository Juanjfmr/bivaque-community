---
name: execute-task
description: Use when implementing or repairing a Bivaque task or delegated batch.
---

# execute-task

Follow the current process §0 in `docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md`.
Reuse the selected Kanban card and existing batch contract; do not add a plan or YAML per component.

1. Validate the affected contract with `node scripts/agents/task-contract.mjs <path>`.
   For delegation use a valid YAML; field/risk rules live in `docs/agents/TASK_CONTRACT.md`.
2. Reproduce its baseline. If it differs, inspect the evidence and reconcile the contract/card
   before proceeding; ask only when authority or a necessary product decision is missing.
3. Make the smallest change that satisfies acceptance. Preserve other sessions' edits.
   `allowed_paths` is scope, not a sandbox: inspect necessary extra hunks, update and revalidate
   the same contract if safe and already authorized, and review them together. `forbidden`
   and R3 boundaries still apply; do not broaden authority yourself.
4. Implementation and proof are one unit. Test both allowed and denied paths where applicable.
   Applied migrations stay immutable; scope columns and their policies land together.
5. Use `runtime-proof` to select evidence and `gate-before-done` to close without duplicate runs.
   Record command, revision, outcome and remaining limitation once in the card.
6. Follow risk routing in `docs/agents/AGENT_ARCHITECTURE.md`: R0 may close with its applicable
   checks; other levels need independent review/runtime proof and required ADR/security review.
   Give the reviewer criteria/reference/diff before any explanation defending the solution.

`retry_budget` limits repairs of the same defect. Exhaustion yields FAIL/BLOCKED/HUMAN_DECISION,
never PASS. A blocked flow does not stop independent work within authorized scope.
