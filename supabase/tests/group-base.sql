begin;

create extension if not exists pgtap with schema extensions;
select plan(69);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

-- COM-003 (B1 do lote 5): a base do grupo.
--
-- member-one (001): dono (owner, approved) dos grupos 001 e 002.
-- member-two (002): membro aprovado, papel `member`, no grupo 001.
-- member-four (004): mora na localidade 001 e NÃO participa de grupo nenhum.
-- member-three (003): mora em outra localidade (0002).
-- non-member (005): moderador (papel `moderator`) do grupo 001, criado abaixo —
--   o papel que a revisão apontou como capaz de fixar publicação e mudar regras.
--
-- Publicações de preparo (superusuário, antes dos papéis):
--   7000…0001 e 7000…0002  recentes no grupo 001  → contam na atividade
--   7000…0003             antiga (40 dias) no 001 → não conta
--   7000…0004             recente no grupo 002    → fixação estrangeira e
--                                                    leitura negada a não-membro
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

-- O moderador do grupo 001 (papel que não administra).
insert into public.group_memberships (group_id, user_id, role, status)
values (
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000005',
  'moderator',
  'approved'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Estrutura: as colunas, o tipo novo e a privacidade do aviso
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

select is(
  (
    select count(*)::integer
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'notification_type'
      and e.enumlabel = 'group_post'
  ),
  1,
  'a caixa de notificações tem o aviso de grupo'
);

select is(
  has_column_privilege(
    'authenticated', 'public.group_memberships', 'notify_level', 'SELECT'
  ),
  false,
  'authenticated não lê notify_level por SELECT'
);

select is(
  has_column_privilege(
    'authenticated', 'public.group_memberships', 'notify_level', 'UPDATE'
  ),
  false,
  'authenticated não escreve notify_level por UPDATE'
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
-- Regras do grupo: o dono escreve, o moderador e quem não administra não
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

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.set_group_rules(
      '40000000-0000-4000-8000-000000000001', 'Regras do moderador'
    )
  $$,
  null,
  'moderador não define as regras do grupo pela RPC'
);

-- Escrita direta das regras pelo moderador: a policy de UPDATE de groups exige
-- o dono, então a linha não é alcançada e não há erro.
select lives_ok(
  $$
    update public.groups
    set rules = 'regras do moderador'
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  'escrita direta das regras pelo moderador não levanta erro'
);

reset role;

select results_eq(
  $$
    select rules from public.groups
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Regras do grupo teste'::text) $$,
  'as regras não mudaram pela escrita do moderador'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    update public.groups
    set rules = 'regras de quem não administra'
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  'escrita direta das regras por membro comum não levanta erro'
);

reset role;

select results_eq(
  $$
    select rules from public.groups
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Regras do grupo teste'::text) $$,
  'as regras não mudaram pela escrita do membro comum'
);

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

reset role;

-- A coluna está revogada para `authenticated`: a leitura da prova é do
-- superusuário, e o RPC do próprio dono vem logo abaixo.
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

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select public.my_group_notify_level('40000000-0000-4000-8000-000000000001')
  $$,
  $$ values ('all'::public.group_notify_level) $$,
  'a própria pessoa lê o próprio aviso pelo RPC'
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

select is(
  public.my_group_notify_level('40000000-0000-4000-8000-000000000001'),
  null::public.group_notify_level,
  'quem não participa não lê aviso de grupo'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select notify_level
    from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  null,
  'a pessoa não lê o aviso de outra pela Data API'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    update public.group_memberships
    set notify_level = 'none'
    where group_id = '40000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  null,
  'o moderador não muda o aviso de outra pessoa'
);

-- Papel e status só mudam pelas RPCs: a escrita direta do moderador é
-- recusada, inclusive na própria participação (a autopromoção a dono era a
-- escalada que fazia o moderador passar nos gates de dono).
select throws_ok(
  $$
    update public.group_memberships
    set status = 'approved'
    where group_id = '40000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000002'
  $$,
  '42501',
  null,
  'o moderador não muda status de outra pessoa pela escrita direta'
);

select throws_ok(
  $$
    update public.group_memberships
    set role = 'owner'
    where group_id = '40000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000005'
  $$,
  '42501',
  null,
  'o moderador não se promove a dono pela escrita direta'
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
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true
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
  'moderador não fixa publicação pela RPC'
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

-- Atualização direta da coluna (o dono tem UPDATE em groups): o gatilho recusa
-- a publicação de outro grupo mesmo por fora da RPC.
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

-- Escrita direta da fixação por quem não administra: a policy exige o dono, e
-- a linha não é alcançada.
select lives_ok(
  $$
    update public.groups
    set pinned_post_id = '70000000-0000-4000-8000-000000000001'
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  'escrita direta da fixação pelo membro comum não levanta erro'
);

reset role;

select results_eq(
  $$
    select pinned_post_id
    from public.groups
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('70000000-0000-4000-8000-000000000002'::uuid) $$,
  'a fixação não mudou pela escrita do membro comum'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.unpin_group_post('40000000-0000-4000-8000-000000000001')
  $$,
  null,
  'moderador não desafixa publicação pela RPC'
);

select lives_ok(
  $$
    update public.groups
    set pinned_post_id = '70000000-0000-4000-8000-000000000001'
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  'escrita direta da fixação pelo moderador não levanta erro'
);

reset role;

select results_eq(
  $$
    select pinned_post_id
    from public.groups
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('70000000-0000-4000-8000-000000000002'::uuid) $$,
  'a fixação não mudou pela escrita do moderador'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

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

reset role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Grupo Fechado: a publicação fixada não é lida por quem não é membro
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.pin_group_post(
      '40000000-0000-4000-8000-000000000002',
      '70000000-0000-4000-8000-000000000004'
    )
  $$,
  'dono fixa uma publicação no grupo Fechado'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Membro da localidade, não membro do grupo Fechado: vê o grupo (e o id da
-- fixada), nunca a publicação fixada.
select isnt_empty(
  $$
    select id
    from public.groups
    where id = '40000000-0000-4000-8000-000000000002'
  $$,
  'quem não é membro continua vendo o grupo Fechado'
);

select is_empty(
  $$
    select id
    from public.posts
    where id = '70000000-0000-4000-8000-000000000004'
  $$,
  'quem não é membro não lê a publicação fixada do grupo Fechado'
);

reset role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Criar grupo com regras
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

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

reset role;

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

-- ═══════════════════════════════════════════════════════════════════════════════
-- O nível de aviso decide os avisos de grupo (NOTIF de presets.js)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Nada: resposta a uma publicação do grupo não avisa o autor.
update public.group_memberships
set notify_level = 'none'
where group_id = '40000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000001';

insert into public.comments (post_id, user_id, content)
values (
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'Comentário um no nível nada'
);

select is(
  (
    select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'comment'
      and target_id = '70000000-0000-4000-8000-000000000001'
  ),
  0,
  'Nada: resposta a publicação de grupo não avisa'
);

-- Destaques: resposta a você avisa.
update public.group_memberships
set notify_level = 'highlights'
where group_id = '40000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000001';

insert into public.comments (post_id, user_id, content)
values (
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'Comentário dois no nível destaques'
);

select is(
  (
    select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'comment'
      and target_id = '70000000-0000-4000-8000-000000000001'
  ),
  1,
  'Destaques: resposta a você avisa'
);

-- Tudo: resposta a você avisa.
update public.group_memberships
set notify_level = 'all'
where group_id = '40000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000001';

insert into public.comments (post_id, user_id, content)
values (
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'Comentário três no nível tudo'
);

select is(
  (
    select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'comment'
      and target_id = '70000000-0000-4000-8000-000000000001'
  ),
  2,
  'Tudo: resposta a você avisa'
);

-- Publicação nova no grupo: só quem escolheu Tudo recebe.
update public.group_memberships
set notify_level = 'none'
where group_id = '40000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000002';

insert into public.posts (locality_id, user_id, group_id, post_type, content)
values (
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'text',
  'Publicação de grupo no nível nada'
);

select is(
  (
    select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'group_post'
      and action = 'created'
  ),
  0,
  'Nada: publicação nova no grupo não avisa'
);

update public.group_memberships
set notify_level = 'highlights'
where group_id = '40000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000002';

insert into public.posts (locality_id, user_id, group_id, post_type, content)
values (
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'text',
  'Publicação de grupo no nível destaques'
);

select is(
  (
    select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'group_post'
      and action = 'created'
  ),
  0,
  'Destaques: publicação nova no grupo não avisa'
);

update public.group_memberships
set notify_level = 'all'
where group_id = '40000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000002';

insert into public.posts (locality_id, user_id, group_id, post_type, content)
values (
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'text',
  'Publicação de grupo no nível tudo'
);

select is(
  (
    select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'group_post'
      and action = 'created'
  ),
  1,
  'Tudo: publicação nova no grupo avisa'
);

-- Publicação fixada: Tudo e Destaques recebem; Nada, não.
-- As fixações das seções anteriores (sempre com a conta dona) já deixaram
-- avisos de fixada para quem estava em Tudo ou Destaques: a prova começa do
-- zero para contar só o que ela mesma provoca.
delete from public.notifications
where type = 'group_post' and action = 'pinned';

update public.group_memberships
set notify_level = 'none'
where group_id = '40000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.pin_group_post(
      '40000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000002'
    )
  $$,
  'dono fixa a publicação para a prova do aviso'
);

reset role;

select is(
  (
    select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'group_post'
      and action = 'pinned'
  ),
  0,
  'Nada: publicação fixada não avisa'
);

update public.group_memberships
set notify_level = 'highlights'
where group_id = '40000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000002';

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
  'dono troca a publicação fixada'
);

reset role;

select is(
  (
    select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'group_post'
      and action = 'pinned'
  ),
  1,
  'Destaques: publicação fixada avisa'
);

update public.group_memberships
set notify_level = 'all'
where group_id = '40000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.pin_group_post(
      '40000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000002'
    )
  $$,
  'dono fixa outra publicação'
);

reset role;

select is(
  (
    select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'group_post'
      and action = 'pinned'
  ),
  2,
  'Tudo: publicação fixada avisa'
);

select is(
  (
    select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'group_post'
      and action = 'pinned'
  ),
  0,
  'quem fixa não se avisa'
);

select results_eq(
  $$
    select target_type, target_id
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'group_post'
      and action = 'pinned'
    order by created_at
    limit 1
  $$,
  $$ values ('group'::text, '40000000-0000-4000-8000-000000000001'::uuid) $$,
  'o aviso de grupo aponta para o grupo'
);

select * from finish();
rollback;