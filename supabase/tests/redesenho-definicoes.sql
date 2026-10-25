-- RED-003 — trava as definições do domínio (ADR-20261024 §3.5).
--
-- Compara o CONJUNTO EXATO das definições normalizadas: comando, papéis,
-- USING e WITH CHECK de cada policy, mais os triggers por tabela e os grants
-- por coluna. O `golden` é fixo e revisável (não é lido da migration): uma
-- policy relaxada que mantém o nome — `using (auth.uid() is not null)` ou
-- `... or outra_condicao` — muda os tokens normalizados e falha.
--
-- Normalização (private.r3_norm): minúsculas, sem espaços, sem aspas, sem
-- qualificação de schema e sem casts, com `( select auth.uid() as uid )`
-- reduzido a `auth.uid()`. O golden usa essa mesma forma reduzida.
--
-- Policies com subconsulta (EXISTS/IN sobre outra tabela) entram no conjunto
-- de NOMES e no veto de `USING (true)`, mas não no golden de texto: a forma
-- deparada de uma EXISTS depende de aliases internos e só pode ser fixada a
-- partir de uma captura real do banco. Isso está registrado em R3-cobertura.md.

begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

\ir fixtures/foundation.inc

create function private.r3_norm(t text) returns text
    language sql
    immutable
    as $$
  select case when t is null then '' else
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(lower(t), '\(\s*select\s+auth\.uid\(\)\s+as\s+uid\s*\)', 'auth.uid()', 'g'),
                    '::[a-z_\.]+', '', 'g'),
                  '[[:space:]]+', '', 'g'),
                '"', '', 'g'),
              'public\.', '', 'g'),
            'private\.', '', 'g'),
          '\(', '', 'g'),
        '\)', '', 'g'),
      '''', '''', 'g')
  end;
$$;

-- ── RLS ligado e forçado em toda tabela do domínio ─────────────────────────
select is(
  (select count(*)::int
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('posts', 'comments', 'post_reactions', 'post_saves',
                        'post_follows', 'hidden_posts', 'groups',
                        'group_memberships', 'group_join_reasons',
                        'group_join_attempts', 'events', 'event_rsvps',
                        'recommendation_requests', 'listings', 'provider_reach',
                        'notifications', 'reports', 'dm_conversations',
                        'provider_accounts')
      and not c.relrowsecurity),
  0, 'definicoes: toda tabela do domínio tem RLS ligado');

select is(
  (select count(*)::int
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('posts', 'comments', 'post_reactions', 'post_saves',
                        'post_follows', 'hidden_posts', 'groups',
                        'group_memberships', 'group_join_reasons',
                        'group_join_attempts', 'events', 'event_rsvps',
                        'recommendation_requests', 'listings', 'provider_reach',
                        'notifications', 'reports', 'dm_conversations',
                        'provider_accounts')
      and not c.relforcerowsecurity),
  0, 'definicoes: toda tabela do domínio tem RLS forçado');

-- ── Veto de qualquer policy frouxa em todo o domínio ───────────────────────
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public'
      and tablename in ('posts', 'comments', 'post_reactions', 'post_saves',
                        'post_follows', 'hidden_posts', 'groups',
                        'group_memberships', 'group_join_reasons', 'events',
                        'event_rsvps', 'recommendation_requests', 'listings',
                        'provider_reach', 'notifications', 'reports',
                        'dm_conversations', 'provider_accounts')
      and (private.r3_norm(coalesce(qual, '')) = 'true'
        or private.r3_norm(coalesce(with_check, '')) = 'true')),
  0, 'definicoes-: nenhuma policy do domínio é USING/WITH CHECK (true)');

-- ── Golden exato de USING/WITH CHECK (policies sem subconsulta) ────────────
with golden(tablename, policyname, qual, with_check) as (
  values
    ('posts', 'posts_select_locality_member',
     'not is_deleted and private.can_access_post_scope(locality_id, group_id) and private.block_allows(( select auth.uid() as uid ), user_id, ''ler'')', ''),
    ('posts', 'posts_insert_locality_member', '',
     'user_id = ( select auth.uid() as uid ) and group_id is not null and private.can_write_post_to(locality_id, group_id) and not public.is_account_suspended(( select auth.uid() as uid )) and not private.account_deletion_requested(( select auth.uid() as uid ))'),
    ('posts', 'posts_update_own',
     'not is_deleted and user_id = ( select auth.uid() as uid )', ''),
    ('posts', 'posts_delete_own',
     'not is_deleted and user_id = ( select auth.uid() as uid )', ''),
    ('groups', 'groups_select_locality_member',
     'private.is_group_member(id) or status = ''active'' and private.is_locality_member(locality_id)', ''),
    ('groups', 'groups_insert_verified_member', '',
     'private.is_verified_locality_member(locality_id) and created_by = ( select auth.uid() as uid ) and owner_user_id = ( select auth.uid() as uid ) and status = ''active'''),
    ('groups', 'groups_update_owner', 'private.is_group_owner(id)', 'private.is_group_owner(id)'),
    ('hidden_posts', 'hidden_posts_select_own',
     'user_id = ( select auth.uid() as uid ) and private.can_access_post(post_id)', ''),
    ('hidden_posts', 'hidden_posts_insert_own', '',
     'user_id = ( select auth.uid() as uid ) and private.can_access_post(post_id)'),
    ('hidden_posts', 'hidden_posts_delete_own',
     'user_id = ( select auth.uid() as uid )', ''),
    ('comments', 'comments_select_via_post',
     'not is_deleted and private.can_access_post(post_id) and private.block_allows(( select auth.uid() as uid ), user_id, ''ler'')', ''),
    ('comments', 'comments_delete_own',
     'not is_deleted and user_id = ( select auth.uid() as uid )', ''),
    ('post_reactions', 'post_reactions_delete_own',
     'user_id = ( select auth.uid() as uid )', ''),
    ('post_saves', 'post_saves_delete_own',
     'user_id = ( select auth.uid() as uid )', ''),
    ('post_follows', 'post_follows_delete_own',
     'user_id = ( select auth.uid() as uid )', ''),
    ('event_rsvps', 'event_rsvps_insert_self', '',
     'user_id = ( select auth.uid() as uid ) and private.can_access_event(event_id) and private.event_accepts_interaction(event_id)'),
    ('event_rsvps', 'event_rsvps_update_self',
     'user_id = ( select auth.uid() as uid )',
     'user_id = ( select auth.uid() as uid ) and private.event_accepts_interaction(event_id)'),
    ('event_rsvps', 'event_rsvps_delete_self',
     'user_id = ( select auth.uid() as uid )', ''),
    ('listings', 'listings_insert_owner', '',
     'owner_user_id = ( select auth.uid() as uid ) and not public.is_account_suspended(( select auth.uid() as uid )) and not private.account_deletion_requested(( select auth.uid() as uid )) and (locality_id is null or private.is_locality_member(locality_id))'),
    ('listings', 'listings_update_owner',
     'owner_user_id = ( select auth.uid() as uid )',
     'owner_user_id = ( select auth.uid() as uid ) and (locality_id is null or private.is_locality_member(locality_id))'),
    ('listings', 'listings_delete_owner',
     'owner_user_id = ( select auth.uid() as uid )', ''),
    ('listings', 'listings_select_scoped',
     'owner_user_id = ( select auth.uid() as uid ) or private.can_read_listing(id)', ''),
    ('provider_reach', 'provider_reach_select_scoped',
     'private.can_see_provider(provider_id)', ''),
    ('notifications', 'notifications_select_recipient',
     'recipient_user_id = ( select auth.uid() as uid )', ''),
    ('notifications', 'notifications_update_recipient',
     'recipient_user_id = ( select auth.uid() as uid )',
     'recipient_user_id = ( select auth.uid() as uid )'),
    ('reports', 'reports_select_reporter_only',
     'reporter_user_id = ( select auth.uid() as uid )', ''),
    ('dm_conversations', 'dm_conversations_select_participant',
     'participant_a = ( select auth.uid() as uid ) or participant_b = ( select auth.uid() as uid )', ''),
    ('provider_accounts', 'provider_accounts_select_self',
     'auth_user_id = ( select auth.uid() as uid )', ''),
    ('group_memberships', 'group_memberships_select',
     'user_id = ( select auth.uid() as uid ) or private.can_read_group_content(group_id)', ''),
    ('group_join_reasons', 'group_join_reasons_select_author_or_moderator',
     'user_id = ( select auth.uid() as uid ) or private.is_group_moderator(group_id)', '')
),
actual as (
  select p.tablename, p.policyname,
         private.r3_norm(coalesce(p.qual, '')) as qual,
         private.r3_norm(coalesce(p.with_check, '')) as with_check
    from pg_policies p
   where p.schemaname = 'public'
     and (p.tablename, p.policyname) in (select tablename, policyname from golden)
)
select is(
  (select array_agg(format('%s|%s|%s|%s', tablename, policyname, qual, with_check)
                    order by tablename, policyname)::text from actual),
  (select array_agg(format('%s|%s|%s|%s', tablename, policyname,
                           private.r3_norm(qual), private.r3_norm(with_check))
                    order by tablename, policyname)::text from golden),
  'definicoes: USING/WITH CHECK normalizados batem com o golden fixo');

-- ── Conjunto EXATO de nomes de policy em todo o domínio ────────────────────
select is(
  (select count(*)::int from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in ('posts', 'comments', 'post_reactions', 'post_saves',
                          'post_follows', 'hidden_posts', 'groups',
                          'group_memberships', 'group_join_reasons', 'events',
                          'event_rsvps', 'recommendation_requests', 'listings',
                          'provider_reach', 'notifications', 'reports',
                          'dm_conversations', 'provider_accounts')
      and p.policyname not in (
        'posts_delete_own', 'posts_insert_locality_member',
        'posts_select_locality_member', 'posts_update_own',
        'comments_delete_own', 'comments_insert_member',
        'comments_select_via_post', 'comments_update_own',
        'post_reactions_delete_own', 'post_reactions_insert_locality_member',
        'post_reactions_select_locality_member',
        'post_saves_delete_own', 'post_saves_insert_own', 'post_saves_select_own',
        'post_follows_delete_own', 'post_follows_insert_own', 'post_follows_select_own',
        'hidden_posts_delete_own', 'hidden_posts_insert_own', 'hidden_posts_select_own',
        'groups_insert_verified_member', 'groups_select_locality_member', 'groups_update_owner',
        'group_memberships_select', 'group_join_reasons_select_author_or_moderator',
        'events_insert_verified_member', 'events_select_locality_member', 'events_update_organizer',
        'event_rsvps_delete_self', 'event_rsvps_insert_self',
        'event_rsvps_select_locality_member', 'event_rsvps_update_self',
        'recommendation_requests_delete_own', 'recommendation_requests_insert_locality',
        'recommendation_requests_select_locality', 'recommendation_requests_update_own',
        'listings_delete_owner', 'listings_insert_owner', 'listings_select_scoped', 'listings_update_owner',
        'provider_reach_delete_owner_free_locality', 'provider_reach_insert_owner_free_locality',
        'provider_reach_select_scoped', 'provider_reach_update_owner_free_locality',
        'notifications_select_recipient', 'notifications_update_recipient',
        'reports_insert_authenticated', 'reports_select_reporter_only',
        'dm_conversations_select_participant', 'provider_accounts_select_self')),
  0, 'definicoes-: nenhuma policy fora do conjunto aprovado');

select is(
  (select count(*)::int from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'post_reactions'
      and p.policyname = 'post_reactions_insert_self'),
  0, 'definicoes-: a policy permissiva duplicada de reação não existe mais');

-- ── Grants por coluna ──────────────────────────────────────────────────────
select is(
  (select array_agg(column_name order by column_name)::text
     from information_schema.column_privileges
    where grantee = 'authenticated' and table_schema = 'public'
      and table_name = 'group_memberships' and privilege_type = 'SELECT'),
  array['group_id', 'joined_at', 'role', 'status', 'user_id']::text,
  'definicoes: o SELECT por coluna de group_memberships exclui notify_level');

select is(
  (select array_agg(column_name order by column_name)::text
     from information_schema.column_privileges
    where grantee = 'authenticated' and table_schema = 'public'
      and table_name = 'post_reactions' and privilege_type = 'SELECT'),
  array['created_at', 'id', 'post_id']::text,
  'definicoes: o SELECT por coluna de post_reactions exclui user_id');

-- ── Triggers por tabela ────────────────────────────────────────────────────
select is(
  (select array_agg(tgname order by tgname)::text from pg_trigger
    where tgrelid = 'public.posts'::regclass and not tgisinternal),
  array['block_soft_delete_posts', 'guard_post_immutable',
        'notify_group_post_trigger', 'posts_group_immutable']::text,
  'definicoes: posts tem exatamente os 4 triggers aprovados');

select is(
  (select array_agg(tgname order by tgname)::text from pg_trigger
    where tgrelid = 'public.groups'::regclass and not tgisinternal),
  array['guard_group_direct_update', 'guard_group_pinned_post',
        'notify_group_pin_trigger']::text,
  'definicoes: groups tem exatamente os 3 triggers aprovados');

-- ── Self-check de mutação: policy relaxada com o mesmo nome falha ──────────
create table public.r3_probe (id uuid);
create policy posts_select_locality_member on public.r3_probe
  for select to authenticated using (auth.uid() is not null);

select isnt(
  private.r3_norm((
    select qual from pg_policies
     where schemaname = 'public' and tablename = 'r3_probe'
       and policyname = 'posts_select_locality_member')),
  private.r3_norm('not is_deleted and private.can_access_post_scope(locality_id, group_id) and private.block_allows(( select auth.uid() as uid ), user_id, ''ler'')'),
  'definicoes-: policy relaxada mantendo o nome não passa pelo golden');

select is(
  private.r3_norm('( SELECT auth.uid() AS uid )'),
  private.r3_norm('(select auth.uid() as uid)'),
  'definicoes: a normalização reduz a subconsulta de auth.uid()');

select * from finish();
rollback;