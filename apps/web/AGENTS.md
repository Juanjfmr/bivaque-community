<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/web — scoped agent instructions

> **DRAFT.** This file defines frontend/runtime-local guidance only. It is intentionally incomplete while the repository instruction architecture is being redesigned. Root `AGENTS.md` remains authoritative until that redesign lands.

## Scope

Applies to `apps/web/**`.

This file should eventually contain only rules that are specific to the Next.js application. Product decisions, Supabase internals, harness operation, incident history, and roadmap sequencing do not belong here unless they directly change how `apps/web` code must be written.

## Local architecture

- Next.js **16**, server runtime. Do not add `output: "export"` or redesign the app around static export.
- React **19**.
- HeroUI **v3** is the component library. Do not add shadcn, Radix, Headless UI, or a second primitive layer.
- Tailwind **4**.
- Supabase access uses `@supabase/ssr` and `@supabase/supabase-js`.
- Shared contracts belong in `packages/{contracts,domain,tokens}` when they are truly cross-boundary; do not create a package for a one-screen concern.

## Before changing behavior

1. Read the nearest code and tests first.
2. If the task changes product behavior, authorization, visibility, admission, community scope, or another product decision, reconcile against `docs/BIVAQUE.md` and `docs/PRODUCT_STATUS.md` before editing.
3. If the task is a local mechanical change with no behavior change, do not invent new product context.
4. For unfamiliar Next.js APIs, read the installed Next 16 docs under `node_modules/next/dist/docs/` before implementation.

## Runtime evidence beats existence

**Existence is not evidence. Runtime behavior is evidence.**

A page, Server Action, RPC call, migration, or test file does not prove that a user flow works.

For a changed user flow, verify the closest practical level to the user:

- component/unit test for isolated deterministic logic;
- integration/API evidence for server behavior;
- Playwright or live browser evidence for interaction/navigation/state transitions;
- database assertion when persistence or authorization is part of the behavior.

A silent empty state caused by a failed query is a bug, not a valid empty state.

## Server/client boundaries

- Prefer server-side reads when the page is server-rendered and no client interaction requires ownership of the fetch.
- Server Actions and route handlers must resolve the real caller identity from the authenticated context before performing privileged writes.
- A `service_role` client is an authorization bypass mechanism, not a caller identity. Never assume `auth.uid()` exists inside an RPC invoked through `service_role`.
- When privileged code passes an explicit caller ID to an RPC, the RPC must validate that caller against authoritative server-side state.
- Never trust a user ID, role, locality, community, or ownership claim merely because it arrived in `FormData`, query params, or client state.

## Supabase call discipline

For every query or RPC on a critical path:

- inspect `error`;
- do not coerce errors into `[]`, `null`, or “not found” unless that mapping is deliberate and tested;
- distinguish access denial from transport/schema/programming failure when the UI behavior differs;
- do not assume a typed RPC exists in the current database merely because a generated type or wrapper references it.

Database-specific rules live in `supabase/AGENTS.md`.

## UI and HeroUI

- Reuse wrappers in `apps/web/app/components/bivaque/` when one exists for the pattern.
- Import HeroUI directly only when there is no project wrapper for that pattern or when the wrapper would be the wrong abstraction.
- Do not introduce a wrapper solely to reduce one import.
- Preserve the mounted `ToastProvider` when touching shell/layout composition.
- For compound HeroUI controls, verify the rendered interaction in the browser; type-checking and visible markup are insufficient evidence that the native control is actionable.
- Every interactive target must remain keyboard accessible and usable at the project’s supported viewports.
- Do not “fix” design debt outside the task unless it blocks correctness, accessibility, privacy, or the acceptance criteria.

## Error and empty states

Every asynchronous user-facing surface should make these states distinguishable where relevant:

- loading;
- true empty;
- denied/not available;
- recoverable failure;
- successful populated state.

Never render “nothing” because an error was ignored.

## Tests for web changes

Use the smallest test that proves the property, then add runtime coverage when the property is interaction-dependent.

Typical matrix:

| Change | Minimum proof |
|---|---|
| pure helper | unit test |
| server action / route behavior | unit/integration + relevant auth negative |
| permission-visible UI | positive + negative authorization evidence |
| navigation / form / compound control | Playwright or live browser evidence |
| screen visual change | visual loop required by root contract |
| cross-layer user flow | E2E against real `seed.sql` state |

Do not write an E2E against IDs copied from pgTAP fixtures. E2E and pgTAP use different data worlds.

## Local validation

From repository root:

```sh
npx pnpm@11.18.0 gate --fast
npx pnpm@11.18.0 gate
npx pnpm@11.18.0 build
```

Run the relevant targeted test during iteration. Run broader gates according to the root contract before declaring done.

## Definition of done for `apps/web`

A web change is not done until:

- the intended behavior is observable at the appropriate runtime layer;
- new or changed failure paths are handled deliberately;
- authorization-sensitive paths have both allowed and denied evidence;
- no Supabase error on the changed path is silently discarded;
- the relevant test fails without the fix or otherwise directly proves the changed property;
- required root gates pass;
- UI changes satisfy the visual-audit contract when applicable.

## Questions to settle before this becomes final

1. Should direct HeroUI imports be prohibited when a wrapper exists, or merely discouraged?
2. Which classes of web change require Playwright versus live-browser evidence versus deterministic integration tests?
3. Should Server Actions use one canonical helper for caller identity instead of each action creating an SSR client?
4. Can we enforce “Supabase error must be consumed” mechanically without unacceptable false positives?
5. Which runtime invariants belong here versus in executable `tests/scope` guardrails?
