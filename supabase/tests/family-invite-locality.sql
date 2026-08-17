begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

-- P0 Task 6: a localidade do dependente é a corrente do titular no momento do
-- aceite — nunca escolhida pelo dependente, e nunca uma constante de piloto.
-- O helper family_accept_holder_locality resolve o holder do family_account_links
-- criado pelo aceite real (accept_family_invitation), que valida o email digest
-- do invitador contra o user que aceita.

\ir fixtures/foundation.inc

-- 030: holder 001 (Manaus), accepted_by 002 (member-two, member-two@example.invalid).
-- O token_digest é o hash do email do aceitante (member-two). O accept valida
-- o invitee_email_digest contra o email do user aceitando.
insert into private.family_invitations (id, inviter_user_id, token_digest, invitee_email_digest, expires_at)
values (
  '50000000-0000-4000-8000-000000000030',
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('ca', 32), 'hex'),
  digest('member-two@example.invalid', 'sha256'),
  now() + interval '7 days'
);

-- 031: holder 003 (EX), accepted_by 004 (hidden-member).
insert into private.family_invitations (id, inviter_user_id, token_digest, invitee_email_digest, expires_at)
values (
  '50000000-0000-4000-8000-000000000031',
  '10000000-0000-4000-8000-000000000003',
  decode(repeat('cb', 32), 'hex'),
  digest('hidden-member@example.invalid', 'sha256'),
  now() + interval '7 days'
);

-- 032: holder 005 (sem membership), accepted_by 003 (other-locality).
insert into private.family_invitations (id, inviter_user_id, token_digest, invitee_email_digest, expires_at)
values (
  '50000000-0000-4000-8000-000000000032',
  '10000000-4000-4000-8000-000000000005',
  decode(repeat('cc', 32), 'hex'),
  digest('other-locality@example.invalid', 'sha256'),
  now() + interval '7 days'
);

-- 033: holder 001 (Manaus), accepted_by 005 (non-member).
insert into private.family_invitations (id, inviter_user_id, token_digest, invitee_email_digest, expires_at)
values (
  '50000000-0000-4000-8000-000000000033',
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('cd', 32), 'hex'),
  digest('non-member@example.invalid', 'sha256'),
  now() + interval '7 days'
);

-- Aceites reais. O role default do runner (postgres) chama a RPC security
-- definer. setamos o claim sub para o user aceitando (a RPC valida o email
-- do auth.uid() contra o invitee_email_digest).
set local role authenticated;
set local request.jwt.claim.sub to '10000000-0000-4000-8000-000000000002';
select private.accept_family_invitation(decode(repeat('ca', 32), 'hex'), '10000000-0000-4000-8000-000000000002'::uuid);

set local request.jwt.claim.sub to '10000000-0000-4000-8000-000000000004';
select private.accept_family_invitation(decode(repeat('cb', 32), 'hex'), '10000000-0000-4000-8000-000000000004'::uuid);

set local request.jwt.claim.sub to '10000000-0000-4000-8000-000000000003';
select private.accept_family_invitation(decode(repeat('cc', 32), 'hex'), '10000000-0000-4000-8000-000000000003'::uuid);

set local request.jwt.claim.sub to '10000000-0000-4000-8000-000000000005';
select private.accept_family_invitation(decode(repeat('cd', 32), 'hex'), '10000000-0000-4000-8000-000000000005'::uuid);

-- O titular 001 (link do aceite 030 ou 033) tem membership em Manaus (001).
-- 031: holder 003, membership em EX (002). 032: holder 005, sem membership.
-- O titular 001 ganha uma segunda membership (para o teste 033).
insert into public.locality_memberships (user_id, locality_id)
values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');

-- Titular em Manaus: o dependente herda a localidade de Manaus.
select results_eq(
  $$
    select public.family_accept_holder_locality(
      (select id from private.family_account_links where holder_user_id = '10000000-0000-4000-8000-000000000001' and family_user_id = '10000000-0000-4000-8000-000000000002')
    )
  $$,
  $$ values ('00000000-0000-4000-8000-000000000001'::uuid) $$,
  'the dependant locality resolves to the holder current locality (Manaus)'
);

-- Holder 003 (other-locality) tem membership na localidade fixture (002). O
-- dependente herda 002, não Manaus.
select results_eq(
  $$
    select public.family_accept_holder_locality(
      (select id from private.family_account_links where holder_user_id = '10000000-0000-4000-8000-000000000003' and family_user_id = '10000000-0000-4000-8000-000000000004')
    )
  $$,
  $$ values ('00000000-0000-4000-8000-000000000002'::uuid) $$,
  'a holder in a second locality produces a dependant in that second locality'
);

-- O dependente NÃO consegue escolher a própria localidade: o helper só aceita
-- o link id de um family_account_links. Passar um locality id é um row que
-- não casa → o helper devolve nulo em vez de gravar nada.
select is(
  public.family_accept_holder_locality('00000000-0000-4000-8000-000000000002'::uuid),
  null,
  'a locality id passed as a link id is not a family link (negative)'
);

-- Holder sem membership: o helper devolve nulo — o aceite falha por construção
-- (o código lança antes de provisionar; nunca grava nulo).
select is(
  public.family_accept_holder_locality(
    (select id from private.family_account_links where holder_user_id = '10000000-4000-4000-8000-000000000005')
  ),
  null,
  'a holder without membership resolves to null (never a locality)'
);

-- O titular 001 (com 2 memberships) tem a corrente como primeira —
-- a ordem é por joined_at asc.
select results_eq(
  $$
    select public.family_accept_holder_locality(
      (select id from private.family_account_links where holder_user_id = '10000000-0000-4000-8000-000000000001' and family_user_id = '10000000-0000-4000-8000-000000000005')
    )
  $$,
  $$ values ('00000000-0000-4000-8000-000000000001'::uuid) $$,
  'the current (first) membership of the holder wins at acceptance time'
);

select * from finish();
rollback;
