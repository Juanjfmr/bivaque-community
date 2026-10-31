begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

\ir fixtures/foundation.inc

-- ═══════════════════════════════════════════════════════════════════════════
-- Fixture: provider-one (prestador civil, sem locality_memberships) +
-- uma comunidade em Manaus para amarrar a indicação.
-- ═══════════════════════════════════════════════════════════════════════════

insert into auth.users (id, email)
values ('60000000-0000-4000-8000-000000000001', 'provider-one@example.invalid');

insert into public.communities (
  id, locality_id, name, created_by, owner_user_id
)
values (
  '50000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Vila Teste',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.provider_accounts (
  auth_user_id, invited_by, community_id, locality_id
)
values (
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);

-- Um segundo prestador, em outra comunidade, para provar que o
-- `provider_accounts_select_self` filtra só a própria linha.
insert into auth.users (id, email)
values ('60000000-0000-4000-8000-000000000002', 'provider-two@example.invalid');

insert into public.communities (
  id, locality_id, name, created_by, owner_user_id
)
values (
  '50000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Vila Teste Dois',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.provider_accounts (
  auth_user_id, invited_by, community_id, locality_id
)
values (
  '60000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FRONTEIRA — prestador não lê nenhum conteúdo do membro
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '60000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.posts',
  'provider sees no posts'
);

select is_empty(
  'select 1 from public.profiles',
  'provider sees no profiles'
);

select is_empty(
  'select 1 from public.groups',
  'provider sees no groups'
);

-- DECISÃO DO DONO (15/09/2026): a apresentação da comunidade (nome, cidade,
-- descrição) não é sigilosa, e o prestador é conta autenticada — ele lê a LINHA.
-- O que a fronteira dele continua vedando é o conteúdo: perfis (acima), grupos
-- (acima), eventos e escrita (abaixo).
select isnt_empty(
  $$ select 1 from public.communities
     where id = '50000000-0000-4000-8000-000000000001' $$,
  'provider reads the community presentation, not its content'
);

select is_empty(
  'select 1 from public.events',
  'provider sees no events'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001',
      'text',
      'provider tentando postar'
    )
  $$,
  42501,
  null,
  'provider cannot insert posts (RLS denies)'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- provider_accounts — vê só a própria linha
-- ═══════════════════════════════════════════════════════════════════════════

select isnt_empty(
  $$ select 1 from public.provider_accounts
     where auth_user_id = '60000000-0000-4000-8000-000000000001' $$,
  'provider sees own provider_accounts row'
);

select is_empty(
  $$ select 1 from public.provider_accounts
     where auth_user_id = '60000000-0000-4000-8000-000000000002' $$,
  'provider does NOT see other provider_accounts rows'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- my_account_kind — 'provider' para o prestador, 'member' para o membro
-- ═══════════════════════════════════════════════════════════════════════════

select is(
  public.my_account_kind()::text,
  'provider',
  'my_account_kind is provider for the provider account'
);

-- reset e assumir identidade de member-one
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  public.my_account_kind()::text,
  'member',
  'my_account_kind is member for a locality member'
);

rollback;