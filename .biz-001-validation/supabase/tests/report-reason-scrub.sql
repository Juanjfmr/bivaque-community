begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

\ir fixtures/foundation.inc
\ir fixtures/reports.inc

insert into public.posts (id, locality_id, user_id, post_type, content, created_at) values
  ('60000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'text', 'alvo extra 1', '2026-08-21 10:00:00+00'),
  ('60000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'text', 'alvo extra 2', '2026-08-21 10:00:00+00'),
  ('60000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'text', 'alvo extra 3', '2026-08-21 10:00:00+00');

insert into public.comments (id, post_id, user_id, content, created_at) values
  ('70000000-0000-4000-8000-000000000010', '60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'comentario alvo extra 1', '2026-08-21 10:05:00+00');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- 1
select lives_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason) values ('10000000-0000-4000-8000-000000000002', 'post', '60000000-0000-4000-8000-000000000001', 'ele publicou o CPF 529.982.247-25 no grupo')$$,
  'CPF formatado no motivo e aceito pelo trigger'
);
select is(
  (select reason from public.reports where reporter_user_id = '10000000-0000-4000-8000-000000000002' and target_type = 'post' and target_id = '60000000-0000-4000-8000-000000000001' and status = 'open'),
  'ele publicou o CPF [documento removido] no grupo',
  'CPF formatado no motivo e redigido server-side'
);

-- 2
select lives_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason) values ('10000000-0000-4000-8000-000000000002', 'comment', '70000000-0000-4000-8000-000000000010', 'ele me enviou DM com 52998224725 e link')$$,
  'CPF sem pontuacao no motivo e aceito pelo trigger'
);
select is(
  (select reason from public.reports where reporter_user_id = '10000000-0000-4000-8000-000000000002' and target_type = 'comment' and target_id = '70000000-0000-4000-8000-000000000010' and status = 'open'),
  'ele me enviou DM com [documento removido] e link',
  'CPF sem pontuacao e redigido (11 digitos)'
);

-- 3
select lives_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason) values ('10000000-0000-4000-8000-000000000002', 'group', '80000000-0000-4000-8000-000000000001', 'ele falou da patente e da OM dele, e publicou o CPF 529.982.247-25')$$,
  'frase sobre patente e OM e aceita pelo trigger'
);
select is(
  (select reason from public.reports where reporter_user_id = '10000000-0000-4000-8000-000000000002' and target_type = 'group' and target_id = '80000000-0000-4000-8000-000000000001' and status = 'open'),
  'ele falou da patente e da OM dele, e publicou o CPF [documento removido]',
  'frase sobre patente e OM sai intacta â€” D21 nao permite filtro de vocabulario'
);

-- 4
select lives_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason) values ('10000000-0000-4000-8000-000000000002', 'post', '60000000-0000-4000-8000-000000000010', 'reescrevendo motivo com 529.982.247.25')$$,
  'CPF com pontos no lugar do hifen e aceito pelo trigger'
);
select is(
  (select reason from public.reports where reporter_user_id = '10000000-0000-4000-8000-000000000002' and target_type = 'post' and target_id = '60000000-0000-4000-8000-000000000010' and status = 'open'),
  'reescrevendo motivo com [documento removido]',
  'CPF com pontos no lugar do hifen (529.982.247.25) tambem e redigido'
);

-- 5
select lives_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason) values ('10000000-0000-4000-8000-000000000002', 'post', '60000000-0000-4000-8000-000000000011', 'ele expÃ´s o 529.982.247-25 e o 000.111.222-99 no chat')$$,
  'multiplos CPFs no motivo sao aceitos pelo trigger'
);
select is(
  (select reason from public.reports where reporter_user_id = '10000000-0000-4000-8000-000000000002' and target_type = 'post' and target_id = '60000000-0000-4000-8000-000000000011' and status = 'open'),
  'ele expÃ´s o [documento removido] e o [documento removido] no chat',
  'multiplos CPFs no mesmo motivo sao redigidos'
);

select * from finish();
rollback;
