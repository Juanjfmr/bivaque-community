begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

-- Reenviar convite familiar (prancha 76).
--
-- O que a suíte prova: reenviar GIRA o digest (o link antigo deixa de valer),
-- devolve 7 dias de prazo, exige que quem reenvia informe o e-mail do convite
-- (comparado por digest, nunca em claro), recusa convite de outra pessoa e
-- recusa convite que não está mais pendente.

\ir fixtures/foundation.inc

-- O reenvio não exige titular verificado (isso é do create): a linha entra
-- direto na tabela privada, com e-mail e digest conhecidos.
-- O id do convite criado aqui fica em tabela temporária: as fixtures já
-- semeiam convites para o mesmo titular, e `limit 1` sem ORDER BY pegaria
-- outro. As asserções usam ESTE id.
create temporary table convite_resend (id uuid);
with novo as (
  insert into private.family_invitations (
    inviter_user_id,
    token_digest,
    invitee_email_digest,
    invitee_email_hint,
    expires_at
  )
  values (
    '10000000-0000-4000-8000-000000000001',
    extensions.digest(decode(repeat('11', 32), 'hex'), 'sha256'),
    extensions.digest('familiar@example.invalid', 'sha256'),
    'fa***@ex***.invalid',
    now() + interval '1 day'
  )
  returning id
)
insert into convite_resend select id from novo;

select lives_ok(
  $$
    select public.resend_family_invitation(
            (select id from convite_resend),
      '10000000-0000-4000-8000-000000000001',
      extensions.digest(decode(repeat('22', 32), 'hex'), 'sha256'),
      extensions.digest('familiar@example.invalid', 'sha256')
    )
  $$,
  'o titular reenvia informando o e-mail do convite'
);

select is(
  (
    select encode(token_digest, 'hex')
      from private.family_invitations
     where id = (select id from convite_resend)
  ),
  encode(extensions.digest(decode(repeat('22', 32), 'hex'), 'sha256'), 'hex'),
  'o digest do token foi girado: o link antigo deixa de valer'
);

select ok(
  (
    select expires_at > now() + interval '6 days'
      from private.family_invitations
     where id = (select id from convite_resend)
  ),
  'o reenvio devolve 7 dias de prazo'
);

select throws_ok(
  $$
    select public.resend_family_invitation(
            (select id from convite_resend),
      '10000000-0000-4000-8000-000000000001',
      extensions.digest(decode(repeat('33', 32), 'hex'), 'sha256'),
      extensions.digest('outro-endereco@example.invalid', 'sha256')
    )
  $$,
  'P0001',
  null,
  'e-mail que não é o do convite é recusado (reenviar não vira oráculo)'
);

select throws_ok(
  $$
    select public.resend_family_invitation(
            (select id from convite_resend),
      '10000000-0000-4000-8000-000000000002',
      extensions.digest(decode(repeat('44', 32), 'hex'), 'sha256'),
      extensions.digest('familiar@example.invalid', 'sha256')
    )
  $$,
  'P0001',
  null,
  'outro titular não reenvia convite alheio'
);

update private.family_invitations
   set status = 'revoked'
 where inviter_user_id = '10000000-0000-4000-8000-000000000001';

select throws_ok(
  $$
    select public.resend_family_invitation(
            (select id from convite_resend),
      '10000000-0000-4000-8000-000000000001',
      extensions.digest(decode(repeat('55', 32), 'hex'), 'sha256'),
      extensions.digest('familiar@example.invalid', 'sha256')
    )
  $$,
  'P0001',
  null,
  'convite revogado não é reenviável'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.resend_family_invitation(uuid, uuid, bytea, bytea)',
    'EXECUTE'
  ),
  'o membro não chama o reenvio direto: quem enfileira é a ação de servidor'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.resend_family_invitation(uuid, uuid, bytea, bytea)',
    'EXECUTE'
  ),
  'service_role executa o reenvio'
);

select * from finish();
rollback;
