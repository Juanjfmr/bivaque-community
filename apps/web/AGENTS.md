<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/web — scoped agent instructions

> **DRAFT.** Applies to `apps/web/**`.
>
> Keep general framework/design knowledge in version-matched docs or external skills. Keep only Bivaque-specific constraints and routing here.

## Authority and precedence

For frontend work, use this order:

1. `docs/BIVAQUE.md`, applicable ADRs, and security/privacy contracts — product truth;
2. `docs/agents/DESIGN_SPEC.md` and `docs/agents/VISUAL_GUIDE.md` — Bivaque visual/interaction truth;
3. root and nearest scoped `AGENTS.md` — repository constraints;
4. version-matched Next.js docs bundled with the installed package;
5. selected external skills relevant to the task;
6. generic model knowledge.

External guidance never authorizes a new dependency, component library, state library, visual language, product behavior, or trust-boundary change by itself.

## External skill policy

`https://github.com/finfin/awesome-frontend-skills` is a **discovery catalog only**. It is not normative and may lag its upstream sources. Always verify the current upstream skill before relying on an entry.

Load the smallest set of skills needed for the task. Do not preload the catalog.

### Next.js — framework knowledge

For Next.js APIs and conventions, the authoritative technical reference is the documentation bundled with the installed Next version:

`node_modules/next/dist/docs/`

Do not use the retired `next-best-practices` skill. Next.js 16.3+ intentionally moved framework knowledge into version-matched bundled docs and the managed block at the top of this file.

### Next.js — runtime verification

For non-trivial Next.js behavior changes, prefer the official workflow skill when its prerequisites are already available:

- upstream: `vercel/next.js`
- skill: `next-dev-loop`

It cross-checks the running `next dev` server through `/_next/mcp` with a real browser and is specifically designed to prove runtime behavior after edits.

Do not install or upgrade `agent-browser`, Next.js, or other tooling as an incidental side effect merely to invoke this skill. If its prerequisites are unavailable, use the repository's existing browser/Playwright/runtime verification path instead.

### React implementation and performance

For non-trivial React/Next.js implementation, data-fetching, rendering, bundle, or refactor work, use:

- upstream: `vercel-labs/agent-skills`
- skill: `vercel-react-best-practices`
- path: `skills/react-best-practices/SKILL.md`

This is primarily a performance/architecture guide, not a product or design authority. Do not add SWR, a cache, or another dependency solely because an external rule uses it as an example.

### Reusable component APIs

When creating or materially redesigning a reusable Bivaque wrapper/component API, optionally use:

- upstream: `vercel/components.build`
- skill: `building-components`

Use it for composition, accessibility, controlled/uncontrolled APIs, typing, and component contracts. HeroUI v3 and existing Bivaque wrappers remain the implementation foundation; do not rebuild primitives that HeroUI already owns.

`vercel-labs/agent-skills` → `vercel-composition-patterns` may be consulted for a specific component-API refactor, but it is not baseline context.

### UI/design craft

Generic UI guidance is **not mandatory baseline context** because Bivaque already has a project-specific design system and visual rubric.

`addyosmani/agent-skills` → `frontend-ui-engineering` may be consulted for a specific accessibility/responsive/UI-engineering question, but its generic file-structure, state-management, breakpoint, and component-size guidance does not override this repository.

For explicit visual critique, audit, or polish work, Impeccable may be used as an optional craft tool:

- upstream: `pbakaus/impeccable`
- current skill: `impeccable`

Do **not** refer to the obsolete `frontend-design` skill name from older catalogs.

Do not run Impeccable `init`, `document`, install hooks, create/replace root `PRODUCT.md` or `DESIGN.md`, or establish a new visual world unless the task explicitly authorizes changing the repository's design-context architecture. Bivaque's existing design documents remain authoritative.

### Playwright

When writing, repairing, restructuring, or debugging Playwright tests, use:

- upstream: `currents-dev/playwright-best-practices-skill`
- skill: `playwright-best-practices`

Treat it as test-authoring guidance. Its generic parallelism, fixture, auth, data, and server examples do not override Bivaque's seed/reset/isolation contracts.

`microsoft/playwright-cli` → `playwright-cli` is browser-automation tooling, not the repository's test-design standard and is not required for ordinary E2E changes.

Playwright-specific local rules should eventually live in `tests/e2e/AGENTS.md`; until then, the constraints below apply.

## Local architecture

These are Bivaque constraints:

- Next.js **16.3.x**, server runtime; `next dev` is the local dev command.
- React **19**.
- HeroUI **v3** is the only component library. Do not add shadcn, Radix, Headless UI, or a second primitive system.
- Tailwind **4**.
- Supabase access uses `@supabase/ssr` and `@supabase/supabase-js`.
- Shared cross-boundary contracts belong in `packages/{contracts,domain,tokens}` only when genuinely shared.
- Token-aware wrappers under `apps/web/app/components/bivaque/` are part of the design-system contract.

## Before changing behavior

- Read the nearest implementation and tests first.
- Reconcile product-changing work against `docs/BIVAQUE.md` and `docs/PRODUCT_STATUS.md`.
- Read the relevant installed Next.js docs before using framework APIs that may have changed from training data.
- For Supabase/Auth/RLS/database behavior, also follow `supabase/AGENTS.md` and the official Supabase skills.
- Do not turn a local mechanical edit into a redesign or architecture migration.

## Runtime evidence

**Existence is not evidence. Runtime behavior is evidence.**

A page, component, Server Action, RPC call, migration, or test file in the tree does not prove a user flow works.

For changed behavior, prove the property at the closest layer where it can still fail:

- pure deterministic logic → unit test;
- server behavior → targeted integration/API evidence;
- forms, navigation, compound controls, hydration, state transitions → real browser/Playwright evidence;
- persistence/authorization → database evidence plus runtime evidence when the boundary crosses into the app.

A failed query rendered as an empty list is a bug, not a valid empty state.

## Server/client trust boundary

- `service_role` is privilege, not caller identity.
- Privileged Server Actions and route handlers resolve the real authenticated caller from server context.
- Never trust identity, role, locality, community, ownership, or authorization merely because it arrived in `FormData`, query params, hidden inputs, or client state.
- Do not silently discard Supabase/PostgREST errors on critical paths.

Detailed database rules live in `supabase/AGENTS.md`.

## HeroUI and local components

- Reuse a Bivaque wrapper when it already represents the intended pattern.
- Do not create wrappers merely to hide imports.
- Direct HeroUI usage is acceptable when no local wrapper owns the pattern.
- Preserve required providers when modifying layouts/shells.
- Prove changed compound-control behavior in a real browser; JSX presence and typecheck are insufficient.
- Do not migrate working UI to another primitive/library as incidental cleanup.

## User-facing states

Where relevant, asynchronous surfaces distinguish deliberately between:

- loading;
- true empty;
- denied/not available;
- recoverable error;
- successful populated state.

Do not create blank UI by swallowing failures.

## E2E data boundary

E2E uses the real development contract in `supabase/seed.sql`.

pgTAP uses separate transactional fixtures.

Never infer E2E entity UUIDs from pgTAP fixture conventions. External Playwright examples do not override this rule.

## Local validation

From repository root:

```sh
npx pnpm@11.18.0 gate --fast
npx pnpm@11.18.0 gate
npx pnpm@11.18.0 build
```

Run targeted tests during iteration. UI changes also follow the repository visual-audit contract. Interaction-dependent changes require browser-level proof.

## Definition of done

A frontend change is not done until:

- the changed property is directly evidenced at the appropriate layer;
- changed loading/error/empty states are deliberate;
- authorization-sensitive behavior has allowed and denied evidence;
- relevant runtime errors are surfaced/handled rather than hidden;
- required root gates pass;
- interaction-dependent changes have browser-level proof;
- visual changes satisfy Bivaque's visual audit when applicable.

## Decisions still open

1. Pin/install selected external skills in the repository/harness versus resolving them upstream on demand.
2. Add `next-dev-loop` + its browser prerequisite to the supported harness toolchain versus keeping it optional.
3. Move Playwright local rules into `tests/e2e/AGENTS.md`.
4. Decide whether Impeccable should remain purely opt-in or become an approved visual-audit tool under a constrained command subset.
5. Promote recurring frontend failures into executable scope/a11y/runtime checks so this file can shrink further.
