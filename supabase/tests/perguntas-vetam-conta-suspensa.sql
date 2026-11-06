-- SEC — a policy recommendation_requests_insert_locality veta conta suspensa.
--
-- Run-015 (F03) achou o pedido de indicação sem o veto do ADR-20260901 que toda
-- escrita de conteúdo tem. Migration 20261106141329_perguntas_vetam_conta_suspensa.

begin;

create extension if not exists pgtap with schema extensions;
select plan(2);

\ir fixtures/foundation.inc

-- ── POSITIVO: membro ativo abre pedido na sua cidade.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.recommendation_requests (
      author_id,
      locality_id,
      title,
      body,
      category
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Alguem indica pediatra em Manaus?',
      'Preciso de uma indicacao de confianca para meu filho pequeno.',
      'outros'
    )
  $$,
  'conta ativa consegue abrir um pedido de indicacao na propria cidade'
);

-- ── NEGATIVO: suspensa nao. A escrita e feita fora da RLS (superusuario),
-- como a operacao faz via service_role.
reset role;
insert into public.profile_suspensions (user_id)
  values ('10000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.recommendation_requests (
      author_id,
      locality_id,
      title,
      body,
      category
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Pedido depois de suspensa',
      'Esta descricao tem tamanho suficiente para passar na validacao do body.',
      'outros'
    )
  $$,
  42501,
  null,
  'conta suspensa nao consegue abrir pedido de indicacao'
);

select * from finish();
rollback;
