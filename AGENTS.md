# AGENTS.md — Bivaque Community

Private, invite-only community product for verified federal military, Veterans and military
pensioners, piloted in Manaus. Server-rendered Next.js on Supabase. Product decisions live in
`C:\Users\juana\Forja-90\.omo\plans\bivaque-community-pilot.md` and
`C:\Users\juana\Forja-90\.omo\drafts\bivaque-community-pilot.md` (outside this repo) — read them
before feature work. Forja-90 is a legacy codebase: reference patterns only, never copy its files.

## Commands (root, pnpm 11.18 pinned, Node >=22)

```sh
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
  test asserts it does not exist. CI runs: lint → typecheck → test → build → supabase start →
  db:reset → test:db → db:lint → `playwright install --with-deps chromium` → test:e2e → upload
  artifacts (always).

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

## Supabase (source of truth: `supabase/migrations/`)

- Never edit an applied migration — add a timestamped one via
  `npx pnpm@11.18.0 exec supabase migration new <name>`.
- pgTAP tests live in `supabase/tests/*.sql` (run by `test:db`). Fixtures in
  `supabase/tests/fixtures/foundation.inc` use `example.invalid` identities and fixed UUIDs and are
  included inside each transaction (auto-rollback). **Never** put users in `seed.sql` or real
  personal data in fixtures.
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
- Local gotcha: `playwright-report/` and `test-results/` are NOT gitignored — running `test:e2e`
  locally leaves artifacts that `biome check .` then scans, failing `pnpm lint`. Delete them before
  linting locally. (CI installs browsers normally; the optional
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` override in `playwright.config.ts` is a dev-host escape
  hatch only.)

## Style

- Biome: double quotes, no semicolons, 2-space indent, lineWidth 100; `noExplicitAny`,
  `noNonNullAssertion`, `noParameterAssign`, `useImportType` are errors.
- Plan convention: implementation + tests are ONE todo; every permission/denial path needs a
  positive and a negative test; evidence goes to
  `.omo/evidence/bivaque-community-pilot/task-<N>-<name>/` (outside this repo). Commits are
  conventional (`chore/feat/fix(scope): …`) per plan todo — no commits have been made yet.
