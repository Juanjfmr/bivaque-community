-- P0 Task 5 (Step 3): the name policy (D23) gets a real home.
--
-- The old constraint only checked length 2-80. A name that reads as another
-- name is the cheapest vector of deception in a network where people
-- recognize each other by name, so the policy now:
--   1. normalizes to Unicode NFC (composed) — the same name must compare
--      equal regardless of how the client sent it;
--   2. rejects control characters (C0, DEL, C1) — no newlines, no tabs,
--      no escape smuggling into logs or HTML;
--   3. rejects bidi control marks (U+202A-U+202E, U+2066-U+2069, U+061C,
--      U+200E, U+200F) — the classic spoofing vector for a name that is
--      visually another name.
--
-- The check is a normalizing expression, not a trigger: the value is stored
-- as the caller sent it, but the check forces canonical equivalence on
-- insert/update, so a composed and a decomposed spelling cannot both live in
-- the table under the same rules.

create or replace function private.display_name_ok(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    p_name is not null
    and pg_catalog.char_length(p_name) between 2 and 80
    and p_name = pg_catalog.normalize(p_name, 'NFC')
    and p_name !~ '[[:cntrl:]]'
    and position(pg_catalog.chr(8234) in p_name) = 0
    and position(pg_catalog.chr(8235) in p_name) = 0
    and position(pg_catalog.chr(8236) in p_name) = 0
    and position(pg_catalog.chr(8237) in p_name) = 0
    and position(pg_catalog.chr(8238) in p_name) = 0
    and position(pg_catalog.chr(8239) in p_name) = 0
    and position(pg_catalog.chr(1564) in p_name) = 0
    and position(pg_catalog.chr(8206) in p_name) = 0
    and position(pg_catalog.chr(8207) in p_name) = 0;
$$;

revoke all on function private.display_name_ok(text) from public;
revoke all on function private.display_name_ok(text) from anon;
-- O CHECK da constraint roda como quem faz o UPDATE (authenticated incluído),
-- então execute não pode ficar só com service_role — senão todo update de
-- nome morre com 42501.
revoke all on function private.display_name_ok(text) from authenticated;
grant execute on function private.display_name_ok(text) to service_role;
grant execute on function private.display_name_ok(text) to authenticated;

alter table public.profiles
  drop constraint profiles_display_name_check;

alter table public.profiles
  add constraint profiles_display_name_check
  check (private.display_name_ok(display_name));
