-- Onda F Task 6 — saved requests notify their followers.

begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

\ir fixtures/foundation.inc

reset role;

-- member-one (001) asks. member-two (002) and member-three (003) save.
-- member-three will UNSAVE before the reply, so they must NOT receive.
insert into public.recommendation_requests (
  id, author_id, locality_id, title, body, category
) values (
  '70000000-0000-4000-8000-000000000030',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Procuro indicação de eletricista',
  'Alguém indica eletricista na Vila Ajuricaba?',
  'servicos_locais'
);

insert into public.recommendation_saves (user_id, request_id) values
  ('10000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000030'),
  ('10000000-0000-4000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000030');

-- member-three unsaves BEFORE the reply lands.
delete from public.recommendation_saves
where user_id = '10000000-0000-4000-4000-8000-000000000003'::uuid
  and request_id = '70000000-0000-4000-8000-000000000030'::uuid;

-- member-four (004, hidden-member) saves too — they should receive.
insert into public.recommendation_saves (user_id, request_id) values
  ('10000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000030');

-- member-five replies to the request.
insert into public.recommendation_replies (
  id, request_id, author_id, body
) values (
  '80000000-0000-4000-8000-000000000030',
  '70000000-0000-4000-8000-000000000030',
  '10000000-0000-4000-8000-000000000005',
  'Recomendo o eletricista X — atende bem e cobra razoável.',
);

-- ── POSITIVE 1: follower who is still saved receives a notification ────────
select isnt_empty(
  $$
    select 1 from public.notifications
    where type = 'recommendation_reply'
      and action = 'replied_to_saved'
      and recipient_user_id = '10000000-0000-4000-8000-000000000002'::uuid
      and target_id = '70000000-0000-4000-8000-000000000030'::uuid
  $$,
  'F6+: still-saved follower (member-two) receives the notification'
);

-- ── POSITIVE 2: another follower (member-four) also receives ───────────────
select isnt_empty(
  $$
    select 1 from public.notifications
    where type = 'recommendation_reply'
      and action = 'replied_to_saved'
      and recipient_user_id = '10000000-0000-4000-8000-000000000004'::uuid
      and target_id = '70000000-0000-4000-8000-000000000030'::uuid
  $$,
  'F6+: another saved follower (member-four) receives the notification'
);

-- ── NEGATIVE 3: person who un-saved before the reply does NOT receive ─────
select is_empty(
  $$
    select 1 from public.notifications
    where action = 'replied_to_saved'
      and recipient_user_id = '10000000-0000-4000-4000-8000-000000000003'::uuid
      and target_id = '70000000-0000-4000-8000-000000000030'::uuid
  $$,
  'F6-: un-saved follower (member-three) does NOT receive (negative)'
);

-- ── NEGATIVE 4: replier never self-notifies; author already covered by F5 ─
-- The replier (member-five, 005) MUST NOT be a recipient (they're the
-- actor). The request author (member-one, 001) IS a recipient (F5) but
-- this F6 trigger excludes them anyway — the F5 trigger is the one that
-- notifies them. Here we assert the F6 trigger does not duplicate the
-- author notification by its own fan-out.
select is(
  (
    select count(*) from public.notifications
    where action = 'replied_to_saved'
      and target_id = '70000000-0000-4000-8000-000000000030'::uuid
  ),
  2::bigint,
  'F6+: exactly two follower notifications — author and replier excluded'
);

select * from finish();
rollback;