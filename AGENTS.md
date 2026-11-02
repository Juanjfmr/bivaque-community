# AGENTS.md — Bivaque Community

National, verification-gated community for federal military, veterans, pensioners and their families,
organized by city (Manaus is an example, not an access boundary). Launch without charging.
Respond in Brazilian Portuguese. Preserve other sessions' changes; inspect the working diff first.

- `apps/app` — the signed-in app: React single-page app (Vite, TanStack Router/Query, shadcn/ui),
  served at `/app`. Its own rules: [apps/app/AGENTS.md](apps/app/AGENTS.md).
- `apps/web` — Next.js: server (auth, sessions, Portal, media, API routes, workers) and the public
  landing. Its old signed-in screens leave journey by journey: [apps/web/AGENTS.md](apps/web/AGENTS.md).
- `supabase/` — database, RLS and pgTAP: [supabase/AGENTS.md](supabase/AGENTS.md).
- Store app: Capacitor over the same `apps/app` build, after web. `apps/mobile` (React Native) and
  `apps/prototipo` are frozen: do not extend them.

## Mandate (owner, 02/11/2026)

The goal is the launch defined in [docs/LANCAMENTO.md](docs/LANCAMENTO.md), complete. Half work does
not count: a flow is done only when entry, action, persistence, feedback, follow-up and the main
failure path work in the integrated app and are proven at 375/768/1440 in both themes.

- **The agent decides.** Product, design and technical choices inside the launch scope are made by
  the agent, recorded once (ADR or card) and executed. Do not ask the owner what can be decided;
  bring decisions only at the milestones in `LANCAMENTO.md`.
- **R3 by delegation.** The agent may decide R3 items (security, privacy, personal data, RLS,
  destructive migrations, legal/compliance) through an ADR with status
  `Aceito por delegação — aguarda ratificação`, with `security-auditor` and an independent reviewer,
  and lists it in [docs/decisions/RATIFICACAO.md](docs/decisions/RATIFICACAO.md). The owner ratifies
  the list at the end. Delegation never covers: real personal data or real CPF in tests, live Portal
  calls outside the server flow, production databases, secrets in the repository.
- **Merge on main is the agent's** after green CI of the delivered revision, independent review and
  runtime proof. Merge integrates; it does not publish (`vercel.json` disables main deployments and
  migrations reach production only from the `producao` branch).
- **The owner's acts:** publishing (advancing `producao`), store submission, creating accounts and
  entering keys or passwords, legal sign-off, real-phone tests at milestones, ratification.
- **Brand:** the owner authorized changing the palette (02/11). Visual identity decisions live in
  [IDENTIDADE-DAS-PECAS.md](docs/agents/regua-nextdoor/IDENTIDADE-DAS-PECAS.md) and its ADR.

## Sources of truth — in this order, read by task

1. [docs/LANCAMENTO.md](docs/LANCAMENTO.md) — scope, definition of done, order, owner milestones.
2. The board card (below).
3. Accepted ADRs in [docs/decisions/](docs/decisions/). The governing ones: the
   [React SPA](docs/decisions/ADR-20261024-front-react-spa.md) (app, navigation, API security
   contract, swap order), [Community redesign](docs/decisions/ADR-20261024-redesenho-da-comunidade.md),
   [entry](docs/decisions/ADR-20261022-entrada-do-prototipo.md),
   [location](docs/decisions/ADR-20261022-localizacao-padrao-de-mercado.md),
   [data foundation](docs/decisions/ADR-20261022-fundacao-dados-bairros-ocultar-chamados.md) and the
   two of 01/11 ([entry by code](docs/decisions/ADR-20261101-entrada-unica-por-codigo.md),
   [photo and reply in groups](docs/decisions/ADR-20261101-foto-e-resposta-nos-grupos.md)). A later ADR
   or a later explicit owner instruction wins over an older one.
4. Visual and interaction bar: [docs/agents/regua-nextdoor/](docs/agents/regua-nextdoor/) — Nextdoor
   (via Mobbin) is the bar; every rebuilt screen starts from cited Mobbin references.
5. [docs/historico/](docs/historico/) is history, never instruction. Do not restore anything from it
   without bringing it into a live source with a date and a reason.

Navigation: Início · Comunidade · [Criar] · Mercado · Você, with Conversas as a top icon.
`communities`/`community_id` are legacy; their presence in the database is not a product feature.
Declared OM may be used privately for the person's own distance calculations; exposing Force/OM to
other members stays out of scope (BLOCK-AFFILIATION).

## Execution and evidence

- Work in an isolated worktree per line of work. One executor writes per checkout; parallel
  executors need disjoint paths and separate servers/ports. Worktrees do not isolate databases:
  resets, migrations and database-writing tests are exclusive on the target stack. Never reset a
  shared or remote database to obtain a green check.
- Delegation follows [AGENT_ARCHITECTURE.md](docs/agents/AGENT_ARCHITECTURE.md) and
  [TASK_CONTRACT.md](docs/agents/TASK_CONTRACT.md): one valid `docs/agents/tasks/*.task.yml` per
  delegated batch, validated with `node scripts/agents/task-contract.mjs <path>`. Mechanical work goes
  to the external implementers (DeepSeek, Qwen); judgment, boundaries and review stay with the
  coordinator. Reviews and blind judgments use another model: the `reviewer` subagent (Claude) or
  DeepSeek through OpenCode. GPT-6 Astra (`codex exec -m gpt-6-astra`) is reserved for extremely
  hard work, such as the illustration family (owner, 02/11); routine images use `gpt-6.1-terra`.
- Implementer, reviewer and runtime-verifier are distinct where risk requires. The reviewer forms
  the first verdict from criteria, reference and diff, without the implementer's defense. An exhausted
  `retry_budget` yields FAIL/BLOCKED/HUMAN_DECISION, never PASS. Verify delegated work on disk and in
  git, never from the executor's report.
- During edits run affected checks; at batch closure run the complete gate once plus the flow,
  denial and visual proofs. Report what actually ran and against which revision. UI batches audit
  touched routes at 375/768/1440 in light and dark before closing.
- Correct introduced regressions, broken primary flows, privacy/access defects and essential
  accessibility failures before merging. Proven preexisting failures stay open on the board with a
  concrete next step; they do not make the gate green.
- Evidence is recorded once in the card; logs and captures go to `.visual/<run>/` (ignored).

## Board workflow

Read [tools/backend-kanban/BOARD.md](tools/backend-kanban/BOARD.md) before planning or changing the
repository; then consult `node tools/backend-kanban/src/board.mjs --card <ID>` or
`--search <terms>`. Autonomous card work uses `node tools/backend-kanban/src/board.mjs --next`:
implement, validate, update and commit one returned card. Priority never overrides the launch
definition or observed runtime.

- Keep material transitions with the work: proof, blocker, drift, priority/status or completion;
  merely starting work is not a board transition. Routine read-only answers need no update.
- Edit canonical `tools/backend-kanban/public/board.json`, never BOARD.md by hand. Regenerate with
  `node tools/backend-kanban/src/board.mjs --write-summary`; CI rejects invalid data
  or a stale summary. Do not create a second task system or mark done without applicable acceptance
  and evidence.
- **Resolve cards; do not stop at drift.** Reconcile the stale source, implement the missing
  behavior or record a real blocker and concrete resolution step. A `done`
  card may not keep open drift.
- **A `done` card may not depend on a card that still has work** (`now`, `next` or `repo`); the
  validator refuses it. Depending on a `blocked` or `frozen` card is allowed.
- **The discovering agent records a genuinely new task.** Search existing IDs, titles and
  checklists first; extend the same closure contract where possible. Otherwise add a stable ID,
  priority/category/status, source evidence, updatedAt, confronted Git `sourceRevision`, checklist
  and explicit `dependencies`. New product/personal-data/payment/RLS/R3 work enters `blocked` or `repo`
  until its required decision/ADR exists (under the mandate the agent may write that ADR);
  discovery is not authority to invent scope.

## Commands and validation

Node >=22; use `npx pnpm@11.18.0` (pnpm/corepack are not on the host PATH). `package.json`, configs
and tests define exact versions; do not casually upgrade pins.

```sh
npx pnpm@11.18.0 gate        # lint -> typecheck -> build -> test -> secrets; stops at first failure
npx pnpm@11.18.0 gate --fast # lint + typecheck only; partial, not completion proof
npx pnpm@11.18.0 test        # unit + workspaces + privacy + scope
npx pnpm@11.18.0 test:scope  # after scripts/config changes
npx pnpm@11.18.0 test:db     # database tests (never db:test)
npx pnpm@11.18.0 db:lint
npx pnpm@11.18.0 --filter @bivaque/app test:e2e   # apps/app: vite preview on 127.0.0.1:3200/app/
npx pnpm@11.18.0 test:e2e    # apps/web: Playwright on 127.0.0.1:3000
```

- Supabase needs Docker and `npx pnpm@11.18.0 exec supabase start`. Local only, never `--linked`.
- DB proof: reset `--local --no-seed`, then `test:db` and `db:lint`, with no dev server or capture
  writing. Reset with seed separately for E2E. The two states are deliberate; do not merge them.
- Write `apps/web/.env.local` before building: Next inlines `NEXT_PUBLIC_*`. CI derives disposable
  keys from the local stack. Never print secrets.
- E2E credentials come from env, falling back to `.env.local`; fail when absent, never inline them.
  Specs use `process.cwd()` for paths, not `import.meta`.
- Before blaming a diff, reproduce the failure cleanly. A capture tool can insert a ghost profile and
  spoil pgTAP counts: reset only the isolated target without server/capture, then rerun.

## Technical and data boundaries

- Workspace roots: `apps/{app,web,mobile,prototipo}` and `packages/{contracts,domain,tokens}`. Next
  stays on the server runtime; no `output: "export"`.
- Every new API route follows SPA ADR §5 with positive and negative tests: one session resolver
  (web cookie or `Authorization` token; conflicts refused; an invalid token never falls back to the
  cookie; it yields a user client under RLS; `service_role` only with explicit authorization in
  code); CSRF via `Origin` allowlist plus an app header on cookie writes; explicit CORS, no
  credentialed wildcard; protected media by short-lived signed URL or authenticated fetch; uploads
  still pass `sanitize-image`. Shared validation lives in one module called by old and new paths.
- Each journey moves in order (SPA ADR §8): interface with demo data → visual acceptance → database
  and API → E2E at three sizes → migrated test coverage → only then the old `apps/web` screen leaves,
  with its code and tests. Old routes redirect to the new ones; proxy gates move in the same PR,
  without redirect cycles. Under the mandate, visual acceptance is the agent's (blind review by
  another model against the Nextdoor bar), presented to the owner at the milestones.
- Never edit an applied migration: add one with `npx pnpm@11.18.0 exec supabase migration new <name>`.
  Scope columns and every policy reading them land in the same migration. Enable and force RLS,
  minimize grants. The `private` schema is never exposed through the Data API; anon/authenticated
  have no table privileges there, except explicitly granted helpers such as
  `private.is_locality_member(uuid)`. Generate only public types (`generate:types`).
- pgTAP fixtures use synthetic `example.invalid` identities and fixed UUIDs inside rollback
  transactions. Development personas live in `supabase/seed.sql`, never in migrations. Seeded
  `auth.users` token columns are `''`, never NULL.
- Never persist raw CPF, Portal payload, inferred OM, rank or a public verification badge. CEP and
  coordinates follow the location ADR: the profile origin is calculation-only and unreadable by other
  members; item address disclosure follows the advertiser's exact/approximate choice. Geocoding is
  server-side and cached; never invent coordinates. Identity documents stay private within the
  verification flow; a valid signed PDF is preserved byte for byte.
- Portal da Transparência is server-only; `chave-api-dados` is a secret, never committed or logged.
  Tests use fixtures. Map source `reformado` only to internal `veteran`. Family members are
  independent Auth users after invite acceptance.
- Biome: double quotes, no semicolons, 2 spaces, width 100; no explicit any, non-null assertions or
  parameter assignment; type-only imports. Implementation and its tests are one unit; permission and
  denial paths need positive and negative cases. Conventional commits, in Portuguese.

## Harness

- Procedures: `.claude/skills/` (`execute-task`, `adversarial-review`, `runtime-proof`,
  `gate-before-done`, `plan-execution`, `experiment-protocol`, `visual-system-experiment`); agent
  roles in `.claude/agents/`. Lessons already paid for: [LICOES.md](docs/agents/LICOES.md).
- OpenCode executors: `.opencode/opencode.json`. Codex: no project agents; call it per task.
- Code graph: `codebase-memory-mcp`, project `bivaque-community`, when available and fresh; otherwise
  `rg` and exact source.
