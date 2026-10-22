---
name: runtime-proof
description: Use when selecting evidence for Bivaque acceptance criteria or deciding whether a task can close.
---

# runtime-proof

A declared route, policy or component is not observed behavior. Choose the layer where the
changed property can fail; use `gate-before-done` for the shared gate and documentation exception.

| Property | Evidence |
|---|---|
| Pure logic/module | Affected unit tests |
| Repository scripts/config/structure | Scope tests |
| DB authorization | pgTAP with positive and negative cases and the real caller |
| User interaction | E2E of the affected flow and main failure/denial paths |
| Appearance/accessibility | Touched-route captures/audit at 375/768/1440 plus interaction proof |

Database states are separate and exclusive on an isolated stack:
1. Confirm project/ports and no concurrent writers. Start the local stack, reset without seed,
   run `test:db` and `db:lint`. Worktrees do not isolate the database.
2. Reset the same isolated stack WITH seed, set its env before build, then run required E2E.
   A migration does not justify skipping E2E when the seed can be restored safely.
3. If the environment cannot support a required proof, record the precise blocker and next step;
   never bypass admission/authorization or reset a shared/remote database.

Record revision, command, result and evidence once in the existing card:
- PASS: every applicable acceptance criterion has its required observation.
- FAIL: identify introduced, preexisting or known-trap failure using evidence.
- BLOCKED: required environment/authority is missing; report what did run separately.

Skipped tests, stale evidence and exhausted retries never close missing acceptance criteria.
Independent runtime adjudication follows the risk routing; the implementer's claim alone
is not independent verification.
