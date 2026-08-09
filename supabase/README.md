# Supabase development baseline

This directory is the source of truth for the Bivaque Community database. It is
independent from every other Supabase project and contains no project reference,
database password, access token, provider credential, or application secret.

## Environment contract

- Local development uses `config.toml` and the Docker-backed CLI stack.
- Test, development, and production must be separate hosted Supabase projects.
- Link only the intended hosted project through an environment-provided project
  reference. Never commit the generated `.temp` link state or credentials.
- Run destructive reset commands only against the local stack. Do not use
  `--linked` with `db reset`.

The future deployment workflow should keep distinct secret variables for each
hosted environment and run `db push --dry-run` before `db push`. This baseline
does not create or link any hosted project.

## Migration workflow

Migrations are imperative and replay in timestamp order:

1. `20260802000100_locality_profile_foundation.sql` creates the public locality,
   membership, and coarse-profile contract and inserts Manaus.
2. `20260802000200_private_trust_family_foundation.sql` creates normalized private
   verification outcomes plus hashed family invitation and account-link records.
3. `20260802000300_foundation_rls.sql` enables RLS, grants minimum privileges, and
   adds locality/profile policies.

Create later changes with:

```sh
npx supabase migration new <short_name>
npx supabase db reset --local
npx supabase test db
npx supabase db lint --local --level error
```

Do not edit an applied migration. Add a later migration instead.

## Privacy boundary

The Data API exposes only `public` and `graphql_public`. Public profiles contain
only display name, locality, visibility, and timestamps. Verification outcomes,
family invitations, and family account links live in the unexposed `private`
schema. Neither `anon` nor `authenticated` has private table privileges; the
only authenticated capability there is execution of the boolean RLS helper.

Portal source data is not part of this baseline. In a future server-only mapper,
the source label `reformado` may map transiently to the private `veteran` value;
the source label itself must never be stored or exposed as a public label. Raw
identifiers, source payloads, military organization, rank, personal address, and
documents must never be persisted.

Accepted family accounts remain ordinary independent Auth users. The private
link records invitation provenance only; it does not transfer ownership or grant
access to another account's profile or data.

## Fixture-safe database tests

`tests/fixtures/foundation.inc` contains synthetic `example.invalid` identities
and fixed UUIDs. It is included inside each pgTAP transaction, so the CLI test
runner rolls it back. Do not copy hosted data, use live Portal calls, or add
real personal data to fixtures.

`seed.sql` is a separate concept and **does carry users**: it is the durable
LOCAL development seed (the E2E account plus whatever the operator and the
§10.2 visual capture need), running only on `supabase db reset --local`, with
credentials that are public and disposable by design. pgTAP fixtures stay
transactional and stay in `supabase/tests/*` — the two must not be merged.

```sh
npx supabase start
npx supabase db reset --local
npx supabase test db
```

## Generated types command stub

Workspace scripts are owned by the parallel workspace bootstrap and are outside
this directory's change boundary. Until that bootstrap wires its root command,
the database types can be generated directly with:

```sh
npx supabase gen types --lang typescript --local --schema public > supabase/database.generated.ts
```

Only the `public` schema is generated for clients. Never generate the private
trust schema into client-facing types.
