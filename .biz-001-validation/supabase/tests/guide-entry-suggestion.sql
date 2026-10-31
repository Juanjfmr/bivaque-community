begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

-- Sugestão de referência do guia pelo membro (prancha 12/61).
--
-- O que a suíte prova: quem sugere NÃO publica (a linha nasce pending, com a
-- localidade da própria associação e o autor registrado), a cota de cinco
-- pendentes trava a sexta, e o caminho de escrita direta continua fechado para
-- o membro — inclusive o UPDATE que tentaria se auto-aprovar.

\ir fixtures/foundation.inc
\ir fixtures/community.inc

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.suggest_guide_entry(
      'school',
      'Escola Sugerida pela Fixture',
      'Sugestão de membro para a fila do operador.',
      'https://escola-sugerida.example.invalid',
      '+55 92 3333-4444'
    )
  $$,
  'membro da localidade sugere uma referência'
);

reset role;

select is(
  (
    select count(*)::integer
      from public.arrival_guide_entries
     where name = 'Escola Sugerida pela Fixture'
       and status = 'pending'
       and source = 'manual'
       and submitted_by = '10000000-0000-4000-8000-000000000001'
       and locality_id = '00000000-0000-4000-8000-000000000001'
  ),
  1,
  'a sugestão nasce pendente, manual, na cidade e com o autor de quem chamou'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.suggest_guide_entry('school', 'S', 'curta demais')
  $$,
  '22023',
  null,
  'nome fora do intervalo é recusado'
);

select throws_ok(
  $$
    select public.suggest_guide_entry(
      'school',
      'Escola com site inválido',
      'descrição',
      'escola.example.invalid'
    )
  $$,
  '22023',
  null,
  'site sem esquema http é recusado'
);

select throws_ok(
  $$
    select public.suggest_guide_entry(
      'school',
      'Escola com telefone inválido',
      'descrição',
      null,
      'ligar no zap'
    )
  $$,
  '22023',
  null,
  'telefone fora do padrão é recusado'
);

-- Cota: quatro sugestões a mais fecham as cinco pendentes da pessoa.
select lives_ok(
  $$
    select public.suggest_guide_entry('hospital', 'Hospital Um', 'descrição')
  $$,
  'segunda sugestão pendente'
);

select lives_ok(
  $$
    select public.suggest_guide_entry('hospital', 'Hospital Dois', 'descrição')
  $$,
  'terceira sugestão pendente'
);

select lives_ok(
  $$
    select public.suggest_guide_entry('transporter', 'Transportadora Três', 'descrição')
  $$,
  'quarta sugestão pendente'
);

select lives_ok(
  $$
    select public.suggest_guide_entry('courier', 'Despachante Quatro', 'descrição')
  $$,
  'quinta sugestão pendente'
);

select throws_ok(
  $$
    select public.suggest_guide_entry('courier', 'Despachante Cinco', 'descrição')
  $$,
  '54000',
  null,
  'a sexta sugestão pendente é recusada pela cota'
);

select throws_ok(
  $$
    insert into public.arrival_guide_entries (locality_id, category, name, description)
    values (
      '00000000-0000-4000-8000-000000000001',
      'school',
      'Escola Publicada Direto',
      'sem passar pela fila'
    )
  $$,
  '42501',
  null,
  'membro não insere direto na tabela do guia'
);

-- Auto-aprovação: o membro não tem privilégio de UPDATE na tabela do guia, e
-- é o privilégio (não a policy) que barra primeiro.
select throws_ok(
  $$
    update public.arrival_guide_entries
       set status = 'approved'
     where name = 'Escola Sugerida pela Fixture'
  $$,
  '42501',
  null,
  'membro não aprova a própria sugestão'
);

select is(
  (
    select count(*)::integer
      from public.arrival_guide_entries
     where status = 'pending'
  ),
  0,
  'sugestão pendente não é legível pelo membro (a fila é da operação)'
);

select * from finish();
rollback;
