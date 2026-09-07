# AGENTS.md — Bivaque Community

## Owner corrections — 2026-09-07

Read [the six explicit corrections](docs/design/visual-guide-2026-09-06/DECISOES-2026-09-07.md). They require city-wide questions, event information requests, an optional reason for joining, the exact military label, fast CPF verification with identity/AI fallback, and optional self-declared Armed Force/OM with individual visibility controls. These are current product instructions, not delivered runtime. They supersede conflicting older product prohibitions; retain server authorization, privacy and data-integrity requirements.

National, verification-gated community product for federal military, veterans, pensioners and
families. Next.js web and React Native/Expo mobile, with a shared Supabase backend.

## Visual coverage update — 2026-09-07

Read the [screen coverage map](docs/design/visual-guide-2026-09-06/MAPA-DE-TELAS.md) and [guide consumption instructions](docs/design/visual-guide-2026-09-06/AGENTS.md) after the construction process. Select the relevant mobile/web references and recovery states before coding. Only files actually present in the manifest count as delivered images; visual coverage is not runtime completion.

## Current build authority — mandatory, 2026-09-06

**Read [`PROCESSO-DE-CONSTRUCAO.md`](docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md)
before planning, implementing or reviewing this reconstruction.** Then read the
[visual correction notes](docs/design/visual-guide-2026-09-06/README.md) and inspect the relevant
images in the [visual guide](docs/design/visual-guide-2026-09-06/index.html).

The owner explicitly authorized this version **independently of conflicting older product
documentation**. Its product scope, navigation, visual direction and construction sequence
supersede conflicting older specs, ADR design choices, wave order and scoped agent guidance.
Do not restore the old product or request approval merely because those documents disagree.
This authorization does not remove security, privacy, authorization, accessibility or data-integrity
requirements. Preserve compatible, proven infrastructure.

The target is national; Manaus is an example/pilot, not an access boundary. Primary navigation is
**Início / Explorar / Comunidades / Perfil**, with explicit Guia and Mercado entry points.
The approved direction uses light surfaces and deep green. Historical documentation below helps
locate existing mechanisms; it does not redefine this target.

**Independent verification:** follow section 14 of the construction process. A model's own
completion report is not independent verification. CI, code review and runtime verification are
different layers; report which actually ran against the delivered revision. There is no fully
automated independent reviewer/runtime-verifier chain today. Do not claim there is one.

**This is a deliberate fork of a larger product.** The parent, `Juanjfmr/Bivaque` (private
GitHub repo), carries 74 sovereign decisions, 19 features and a formal ADR regime — the
governance that stopped it from shipping. This repository is the smallest slice that can
launch, absorbing the parent's features afterwards. The parent is **reference, not law**;
[`docs/BIVAQUE.md`](docs/BIVAQUE.md) §1.5 records the relationship.

An earlier revision of this file said the original decisions lived in
`C:\Users\juana\Forja-90\.omo\…` and were unreachable, telling you not to block on them.
That was wrong and it cost a week: the canon is the GitHub repo above
(`docs/FOUNDER-INTENT.md`, `docs/DECISIONS.md`, `FEATURES.yaml`, `docs/MONETIZACAO.md`).

Forja-90 is a legacy codebase: reference patterns only, never copy its files.

## READ FIRST — before any work in this repository

**Read the current construction process above first.** Also read these two documents to
understand the starting point before touching code or answering implementation questions.

- **[`docs/BIVAQUE.md`](docs/BIVAQUE.md)** — historical vision, roles, community model and
  decisions. Use compatible details as context; the current construction process takes
  precedence for the target product and experience.
- **[`docs/PRODUCT_STATUS.md`](docs/PRODUCT_STATUS.md)** — what the code **does today**,
  with file:line evidence and the gap to the target.

**For a task that plans or changes the repository, read the operational summary too.**

- **[`tools/backend-kanban/BOARD.md`](tools/backend-kanban/BOARD.md)** — the generated, concise
  view of the current path to MVP launch. Use the stable card ID from that summary to consult the
  canonical entry with `node tools/backend-kanban/src/board.mjs --card <ID>` before planning the
  change; use `--search <terms>` when no ID is known. For autonomous card-by-card work, use
  `node tools/backend-kanban/src/board.mjs --next` and take exactly one returned card through
  implementation, validation, board update and commit. The board sets execution priority; it never
  overrides the current construction authority or actual runtime evidence. Reconcile affected
  cards when the current version replaces their assumptions. Never edit
  `BOARD.md` by hand.

**Never infer intent from implementation or vice versa.** The construction process describes
the current target; `PRODUCT_STATUS.md` describes recorded runtime evidence. Reading a decision as a delivered feature is
the mistake that produced the document these two replace.

`docs/journeys/MAP.md` is **historical** — superseded 2026-08-11, kept for audit trail only.

Three rules that decide whether your work is legitimate at all:

- **The visual audit blocks.** A wave is not finished until the screens it touched pass
  the audit in [`docs/superpowers/plans/2026-08-05-auditoria-telas.md`](docs/superpowers/plans/2026-08-05-auditoria-telas.md).
  No following work starts before that — not the next wave, not parallel work on another front.
  Screens a wave creates are audited inside that wave. There is no audit round "at the end".
- **Accessibility and security do not wait for any wave.** Phases 1 and 2 of the audit plan
  are exactly this and may run at any time, on any screen. Everything else cosmetic waits
  its turn. Wave A of `BIVAQUE.md` §10 is under this exemption.
- **A row leaves `PRODUCT_STATUS.md` only when the user closes the cycle** — entry, action,
  feedback, follow-up and the main sad path. Capability in the database does not close a row
  on its own. Doing that is what made the previous map promise what the product never
  delivered.

- **Keep material board transitions with the work.** Before planning or implementation, identify
  the matching card from `BOARD.md` and consult its canonical entry in `board.json`. In the same
  commit, update the card only when the work gains proof, becomes blocked, reveals drift, changes
  priority/status or completes — merely starting work is not a board transition. Regenerate the
  summary with `node tools/backend-kanban/src/board.mjs --write-summary`; CI rejects invalid data
  or a stale summary. Do not create a second task system or mark a card `done` without its
  applicable Definition of Done and recorded evidence. Routine questions and read-only answers
  do not require a board update.

- **Resolve cards; do not stop at drift.** Drift is evidence of a mismatch between documentation,
  GitHub state and runtime. It is not a deliverable and it does not close work. When a card reveals
  drift, the same agent either reconciles the stale source, implements the missing behavior, marks a
  true external/R3 blocker, or leaves the card open with the next concrete resolution step. A `done`
  card may not keep open drift.

- **The discovering agent records a genuinely new task.** Search existing IDs, titles and
  checklists first; extend an existing card when the work belongs to the same closure contract.
  When no card covers it, add a card with a stable ID, priority, category, status, source evidence,
  `updatedAt`, the confronted Git `sourceRevision`, checklist and explicit `dependencies` in the
  same commit that reveals the work. A new task involving a product decision, personal data,
  payment, RLS or another R3 boundary enters `blocked` or `repo` until the required human
  decision/ADR exists — discovery is not authority to invent scope.

**Scope column and the policies that read it land in the same migration** — never "in
future". This is the failure this repository keeps repeating; it has produced four privacy
leaks so far.

### Where things are

| Document | Answers |
|---|---|
| `docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md` | Current version to build, owner authorization, execution sequence and independent verification |
| `docs/BIVAQUE.md` | Historical product decisions; compatible context for the new version |
| `docs/PRODUCT_STATUS.md` | What the code does today, the gap to the target, and which wave closes it |
| `tools/backend-kanban/BOARD.md` | Concise generated MVP path agents read before planning or implementation |
| `tools/backend-kanban/public/board.json` | Canonical board data, evidence and documentation drift by stable card ID |
| `docs/decisions/` | R3 decisions as ADRs, and `RISK_MATRIX.md` — what an agent may decide alone |
| `docs/agents/DESIGN_SYSTEM.md` | Existing tokens, components and audit mechanics; conflicting appearance is superseded by the current guide |
| `docs/superpowers/specs/` | Approved designs, with dated conflicts recorded rather than hidden |
| `docs/superpowers/plans/` | Executable plans derived from those specs |
| `docs/agents/AGENT_ARCHITECTURE.md` | The agent roles, the execution loop, and which composition a task gets |
| `docs/agents/TASK_CONTRACT.md` | The unit of execution — fields, refusals, and how risk is elevated |
| `.claude/skills/` | The procedures themselves, versioned here rather than on a developer's machine |

## Commands (root, pnpm 11.18 pinned, Node >=22)

```sh
npx pnpm@11.18.0 gate        # PORTA ÚNICA: lint -> typecheck -> test -> secrets, para no primeiro vermelho
npx pnpm@11.18.0 gate --fast # só lint + typecheck, para o loop de edição (não autoriza declarar pronto)
npx pnpm@11.18.0 lint        # biome check . (Biome 2.5.6)
npx pnpm@11.18.0 typecheck   # tsc --noEmit across all workspaces
npx pnpm@11.18.0 test        # test:unit (vitest) + test:scope (node --test)
npx pnpm@11.18.0 test:scope  # node --test tests/scope/*.test.mjs — runs in ms, run after touching scripts/config
npx pnpm@11.18.0 build       # pnpm --filter web build (Next 16, server runtime)
npx pnpm@11.18.0 test:e2e    # playwright test (needs Docker-free; starts its own built server on :3000)
```

- `pnpm`/`corepack` are NOT on PATH on the dev host — always invoke via `npx pnpm@11.18.0`.
- Supabase commands need Docker and a running stack: `npx pnpm@11.18.0 exec supabase start` FIRST,
  then `db:reset` / `test:db` / `db:lint`. `db:reset` is destructive — local only, never `--linked`.
- Canonical db test script is **`test:db`** (`supabase test db`). `db:test` is forbidden — a scope
  test asserts it does not exist. CI runs: lint → typecheck → test → secrets → supabase start →
  write env → build → types drift → db:reset `--no-seed` → test:db → db:lint →
  `playwright install --with-deps chromium` → db:reset (with seed) → test:e2e → upload artifacts
  (always).
- **The two resets are deliberate.** pgTAP compares the exact set of profiles visible in Manaus
  against its own fixtures, so it must run against a database WITHOUT the development seed; E2E
  needs the opposite, because it authenticates as a seeded user. Collapsing them back into one
  reset turns six profile-listing asserts red.
- **The build needs the env before it runs.** Next inlines `NEXT_PUBLIC_*` at build time, so
  `supabase start` and the step that writes `apps/web/.env.local` both precede `pnpm build`.
  Moving the build earlier reintroduces the prerender crash that kept CI red from `78d4318` on.

## Visual build loop (UI work)

```sh
node scripts/visual/loop.mjs          # gates -> build -> serve -> screenshot -> audit -> .visual/<run>/
node scripts/visual/loop.mjs --fast   # capture only, against an already-running dev server
```

Screenshots every route at 375/768/1440 plus a deterministic audit (touch targets, contrast,
overflow, motion presence, token discipline) into `.visual/<run>/`. The spec it judges against is
`docs/agents/DESIGN_SYSTEM.md`; the version-aligned driving prompt is `docs/agents/QWEN_BUILD_PROMPT.md` and the low-cost vision-model guidance is `docs/design/visual-guide-2026-09-06/MODELOS-PARA-CONSTRUCAO.md`. Set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when the managed browser bundle is not installed.

## Repo contracts enforced by `tests/scope/*.test.mjs` (guardrails)

These tests fail CI if you break them — update them only when a contract deliberately changes:
- Workspace roots are `apps/{web,mobile}` + `packages/{contracts,domain,tokens}`. `apps/mobile`
  is the React Native + Expo client for Android and iOS; it shares domain contracts and
  authorization semantics with the web, never its web UI implementation.
- Next must stay on the **server runtime** — `output: "export"` is prohibited.
- **For `apps/web`, HeroUI v3 is the only component library** — no shadcn/Radix/Headless UI
  imports. `apps/mobile` uses native React Native components and never imports web UI.
- `supabase/config.toml` must use `[inbucket]` — **NOT `[local_smtp]`**: the pinned CLI 2.107.0
  rejects `local_smtp` with `invalid keys` (renamed only in 2.108+). Do not upgrade the pinned CLI
  casually; both pin and section are locked by tests.
- Root scripts/devDeps and the three Playwright viewport projects are asserted verbatim.

## Known traps — check these BEFORE blaming your diff

Each of these surfaces as a test or lint failure unrelated to the change in flight. That is
exactly the signal that makes an autonomous agent "fix" what is not broken. **Confirm a failure
reproduces from a clean state before attributing it to code.**

- **The "Visual Capture" ghost profile.** The `.visual/` tooling inserts a profile row into the
  local database when it runs. If a dev server or a visual capture touches the stack between
  `db:reset` and `test:db`, six profile-listing asserts fail — `locality-profile-access`,
  `authz-*-matrix`, `full-regression`. It looks like a real regression and is not. `.visual/` is
  gitignored, so grepping the repo for the string finds nothing. **Fix: re-run `db:reset` with no
  dev server and no capture running, then `test:db`.** This is also why the Playwright MCP is
  disabled in `.opencode/opencode.json` — drive the browser through `scripts/visual/loop.mjs`,
  which is deterministic and cleans up after itself.
- **Stale `dev-server.pid` / `dev-server.log`.** A pid file left behind from a killed run makes
  the visual loop attach to a server that is not there. Both are gitignored; delete and retry.
- **Product decisions live outside the repo.** `C:\Users\juana\Forja-90\.omo\…` is unreachable
  from a workspace-scoped session. Do not block on it — see the header of this file.

## Harness (OpenCode)

- **The Bivaque code graph is `codebase-memory-mcp` — NOT graphify.** The project index is
  `project: "bivaque-community"` (`~/.local/bin/codebase-memory-mcp.exe cli <tool> --project
  bivaque-community`). Consult it for architecture/symbol questions (`search_graph`,
  `trace_path`, `get_architecture`, `get_code_snippet`, `detect_changes`). Never run the
  graphify pipeline (`graphify-out/` does not exist here and is not the tool for this repo).
  Tools require the `project` param — without it they fail.
- `.opencode/opencode.json` holds the project MCP config. It merges over the global one at
  `~/.config/opencode/opencode.json`, where destructive-command guard-rails live (`--linked` is
  denied, `db:reset` asks).
- **Before executing any wave, read [`docs/superpowers/plans/README.md`](docs/superpowers/plans/README.md)
  in full.** It carries the execution order, why the waves run serially, the mandatory stops,
  and what closes a wave. The `directory-readme` plugin only injects the README of the working
  directory — it will not surface that file on its own, and a session that skips it has
  already gone looking for orientation in the wrong place once.
- `/run-plan <caminho>` executes a plan from `docs/superpowers/plans/` todo by todo, gating
  between each. `/gate` measures without fixing. `/harness-doctor` audits the config itself.
- Plans may reference `superpowers:*` or `anthropic-skills:*` skills. **Those are Claude Code
  plugins and do not exist in OpenCode.** The equivalent protocol lives in `.claude/skills/`.
- **The skills are in this repository, not on your machine.** An earlier revision of this file
  sent you to `~/.claude/skills/` for `plan-execution` and `gate-before-done`. Neither was there:
  the repo described a harness that depended on whichever laptop was running it. Since
  2026-08-22 the seven procedures are versioned under `.claude/skills/` — `execute-task`,
  `adversarial-review`, `runtime-proof`, `gate-before-done`, `plan-execution`,
  `experiment-protocol`, `visual-system-experiment` — and a scope test fails if one goes missing.

### Agents, contracts and who reviews whom

- **[`docs/agents/AGENT_ARCHITECTURE.md`](docs/agents/AGENT_ARCHITECTURE.md)** is the entry
  point: seven roles, the execution loop, the composition patterns and the risk routing.
  Read it before delegating anything to a subagent.
- **The unit of execution is the task contract, not the agent.** Contracts live in
  `docs/agents/tasks/*.task.yml` and are validated by `node scripts/agents/task-contract.mjs`.
  An invalid contract does not reach execution — the validator says what is missing.
  Format: [`docs/agents/TASK_CONTRACT.md`](docs/agents/TASK_CONTRACT.md).
- **`implementer` ≠ `reviewer` ≠ `runtime-verifier`.** Whoever implemented does not review,
  and does not adjudicate their own runtime evidence. A reviewer who read the implementer's
  rationale before forming a first verdict is not an independent reviewer.
- **Isolated subagents are the default; a team is the exception you justify.** Agents that
  talk to each other produce correlated error, and correlated error is invisible in review.
- **An exhausted `retry_budget` never produces `PASS`** — it produces `FAIL`, `BLOCKED` or
  `HUMAN_DECISION`. `tests/scope/agent-architecture.test.mjs` locks this structure.

## HeroUI v3 components in use (post waves 1–5 + 7)

After the visual audit migration (merge `5d0dc62` / PR #2) the frontend
relies on these sub-components of `@heroui/react`:

- **Forms**: `Button`, `Form`, `Input`, `SearchField`, `TextArea`,
  `Checkbox`, `Radio`, `RadioGroup`, `Select`
- **Feedback**: `Alert` (via the `FeedbackAlert` wrapper), `Spinner`,
  `Skeleton`, `Toast` (via `ToastProvider`), `Chip`, `Kbd`
- **Overlays**: `Modal` (with `useOverlayState`), `Dropdown` (compound
  `Trigger`/`Popover`/`Menu`/`Item`), `Tooltip`, `ListBox`
- **Layout**: `Tabs` (+ `Tab`/`TabList`/`TabPanel`), `ButtonGroup`,
  `ToggleButton`, `Separator`, `Link`, `ProgressBar`, `Avatar` (via the
  `MemberAvatar` wrapper), `CloseButton`

Available but **deliberately deferred** (current code is functional; full
migration is follow-up work): `Drawer`, `Table`, `Pagination`,
`NumberInput`, `Autocomplete`, `ComboBox`, `Slider`, `Switch`,
`Accordion`, `Disclosure`, `ScrollShadow`, `Meter`. (`Snippet` and
`Image` were **removed** in HeroUI v3 — use `Typography.Code`/`Prose`
and `next/image` respectively.)

### UI component wrappers (token-driven front for HeroUI)

Every primitive in `apps/web/app/components/bivaque/` is a thin,
token-aware wrapper over a HeroUI v3 sub-component. Never import HeroUI
directly for patterns that already have a wrapper — the wrapper is what
keeps the design system coherent.

| Wrapper | Wraps | Purpose |
|---|---|---|
| `Card` | `Card` | Surface container with elevation |
| `Skeleton` | `Skeleton` | Loading placeholder |
| `ToastProvider` + `showToast` | `Toast.Provider` + `toast()` | Queued toasts |
| `ErrorState` | `Alert` (via `FeedbackAlert`) | User-safe error UI |
| `FeedbackAlert` | `Alert` | info/success/warning/danger, role-aware (assertive for danger/warning, polite for info/success) |
| `MemberAvatar` | `Avatar` | Initial-fallback avatar for verified members |

**Critical: `ToastProvider` must be mounted.** It was defined in
`bivaque/toast.tsx` and shipped unused for months; calls to
`toast.success()` / `toast.danger()` silently dropped on the floor
because no provider was in the tree. It is mounted once under
`(shell)/layout.tsx`. If you ever refactor those layouts, **keep the
provider** — the global `toast()` helper only renders through it.

## Supabase (source of truth: `supabase/migrations/`)

- Never edit an applied migration — add a timestamped one via
  `npx pnpm@11.18.0 exec supabase migration new <name>`.
- pgTAP tests live in `supabase/tests/*.sql` (run by `test:db`). Fixtures in
  `supabase/tests/fixtures/foundation.inc` use `example.invalid` identities and fixed UUIDs and are
  included inside each transaction (auto-rollback). Never put real personal data in fixtures.
- **`seed.sql` is a separate concept from the pgTAP fixtures, and it does carry users.** It is the
  durable LOCAL development seed (two runbook accounts plus ~300 Manaus members, 400 posts, groups,
  events and open reports) that the operator, the E2E suite and the §10.2 visual capture all need.
  Its credentials are public and disposable by design. pgTAP fixtures stay transactional and stay
  in `supabase/tests/*` — the two must not be merged.
- **Seeding `auth.users` requires the token columns as `''`, never NULL.** GoTrue scans
  `confirmation_token` and its siblings as Go `string`; a NULL makes the password grant fail with
  HTTP 500 (`converting NULL to string is unsupported`), not the 400 you would expect from a bad
  password hash.
- Client types: `npx supabase gen types --lang typescript --local --schema public > supabase/database.generated.ts`
  — generate ONLY the `public` schema, never the `private` trust schema.
- Privacy boundary: `private` schema (`verification_outcomes`, `family_invitations`,
  `family_account_links`) is never exposed via Data API; `anon`/`authenticated` have no table
  privileges there — only `private.is_locality_member(uuid)` execution. RLS is enabled AND forced
  on every table; grants are minimal.
- Never persist: raw CPF, Portal payload, inferred military organization, rank, residential address,
  or a public verification badge. The owner now authorizes optional self-declared Armed Force/OM
  with visibility controls and private identity-document processing as the CPF fallback; follow
  the 2026-09-07 corrections before implementing storage, processing and deletion contracts. Portal source label `reformado` maps to internal
  `veteran` only. Family accounts stay independent Auth users after accepting an invite.
  > **Open R3 proposal against this line.**
  > [`ADR-20260811-om-declarada`](docs/decisions/ADR-20260811-om-declarada.md) proposes
  > allowing the member to *declare* branch, status, unit and class — distinguishing what the
  > State asserts from what the person chooses to say. It is `proposed`, not approved, and
  > carries five prerequisites (threat model, consent screen, LGPD governance, and more).
  > **Product authorization updated 2026-09-07:** optional self-declared Armed Force/OM and
  > user-controlled visibility are explicitly authorized in the current guide. Older proposed
  > scope (status, class and other fields) is not automatically approved. Preserve the technical
  > privacy requirements and reconcile the ADR when implementing; do not ask again for the
  > product choice already made.

## Portal da Transparência integration

- Server-side only (never call from the browser). Auth header: `chave-api-dados: <secret>` — the
  key is an environment secret (`.env` is gitignored; CI secret), never committed or logged.
- Tests use fixtures only — no real CPF values, no live Portal calls.

## Playwright

- Projects: `mobile-375`, `tablet-768`, `desktop-1440`; `webServer` builds then serves the app on
  `http://127.0.0.1:3000`. Smoke spec asserts the home heading "Bivaque" and
  `/api/health` → `{"status":"ok"}` — changing either breaks E2E.
- `playwright-report/` and `test-results/` need no cleanup before linting. They are in
  `.gitignore` (lines 6-7) **and** excluded in `biome.json` (lines 13-14), so a local `test:e2e`
  run cannot fail `pnpm lint` or reach a commit. Earlier revisions of this file said the opposite
  and told you to delete them by hand; that is obsolete.
- CI installs browsers normally. The optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` override in
  `playwright.config.ts` is a dev-host escape hatch only.
- E2E specs must not inline credentials. Read them from the environment, falling back to
  `apps/web/.env.local`, and throw when neither supplies one — see
  `tests/e2e/persistent-login.spec.ts`. The secrets scan enforces this for anything bound to a
  `password`, `secret`, `api_key` or `credential` name.
- **No repository secrets are needed for the E2E gate.** An earlier revision of this file said
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` had to be configured under
  `Settings → Secrets and variables → Actions`. That is obsolete: CI now derives both from the
  local stack (`supabase status -o env`) and writes `apps/web/.env.local` before the build.
- **Specs are transpiled to CJS — `import.meta` is not available in them.** `scripts/visual/*.mjs`
  is real ESM and may use `import.meta.dirname`; a spec may not. The emitted `require` fails as
  "require is not defined in ES module scope" at load time and aborts collection for the WHOLE
  suite, reporting `Total: 0 tests in 0 files`. Resolve paths from `process.cwd()` instead.

## Style

- Biome: double quotes, no semicolons, 2-space indent, lineWidth 100; `noExplicitAny`,
  `noNonNullAssertion`, `noParameterAssign`, `useImportType` are errors.
- Plan convention: implementation + tests are ONE todo; every permission/denial path needs a
  positive and a negative test; evidence goes to
  `.omo/evidence/bivaque-community-pilot/task-<N>-<name>/` (outside this repo). Commits are
  conventional (`chore/feat/fix(scope): …`) per plan todo — no commits have been made yet.
