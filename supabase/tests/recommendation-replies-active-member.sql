begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

\ir fixtures/foundation.inc
\ir fixtures/recommendations.inc

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.recommendation_replies (request_id, author_id, body)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'Recomendo a clinica da esquina, atendimento atencioso e horario flexivel.'
    )
  $$,
  'vínculo ativo responde a pergunta'
);

-- Vínculo de leitura (membro de saída) não escreve.
reset role;
update public.locality_memberships
   set access = 'read_only'
 where user_id = '10000000-0000-4000-8000-000000000002'
   and locality_id = '00000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.recommendation_replies (request_id, author_id, body)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'Resposta de vinculo somente leitura.'
    )
  $$,
  '42501',
  null,
  'vínculo somente leitura não responde'
);

-- Conta suspensa não escreve, mesmo com vínculo ativo.
reset role;
update public.locality_memberships
   set access = 'active'
 where user_id = '10000000-0000-4000-8000-000000000002'
   and locality_id = '00000000-0000-4000-8000-000000000001';
insert into public.profile_suspensions (user_id)
values ('10000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.recommendation_replies (request_id, author_id, body)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'Resposta de conta suspensa.'
    )
  $$,
  '42501',
  null,
  'conta suspensa não responde'
);

select * from finish();
rollback;
