<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/web — server and public landing

Root rules in [AGENTS.md](../../AGENTS.md) apply first. Next.js 16.3, React 19, server runtime.

## What lives here

- **Server:** login and session, the Portal da Transparência check, media processing
  (`sanitize-image`), account deletion, workers, and the API routes the app calls.
- **Public landing**, rendered on the server for search.
- **Old signed-in screens (HeroUI).** They are being replaced by `apps/app`. Do not add features or
  redesign them; fix only defects that affect users before the swap. Each one leaves with its code
  and tests once its journey passes in `apps/app` (SPA ADR §8), with a redirect from the old route
  and the proxy gate moved in the same PR (no redirect cycles; member, provider and pre-admission
  still land in the right place, each tested).

## Server rules

- `service_role` is privilege, not caller identity. Privileged actions and routes resolve the real
  authenticated caller from server context. Never trust identity, role, locality, ownership or
  authorization arriving in `FormData`, query params, hidden inputs or client state.
- New API routes follow the SPA ADR §5 contract (root AGENTS.md) with positive and negative tests.
  The validation of an action lives in one module called by the old Server Action and the new route.
- Do not silently discard Supabase/PostgREST errors on critical paths; a failed query rendered as an
  empty state is a bug.
- Read the installed Next docs before using framework APIs that may have changed. Database work also
  follows [supabase/AGENTS.md](../../supabase/AGENTS.md).

## Proof

Existence is not evidence; runtime behavior is. Pure logic → unit test; server behavior → targeted
integration/API test; navigation, forms, hydration → Playwright; persistence and authorization →
database proof plus runtime proof across the boundary. E2E uses `supabase/seed.sql`; pgTAP uses its
own transactional fixtures; never borrow fixture UUIDs in E2E.
