-- P0 Task 1 (Step 3): canonical IBGE municipality code on public.localities.
--
-- ibge_code is the canonical identity of a municipality (issue #20): without
-- it, "Bom Jesus" becomes four localities by spelling alone. It is text, not
-- number — seven digits, and treating it as a number is the door to losing
-- the leading zero on some future reformat. The column is nullable only for
-- the duration of the data migration that follows; that same migration fills
-- the catalog and then locks it NOT NULL.
--
-- The slug must carry the UF: municipality names repeat across states ("Bom
-- Jesus" exists in several) and a name-only slug collides on insert. The data
-- migration generates 'bom-jesus-pi' style slugs.
--
-- Manaus already exists with a durable UUID and the slug 'manaus-am'. The
-- data migration preserves that row via ON CONFLICT (slug) DO UPDATE — an
-- UPDATE, never delete+insert, so locality_memberships, profiles, posts,
-- groups, events and the pgTAP fixtures that fix the UUID keep working.

alter table public.localities
  add column ibge_code text
  check (ibge_code ~ '^[0-9]{7}$');

-- Unique allows multiple NULLs in Postgres, so it is safe to add before the
-- data migration fills the catalog. Constraint (not bare index) so pgTAP's
-- col_is_unique sees it in pg_constraint.
alter table public.localities
  add constraint localities_ibge_code_key unique (ibge_code);
