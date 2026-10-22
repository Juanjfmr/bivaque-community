begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

\ir fixtures/foundation.inc

reset role;

-- Códigos de teste: sha256 de "AAAA2222" e afins não é calculável à mão, e não
-- precisa ser — o que a função compara é o bytea que chega, não o texto. Cada
-- convite aqui usa um hash distinto de 32 bytes.
--   01: válido, do titular verificado member-one, para member-two.
--   02: vencido.
--   03: já aceito.
insert into private.family_invitations (
  id,
  inviter_user_id,
  token_digest,
  invitee_email_digest,
  invitee_email_hint,
  code_hash,
  expires_at
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    decode(repeat('11', 32), 'hex'),
    extensions.digest(lower(trim('member-two@example.invalid')), 'sha256'),
    'me***@ex***.invalid',
    decode(repeat('a1', 32), 'hex'),
    now() + interval '7 days'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    decode(repeat('22', 32), 'hex'),
    extensions.digest(lower(trim('member-two@example.invalid')), 'sha256'),
    'me***@ex***.invalid',
    decode(repeat('a2', 32), 'hex'),
    now() - interval '1 second'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    decode(repeat('33', 32), 'hex'),
    extensions.digest(lower(trim('member-two@example.invalid')), 'sha256'),
    'me***@ex***.invalid',
    decode(repeat('a3', 32), 'hex'),
    now() + interval '7 days'
  );

update private.family_invitations
  set status = 'accepted',
      accepted_by_user_id = '10000000-0000-4000-8000-000000000004',
      accepted_at = now()
  where id = '30000000-0000-4000-8000-000000000003';

-- 1 e 2. O preview devolve o nome de quem convidou e o rótulo mascarado.
select is(
  (
    select inviter_name
    from public.family_invite_code_preview(
      decode(repeat('a1', 32), 'hex'),
      decode(repeat('9a', 32), 'hex'),
      null
    )
  ),
  'Member One',
  'preview devolve o nome de exibição de quem convidou'
);

select is(
  (
    select invitee_email_hint
    from public.family_invite_code_preview(
      decode(repeat('a1', 32), 'hex'),
      decode(repeat('9a', 32), 'hex'),
      null
    )
  ),
  'me***@ex***.invalid',
  'preview devolve o rótulo mascarado, nunca o e-mail convidado'
);

-- 3. Código errado: a mensagem é a mesma dos outros casos.
select throws_ok(
  $$
    select public.family_invite_code_preview(
      decode(repeat('ff', 32), 'hex'),
      decode(repeat('9a', 32), 'hex'),
      null
    )
  $$,
  'P0001',
  'family_invite_code_unavailable',
  'código inexistente responde como indisponível'
);

-- 4. Código vencido: mesma resposta.
select throws_ok(
  $$
    select public.family_invite_code_preview(
      decode(repeat('a2', 32), 'hex'),
      decode(repeat('9a', 32), 'hex'),
      null
    )
  $$,
  'P0001',
  'family_invite_code_unavailable',
  'código vencido responde igual ao inexistente'
);

-- 5. Código já usado: mesma resposta.
select throws_ok(
  $$
    select public.family_invite_code_preview(
      decode(repeat('a3', 32), 'hex'),
      decode(repeat('9a', 32), 'hex'),
      null
    )
  $$,
  'P0001',
  'family_invite_code_unavailable',
  'código já usado responde igual ao inexistente'
);

-- 6 e 7. Aceite real: cria o vínculo e move o convite para accepted.
select isnt(
  public.family_invite_code_accept(
    decode(repeat('a1', 32), 'hex'),
    '10000000-0000-4000-8000-000000000002'::uuid,
    decode(repeat('9a', 32), 'hex')
  ),
  null::uuid,
  'o código do e-mail certo cria o vínculo familiar'
);

select is(
  (
    select status::text
    from private.family_invitations
    where id = '30000000-0000-4000-8000-000000000001'
  ),
  'accepted',
  'o convite aceito por código sai de pending'
);

-- 8. Uso único: o mesmo código não aceita de novo.
select throws_ok(
  $$
    select public.family_invite_code_accept(
      decode(repeat('a1', 32), 'hex'),
      '10000000-0000-4000-8000-000000000002'::uuid,
      decode(repeat('9a', 32), 'hex')
    )
  $$,
  'P0001',
  'family_invite_code_unavailable',
  'o código de uso único não aceita uma segunda vez'
);

-- 9. E-mail diferente do convite: mesma resposta, sem dizer que o código existe.
delete from private.family_invite_code_attempts;

-- O vínculo criado no caso feliz referencia (id, inviter, accepted_by): apagar
-- a linha que aponta ANTES de devolver o convite a pending, senão a FK recusa o
-- update.
delete from private.family_account_links
  where invitation_id = '30000000-0000-4000-8000-000000000001';

update private.family_invitations
  set status = 'pending',
      accepted_by_user_id = null,
      accepted_at = null,
      code_hash = decode(repeat('a4', 32), 'hex')
  where id = '30000000-0000-4000-8000-000000000001';

select throws_ok(
  $$
    select public.family_invite_code_accept(
      decode(repeat('a4', 32), 'hex'),
      '10000000-0000-4000-8000-000000000003'::uuid,
      decode(repeat('9b', 32), 'hex')
    )
  $$,
  'P0001',
  'family_invite_code_unavailable',
  'quem não é o e-mail convidado recebe a mesma resposta'
);

-- 10. Limite por origem: 15 tentativas da mesma origem na janela; a 16ª para.
delete from private.family_invite_code_attempts;

insert into private.family_invite_code_attempts (origin_digest, email_digest, code_hash)
select
  decode(repeat('c1', 32), 'hex'),
  null,
  decode(lpad(to_hex(n), 64, '0'), 'hex')
from generate_series(1, 15) as n;

select throws_ok(
  $$
    select public.family_invite_code_preview(
      decode(repeat('be', 32), 'hex'),
      decode(repeat('c1', 32), 'hex'),
      null
    )
  $$,
  '54000',
  null,
  'a 16ª tentativa da mesma origem é recusada'
);

-- 11. Limite por e-mail: 10 tentativas do mesmo endereço (origens diferentes);
-- a 11ª para, mesmo vindo de outra origem.
delete from private.family_invite_code_attempts;

insert into private.family_invite_code_attempts (origin_digest, email_digest, code_hash)
select
  extensions.digest('origin-' || n, 'sha256'),
  extensions.digest(lower(trim('member-one@example.invalid')), 'sha256'),
  decode(lpad(to_hex(n), 64, '0'), 'hex')
from generate_series(1, 10) as n;

select throws_ok(
  $$
    select public.family_invite_code_preview(
      decode(repeat('be', 32), 'hex'),
      decode(repeat('9e', 32), 'hex'),
      extensions.digest(lower(trim('member-one@example.invalid')), 'sha256')
    )
  $$,
  '54000',
  null,
  'a 11ª tentativa do mesmo e-mail é recusada, mesmo de outra origem'
);

-- 12. O código não é legível por quem tem conta: sem grant na tabela.
set local role authenticated;
select throws_ok(
  $$ select code_hash from private.family_invitations limit 1 $$,
  '42501',
  null,
  'authenticated não lê o código de ninguém'
);
reset role;

-- 13. As funções são só do servidor.
set local role anon;
select throws_ok(
  $$
    select public.family_invite_code_preview(
      decode(repeat('a1', 32), 'hex'),
      decode(repeat('9a', 32), 'hex'),
      null
    )
  $$,
  '42501',
  null,
  'anon não executa o preview do código'
);
reset role;

select * from finish();
rollback;
