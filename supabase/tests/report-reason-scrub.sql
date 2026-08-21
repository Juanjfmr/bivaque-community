-- Onda H Task 2 — redacao automatica do motivo de denuncia.
--
-- O trigger private.scrub_report_reason aplica a mesma redacao que o cliente
-- (scrubReportReason) como cinto de seguranca server-side. Estes testes
-- confirmam o efeito via insert da coluna reason, no mesmo padrao
-- dos testes reports-resolution.sql.
--
-- Cuidado com unique constraint em reports_one_open_per_reporter_target_idx:
-- cada reporter so pode ter UMA denuncia aberta por alvo. Por isso usamos
-- alvos (posts/comments/groups) diferentes em cada teste.

begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

\ir fixtures/foundation.inc
\ir fixtures/reports.inc

-- Cria alvos adicionais para o teste na fixture, para evitar o unique
-- constraint. Os autores sao member-one (001), para que member-two (002)
-- possa denuncia-los sem cair em self-report.
insert into public.posts (id, locality_id, user_id, post_type, content, created_at) values
  ('60000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'text', 'alvo extra 1', '2026-08-21 10:00:00+00'),
  ('60000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'text', 'alvo extra 2', '2026-08-21 10:00:00+00'),
  ('60000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'text', 'alvo extra 3', '2026-08-21 10:00:00+00');

insert into public.comments (id, post_id, user_id, content, created_at) values
  ('70000000-0000-4000-8000-000000000010', '60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'comentario alvo extra 1', '2026-08-21 10:05:00+00');

-- member-two (002) denuncia varios alvos de member-one (001)
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- 1. CPF formatado e redigido
select lives_ok(
  $$
    insert into public.reports (
      reporter_user_id, target_type, target_id, reason
    ) values (
      '10000000-0000-4000-8000-000000000002',
      'post',
      '60000000-0000-4000-8000-000000000001',
      'ele publicou o CPF 529.982.247-25 no grupo'
    )
  $$,
  'CPF formatado no motivo e aceito pelo trigger'
);

select is(
  (select reason from public.reports
   where reporter_user_id = '10000000-0000-4000-8000-000000000002'
     and target_type = 'post'
     and target_id = '60000000-0000-4000-8000-000000000001'
     and status = 'open'),
  'ele publicou o CPF [documento removido] no grupo',
  'CPF formatado no motivo e redigido server-side'
);

-- 2. CPF sem pontuacao (autor = member-one, alvo = comment)
select lives_ok(
  $$
    insert into public.reports (
      reporter_user_id, target_type, target_id, reason
    ) values (
      '10000000-0000-4000-8000-000000000002',
      'comment',
      '70000000-0000-4000-8000-000000000010',
      'ele me enviou DM com 52998224725 e link'
    )
  $$,
  'CPF sem pontuacao no motivo e aceito pelo trigger'
);

select is(
  (select reason from public.reports
   where reporter_user_id = '10000000-0000-4000-8000-000000000002'
     and target_type = 'comment'
     and target_id = '70000000-0000-4000-8000-000000000010'
     and status = 'open'),
  'ele me enviou DM com [documento removido] e link',
  'CPF sem pontuacao e redigido (11 digitos)'
);

-- 3. Frase sobre patente e OM (D21 nao permite filtro de vocabulario)
select lives_ok(
  $$
    insert into public.reports (
      reporter_user_id, target_type, target_id, reason
    ) values (
      '10000000-0000-4000-8000-000000000002',
      'group',
      '80000000-0000-4000-8000-000000000001',
      'ele falou da patente e da OM dele, e publicou o CPF 529.982.247-25'
    )
  $$,
  'frase sobre patente e OM e aceita pelo trigger'
);

select is(
  (select reason from public.reports
   where reporter_user_id = '10000000-0000-4000-8000-000000000002'
     and target_type = 'group'
     and target_id = '80000000-0000-4000-8000-000000000001'
     and status = 'open'),
  'ele falou da patente e da OM dele, e publicou o CPF [documento removido]',
  'frase sobre patente e OM sai intacta — D21 nao permite filtro de vocabulario'
);

-- 4. CPF com pontos no lugar do hifen (529.982.247.25) — alvo diferente
select lives_ok(
  $$
    insert into public.reports (
      reporter_user_id, target_type, target_id, reason
    ) values (
      '10000000-0000-4000-8000-000000000002',
      'post',
      '60000000-0000-4000-8000-000000000010',
      'reescrevendo motivo com 529.982.247.25'
    )
  $$,
  'CPF com pontos no lugar do hifen e aceito pelo trigger'
);

select is(
  (select reason from public.reports
   where reporter_user_id = '10000000-0000-4000-8000-000000000002'
     and target_type = 'post'
     and target_id = '60000000-0000-4000-8000-000000000010'
     and status = 'open'),
  'reescrevendo motivo com [documento removido]',
  'CPF com pontos no lugar do hifen (529.982.247.25) tambem e redigido'
);

-- 5. Multiplos CPFs no mesmo motivo — alvo diferente
select lives_ok(
  $$
    insert into public.reports (
      reporter_user_id, target_type, target_id, reason
    ) values (
      '10000000-0000-4000-8000-000000000002',
      'post',
      '60000000-0000-4000-8000-000000000011',
      'ele expôs o 529.982.247-25 e o 111.444.777-35 no chat'
    )
  $$,
  'multiplos CPFs no motivo sao aceitos pelo trigger'
);

select is(
  (select reason from public.reports
   where reporter_user_id = '10000000-0000-4000-8000-000000000002'
     and target_type = 'post'
     and target_id = '60000000-0000-4000-8000-000000000011'
     and status = 'open'),
  'ele expôs o [documento removido] e o [documento removido] no chat',
  'multiplos CPFs no mesmo motivo sao redigidos'
);

select * from finish();
rollback;
