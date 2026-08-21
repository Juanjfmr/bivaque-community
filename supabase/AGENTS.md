# supabase — scoped agent instructions

> **DRAFT.** This file defines database/auth/storage-local guidance only. Root `AGENTS.md` remains authoritative until the repository instruction architecture is redesigned.

## Scope

Applies to `supabase/**` and to any change whose correctness depends on schema, RLS, grants, RPCs, auth context, Storage policies, database jobs, or seed state.

The goal of this file is to keep trust-boundary rules close to the database instead of repeating them in every agent prompt.

## Sources of truth

- Applied schema history: `supabase/migrations/`.
- Generated public client types: `supabase/database.generated.ts`.
- Database behavioral tests: `supabase/tests/*.sql`.
- Development/E2E data: `supabase/seed.sql`.
- Product authorization intent: `docs/BIVAQUE.md` + relevant ADRs.
- Implemented-state inventory: `docs/PRODUCT_STATUS.md`.

Generated types are not proof that the currently running database exposes the same behavior. Migrations and runtime evidence win.

## Non-negotiable trust boundaries

- Never persist raw CPF, Portal payload, military organization, rank, residential address, or verification documents beyond their allowed lifetime.
- The `private` schema is not a public application API. Keep it outside generated public client types and Data API exposure.
- RLS must remain enabled and forced where the current schema contract requires it.
- `service_role` bypasses RLS. Treat every use as privileged code that must establish authorization separately.
- Scope data and the policies that enforce that scope must land together. Do not add a scope column now and defer its policy.
- Never weaken a policy, grant, or SECURITY DEFINER boundary merely to make a test or UI path pass.

## Migrations

- Never edit an applied migration.
- Create a new timestamped migration with the pinned Supabase CLI.
- Keep a migration focused on one coherent schema/security change when practical.
- A migration that creates or changes authorization must ship with tests for the same property.
- When changing a function signature, search every application call site and every pgTAP caller before declaring the migration complete.
- When dropping or renaming a column/function/table, search later migrations too; PL/pgSQL bodies can preserve references that only fail at runtime.

Canonical creation command:

```sh
npx pnpm@11.18.0 exec supabase migration new <name>
```

## Authorization model: caller identity is explicit evidence

Do not conflate these concepts:

- authenticated database caller;
- application user whose action is being performed;
- privileged `service_role` connection;
- operator/community-owner/moderator authorization.

A function invoked through `service_role` cannot rely on `auth.uid()` or `auth.jwt()` to identify the application caller unless the connection actually carries that user JWT.

When application code invokes a privileged RPC on behalf of a user:

1. resolve the user from authenticated server context;
2. pass only the minimum caller identity/context required;
3. re-check authorization inside the database or another authoritative server boundary;
4. test both the allowed caller and at least one denied caller.

Never use a target object’s `user_id` as evidence that the caller is authorized to mutate that object.

## SECURITY DEFINER functions

For every new or materially changed SECURITY DEFINER function:

- set an explicit safe `search_path` according to existing repository conventions;
- grant EXECUTE only to roles that need it;
- validate caller/target/scope relationships inside the function when RLS is bypassed;
- avoid returning more data than the caller needs;
- add positive and negative tests;
- inspect whether the function is called from RLS policies and preserve recursion-safe structure.

A SECURITY DEFINER function is a privilege boundary, not a convenience wrapper.

## RLS proof standard

For permission-sensitive behavior, prove the property, not merely the policy text.

At minimum consider:

1. authorized user succeeds;
2. unauthorized user fails;
3. user from another locality/community/group fails when cross-scope access is forbidden;
4. direct database/API access cannot bypass a UI-only restriction;
5. service-role application paths perform their own authorization where necessary.

If a read denial intentionally maps to “not found”, test that protected content is absent; do not rely only on HTTP status behavior from Next.js.

## Grants and RPC existence

Whenever the application starts calling an RPC or table through a new role/client:

- verify the function/table exists after a clean reset;
- verify the role has the required grant;
- verify its dependencies exist at the point its migration runs;
- verify the application uses the current signature.

A TypeScript declaration, wrapper, or old migration reference is not evidence that the RPC exists in the clean current schema.

## Seed and pgTAP are different worlds

Do not mix them.

### pgTAP

- Runs against a clean database **without** development seed.
- Uses transactional fixtures under `supabase/tests/fixtures/`.
- Fixture UUID conventions are local to those tests.

### E2E / visual / local product runtime

- Uses `supabase/seed.sql`.
- Seeded accounts/entities must be treated as the runtime truth for Playwright.
- Do not copy pgTAP fixture UUIDs into E2E specs.

The two required reset states are intentionally incompatible.

## Canonical database validation sequence

With local Supabase running:

```sh
# database tests: no dev seed
npx pnpm@11.18.0 exec supabase db reset --local --no-seed
npx pnpm@11.18.0 test:db
npx pnpm@11.18.0 db:lint

# E2E/runtime state: with seed
npx pnpm@11.18.0 exec supabase db reset --local
```

Do not run visual capture or a dev tool that writes rows between the no-seed reset and `test:db`.

Never use `--linked` for agent-driven destructive operations.

## Error handling across the application boundary

Database errors on critical paths must remain observable to the application layer.

Do not design an RPC/query contract that forces the caller to interpret these as the same state unless the product explicitly wants that:

- no rows;
- access denied;
- function missing;
- schema mismatch;
- transport failure;
- provider failure.

Silent failure is especially dangerous when UI logic interprets `null`/`[]` as “nothing to show”.

## Storage

For verification or other private uploads:

- bucket visibility and Storage policies are part of the authorization change;
- signed access should be short-lived and generated only after authorization;
- persisted metadata must not accidentally extend the lifetime of the underlying sensitive document;
- test direct Storage access, not only the UI path.

## Cron, outbox, and jobs

For `pg_cron`, `pg_net`, outbox, reconciliation, or cleanup jobs:

- migration defines the job and its database-side contract;
- job execution must be idempotent or explicitly safe to retry;
- failure must leave enough state to diagnose/retry without duplicating side effects;
- local/runtime limitations must be documented as `RUNTIME UNVERIFIED`, not silently treated as passing.

## Definition of done for database changes

A Supabase change is not done until:

- clean migration replay succeeds;
- `test:db` and `db:lint` pass in the correct no-seed state;
- generated public types are updated when the public schema changed;
- authorization-sensitive paths have positive and negative proof;
- application call sites match the final function/schema contract;
- runtime/E2E evidence exists when the property crosses the DB/UI boundary;
- no privileged path relies on implicit caller identity that is absent in its real execution context.

## Questions to settle before this becomes final

1. Should we add a scope test that compares application `.rpc()` names against functions present after migration replay?
2. Can we statically flag RPCs called through `service_role` that reference `auth.uid()`/`auth.jwt()`?
3. Which SECURITY DEFINER invariants should become automated structural tests rather than prose?
4. Should every authorization RPC require an explicit caller parameter, or only service-role-mediated paths?
5. Should seed entities expose stable named helpers/fixtures for E2E instead of letting specs know UUIDs at all?
