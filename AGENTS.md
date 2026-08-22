# AGENTS.md — Bivaque Community

This file is the operational README for coding agents working in this repository.
Keep durable product/design law in the canonical documents below; keep implementation detail in the
nearest scoped `AGENTS.md`, code, tests, or runbooks.

Bivaque is a controlled-access, community-operated product for Brazil's federal military community
and adjacent eligible roles. Manaus is the initial pilot, not a permanent UI literal. The product is
not an official Armed Forces channel.

## Scope and precedence

- This file applies to the whole repository.
- A nearer `AGENTS.md` adds or overrides local implementation/workflow guidance for its subtree.
- A scoped file may not silently weaken product/security invariants, the frozen Phase 6 design
  contract, or objective standards.
- If two instructions materially conflict, stop the affected line of work and surface the conflict;
  do not choose whichever is more convenient.

## Read first

Read only what the task needs, but do not code against assumptions when a canonical source exists.

| Source | Use it for |
|---|---|
| `docs/BIVAQUE.md` | Product truth: roles, trust model, capabilities, constraints, sequencing |
| `docs/PRODUCT_STATUS.md` | What the implementation actually does today and known gaps |
| `docs/agents/DESIGN_SPEC.md` | Frozen vNext interaction/design contract |
| `docs/agents/VISUAL_GUIDE.md` | Frozen vNext visual/craft contract |
| `docs/agents/design-audit/PHASE6_REVIEW.md` | Phase 6 conformance baseline, current blockers, experiments and proof status |
| `docs/decisions/` | Approved/proposed ADRs and risk authority |
| `docs/superpowers/plans/README.md` | Required protocol before executing a plan/wave |
| nearest scoped `AGENTS.md` | Local implementation constraints |

Never infer delivered behavior from `BIVAQUE.md`, and never infer product intent from current code.
`PRODUCT_STATUS.md` and runtime evidence describe reality; product/design documents describe target
contracts.

## Authority model

For product and implementation work, distinguish these classes instead of flattening them into one
precedence list:

1. **Product/security invariants** — product canon, approved ADRs, privacy/authorization contracts.
2. **Frozen design contract** — `DESIGN_SPEC.md` and `VISUAL_GUIDE.md` after Phase 6B/6C.
3. **Repository technical contracts** — nearest `AGENTS.md`, pinned dependencies, source, schemas,
   tests and version-matched framework docs.
4. **Runtime evidence** — browser, database and integration evidence about what the current build
   actually does.
5. **External guidance** — current standards/maintainer docs/skills relevant to the question.
6. **Generic model knowledge** — lowest authority.

Objective standards or reproducible runtime evidence can reveal a defect in local documentation, but
agents do not silently rewrite frozen product/design law. Record the conflict and route it through the
appropriate decision/adjudication path.

### Phase 6 design freeze

The Phase 6 contract is frozen for implementation.

- `DS-001..DS-035` are settled design rules; `DS-036` remains an experiment.
- Settled `VG-*` rules are normative; entries labeled `CRAFT HEURISTIC` are quality lenses, not
  independent product law.
- `EXPERIMENT` entries are candidates only. Code existence does not select a winner.
- `HUMAN_DECISION` entries remain unresolved until explicit product authority decides them.
- A rule deleted during Phase 5.5 does not return because an old component, screenshot, test or
  implementation still contains it.
- "AAA-ready" is an internal craft gate from `VISUAL_GUIDE.md`; it is not WCAG AAA.
- WCAG 2.2 AA is the objective accessibility baseline. Bivaque may intentionally impose stronger
  product requirements, such as reduced-motion behavior, without mislabeling them as AA.

Do not edit the frozen contract as incidental cleanup while fixing an implementation blocker.

## Commands

Run from repository root. pnpm 11.18 is pinned; Node >=22.

```sh
npx pnpm@11.18.0 gate        # lint -> typecheck -> test -> secrets; full repository gate
npx pnpm@11.18.0 gate --fast # lint + typecheck; iteration gate, not proof of completion
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 test
npx pnpm@11.18.0 test:scope
npx pnpm@11.18.0 build
npx pnpm@11.18.0 test:e2e
```

`pnpm`/`corepack` are not assumed to be on PATH on the dev host; use the pinned `npx pnpm@11.18.0`
form unless the environment explicitly proves otherwise.

Supabase commands require a running local stack:

```sh
npx pnpm@11.18.0 exec supabase start
```

`db:reset` is destructive and is local-only. Never use destructive database commands against a linked
or remote project. The canonical database test command is `test:db`; `db:test` is not a repository
command.

## Change workflow

1. Read the nearest implementation and tests before proposing a solution.
2. Identify the contract/property being changed. For a Phase 6 blocker, cite the corresponding
   `DS-*`/`VG-*` rule and `RUN-*` evidence from `PHASE6_REVIEW.md`/`RUNTIME_FINDINGS.md`.
3. Change the smallest coherent surface. Do not turn a blocker fix into a redesign, dependency
   migration or unrelated cleanup.
4. Add/update proof at the closest layer where the property can still fail.
5. Run the targeted test during iteration.
6. For a material blocker, run `gate --fast` and `test:scope` before closing it. If the property is
   interaction-dependent, also run the targeted browser/E2E proof.
7. Run the full `gate` at the end of the implementation batch/day or before integration. Run build,
   database or E2E gates when the changed surface requires them.
8. A blocker closes only when the original failure property is demonstrated as passing at runtime or
   at the authoritative persistence/authorization layer. "The code looks fixed" is not closure.

Do not reinterpret `NOT_OBSERVED` as PASS. Do not reuse old runtime evidence after application code
has changed in a way that can affect the tested property.

## Evidence rules

**Existence is not evidence. Runtime behavior is evidence.**

Use the closest meaningful proof layer:

- pure deterministic logic -> unit test;
- static repository contract -> `test:scope`/deterministic check;
- server behavior -> targeted integration/API evidence;
- forms, navigation, dialogs, compound controls, focus, hydration and state transitions -> real
  browser/Playwright evidence;
- persistence/RLS/authorization -> database evidence, plus runtime evidence when the boundary crosses
  into the app;
- visual craft -> rendered representative surfaces/states, not component existence or a screenshot
  of only the happy path.

A screenshot cannot prove keyboard, focus lifecycle, semantics, authorization or error recovery.

## UI and visual work

The old visual capture/audit tooling is diagnostic, not design authority. Phase 6 found that prior
harness logic overclaimed several properties. Do not treat a legacy `scripts/visual/*` PASS as proof
of WCAG conformance, authenticated landed state, or `AAA-ready` quality.

For UI changes:

- follow `DESIGN_SPEC.md` and `VISUAL_GUIDE.md`;
- preserve unresolved `EXP-001..EXP-011` status unless the task explicitly runs the experiment;
- do not promote exact pixels, breakpoints, colors, radii, counts, wireframes or navigation geometry
  from old code into new design law;
- use realistic content and relevant states for visual review;
- treat hierarchy, composition, density, responsive adaptation, state craft and Bivaque character as
  part of visual readiness, not polish deferred to the end.

When running an experiment, isolate the variable(s), compare bounded alternatives under the same
representative content/states, and record the decision evidence before hardening a winner.

## Repository guardrails

These are enforced or intentionally pinned; do not change them incidentally:

- Workspace roots: `apps/web` and `packages/{contracts,domain,tokens}`.
- Next.js stays on the server runtime; do not switch to static export.
- HeroUI v3 is the only component library. Do not add shadcn, Radix, Headless UI or a second
  primitive system.
- Tailwind 4 and the current Supabase stack remain the implementation foundation.
- `supabase/config.toml` uses the section required by the pinned CLI; do not casually upgrade the
  CLI/config contract.
- Root scripts/devDependencies and Playwright projects are covered by scope tests.

If a guardrail intentionally changes, change its executable test/contract in the same work item and
explain why.

## Security and data boundaries

For database/Auth/RLS work, read `supabase/AGENTS.md` before editing.

Non-negotiable defaults:

- `service_role` is privilege, not caller identity.
- Resolve the real authenticated caller server-side for privileged actions.
- Do not trust role, locality, community, ownership or authorization merely because the client sent
  it in form/query/client state.
- Scope-bearing schema changes and the policies that enforce the scope land together; never leave a
  known permissive gap for a later migration.
- Never expose private authorization data client-side and then rely on UI hiding.
- Do not persist raw CPF, Portal payload, military organization, rank, residential address,
  documents, or public verification-prestige data unless a later approved product/security decision
  explicitly changes the contract.
- Do not leak raw Supabase/Postgres/internal errors into user-facing UI.

Portal da Transparência integration is server-side only. Secrets are never committed, rendered or
logged; tests use fixtures rather than live personal data.

## Test data and Supabase isolation

pgTAP fixtures and the development/E2E seed are different contracts.

- pgTAP uses transactional fixtures and should run without the development seed when its assertions
  require fixture-only state.
- E2E/runtime flows use the development seed.
- Do not infer E2E UUIDs from pgTAP fixture conventions.
- Do not let a visual/dev process mutate the local stack between a clean reset and a fixture-sensitive
  `test:db` run.

If profile-listing database tests suddenly fail after visual capture/dev activity, reproduce from a
clean reset before "fixing" authorization code.

## Plans, git and scope discipline

Before executing a plan/wave, read `docs/superpowers/plans/README.md` in full.

- Implement code + its proof in the same task whenever practical.
- For permission/denial paths, include positive and negative evidence.
- Do not modify unrelated files to make a gate green.
- Confirm a suspicious pre-existing failure from a clean state before attributing it to the current
  diff.
- Keep commits focused and conventional (`fix(scope): ...`, `feat(scope): ...`, `chore(scope): ...`).
- Never treat generated artifacts, local caches or external evidence directories as source files to
  commit unless the task explicitly requires them.

## Definition of done

A change is done only when all applicable conditions hold:

- product/security/design authority was not silently changed;
- the changed property has direct evidence at the appropriate layer;
- relevant failure/empty/pending/denied states remain truthful;
- authorization-sensitive paths have allowed and denied evidence;
- user-facing errors are stable and privacy-safe;
- interaction-dependent behavior has browser proof;
- applicable root gates pass;
- visual changes meet the frozen visual contract, or remain explicitly inside an unresolved
  experiment;
- no known Phase 6 blocker is declared closed without evidence that falsifies its original finding.
