<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/web — scoped agent instructions

Applies to `apps/web/**`. Read the root `AGENTS.md` first; this file adds frontend-specific rules.
It follows the AGENTS.md pattern: local context, concrete commands/contracts, and proof requirements.
It is not a duplicate design system.

## Canonical frontend sources

Before changing user-facing behavior, use the smallest relevant set:

- `docs/agents/DESIGN_SPEC.md` — frozen vNext interaction/design authority.
- `docs/agents/VISUAL_GUIDE.md` — frozen vNext visual/craft authority.
- `docs/agents/design-audit/PHASE6_REVIEW.md` — current conformance baseline and blocker evidence.
- `docs/agents/design-audit/RUNTIME_FINDINGS.md` — detailed runtime evidence when a blocker/finding is
  being remediated.
- `docs/BIVAQUE.md` — product truth when behavior/capability/role/scope is changing.
- `docs/PRODUCT_STATUS.md` — implementation reality/status.
- `node_modules/next/dist/docs/` — authoritative Next.js API/convention docs for the installed version.
- nearest tests/source — current implementation mechanism, never normative design authority by itself.

The Phase 6 design contract is frozen for implementation. Do not edit it as incidental cleanup while
fixing frontend code.

## Phase 6 rules for implementers

- Settled `DS-*` and settled `VG-*` rules are implementation constraints.
- `CRAFT HEURISTIC` can block the internal `AAA-ready` label but cannot invent product behavior,
  routes, fixed geometry, tokens or component anatomy.
- `EXPERIMENT` means unresolved. Existing code does not select the winner.
- `HUMAN_DECISION` means stop that product choice until explicit authority resolves it.
- Deleted Phase 5.5 prescriptions do not regain authority because they still exist in old code,
  screenshots, tests or wrappers.
- If runtime evidence contradicts the frozen contract, fix implementation when the contract is
  settled; if new evidence shows the contract itself is wrong, report it rather than silently
  rewriting the contract.

For known remediation work, the source of truth for current blocker status is
`PHASE6_REVIEW.md`. A blocker closes only when its original failure property is directly disproved by
new evidence.

## Local architecture

- Next.js 16.3.x, server runtime.
- React 19.
- HeroUI v3 is the only component library.
- Tailwind 4.
- Supabase access uses `@supabase/ssr` and `@supabase/supabase-js`.
- Shared cross-boundary contracts belong in `packages/{contracts,domain,tokens}` only when genuinely
  shared.
- Local wrappers under `apps/web/app/components/bivaque/` are implementation assets, not design
  authority.

Do not add shadcn, Radix, Headless UI, a second primitive system, state library or styling system as
incidental work.

## Before editing

1. Read the nearest component/page/action and its tests.
2. Identify the product/design/runtime property being changed.
3. If using Next.js behavior that may have changed from training data, read the matching installed
   Next.js guide first.
4. If touching Supabase/Auth/RLS/database behavior, also read `supabase/AGENTS.md`.
5. If touching an unresolved visual/IA experiment, do not select a winner unless the task explicitly
   authorizes that experiment and its comparison protocol.
6. Keep the diff scoped to the property under repair.

## Next.js and React

Use version-matched bundled Next.js docs, not remembered APIs.

Prefer server components/server-side data access unless client interactivity genuinely requires a
client boundary. Do not create client state to mirror state already owned by the URL, server or
canonical component primitive without a concrete need.

For non-trivial runtime changes, prove the behavior in the running application. A successful build or
typecheck does not prove navigation, hydration, focus, forms or state transitions.

## HeroUI, semantics and compound controls

`DS-021` is the baseline:

- native semantics first: links navigate, buttons command;
- use canonical HeroUI/React Aria behavior for compound controls;
- preserve name/role/state, focus and expected keyboard behavior;
- a local wrapper is preferred when it already owns the intended pattern, but wrapper existence is
  not proof that the behavior is correct;
- direct HeroUI usage is acceptable when no wrapper owns the pattern;
- do not invent manual ARIA widgets when a native or canonical library primitive already provides the
  behavior;
- if a canonical library composition has a reproducible runtime failure, a simpler semantic fallback
  is allowed only when the fallback is documented and browser-tested.

For tabs, dialogs, listboxes, comboboxes, menus, radio groups, checkboxes and similar compound
controls, browser keyboard/focus proof is required after behavior changes.

## Scope, locality and navigation truth

- Visible locality/community/group context comes from current authorized product state, never a
  pilot-city literal.
- Task navigation and membership scope are distinct concepts.
- A route must not acquire a different conceptual parent only because the viewport changes.
- Before consequential publish/share/moderation, expose effective audience/scope in the same decision
  context.
- Retry, draft recovery, navigation and context switching must not silently widen audience.

If changing shell/navigation/scope behavior, test representative nested routes and more than one
membership/locality state at the affected viewport classes.

## User-facing states and errors

Do not collapse transport/query/action failure into empty data.

Where applicable, keep distinct meanings and recovery paths for:

- loading;
- true empty;
- denied/unavailable;
- recoverable failure;
- pending/optimistic;
- success;
- stale/retry.

Rules:

- branch on Supabase/PostgREST errors before coercing data into arrays/empty state;
- never render raw Supabase/Postgres/internal error strings to users;
- optimistic failure must visibly reconcile/roll back;
- preserve useful entered/query context when recovery is safe;
- pending actions retain their meaning and prevent harmful duplicate activation.

## Accessibility

Production UI targets applicable WCAG 2.2 Level AA criteria. Do not resurrect the deleted universal
"44px = WCAG" or "exactly one h1 per screen" rules.

Bivaque also keeps a stronger reduced-motion product contract: non-essential travel/transform motion
is removed or materially reduced under reduced-motion preference while state feedback remains clear.
Do not mislabel that stronger contract as an AA success criterion.

For changed interaction surfaces, verify as applicable:

- accessible names/labels and programmatic error/help relationships;
- keyboard operation;
- visible focus and focus lifecycle;
- semantic name/role/state;
- contrast and non-color state meaning;
- zoom/text resize/reflow;
- reduced motion;
- locale/copy correctness.

A screenshot is not proof of any keyboard/focus/semantic property.

## Visual craft

`AAA-ready` is the internal quality bar in `VISUAL_GUIDE.md`, not WCAG AAA.

A UI change is not visually resolved merely because it renders, uses tokens and passes lint. Review
representative real content and relevant states for:

- hierarchy;
- composition;
- task-appropriate density;
- Bivaque character;
- responsive recomposition;
- state craft;
- interaction craft;
- wrapping/alignment/media/metadata resilience.

Do not turn craft heuristics into exact pixels or fixed recipes. Exact palette/type/spacing/radii/
elevation/motion and other EXP-004 values remain experimental until the experiment selects a coherent
system.

The legacy visual harness may be used as diagnostic tooling, but its PASS is not proof of WCAG,
authenticated landed-state correctness or `AAA-ready` quality.

## Server/client trust boundary

- `service_role` is privilege, not caller identity.
- Privileged Server Actions and route handlers resolve the authenticated caller from server context.
- Never trust identity, role, locality, community, ownership or authorization because it arrived in
  `FormData`, query params, hidden inputs or client state.
- Do not fetch private data to an unauthorized client and then hide it in UI.
- Do not silently swallow Supabase/PostgREST failures on material paths.

Detailed database policy belongs to `supabase/AGENTS.md`.

## E2E and test data

E2E uses the development contract in `supabase/seed.sql`; pgTAP uses separate transactional fixtures.
Do not infer E2E entity IDs from pgTAP fixtures.

For interaction-dependent work, use targeted Playwright/browser proof. Keep authentication/seed/reset
isolation consistent with the root `AGENTS.md`; external Playwright examples do not override local
isolation rules.

## Validation

Run from repository root.

During iteration:

```sh
npx pnpm@11.18.0 gate --fast
npx pnpm@11.18.0 test:scope
```

Also run the narrow test/browser probe that directly exercises the changed property.

Before integration or at the end of a material implementation batch:

```sh
npx pnpm@11.18.0 gate
```

Run `build`, database tests and/or `test:e2e` when the affected layer requires them. Do not claim a
Phase 6 blocker closed on static inspection alone.

## Definition of done

A frontend change is done only when:

- the frozen product/design authority was not silently changed;
- the target property has evidence at the layer where it can fail;
- changed error/empty/pending/denied states remain truthful;
- authorization-sensitive behavior has positive and negative evidence where applicable;
- user-facing failure copy is stable and privacy-safe;
- interaction-dependent behavior has browser proof;
- applicable root gates pass;
- visual changes satisfy the frozen visual contract or remain explicitly experimental;
- any remediated `RUN-*`/`DS-*` blocker is updated only after new evidence demonstrates the prior
  failure no longer occurs.
