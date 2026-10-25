-- RED-003 — contrato do bloqueio (R2-comum §5; ADR-20261024 §4).
--
-- A assinatura e os consumidores são fixados agora; o corpo (D1/D2) devolve
-- true nesta leva. Para provar que os consumidores CONSULTAM a função, o corpo
-- é substituído DENTRO da transação do teste por um que devolve false e a
-- diferença de comportamento é medida. O rollback desfaz a substituição.

begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

\ir fixtures/foundation.inc
\ir fixtures/redesenho.inc

-- ── Assinatura, corpo e grants ─────────────────────────────────────────────
select ok(
  (select p.prosecdef from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'block_allows'),
  'bloqueio: block_allows é security definer');
select ok(
  position('search_path=' in coalesce(
    (select p.proconfig::text from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private' and p.proname = 'block_allows'), '')) > 0,
  'bloqueio: block_allows fixa search_path');
select ok(
  (select p.prorettype = 'boolean'::regtype from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'block_allows'),
  'bloqueio: block_allows retorna boolean');

-- ── Consumidores de leitura declaram a consulta ────────────────────────────
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'posts'
      and cmd = 'SELECT' and coalesce(qual, '') like '%block_allows%'
  ),
  'bloqueio: a leitura de publicações consulta block_allows');
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'comments'
      and cmd = 'SELECT' and coalesce(qual, '') like '%block_allows%'
  ),
  'bloqueio: a leitura de comentários consulta block_allows');
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events'
      and cmd = 'SELECT' and coalesce(qual, '') like '%block_allows%'
  ),
  'bloqueio: a leitura de eventos consulta block_allows');
select ok(
  position('block_allows' in (select prosrc from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'notify_group_post')) > 0,
  'bloqueio: o aviso de publicação consulta block_allows antes de emitir');
select ok(
  position('block_allows' in (select prosrc from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'notify_comment')) > 0,
  'bloqueio: o aviso de comentário consulta block_allows antes de emitir');

-- ── Leitura: quando o bloqueio deixa de permitir, o conteúdo some ──────────
-- member-four (004) é membro da cidade A e NÃO participa de grupo: lê o grupo
-- Aberto pelo escopo da cidade.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select is(
  (select count(*)::int from public.posts where id = '91000000-0000-4000-8000-000000000001'),
  1,
  'bloqueio+: com allow, o membro da cidade lê a publicação do grupo Aberto');

-- Substitui o corpo só nesta transação.
reset role;
create or replace function private.block_allows(p_actor uuid, p_author uuid, p_action text)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select false;
$$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select is(
  (select count(*)::int from public.posts where id = '91000000-0000-4000-8000-000000000001'),
  0,
  'bloqueio: com deny, o conteúdo some da leitura — a policy consulta a função');

-- ── Notificação: o trigger filtra cada destinatário ────────────────────────
reset role;
create or replace function private.block_allows(p_actor uuid, p_author uuid, p_action text)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select true;
$$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

insert into public.posts (locality_id, user_id, group_id, post_type, content)
values (
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  'text',
  'Aviso no grupo fechado');

reset role;
select is(
  (select count(*)::int from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'group_post'),
  1,
  'bloqueio+: com allow, o membro recebe o aviso da publicação');

create or replace function private.block_allows(p_actor uuid, p_author uuid, p_action text)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select false;
$$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

insert into public.posts (locality_id, user_id, group_id, post_type, content)
values (
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  'text',
  'Segundo aviso no grupo fechado');

reset role;
select is(
  (select count(*)::int from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'group_post'),
  1,
  'bloqueio: com deny, nenhum aviso novo é emitido');

select * from finish();
rollback;