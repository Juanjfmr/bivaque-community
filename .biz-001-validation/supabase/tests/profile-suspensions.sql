-- R3-1: o estado de suspensão sai da exposição do Data API.
--
-- Card BLOCK-SUSPENSION-EXPOSURE. Antes, is_suspended era coluna de
-- public.profiles e vazava pela LINHA INTEIRA a qualquer membro da mesma
-- cidade. Agora vive em public.profile_suspensions, com RLS owner-only, e o
-- helper public.is_account_suspended() mantém o contrato que as cinco policies
-- de INSERT consomem. Este arquivo prova a exposição fechada, a autoleitura e
-- o veto de publicação ainda de pé.

begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

\ir fixtures/foundation.inc

-- ── Estrutura: a coluna sumiu de profiles; a tabela nova existe.
select hasnt_column(
  'public', 'profiles', 'is_suspended',
  'profiles nao expoe mais o estado de suspensao'
);
select has_table(
  'public', 'profile_suspensions',
  'o estado de suspensao vive em tabela propria'
);

-- member-one (001) esta suspenso. A escrita e feita fora da RLS (superusuario),
-- como a operacao faz via service_role.
reset role;
insert into public.profile_suspensions (user_id)
  values ('10000000-0000-4000-8000-000000000001');

-- ── POSITIVO: o dono le a propria suspensao, linha e helper.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::int from public.profile_suspensions
    where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  1,
  'o dono le a propria linha de suspensao'
);

select is(
  public.is_account_suspended('10000000-0000-4000-8000-000000000001'),
  true,
  'o helper devolve true para o proprio dono suspenso (veto de publicacao intacto)'
);

-- ── NEGATIVO: vizinho de cidade (002) nao le a suspensao do terceiro.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::int from public.profile_suspensions
    where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  0,
  'membro da mesma cidade NAO le a suspensao de terceiro'
);

select is(
  public.is_account_suspended('10000000-0000-4000-8000-000000000001'),
  false,
  'o helper responde false para terceiro (anti-enumeracao 4.3)'
);

-- ── NEGATIVO: ninguem se auto-suspende nem se reabilita pela Data API.
select throws_ok(
  $$ insert into public.profile_suspensions (user_id)
     values ('10000000-0000-4000-8000-000000000002') $$,
  null, null,
  'authenticated nao escreve a propria suspensao'
);

-- ── NEGATIVO: anon nao executa o helper nem le a tabela.
reset role;
set local role anon;
select throws_ok(
  $$ select public.is_account_suspended('10000000-0000-4000-8000-000000000001') $$,
  null, null,
  'anon nao executa o helper de suspensao'
);
select throws_ok(
  $$ select count(*) from public.profile_suspensions $$,
  null, null,
  'anon nao le a tabela de suspensao'
);

-- ── Privilegios: o helper e o unico caminho, e so para authenticated.
reset role;
select function_privs_are(
  'public', 'is_account_suspended', array['uuid'], 'anon', array[]::text[],
  'anon nao tem EXECUTE no helper'
);
select function_privs_are(
  'public', 'is_account_suspended', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated tem EXECUTE no helper'
);

select * from finish();
rollback;
