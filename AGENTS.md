# AGENTS.md — Bivaque Community

National, verification-gated community for federal military, veterans, pensioners and families.
The signed-in app is a React single-page app in `apps/app` (Vite, TanStack Router/Query, shadcn/ui); Next.js in
`apps/web` stays as server and public landing; the store app is Capacitor over the same build, after web.
Respond in Brazilian Portuguese. Preserve other sessions' changes; inspect the working diff first.

## Authority and context — read once, then consult by task

1. Current authority: the [22/10 handoff](docs/agents/HANDOFF-COORDENACAO-2026-10-22.md), the relevant lot in [the 19/10 audit §6](docs/AUDITORIA_ADERENCIA_2026-10-19.md), and the selected card. The HTML prototype is the product specification until the owner approves each wave in `apps/app`; from then on the new app is the reference for that part. Consult only the relevant flow, not the entire audit on every task.
2. The [React SPA ADR](docs/decisions/ADR-20261024-front-react-spa.md) governs the app: it replaces the [Material Web porting ADR](docs/decisions/ADR-20261022-porte-visual-material-web.md) for components, icons and screen-by-screen migration, keeping its R70 tokens, self-hosted Noto, system-following theme and capture proof. Status: [prototipo-shadcn/STATUS.md](docs/agents/prototipo-shadcn/STATUS.md); per-flow direction and approved references: [fluxos-2026-10-30](docs/design/fluxos-2026-10-30/README.md). Apply the accepted ADRs for [visual identity](docs/decisions/ADR-20261020-identidade-visual-e-tema-escuro.md), [Community redesign](docs/decisions/ADR-20261024-redesenho-da-comunidade.md), [entry](docs/decisions/ADR-20261022-entrada-do-prototipo.md), [location](docs/decisions/ADR-20261022-localizacao-padrao-de-mercado.md) and [data foundation](docs/decisions/ADR-20261022-fundacao-dados-bairros-ocultar-chamados.md) where applicable. Later explicit owner decisions override older product/scoped instructions. These decisions authorize implementation; they do not prove it is delivered.
3. The lean cadence in [process §0](docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md#0-execução-enxuta-das-pranchas-web--08092026) still applies. September specs, Figma/PNG guides and [BIVAQUE.md](docs/BIVAQUE.md) are historical context wherever October decisions replace them. Do not restart W00 or restore superseded layouts/navigation. Deliver entry, action, persistence, feedback, follow-up and the main failure path. Mobile does not block this web delivery.
4. Read nearest scoped instructions for technical work in `apps/web/**` or `supabase/**`, subject to the current ADRs above. [PRODUCT_STATUS.md](docs/PRODUCT_STATUS.md) records dated evidence; verify source and runtime. Before selecting work, compare the checkout base and board with the latest merged PRs; do not mistake this older branch's code for current main.

Later explicit owner instructions and the current construction authority supersede conflicting older product/design choices. Preserve security, privacy, server authorization, accessibility and data integrity; do not reopen product choices already authorized. Technical R3 decisions still follow [RISK_MATRIX.md](docs/decisions/RISK_MATRIX.md).

Target: national, organized by city; Manaus is an example, not an access boundary. Launch without charging. Navigation is Início · Comunidade · [Criar] · Mercado · Você, with Conversas as a top icon (SPA ADR §3.1, which changes the prototype); brand and light/dark themes follow the system. `communities` and `community_id` are legacy; their presence in the database does not make communities a current product feature.
Entry follows ADR-20261022-entrada-do-prototipo: account → acceptance for Google when needed → CPF without a prior relationship question → result/review → city and moment → welcome. `/consent` is required by the Google acceptance step (PR #104); do not remove it using an older orphan-route card. Family code, pending timeline, resume, deleted-account and public Help are authorized scope, not automatically implemented features.
Declared OM may be used privately for the person's own distance calculations. Exposure of Force/OM to other members remains pending under BLOCK-AFFILIATION; do not infer permission to disclose from the older September guide.

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

Documentation/board reconciliation baseline: main `c4945a46` (PRs #99–#105 and #112 merged). The `apps/app` line (PR #116 and branches built on it) contains that revision plus the SPA work, which is not on main yet. Done statuses describe the integrated main revision, not a local runtime PASS. Reconcile later main changes before implementation; preserve local historical proof by its original revision.

- Keep material transitions with the work: proof, blocker, drift, priority/status or completion; merely starting work is not a board transition. Routine read-only answers need no update.
- Edit canonical `tools/backend-kanban/public/board.json`, never BOARD.md by hand. Regenerate with `node tools/backend-kanban/src/board.mjs --write-summary`; CI rejects invalid data or a stale summary. Do not create a second task system or mark done without applicable acceptance and evidence.
- **Resolve cards; do not stop at drift.** Reconcile the stale source, implement the missing behavior or record a real blocker and concrete resolution step. A `done` card may not keep open drift.
- **A `done` card may not depend on a card that still has work** (`now`, `next` or `repo`); the validator refuses it. Depending on a `blocked` or `frozen` card is allowed: those wait on a human decision, not on work.
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
- Playwright projects: `mobile-375`, `tablet-768`, `desktop-1440`; server `http://127.0.0.1:3000`. Smoke expects heading "Bivaque" and `/api/health` -> `{"status":"ok"}`. Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` only as a local browser override. `apps/app` has its own suite (`npx pnpm@11.18.0 --filter @bivaque/app test:e2e`): `vite preview` on `http://127.0.0.1:3200/app/`, six viewports from 320 to 1440.
- E2E credentials come from env, falling back to `.env.local`; fail when absent, never inline them. Specs use `process.cwd()` for paths, not `import.meta` (CJS transpilation). Reports/results are ignored and excluded from Biome; no pre-lint cleanup needed.
- Before blaming a diff, reproduce the failure cleanly. Visual Capture can insert a ghost profile and spoil pgTAP counts: reset only the isolated target without server/capture, then rerun. Inspect stale ignored `dev-server.pid`/`.log` before retrying the visual server.

## Technical and data boundaries

- Workspace roots: `apps/{app,web,mobile,prototipo}` and `packages/{contracts,domain,tokens}`. `apps/prototipo` is a theme/component/data source and leaves when wave 1 ends. `apps/mobile` (React Native/Expo) is superseded by Capacitor (SPA ADR §6): do not extend it. Next stays on the server runtime; no `output: "export"`.
- `apps/app` uses shadcn/ui with its code in the repository; what shadcn lacks is built with Radix and Tailwind. No Material Web or HeroUI there. Prototype tokens are translated to the shadcn theme in both themes; Material Symbols are self-hosted, only the icons used, decorative with `aria-hidden` (icon text never enters the accessible name). Screens do not depend on router specifics.
- Each journey moves in order: demo data → owner visual approval → database/API → e2e at three sizes → migrated test coverage → only then the old `apps/web` screen leaves, with its code and tests (SPA ADR §8). No old screen leaves before the vertical proof (§7). Until then HeroUI stays only on old `apps/web` screens; preserve required providers in their actual layouts (PR #101). Old routes redirect to the new ones and proxy gates move in the same PR, without redirect cycles.
- Every new API route follows SPA ADR §5 with positive and negative tests: one session resolver (web cookie or `Authorization` token; conflicts refused; an invalid token never falls back to the cookie; it yields a user client under RLS; `service_role` only with explicit authorization in code); CSRF via `Origin` allowlist plus an app header on cookie writes; explicit CORS, no credentialed wildcard; protected media by short-lived signed URL or authenticated fetch; uploads still pass `sanitize-image`. Shared validation lives in one module called by the old action and the new route.
- Supabase CLI remains pinned at 2.107.0 with `[inbucket]`, not `[local_smtp]`. Scope tests lock workspace/config/script contracts; update tests only for deliberate contract changes.
- Never edit an applied migration: add a timestamped migration via `npx pnpm@11.18.0 exec supabase migration new <name>`.
- Scope columns and all policies reading them land in the same migration. Enable and force RLS, minimize grants. The `private` trust schema is never exposed via Data API; anon/authenticated have no table privileges there. Preserve only explicitly granted helper execution, including `private.is_locality_member(uuid)`.
- Generate only public types with `npx pnpm@11.18.0 generate:types`; never expose the private schema. Source of truth: migrations, not wrappers or generated types alone.
- pgTAP fixtures use synthetic `example.invalid` identities/fixed UUIDs inside rollback transactions. Development personas belong in local `supabase/seed.sql`, not migrations; keep seed separate from pgTAP fixtures. For seeded `auth.users`, token columns are `''`, never NULL, to avoid GoTrue password-grant failures.
- Never persist raw CPF, Portal payload, inferred OM, rank or a public verification badge. The location ADR permits CEP/coordinates: CEP required for property, optional for resale/service request/profile; the profile origin is calculation-only and must not be readable by another member. Item address/map disclosure follows the advertiser's approved exact/approximate choice, not the profile visibility setting. Geocoding is server-side (BrasilAPI, Google fallback), cached; do not invent coordinates. Declared OM for private calculations does not authorize public affiliation. Identity documents remain private within the approved verification flow; valid signed PDF is preserved byte-for-byte, not treated like a photo to rewrite. Preserve removal/disposal and positive/negative authorization proofs.
- Portal da Transparência is server-only; `chave-api-dados` is a secret, never committed/logged. Tests use fixtures, no real CPF or live Portal calls. Map source `reformado` only to internal `veteran`. Family members remain independent Auth users after invite acceptance.
- Follow Biome (double quotes, no semicolons, 2 spaces, width 100; no explicit any/non-null assertions/parameter assignment; type-only imports). Implementation and its tests are one unit; permission/denial paths need positive and negative cases. Use conventional commits.

## Harness references — consult when needed

- Repository procedures: `.claude/skills/` (`execute-task`, `adversarial-review`, `runtime-proof`, `gate-before-done`, `plan-execution`, `experiment-protocol`, `visual-system-experiment`). Do not assume machine-local plugins exist; OpenCode equivalents are versioned here.
- OpenCode config: `.opencode/opencode.json`; wave execution context: [plans README](docs/superpowers/plans/README.md), subject to process §0. `/run-plan` executes a plan, `/gate` measures, `/harness-doctor` audits configuration.
- Code graph: `codebase-memory-mcp`, project `bivaque-community`; never graphify. For architecture/symbol questions use the available graph with the project parameter, checking freshness/coverage. Fall back to `rg` and exact source when unavailable, stale or partial; do not block simple file searches on indexing.
