begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- ═══════════════════════════════════════════════════════════════════════════
-- RED-005 — fronteira da conta de prestador no esquema aprovado.
--
-- A vila saiu (ADR-20261024 §4): o prestador já não é atestado por uma
-- comunidade. Ele é conta independente (`provider_accounts.locality_id`), sem
-- `locality_memberships` e sem vínculo de grupo — e por isso não lê conteúdo
-- de membro. `communities.inc` entra só como fixture de GRUPOS: o que a
-- fronteira dele continua vedando (perfis, grupos, publicações, eventos,
-- escrita) agora precisa existir para a negativa não ser vazia.
-- ═══════════════════════════════════════════════════════════════════════════

insert into auth.users (id, email)
values
  ('60000000-0000-4000-8000-000000000001', 'provider-one@example.invalid'),
  ('60000000-0000-4000-8000-000000000002', 'provider-two@example.invalid');

insert into public.provider_accounts (
  auth_user_id, invited_by, locality_id
)
values
  (
    '60000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  );

-- Ficha própria do prestador. A apresentação que ele lê não é mais a da
-- comunidade (removida com a vila): é a linha dele.
insert into public.provider_profiles (id, owner_user_id, display_name, category, bio)
values (
  '30000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  'Prestador civil',
  'assistencia_tecnica',
  'Atende a cidade sem vínculo de grupo'
);

-- Encontro da cidade, para a negativa de eventos não ser vazia.
insert into public.events (id, organizer_id, locality_id, title, starts_at)
values (
  'c3000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Encontro da cidade',
  now() + interval '3 days'
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

-- O que substitui a antiga leitura da apresentação da vila: o prestador é
-- conta autenticada e lê a PRÓPRIA linha (titularidade). O conteúdo alheio
-- continua vedado acima e abaixo.
select isnt_empty(
  $$ select 1 from public.provider_profiles
     where owner_user_id = '60000000-0000-4000-8000-000000000001' $$,
  'provider reads the own provider row, not member content'
);

select is_empty(
  'select 1 from public.events',
  'provider sees no events'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, group_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001',
      '80000000-0000-4000-8000-000000000001',
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