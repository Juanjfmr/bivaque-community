-- Onda F Task 5 — reply notifies the request author (and edit/delete + resolved).

begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

\ir fixtures/foundation.inc

reset role;

-- member-one (001) asks; member-two (002) replies.
insert into public.recommendation_requests (
  id, author_id, locality_id, title, body, category
) values (
  '70000000-0000-4000-8000-000000000020',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Procuro despachante confiável',
  'Alguém indica um despachante que resolva documentação de militar transferido?',
  'servicos_locais'
);

-- ── POSITIVE 1: a reply from member-two notifies the author (member-one) ────
insert into public.recommendation_replies (
  id, request_id, author_id, body
) values (
  '80000000-0000-4000-8000-000000000020',
  '70000000-0000-4000-8000-000000000020',
  '10000000-0000-4000-8000-000000000002',
  'O despachante X é muito bom e atende perto da Vila Ajuricaba.',
);

select is(
  (
    select count(*) from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'recommendation_reply'
      and target_id = '70000000-0000-4000-8000-000000000020'::uuid
      and action = 'replied'
  ),
  1::bigint,
  'F5+: reply notifies the request author once'
);

select is(
  (
    select count(*) from public.outbox
    where type = 'recommendation_reply'
      and payload->>'request_id' = '70000000-0000-4000-8000-000000000020'
  ),
  1::bigint,
  'F5+: reply enqueues exactly one outbox row (email to the author)'
);

-- ── NEGATIVE 2: replying to your own request does NOT notify yourself ──────
insert into public.recommendation_replies (
  id, request_id, author_id, body
) values (
  '80000000-0000-4000-8000-000000000021',
  '70000000-0000-4000-8000-000000000020',
  '10000000-0000-4000-8000-000000000001',
  '(membro-one respondendo ao próprio pedido, sem aviso para si)',
);

select is(
  (
    select count(*) from public.notifications
    where type = 'recommendation_reply'
      and recipient_user_id = '10000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'F5-: replying to your own request does not add another notification (no self-notify)'
);

-- ── NEGATIVE 3: author can edit their own reply but not member-two's ──────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    update public.recommendation_replies
    set body = 'Atualizei o meu próprio comentário (sou o autor).'
    where id = '80000000-0000-4000-8000-000000000021'::uuid
  $$,
  'F5+: author edits their own reply'
);

select throws_ok(
  $$
    update public.recommendation_replies
    set body = 'Nao autorizado a editar a resposta do outro.'
    where id = '80000000-0000-4000-8000-000000000020'::uuid
  $$,
  '42501',
  null,
  'F5-: author cannot edit another member reply (RLS denies)'
);

-- ── POSITIVE 4: mark_recommendation_resolved (author only) ──────────────────
select lives_ok(
  $$
    select public.mark_recommendation_resolved(
      '70000000-0000-4000-8000-000000000020'::uuid
    )
  $$,
  'F5+: request author marks the request resolved'
);

select is(
  (select is_resolved from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000020'::uuid),
  true,
  'F5+: is_resolved is now true'
);

select * from finish();
rollback;