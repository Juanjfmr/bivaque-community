begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

-- Salvamento de referência do guia (prancha 12/61).
--
-- O que a suíte prova: o salvamento é do próprio usuário (select, insert e
-- delete passam por auth.uid()), o INSERT exige referência APROVADA da
-- localidade de quem salva (pendente da fila do operador e referência de
-- outra cidade não entram), e ninguém lê o salvamento alheio.

\ir fixtures/foundation.inc
\ir fixtures/community.inc

-- Duas referências na localidade da fixture, uma pendente e uma aprovada; e
-- uma aprovada em OUTRA localidade.
insert into public.arrival_guide_entries (id, locality_id, category, name, description, status)
values
  (
    '00000000-0000-4000-8000-0000000000e1',
    '00000000-0000-4000-8000-000000000001',
    'school',
    'Escola Aprovada da Fixture',
    'Referência aprovada para o teste de salvamento.',
    'approved'
  ),
  (
    '00000000-0000-4000-8000-0000000000e2',
    '00000000-0000-4000-8000-000000000001',
    'school',
    'Escola Pendente da Fixture',
    'Ainda na fila do operador.',
    'pending'
  ),
  (
    '00000000-0000-4000-8000-0000000000e3',
    '00000000-0000-4000-8000-000000000002',
    'school',
    'Escola de Outra Cidade',
    'Referência de outra localidade.',
    'approved'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.guide_entry_saves (user_id, entry_id)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-0000000000e1'
    )
  $$,
  'membro salva referência aprovada da própria localidade'
);

select throws_ok(
  $$
    insert into public.guide_entry_saves (user_id, entry_id)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-0000000000e2'
    )
  $$,
  '42501',
  null,
  'referência ainda pendente na fila não pode ser salva'
);

select throws_ok(
  $$
    insert into public.guide_entry_saves (user_id, entry_id)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-0000000000e3'
    )
  $$,
  '42501',
  null,
  'referência de outra localidade não pode ser salva'
);

select throws_ok(
  $$
    insert into public.guide_entry_saves (user_id, entry_id)
    values (
      '10000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-0000000000e1'
    )
  $$,
  '42501',
  null,
  'ninguém salva em nome de outro usuário'
);

select is(
  (select count(*)::integer from public.guide_entry_saves),
  1,
  'o próprio salvamento é legível'
);

reset role;

select is(
  (
    select count(*)::integer
      from public.guide_entry_saves
     where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  1,
  'a linha existe para quem salvou'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.guide_entry_saves),
  0,
  'outro membro não vê o salvamento alheio'
);

-- A remoção é medida pelo EFEITO: quem não salvou não apaga a linha alheia
-- (a policy de delete exige user_id = auth.uid()), então sobram 1 linha.
delete from public.guide_entry_saves
 where entry_id = '00000000-0000-4000-8000-0000000000e1';

reset role;

select is(
  (
    select count(*)::integer
      from public.guide_entry_saves
     where entry_id = '00000000-0000-4000-8000-0000000000e1'
  ),
  1,
  'quem não salvou não remove o salvamento alheio'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

delete from public.guide_entry_saves
 where entry_id = '00000000-0000-4000-8000-0000000000e1';

reset role;

select is(
  (
    select count(*)::integer
      from public.guide_entry_saves
     where entry_id = '00000000-0000-4000-8000-0000000000e1'
  ),
  0,
  'quem salvou remove o próprio salvamento'
);

select * from finish();
rollback;
