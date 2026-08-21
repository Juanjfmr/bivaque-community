# Supabase — scoped agent instructions

> **DRAFT.** Applies to `supabase/**` and to any change whose correctness depends on Supabase Database, Auth, Storage, RLS, RPCs, grants, Cron, `pg_net`, or local Supabase state.
>
> This file is intentionally **not** a Supabase handbook. General Supabase/Postgres practice comes from the official `supabase/agent-skills` repository. This file contains only Bivaque-specific constraints and the local workflow needed to apply those skills safely.

## Mandatory upstream instructions

Canonical upstream repository:

`https://github.com/supabase/agent-skills`

For **every task involving Supabase**, load and follow:

- `skills/supabase/SKILL.md`

For **anything that writes, changes, tests, or diagnoses something that lives in Postgres**, also load:

- `skills/supabase-postgres-best-practices/SKILL.md`

This includes even a one-column migration, SQL query, RLS policy, pgTAP assertion, function, trigger, index, `pg_cron` job, schema design, query-performance investigation, locking issue, or rows visible to the wrong user/scope.

The upstream repository currently exposes exactly these two skills. Do not invent additional Supabase skill names.

### Precedence

1. Product/security decisions recorded in Bivaque define **what the product is allowed to do**.
2. Official Supabase agent skills and current Supabase docs define **how Supabase/Postgres work should be performed safely and correctly**.
3. This file defines **Bivaque-specific constraints, test states, and trust-boundary lessons**.

If upstream guidance conflicts with a locally pinned dependency/configuration, do not silently upgrade the project. Verify the installed version and treat the upgrade as its own change.

## Freshness is part of correctness

Supabase changes frequently. Do not diagnose or implement from model memory alone.

Before implementing Supabase behavior:

1. load the applicable upstream skill(s);
2. check the current Supabase changelog for relevant breaking changes;
3. read the current docs for the feature or failure mode being changed;
4. discover CLI syntax with the installed CLI `--help` when needed.

The Bivaque repository currently pins Supabase CLI `2.107.0`; use the repository-installed CLI, not an arbitrary global/latest CLI.

For Supabase errors, unexpected empty results, RLS surprises, permission errors, schema-cache issues, timeouts, Auth/Storage/Realtime failures, or performance incidents, consult Supabase's current Monitoring and Debugging guidance and inspect relevant logs before settling on a diagnosis.

If the same approach fails 2–3 times, stop repeating it. Re-read the error, docs, logs, and assumptions before trying another approach.

## Bivaque sources of truth

- Migration history: `supabase/migrations/`
- Public generated types: `supabase/database.generated.ts`
- Database tests: `supabase/tests/*.sql`
- Local runtime/E2E data: `supabase/seed.sql`
- Product authorization intent: `docs/BIVAQUE.md` + applicable ADRs
- Implemented-state inventory: `docs/PRODUCT_STATUS.md`

Generated types, old plans, and application wrappers are not proof of the clean database state.

## Local schema workflow

Bivaque currently uses **imperative migrations**. There is no `supabase/schemas/` declarative workflow to substitute without an explicit project decision.

For schema/database changes, follow the official imperative workflow rather than accumulating trial-and-error migration files.

### During iteration

Prefer changing the **local** database first with one of the mechanisms allowed by the official skill:

- MCP `execute_sql`; or
- the repository-installed CLI `supabase db query`.

Iterate there until the desired schema/behavior is correct. Do not use `apply_migration` as an iterative local scratchpad because it writes migration-history entries and makes clean diff/pull workflows unreliable.

### Before committing the schema change

1. run Supabase database advisors and fix applicable findings;
2. review the upstream security checklist when the change touches RLS, views, functions, triggers, Storage, Auth, or user data;
3. generate/reconcile a clean migration from the validated local state using the workflow documented by the current official skill;
4. inspect the generated SQL rather than trusting generation blindly;
5. verify local migration history;
6. replay from a clean database and run Bivaque's database gates.

With the currently pinned CLI, the official skill's generated-migration workflow is:

```sh
npx pnpm@11.18.0 exec supabase db advisors
npx pnpm@11.18.0 exec supabase db pull <descriptive-name> --local --yes
npx pnpm@11.18.0 exec supabase migration list --local
```

If a migration must instead be hand-authored, create its filename with the pinned CLI first:

```sh
npx pnpm@11.18.0 exec supabase migration new <name>
```

Never invent migration timestamps/filenames from memory. Never edit an already-applied migration.

## Local project constraints

- Never use `--linked` for agent-driven destructive operations.
- Generate client types from the **`public` schema only**.
- The `private` schema is not application-facing Data API surface and must remain outside generated public client types.
- Never persist data prohibited by the Bivaque privacy contract, including raw CPF, Portal payload, military organization/rank where prohibited, residential address, or verification documents beyond their allowed lifetime.
- A scope field and the RLS/policies that enforce that scope land together.
- Do not weaken grants, RLS, or privileged-function boundaries merely to make a test/UI path pass.

## Bivaque-specific authorization trap

Recent runtime failures established a recurring project-specific pattern:

**`service_role` is not the application caller.**

When application code calls an RPC through a `service_role` client, do not assume `auth.uid()` or `auth.jwt()` inside that RPC identifies the human user. The privileged connection may carry no user JWT at all.

For service-role-mediated user actions:

1. resolve the real user from authenticated server context;
2. pass only the caller/context required by the RPC;
3. authorize again at an authoritative server/database boundary;
4. prove both allowed and denied cases.

Do not use the target object's `user_id` as caller identity.

This rule supplements the official Supabase SECURITY DEFINER/RLS guidance; it does not replace it.

## Seed and pgTAP are separate data worlds

Do not mix them.

### pgTAP

- runs against a clean database **without** development seed;
- uses transactional fixtures under `supabase/tests/fixtures/`;
- fixture UUID conventions belong only to pgTAP.

### E2E / visual / local product runtime

- uses `supabase/seed.sql`;
- Playwright must resolve entities/accounts from the real seed contract;
- never copy a pgTAP fixture UUID into an E2E because it "looks like" the same entity.

## Canonical Bivaque validation states

With local Supabase running:

```sh
# DB verification state — NO development seed
npx pnpm@11.18.0 exec supabase db reset --local --no-seed
npx pnpm@11.18.0 test:db
npx pnpm@11.18.0 db:lint

# Runtime/E2E state — WITH development seed
npx pnpm@11.18.0 exec supabase db reset --local
```

Do not run visual capture, a dev tool, or another process that writes rows between the no-seed reset and `test:db`.

The two reset states are intentionally different. Do not simplify them into one.

## Runtime proof required across boundaries

For database changes that affect an application flow, pgTAP alone is not completion evidence.

After upstream Supabase verification and Bivaque database gates pass, verify the closest runtime layer where the behavior can still fail:

- application RPC signature matches the migrated function;
- required grants exist for the actual client role;
- privileged call has the correct caller identity;
- UI/server code consumes database errors rather than turning them into false empty states;
- E2E/live runtime proves the cross-layer flow when interaction is part of the property.

**Existence is not evidence. Runtime behavior is evidence.**

## Before declaring a Supabase task done

- applicable official skills were loaded and followed;
- relevant current Supabase changelog/docs were checked;
- database advisors were run when schema/database work requires them;
- clean migration replay succeeds;
- `test:db` and `db:lint` pass in the no-seed state;
- public generated types are updated when required;
- auth/RLS changes have positive and negative evidence;
- application/runtime evidence exists when the change crosses the DB boundary;
- no database error on the changed path is silently reinterpreted as a valid empty state;
- no local pinned-version constraint was silently changed.

## Questions to settle before finalizing this file

1. Should Bivaque pin the two upstream skills by per-skill release or by repository commit SHA? The upstream repository publishes independent semver versions for both skills.
2. Should CI verify that the expected Supabase skills are installed/available to supported harnesses?
3. Which Bivaque incidents should become automated scope tests instead of remaining as local prose here?
4. Should E2E stop knowing stable UUIDs entirely and use named seed helpers/contracts?
