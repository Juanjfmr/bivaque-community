-- RED-003 — a vila saiu do banco (ADR-20261024 §4).
--
-- Prova que tabelas, enums, colunas, funções e bucket exclusivos da vila não
-- existem mais, que os enums do domínio têm os valores aprovados, e que o
-- contrato do bloqueio existe com a assinatura e os grants certos.
-- Negativos de vila viram ausência de objeto; não basta "não lançou erro".

begin;

create extension if not exists pgtap with schema extensions;
select plan(28);

-- ── Tabelas da vila ────────────────────────────────────────────────────────
select is(to_regclass('public.communities')::text, null, 'vila-: public.communities não existe');
select is(to_regclass('public.community_memberships')::text, null, 'vila-: public.community_memberships não existe');
select is(to_regclass('public.community_invitations')::text, null, 'vila-: public.community_invitations não existe');
select is(to_regclass('public.community_join_reasons')::text, null, 'vila-: public.community_join_reasons não existe');

-- ── Enums exclusivos da vila ───────────────────────────────────────────────
select is(
  (select count(*)::int from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'community_invitation_status'),
  0, 'vila-: enum community_invitation_status não existe');
select is(
  (select count(*)::int from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'community_membership_role'),
  0, 'vila-: enum community_membership_role não existe');
select is(
  (select count(*)::int from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'community_membership_status'),
  0, 'vila-: enum community_membership_status não existe');

-- ── Colunas de vila que saíram ─────────────────────────────────────────────
select is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and column_name = 'community_id'),
  0, 'vila-: nenhuma coluna community_id sobra no schema public');

-- ── Funções exclusivas da vila ─────────────────────────────────────────────
select is(to_regprocedure('public.feed_community(uuid,text,integer,integer)')::text, null,
  'vila-: public.feed_community não existe');
select is(to_regprocedure('public.create_group_in_community(text,text,public.group_visibility,uuid)')::text, null,
  'vila-: public.create_group_in_community não existe');
select is(to_regprocedure('public.delete_group(uuid)')::text, null,
  'vila-: public.delete_group não existe (encerrar substitui)');
select is(to_regprocedure('private.is_community_member(uuid)')::text, null,
  'vila-: private.is_community_member não existe');
select is(to_regprocedure('public.accept_community_invitation(bytea,uuid)')::text, null,
  'vila-: public.accept_community_invitation não existe');

-- ── Bucket ─────────────────────────────────────────────────────────────────
select is(
  (select count(*)::int from storage.buckets where id = 'community-images'),
  0, 'vila-: bucket community-images não existe');

-- ── Enums do domínio redesenhados ──────────────────────────────────────────
select is(
  (select count(*)::int from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'post_type' and e.enumlabel = 'poll'),
  0, 'domínio: post_type não tem poll');
select is(
  (select count(*)::int from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'group_visibility' and e.enumlabel = 'open'),
  1, 'domínio: group_visibility tem open');
select is(
  (select count(*)::int from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'group_visibility' and e.enumlabel = 'closed'),
  1, 'domínio: group_visibility tem closed');
select is(
  (select count(*)::int from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'group_status' and e.enumlabel in ('active', 'archived')),
  2, 'domínio: group_status tem active e archived');
select is(
  (select count(*)::int from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'provider_reach_scope' and e.enumlabel = 'community'),
  0, 'domínio: provider_reach_scope não tem community');

-- ── groups: status e locality_id ───────────────────────────────────────────
select is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and table_name = 'groups' and column_name = 'status'),
  1, 'domínio: groups tem a coluna status');
select is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and table_name = 'groups'
      and column_name = 'is_deleted'),
  0, 'domínio: groups não tem is_deleted');
select is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and table_name = 'groups'
      and column_name = 'locality_id' and is_nullable = 'NO'),
  1, 'domínio: groups.locality_id é obrigatório');
select is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and table_name = 'posts'
      and column_name = 'group_id' and is_nullable = 'NO'),
  1, 'domínio: posts.group_id é obrigatório');

-- ── Contrato do bloqueio ───────────────────────────────────────────────────
select ok(
  exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'private' and p.proname = 'block_allows'),
  'bloqueio: private.block_allows existe');
select ok(
  private.block_allows(
    '00000000-0000-4000-8000-000000000001'::uuid,
    '00000000-0000-4000-8000-000000000002'::uuid,
    'ler'
  ),
  'bloqueio: corpo devolve true nesta leva');
select is(
  has_function_privilege('public', 'private.block_allows(uuid,uuid,text)', 'execute'),
  false,
  'bloqueio-: PUBLIC não executa block_allows');

-- ── Fundação sobrevive ─────────────────────────────────────────────────────
select ok(
  to_regprocedure('public.finalize_account_deletion(uuid,text)') is not null,
  'fundação: finalize_account_deletion existe');
select ok(
  to_regprocedure('public.settle_account_possessions(uuid)') is not null,
  'fundação: settle_account_possessions existe');

select * from finish();
rollback;