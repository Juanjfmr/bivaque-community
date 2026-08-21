# Supabase — scoped agent instructions

> **DRAFT.** Applies to `supabase/**` and to any change whose correctness depends on Supabase Database, Auth, Storage, RLS, RPCs, grants, Cron, `pg_net`, or local Supabase state.
>
> This file is intentionally **not** a Supabase handbook. General Supabase/Postgres practice comes from the official Supabase agent skills. This file contains only Bivaque-specific constraints and workflow.

## Mandatory upstream instructions

For **every Supabase task**, load and follow the official Supabase skill from:

- `supabase/agent-skills` → `skills/supabase/SKILL.md`

For **anything that writes or changes Postgres**, including a one-column migration, RLS policy, SQL query, function, trigger, index, pgTAP assertion, `pg_cron` job, or schema design, also load:

- `supabase/agent-skills` → `skills/supabase-postgres-best-practices/SKILL.md`

Canonical upstream repository:

`https://github.com/supabase/agent-skills`

If the harness has these skills installed, use the installed skills. Otherwise read the current upstream instructions before implementation.

### Precedence

1. Product/security decisions recorded in this repository define **what Bivaque is allowed to do**.
2. Official Supabase agent skills define **how Supabase/Postgres work should be performed safely and correctly**.
3. This file defines **Bivaque's local Supabase workflow and reproducibility constraints**.

If current Supabase guidance conflicts with a locally pinned version/configuration, do not silently upgrade or rewrite the project. Verify the pinned version, explain the incompatibility, and treat an upgrade as its own change.

## Bivaque sources of truth

- Migration history: `supabase/migrations/`
- Public generated types: `supabase/database.generated.ts`
- Database tests: `supabase/tests/*.sql`
- Local runtime/E2E data: `supabase/seed.sql`
- Product authorization intent: `docs/BIVAQUE.md` + applicable ADRs
- Implemented-state inventory: `docs/PRODUCT_STATUS.md`

Generated types, old plans, and application wrappers are not proof of the clean database state.

## Local project constraints

- This repository currently uses **imperative migrations**. There is no declarative `supabase/schemas/` workflow to substitute without an explicit project decision.
- Supabase CLI is pinned by the repository. Discover commands from the installed version with `--help`; do not assume latest CLI behavior.
- Never edit an applied migration. Add a new migration through the pinned CLI.
- Never use `--linked` for agent-driven destructive operations.
- Generate client types from the **`public` schema only**. The trust schema must remain outside generated public client types.
- The `private` schema is not application-facing Data API surface.
- Never persist data prohibited by the Bivaque privacy contract, including raw CPF, Portal payload, military organization/rank where prohibited, residential address, or verification documents beyond their allowed lifetime.
- A scope field and the RLS/policies that enforce that scope land together.

Canonical migration creation:

```sh
npx pnpm@11.18.0 exec supabase migration new <name>
```

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

This rule supplements the official Supabase guidance; it does not replace its SECURITY DEFINER/RLS checklist.

## Seed and pgTAP are separate data worlds

Do not mix them.

### pgTAP

- runs against a clean database **without** development seed;
- uses transactional fixtures under `supabase/tests/fixtures/`;
- fixture UUID conventions belong only to pgTAP.

### E2E / visual / local product runtime

- uses `supabase/seed.sql`;
- Playwright must resolve entities/accounts from the real seed contract;
- never copy a pgTAP fixture UUID into an E2E because it “looks like” the same entity.

## Canonical local validation states

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

The two reset states are intentionally different. Do not “simplify” them into one.

## Runtime proof required across boundaries

For database changes that affect an application flow, pgTAP alone is not completion evidence.

After the official Supabase verification steps and Bivaque database gates pass, verify the closest runtime layer where the behavior can still fail:

- application RPC signature matches the migrated function;
- required grants exist for the actual client role;
- privileged call has the correct caller identity;
- UI/server code consumes database errors rather than turning them into false empty states;
- E2E/live runtime proves the cross-layer flow when interaction is part of the property.

**Existence is not evidence. Runtime behavior is evidence.**

## Before declaring a Supabase task done

- current official `supabase` skill followed;
- `supabase-postgres-best-practices` followed for Postgres work;
- relevant current Supabase docs/changelog checked as required by the upstream skill;
- clean migration replay succeeds;
- `test:db` and `db:lint` pass in the no-seed state;
- public generated types updated when required;
- auth/RLS changes have positive and negative evidence;
- application/runtime evidence exists when the change crosses the DB boundary;
- no local pinned-version constraint was silently changed.

## Questions to settle before finalizing this file

1. Should CI verify that the official Supabase skills are installed/available to supported harnesses?
2. Should we pin an upstream `agent-skills` release/SHA for reproducibility, or deliberately follow current upstream `main`?
3. Which Bivaque incidents should become automated scope tests instead of remaining as local prose here?
4. Should E2E stop knowing stable UUIDs entirely and use named seed helpers/contracts?
