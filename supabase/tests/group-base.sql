begin;

create extension if not exists pgtap with schema extensions;
select plan(34);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

-- COM-003 (B1 do lote 5): a base do grupo.
--
-- member-one (001): dono (owner, approved) dos grupos 001 e 002.
-- member-two (002): membro aprovado, papel `member`, no grupo 001.
-- member-four (004): mora na localidade 001 e NÃO participa de grupo nenhum.
-- member-three (003): mora em outra localidade (0002).
--
-- Publicações de preparo (superusuário, antes dos papéis):
--   7000…0001 e 7000…0002  recentes no grupo 001  → contam na atividade
--   7000…0003             antiga (40 dias) no 001 → não conta
--   7000…0004             recente no grupo 002    → fixação estrangeira
--   7000…0005             removida no grupo 001    → fixação recusada

insert into public.posts (
  id, locality_id, user_id, group_id, post_type, content, created_at, is_deleted
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'text', 'Publicação recente um', now() - interval '1 day', false
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'text', 'Publicação recente dois', now() - interval '2 days', false
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'text', 'Publicação antiga', now() - interval '40 days', false
  ),
  (
    '70000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002',
    'text', 'Publicação do outro grupo', now() - interval '1 day', false
  ),
  (
    '70000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'text', 'Publicação removida', now() - interval '1 day', true
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- Estrutura: as colunas e o tipo novo
-- ═══════════════════════════════════════════════════════════════════════════════

select has_column('public', 'groups', 'rules', 'groups tem a coluna rules');
select has_column(
  'public', 'groups', 'pinned_post_id', 'groups tem a coluna pinned_post_id'
);
select has_column(
  'public', 'group_memberships', 'notify_level',
  'group_memberships tem a coluna notify_level'
);

select results_eq(
  $$
    select enumlabel::text collate "default"
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'group_notify_level'
    order by e.enumsortorder
  $$,
  $$ values ('all'::text), ('highlights'::text), ('none'::text) $$,
  'o nível de aviso tem Tudo, Destaques e Nada'
);

select results_eq(
  $$
    select count(*)
    from pg_trigger tg
    join pg_class c on c.oid = tg.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'groups'
      and tg.tgname = 'guard_group_pinned_post'
      and not tg.tgisinternal
  $$,
  array[1::bigint],
  'o gatilho da publicação fixada existe'
);

select results_eq(
  $$
    select relrowsecurity and relforcerowsecurity
    from pg_class
    where relname = 'groups' and relnamespace = 'public'::regnamespace
  $$,
  $$ values (true) $$,
  'RLS continua habilitada e forçada em groups'
);

select results_eq(
  $$
    select relrowsecurity and relforcerowsecurity
    from pg_class
    where relname = 'group_memberships' and relnamespace = 'public'::regnamespace
  $$,
  $$ values (true) $$,
  'RLS continua habilitada e forçada em group_memberships'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Regras do grupo: o dono escreve, quem não administra não
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.set_group_rules(
      '40000000-0000-4000-8000-000000000001', 'Regras do grupo teste'
    )
  $$,
  'dono define as regras do grupo'
);

select results_eq(
  $$
    select rules from public.groups
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Regras do grupo teste'::text) $$,
  'as regras ficam gravadas'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.set_group_rules(
      '40000000-0000-4000-8000-000000000001', 'Regras de quem não administra'
    )
  $$,
  null,
  'membro comum não define as regras do grupo'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.set_group_rules(
      '40000000-0000-4000-8000-000000000001', 'Regras de fora'
    )
  $$,
  null,
  'quem não é do grupo não define as regras'
);

reset role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Aviso por grupo: a própria pessoa, e só ela
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.set_group_notify_level(
      '40000000-0000-4000-8000-000000000001', 'all'
    )
  $$,
  'membro aprovado troca o próprio aviso'
);

select results_eq(
  $$
    select notify_level::text
    from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000002'
  $$,
  $$ values ('all'::text) $$,
  'o nível de aviso fica gravado na participação'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.set_group_notify_level(
      '40000000-0000-4000-8000-000000000001', 'none'
    )
  $$,
  null,
  'quem não participa não troca aviso de grupo'
);

reset role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Publicação fixada: uma por grupo, só o admin fixa, e tem de ser do grupo
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.pin_group_post(
      '40000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001'
    )
  $$,
  'dono fixa uma publicação do próprio grupo'
);

select results_eq(
  $$
    select pinned_post_id
    from public.groups
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('70000000-0000-4000-8000-000000000001'::uuid) $$,
  'a publicação fixada fica gravada no grupo'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.pin_group_post(
      '40000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000002'
    )
  $$,
  null,
  'membro comum não fixa publicação'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.pin_group_post(
      '40000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001'
    )
  $$,
  null,
  'quem não é do grupo não fixa publicação'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.pin_group_post(
      '40000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000004'
    )
  $$,
  null,
  'não se fixa publicação de outro grupo'
);

select throws_ok(
  $$
    select public.pin_group_post(
      '40000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000005'
    )
  $$,
  null,
  'não se fixa publicação removida'
);

select lives_ok(
  $$
    select public.pin_group_post(
      '40000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000002'
    )
  $$,
  'fixar outra substitui a anterior'
);

select results_eq(
  $$
    select pinned_post_id
    from public.groups
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('70000000-0000-4000-8000-000000000002'::uuid) $$,
  'só uma publicação fica fixada por grupo'
);

-- Atualização direta da coluna (authenticated tem UPDATE em groups): o gatilho
-- recusa a publicação de outro grupo mesmo por fora da RPC.
select throws_ok(
  $$
    update public.groups
    set pinned_post_id = '70000000-0000-4000-8000-000000000004'
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  null,
  'o gatilho recusa a publicação estrangeira na escrita direta'
);

select results_eq(
  $$
    select pinned_post_id
    from public.groups
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('70000000-0000-4000-8000-000000000002'::uuid) $$,
  'a fixação anterior continua depois da tentativa recusada'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.unpin_group_post('40000000-0000-4000-8000-000000000001')
  $$,
  null,
  'membro comum não desafixa publicação'
);

-- Escrita direta das regras por quem não administra: a policy de UPDATE de
-- groups exige moderador, então a linha não é alcançada e não há erro.
select lives_ok(
  $$
    update public.groups
    set rules = 'regras de quem não administra'
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  'escrita direta das regras por membro comum não levanta erro'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select rules from public.groups
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Regras do grupo teste'::text) $$,
  'as regras não mudaram pela escrita do membro comum'
);

select lives_ok(
  $$
    select public.unpin_group_post('40000000-0000-4000-8000-000000000001')
  $$,
  'dono desafixa a publicação'
);

select results_eq(
  $$
    select pinned_post_id
    from public.groups
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values (null::uuid) $$,
  'desafixar limpa a publicação fixada'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Criar grupo com regras
-- ═══════════════════════════════════════════════════════════════════════════════

select lives_ok(
  $$
    select public.create_group(
      'Grupo com regras',
      'public',
      '00000000-0000-4000-8000-000000000001',
      'Sobre o grupo com regras',
      'Regras novas'
    )
  $$,
  'membro verificado cria grupo com regras'
);

select results_eq(
  $$
    select rules from public.groups where name = 'Grupo com regras'
  $$,
  $$ values ('Regras novas'::text) $$,
  'o grupo criado guarda as regras'
);

select results_eq(
  $$
    select gm.role::text, gm.status::text
    from public.group_memberships gm
    join public.groups g on g.id = gm.group_id
    where g.name = 'Grupo com regras'
      and gm.user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('owner', 'approved') $$,
  'quem cria o grupo entra como dono aprovado'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Populares: atividade recente, não número de membros
-- ═══════════════════════════════════════════════════════════════════════════════

select results_eq(
  $$
    select recent_post_count
    from public.list_group_activity('00000000-0000-4000-8000-000000000001')
    where group_id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values (2::bigint) $$,
  'a atividade conta só as publicações dos últimos 30 dias'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select group_id
    from public.list_group_activity('00000000-0000-4000-8000-000000000001')
  $$,
  'quem é de outra localidade não lê a atividade'
);

reset role;

select * from finish();
rollback;