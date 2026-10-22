# AGENTS.md — Bivaque Community

National, verification-gated community for federal military, veterans, pensioners and families.
Next.js web + React Native/Expo mobile share Supabase contracts and authorization, never web UI.
Respond in Brazilian Portuguese. Preserve other sessions' changes; inspect the working diff first.

## Authority and context — read once, then consult by task

1. For the current web reconstruction, start with [process §0](docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md#0-execução-enxuta-das-pranchas-web--08092026), [owner corrections](docs/design/visual-guide-2026-09-06/DECISOES-2026-09-07.md) and the selected card. This supersedes older mandatory rereads, serial wave queues and per-adjustment plans/gates. Do not restart W00 or discard existing screens.
2. Consult the relevant routes in the [functional web spec](docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md). Deliver working entry, action, persistence, feedback, follow-up and main failure path; UI alone does not close a flow. Mobile does not block this web delivery.
3. For UI work, consult the [screen map](docs/design/visual-guide-2026-09-06/MAPA-DE-TELAS.md), [guide instructions](docs/design/visual-guide-2026-09-06/AGENTS.md), [correction notes](docs/design/visual-guide-2026-09-06/README.md) and relevant images/recovery states in the [gallery](docs/design/visual-guide-2026-09-06/index.html). Notes override inconsistent image details; only manifest files count as delivered images.
4. Read the nearest scoped instructions when touching `apps/web/**` or `supabase/**`. Consult [BIVAQUE.md](docs/BIVAQUE.md) for historical intent, [PRODUCT_STATUS.md](docs/PRODUCT_STATUS.md) for recorded implementation evidence, and the applicable ADRs in `docs/decisions/`. None substitutes runtime verification.

Later explicit owner instructions and the current construction authority supersede conflicting older product/design choices. Preserve security, privacy, server authorization, accessibility and data integrity; do not reopen product choices already authorized. Technical R3 decisions still follow [RISK_MATRIX.md](docs/decisions/RISK_MATRIX.md).

Target: national; Manaus is an example, not an access boundary. Navigation: **Início / Explorar / Comunidades / Perfil**, with Guia and Mercado entry points; light surfaces and deep green.
The six owner corrections cover the exact military label, CPF with private identity/AI fallback, optional joining reason, city-wide questions, event information requests and optional self-declared Force/OM with individual visibility controls. Product authorization does not prove delivery or authorize new providers/retention policies.

The private parent `Juanjfmr/Bivaque` is reference, not law (see BIVAQUE §1.5). Forja-90 is legacy reference only: never copy its files. `docs/journeys/MAP.md` is historical.

## Execution and evidence

- Deliver one small flow or 1–3 related screens per batch. Reuse its card and contract; no separate plan/report when they already define acceptance. A blocker stops dependent work, not independent flows.
- One executor writes per checkout. Parallel executors require isolated worktrees, independent paths and separate servers/ports; worktrees do not isolate databases. Resets/migrations/database-writing tests are exclusive on the target stack. Never reset a shared or remote database to obtain a green check.
- Before delegation, read [AGENT_ARCHITECTURE.md](docs/agents/AGENT_ARCHITECTURE.md) and [TASK_CONTRACT.md](docs/agents/TASK_CONTRACT.md). Use one valid `docs/agents/tasks/*.task.yml` per delegated batch; validate with `node scripts/agents/task-contract.mjs <path>`. Isolated subagents are the default; a communicating team needs justification. Follow the risk routing, including R3 approval/security review.
- Implementer, reviewer and runtime-verifier are distinct where the risk/process requires them. Reviewer forms the first verdict from criteria/reference/diff, without the implementer's defense. An exhausted `retry_budget` yields FAIL/BLOCKED/HUMAN_DECISION, never PASS.
- During edits, run affected checks. At stable implementation batch closure, run the complete gate once and the required flow/denial/visual proofs; avoid duplicate builds. R0 documentation-only maintenance uses links/references, affected contract checks and lint; do not claim an unrun global gate passed. UI batches audit touched routes at 375/768/1440 before closing. Apply the current process over older serial-wave audit rules.
- Integration/publication requires the applicable regression, CI of the delivered revision and process G6. CI, code review and runtime verification are separate layers: report what actually ran and against which revision. There is no fully automated independent review/runtime chain.
- Record evidence once in the card; logs/captures belong in `.visual/` or the existing evidence directory. Update PRODUCT_STATUS only when a functioning claim changes; remove a row only after the complete user cycle is proven. Historical evidence is not a fresh PASS.
- Correct introduced regressions, broken primary flows, privacy/access defects and essential accessibility failures before integration. Proven preexisting failures remain open with a concrete next step; they do not make the global gate green.

## Board workflow

Read [tools/backend-kanban/BOARD.md](tools/backend-kanban/BOARD.md) before planning/changing the repository; then consult `node tools/backend-kanban/src/board.mjs --card <ID>` or `--search <terms>`. Autonomous card work uses `node tools/backend-kanban/src/board.mjs --next`: implement, validate, update and commit one returned card. Priority never overrides current product authority or observed runtime.

- Keep material transitions with the work: proof, blocker, drift, priority/status or completion; merely starting work is not a board transition. Routine read-only answers need no update.
- Edit canonical `tools/backend-kanban/public/board.json`, never BOARD.md by hand. Regenerate with `node tools/backend-kanban/src/board.mjs --write-summary`; CI rejects invalid data or a stale summary. Do not create a second task system or mark done without applicable acceptance and evidence.
- **Resolve cards; do not stop at drift.** Reconcile the stale source, implement the missing behavior or record a real blocker and concrete resolution step. A `done` card may not keep open drift.
- **The discovering agent records a genuinely new task.** Search existing IDs, titles and checklists first; extend the same closure contract where possible. Otherwise add a stable ID, priority/category/status, source evidence, updatedAt, confronted Git `sourceRevision`, checklist and explicit `dependencies`. New product/personal-data/payment/RLS/R3 work enters `blocked` or `repo` until its required decision/ADR exists; discovery is not authority to invent scope.

## Commands and validation

Node >=22; use `npx pnpm@11.18.0` (pnpm/corepack are not on the dev host PATH). `package.json`, configs and tests define exact versions/scripts; do not casually upgrade pins.

```sh
npx pnpm@11.18.0 gate        # lint -> typecheck -> build -> test -> secrets; stops at first failure
npx pnpm@11.18.0 gate --fast # lint + typecheck only; partial, not completion proof
npx pnpm@11.18.0 test        # unit + privacy + scope
npx pnpm@11.18.0 test:scope  # after scripts/config changes
npx pnpm@11.18.0 test:e2e    # browser + configured backend/seed; CI reuses its existing build
npx pnpm@11.18.0 test:db     # canonical database test name; never db:test
npx pnpm@11.18.0 db:lint
```

- Supabase needs Docker and `npx pnpm@11.18.0 exec supabase start` first. Confirm the target stack before any reset. Local only, never `--linked`.
- DB proof: reset `--local --no-seed`, then `test:db` and `db:lint`, without dev server/capture writes. Reset with seed separately for E2E. The two states are deliberate; do not merge them. See `.github/workflows/pull-request-ci.yml` for CI order.
- Write `apps/web/.env.local` before build: Next inlines `NEXT_PUBLIC_*`. CI derives disposable keys from the local stack, without repository Supabase secrets. Never print secrets.
- `node scripts/visual/loop.mjs` runs the complete gate, serves, captures and audits; do not repeat its gate/build. `--fast` runs lint/types and captures against a running server. Capture only: `node scripts/visual/capture.mjs`; set `BIVAQUE_VISUAL_ROUTE` for a registered route. Confirm the intended role/page, not login/403; captures alone do not prove interactions. Evidence: `.visual/<run>/`.
- Playwright projects: `mobile-375`, `tablet-768`, `desktop-1440`; server `http://127.0.0.1:3000`. Smoke expects heading "Bivaque" and `/api/health` -> `{"status":"ok"}`. Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` only as a local browser override.
- E2E credentials come from env, falling back to `.env.local`; fail when absent, never inline them. Specs use `process.cwd()` for paths, not `import.meta` (CJS transpilation). Reports/results are ignored and excluded from Biome; no pre-lint cleanup needed.
- Before blaming a diff, reproduce the failure cleanly. Visual Capture can insert a ghost profile and spoil pgTAP counts: reset only the isolated target without server/capture, then rerun. Inspect stale ignored `dev-server.pid`/`.log` before retrying the visual server.

## Technical and data boundaries

- Workspace roots: `apps/{web,mobile}` and `packages/{contracts,domain,tokens}`. Next stays on the server runtime; no `output: "export"`.
- Web: HeroUI v3 only; no shadcn/Radix/Headless UI imports. Reuse wrappers in `apps/web/app/components/bivaque/`; preserve the mounted ToastProvider under `(shell)/layout.tsx`. Mobile uses native React Native UI. Consult [DESIGN_SYSTEM.md](docs/agents/DESIGN_SYSTEM.md) for tokens/components and [QWEN_BUILD_PROMPT.md](docs/agents/QWEN_BUILD_PROMPT.md) for the visual loop; current guide wins visual conflicts.
- Supabase CLI remains pinned at 2.107.0 with `[inbucket]`, not `[local_smtp]`. Scope tests lock workspace/config/script contracts; update tests only for deliberate contract changes.
- Never edit an applied migration: add a timestamped migration via `npx pnpm@11.18.0 exec supabase migration new <name>`. The single authorized exception is recorded in [ADR-20261022-replay-fixture-migration.md](docs/decisions/ADR-20261022-replay-fixture-migration.md); it is not general permission.
- Scope columns and all policies reading them land in the same migration. Enable and force RLS, minimize grants. The `private` trust schema is never exposed via Data API; anon/authenticated have no table privileges there. Preserve only explicitly granted helper execution, including `private.is_locality_member(uuid)`.
- Generate only public types with `npx pnpm@11.18.0 generate:types`; never expose the private schema. Source of truth: migrations, not wrappers or generated types alone.
- pgTAP fixtures use synthetic `example.invalid` identities/fixed UUIDs inside rollback transactions. Development personas belong in local `supabase/seed.sql`, not migrations; keep seed separate from pgTAP fixtures. For seeded `auth.users`, token columns are `''`, never NULL, to avoid GoTrue password-grant failures.
- Never persist raw CPF, Portal payload, inferred OM, rank, residential address or a public verification badge. Optional self-declared Force/OM and private identity fallback follow the owner corrections and applicable technical ADRs: per-field visibility, minimal access, removal/disposal and positive/negative authorization tests. Broader proposed affiliation fields are not automatically authorized.
- Portal da Transparência is server-only; `chave-api-dados` is a secret, never committed/logged. Tests use fixtures, no real CPF or live Portal calls. Map source `reformado` only to internal `veteran`. Family members remain independent Auth users after invite acceptance.
- Follow Biome (double quotes, no semicolons, 2 spaces, width 100; no explicit any/non-null assertions/parameter assignment; type-only imports). Implementation and its tests are one unit; permission/denial paths need positive and negative cases. Use conventional commits.

## Harness references — consult when needed

- Repository procedures: `.claude/skills/` (`execute-task`, `adversarial-review`, `runtime-proof`, `gate-before-done`, `plan-execution`, `experiment-protocol`, `visual-system-experiment`). Do not assume machine-local plugins exist; OpenCode equivalents are versioned here.
- OpenCode config: `.opencode/opencode.json`; wave execution context: [plans README](docs/superpowers/plans/README.md), subject to process §0. `/run-plan` executes a plan, `/gate` measures, `/harness-doctor` audits configuration.
- Code graph: `codebase-memory-mcp`, project `bivaque-community`; never graphify. For architecture/symbol questions use the available graph with the project parameter, checking freshness/coverage. Fall back to `rg` and exact source when unavailable, stale or partial; do not block simple file searches on indexing.
