---
name: gate-before-done
description: Use before reporting a Bivaque change as verified, committing it, or classifying a failed check.
---

# gate-before-done

Choose verification for the changed property; read the output before reporting PASS.

| Change or stage | Required proof |
|---|---|
| R0 documentation only, without executable/config changes | Links/references, affected contract checks and lint; no build/E2E required |
| Editing executable code | Affected tests; `gate --fast` when useful (lint + types only) |
| Stable implementation batch | `npx pnpm@11.18.0 gate` once: lint → types → build → unit/privacy/scope → secrets |
| Integration/publication | Applicable full regression, CI of the delivered revision, process G6 and production authorization |

R0 documentation is a scoped exception, not permission to call an unrun global gate green.
The complete visual loop already runs the complete gate; reuse its result for the same revision.
Do not repeat gate/build without a relevant change, failure or unresolved concern. Revalidate
changed properties after later edits. `--fast` alone never proves an implementation complete.

The gate excludes DB, E2E and visual proof; use `runtime-proof` when acceptance needs them.
Record each layer separately: code review, local gate, runtime and CI are not interchangeable.

On failure, classify introduced / preexisting / environment after checking evidence. Known traps:
- Capture/dev-server writes spoil pgTAP counts. Confirm the isolated target; reset without seed,
  without concurrent writers, then rerun DB tests. Never reset a shared/remote stack for this.
- Inspect stale ignored visual server pid/log before cleanup; do not kill an unrelated process.
- Supabase needs Docker and a running local stack. External download failures are BLOCKED,
  not product failures or a reason to weaken checks.

Only an actual successful exit supports PASS. Missing or skipped required proof stays pending.
