<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/web — scoped agent instructions

> **DRAFT.** Applies to `apps/web/**`.
>
> This file is intentionally **not** a general frontend handbook. `finfin/awesome-frontend-skills` is the curated discovery index for external frontend skills; Bivaque keeps only project-specific constraints here.

## Frontend skill sources

Curated index:

`https://github.com/finfin/awesome-frontend-skills`

The index is **discovery**, not normative authority. Prefer official/maintainer-owned skills and current upstream repositories over copying guidance from the index itself.

### Base guidance for React work

For React/Next.js code, load:

- Vercel Engineering — `vercel-react-best-practices`
  - upstream: `vercel-labs/agent-skills`
  - path: `skills/react-best-practices/SKILL.md`

Use it for React components, pages, data fetching, server/client performance, bundle behavior, rendering, and refactors.

### Next.js guidance

Do **not** install the retired `next-best-practices` skill referenced by older versions of the curated index.

For Next.js 16.3+, Vercel moved version-matched reference knowledge into:

- the bundled docs at `node_modules/next/dist/docs/`;
- the auto-generated agent rules at the top of this file.

Current workflow skills, when relevant, live in:

`https://github.com/vercel/next.js/tree/canary/skills`

Read the installed Next 16 docs before using framework APIs that may have changed from model training data.

### User-facing UI work

For building or materially changing user-facing UI, also load:

- Addy Osmani — `frontend-ui-engineering`
  - upstream: `addyosmani/agent-skills`
  - path: `skills/frontend-ui-engineering/SKILL.md`

This covers component architecture, responsive behavior, accessibility, interaction quality, states, and avoiding generic AI-generated UI patterns.

Bivaque's own `docs/agents/DESIGN_SPEC.md` and `docs/agents/VISUAL_GUIDE.md` override generic aesthetic advice. External skills may improve execution; they may not redesign the product's visual language by themselves.

### Visual design / polish

For explicit visual redesign or polish tasks, the project may additionally use:

- `pbakaus/impeccable` → `frontend-design`

Use it as a craft aid under the Bivaque design system and visual audit, never as permission to introduce a new visual direction outside the task.

### Playwright work

When writing, repairing, restructuring, or debugging Playwright tests, load:

- Currents — `playwright-best-practices`
  - upstream: `currents-dev/playwright-best-practices-skill`
  - path: `playwright-best-practices/SKILL.md`

Do not load Playwright guidance for tasks that do not touch browser/E2E behavior.

## Skill loading rule

**Load only the skills relevant to the task.**

Typical selection:

| Task | Required external guidance |
|---|---|
| React logic/refactor | Vercel React |
| Next.js route/RSC/Server Action | Vercel React + installed Next 16 docs |
| new or materially changed UI | Vercel React + frontend-ui-engineering + Next docs as needed |
| visual redesign/polish | above + frontend-design |
| Playwright/E2E | playwright-best-practices + framework guidance only if app code also changes |

Do not preload the entire `awesome-frontend-skills` catalog. More skills are not inherently better context.

If a referenced skill is installed in the active harness, use the installed skill. Otherwise read the current upstream `SKILL.md` before implementation.

## Local architecture

These are Bivaque constraints, not suggestions from external skills:

- Next.js **16.3.x**, server runtime.
- React **19**.
- HeroUI **v3** is the only component library. Do not add shadcn, Radix, Headless UI, or a second primitive system.
- Tailwind **4**.
- Supabase access uses `@supabase/ssr` and `@supabase/supabase-js`.
- Shared cross-boundary contracts live in `packages/{contracts,domain,tokens}` when genuinely shared.
- Existing token-aware wrappers under `apps/web/app/components/bivaque/` are part of the design-system contract.

## Local precedence

For frontend work, apply instructions in this order:

1. product/security decisions in `docs/BIVAQUE.md` and applicable ADRs;
2. local Bivaque design system and visual rubric;
3. this scoped file and root repository contracts;
4. official/selected external frontend skills;
5. generic model knowledge.

An external best practice does not authorize changing a Bivaque product decision, library choice, design language, or trust boundary.

## Before changing behavior

- Read the nearest implementation and tests first.
- Reconcile product-changing work against `docs/BIVAQUE.md` and `docs/PRODUCT_STATUS.md`.
- For local mechanical edits, do not preload unrelated product history.
- For Supabase/auth/RLS/database behavior, also follow `supabase/AGENTS.md` and the official Supabase skills.

## Runtime evidence

**Existence is not evidence. Runtime behavior is evidence.**

A page, component, Server Action, RPC call, migration, or E2E file existing in the tree does not prove the user flow works.

For changed interaction behavior, verify at the closest layer where the failure can still occur:

- unit/component test for isolated deterministic behavior;
- server/API integration evidence for server behavior;
- browser/Playwright evidence for forms, navigation, compound controls, hydration, and state transitions;
- database evidence when persistence or authorization is part of the flow.

A query failure rendered as an empty list is not a valid empty state.

## Bivaque-specific server/client boundary

- `service_role` is privilege, not caller identity.
- Server Actions and route handlers performing privileged work must resolve the authenticated caller from real server context.
- Never trust caller identity, role, locality, community, ownership, or authorization merely because it arrived in `FormData`, query params, hidden inputs, or client state.
- Do not silently discard Supabase/PostgREST errors on critical paths.

Detailed database rules live in `supabase/AGENTS.md`.

## HeroUI and local components

- Reuse a Bivaque wrapper when it already represents the intended pattern.
- Do not create wrappers just to hide imports.
- Direct HeroUI usage is acceptable when no local wrapper represents the pattern, subject to the current design-system contract.
- Preserve required providers when modifying layouts/shells.
- Compound HeroUI controls must be proven actionable in a real browser when their behavior changes; JSX presence and typecheck are insufficient.
- Do not migrate working UI to another component primitive as incidental cleanup.

## User-facing states

Where relevant, asynchronous surfaces must deliberately distinguish:

- loading;
- true empty;
- denied/not available;
- recoverable error;
- successful populated state.

Do not manufacture blank UI by swallowing failures.

## Bivaque test/data constraint

E2E uses the real development contract in `supabase/seed.sql`.

pgTAP uses separate transactional fixtures.

Never infer E2E entity UUIDs from pgTAP fixture conventions.

When touching Playwright, follow both the selected Playwright skill and the repository's seed/reset constraints.

## Local validation

From repository root, use the pinned project commands:

```sh
npx pnpm@11.18.0 gate --fast
npx pnpm@11.18.0 gate
npx pnpm@11.18.0 build
```

Run targeted tests during iteration. UI work also follows the repository visual-audit contract.

## Definition of done for `apps/web`

A frontend change is not done until:

- the changed property is directly evidenced at the appropriate layer;
- changed failure/empty/loading states are deliberate;
- authorization-sensitive behavior has allowed and denied evidence;
- relevant runtime errors are consumed explicitly rather than hidden;
- required root gates pass;
- interaction-dependent changes have browser-level proof;
- visual changes satisfy Bivaque's visual audit when applicable.

## Questions to settle before this becomes final

1. Should these external skills be installed and versioned inside the repository/harness, or resolved from current upstream on demand?
2. Should `frontend-ui-engineering` be mandatory for every UI diff or only material UI/interaction work?
3. Should `frontend-design` remain conditional to redesign/polish, or become part of every visual-audit remediation loop?
4. Should Playwright guidance move later into a dedicated `tests/e2e/AGENTS.md`, leaving only a pointer here?
5. Which local frontend rules can become executable scope/a11y checks and disappear from this file entirely?
