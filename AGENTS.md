# AGENTS.md — Bivaque Community

Private, invite-only community product for verified federal military, Veterans and military
pensioners, piloted in Manaus. Server-rendered Next.js on Supabase.

The original product decisions live outside this repository, in
`C:\Users\juana\Forja-90\.omo\plans\bivaque-community-pilot.md` and
`…\drafts\bivaque-community-pilot.md`. **Do not block on them.** They are unreachable from a
workspace-scoped session, and everything needed to work here has been carried into
`docs/journeys/MAP.md` and `docs/superpowers/specs/` — including the exclusions decided there
(marketplace, ads, AI, video, native app, other cities), recorded in §6 of the map. Read the
originals only if you already have access and are reopening a product decision.

Forja-90 is a legacy codebase: reference patterns only, never copy its files.

## READ FIRST — before any work in this repository

**[`docs/journeys/MAP.md`](docs/journeys/MAP.md) is the entry point.** Read it before
touching code, before planning, before answering a question about what this product does. It
carries the functional state of every area, what is prioritised, and the sequencing rules that
govern what work is allowed to start.

Three rules from it that decide whether your work is legitimate at all:

- **§10.2 — the visual audit blocks.** A wave is not finished until the screens it touched pass
  the audit in [`docs/superpowers/plans/2026-08-05-auditoria-telas.md`](docs/superpowers/plans/2026-08-05-auditoria-telas.md).
  No following work starts before that — not the next wave, not parallel work on another front.
  Screens a wave creates are audited inside that wave. There is no audit round "at the end".
- **§1 — the accessibility exemption.** Accessibility fixes, critical visual bugs and security do
  not wait for any wave. Phases 1 and 2 of the audit plan are exactly this and may run at any
  time, on any screen. Everything else cosmetic waits its turn.
- **Matrix legend — what "Corrigida" means.** State describes what the user can do, not what the
  schema permits. Capability in the database does not close a row on its own. Marking a row
  Corrigida because the migration landed makes the map promise what the product does not deliver.

**§7 Padrão 6 is the failure this repository keeps repeating**: a scope column shipped without the
policies that read it. It has produced four privacy leaks so far. If you add a scope column, the
policies that read it land in the **same migration** — never "in future".

### Where things are

| Document | Answers |
|---|---|
| `docs/journeys/MAP.md` | What is broken, what is prioritised, what blocks what |
| `docs/agents/DESIGN_SPEC.md` | The visual language, and the source of truth for tokens |
| `docs/agents/VISUAL_GUIDE.md` §9 | The audit rubric — how well a screen must be made |
| `docs/superpowers/specs/` | Approved designs, with dated conflicts recorded rather than hidden |
| `docs/superpowers/plans/` | Executable plans derived from those specs |

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
`docs/agents/DESIGN_SPEC.md`; the driving prompt is `docs/agents/QWEN_BUILD_PROMPT.md`. Set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when the managed browser bundle is not installed.

## Repo contracts enforced by `tests/scope/*.test.mjs` (guardrails)

These tests fail CI if you break them — update them only when a contract deliberately changes:
- Workspace roots are exactly `apps/web` + `packages/{contracts,domain,tokens}` (no `apps/mobile`).
- Next must stay on the **server runtime** — `output: "export"` is prohibited.
- **HeroUI v3 is the only component library** — no shadcn/Radix/Headless UI imports.
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
- `/run-plan <caminho>` executes a plan from `docs/superpowers/plans/` todo by todo, gating
  between each. `/gate` measures without fixing. `/harness-doctor` audits the config itself.
- Plans may reference `superpowers:*` or `anthropic-skills:*` skills. **Those are Claude Code
  plugins and do not exist in OpenCode.** The equivalent protocol is in the `plan-execution` and
  `gate-before-done` skills, which live in `~/.claude/skills/` and are read by both harnesses.

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
- Never persist: raw CPF, Portal payload, military organization, rank, residential address,
  documents, or a public verification badge. Portal source label `reformado` maps to internal
  `veteran` only. Family accounts stay independent Auth users after accepting an invite.

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
