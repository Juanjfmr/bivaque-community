-- Onda E Task 7 Step 1 — profile_posts_for visibility (server-side, not client).
-- A group post must NOT appear in the target user's profile for a viewer who is
-- not approved in that group (or the community). The query must return only
-- what the viewer can see.
--
-- Rewritten (20260821000023): the original version called these functions as
-- `authenticated` with `set_config('request.jwt.claim.sub', ...)`, which only
-- exercises the auth.uid()-based implementation the app never actually uses.
-- apps/web/app/(shell)/profile/[userId]/page.tsx calls all three through the
-- service_role client, which carries no JWT — auth.uid() was always NULL
-- there, so every visibility check silently failed regardless of viewer. This
-- file now calls the functions the way the app does: as service_role, with
-- the viewer passed explicitly as p_viewer_user_id. Same gap shape as the
-- event-invite RPCs (event-invite-rpc-exposure.sql).

begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- Add a post by member-one in a -001 group member-two does NOT belong to, and a
-- post by member-one in a -002 group member-two IS approved in. Desde o lote 5
-- N2 (migration 20261024100000) a publicação só existe dentro de um grupo:
-- `profile_posts_for` não lista mais linha sem grupo, então a visibilidade se
-- prova por participação de grupo. `posts_single_scope` exige escopo exclusivo
-- (grupo XOR comunidade), por isso as linhas têm só `group_id`.
insert into public.groups (
  id, name, description, visibility, locality_id,
  created_by, owner_user_id
)
values (
  '81000000-0000-4000-8000-000000000001',
  'Grupo da Vizinha',
  'Grupo de teste da visibilidade de perfil',
  'closed',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002'
);

-- Só a membership do member-two (dono do grupo): ele é membro aprovado da
-- comunidade -002, que é o que o gatilho de grupo-em-comunidade exige. O autor
-- das publicações é o member-one, inserido direto como fixture.
insert into public.group_memberships (group_id, user_id, role, status)
values (
  '81000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'owner',
  'approved'
);

insert into public.posts (
  id, locality_id, user_id, group_id, post_type, content, created_at
) values
  (
    '90000000-0000-4000-8000-000000000020',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000001',
    'text',
    'Post da Ajuricaba pelo member-one',
    '2026-08-04 12:00:00+00'
  ),
  (
    '90000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000001',
    'text',
    'Post da Vizinha pelo member-one',
    '2026-08-04 13:00:00+00'
  );

reset role;
set local role service_role;

-- ── POSITIVE: member-two sees the -002 post of member-one (their group) ───
select isnt_empty(
  $$
    select id from public.profile_posts_for(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000002'::uuid
    )
    where id = '90000000-0000-4000-8000-000000000021'::uuid
  $$,
  'E7+: member-two (approved in the -002 group) sees member-one posts of that group'
);

-- ── NEGATIVE: member-two does NOT see the -001 post of member-one ────────
select is_empty(
  $$
    select id from public.profile_posts_for(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000002'::uuid
    )
    where id = '90000000-0000-4000-8000-000000000020'::uuid
  $$,
  'E7-: a pending member of -001 does NOT see posts of a -001 group they do not belong to (cross-group denial)'
);

-- ── NEGATIVE: other-locality user sees nothing of member-one's profile ──
-- other-locality (member-three) is in locality 2 only, no overlap with
-- member-one's locality 1.
select is_empty(
  $$
    select id from public.profile_posts_for(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000003'::uuid
    )
  $$,
  'E7-: a member of another locality sees no posts from member-one at all'
);

-- ── NEGATIVE: profile_is_visible_to_viewer denies cross-locality ────────
select is(
  public.profile_is_visible_to_viewer(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid
  ),
  false,
  'E7-: profile_is_visible_to_viewer is false for a member of another locality'
);

select * from finish();
rollback;
