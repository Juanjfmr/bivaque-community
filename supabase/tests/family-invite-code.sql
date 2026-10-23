begin;

create extension if not exists pgtap with schema extensions;
select plan(30);

\ir fixtures/foundation.inc

reset role;

-- Códigos de teste: sha256 de "AAAA2222" e afins não é calculável à mão, e não
-- precisa ser — o que a função compara é o bytea que chega, não o texto. Cada
-- convite aqui usa um hash distinto de 32 bytes.
--   01: válido, do titular verificado member-one, para member-two.
--   02: vencido.
--   03: já aceito.
--   05: revogado.
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
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    decode(repeat('55', 32), 'hex'),
    extensions.digest(lower(trim('member-two@example.invalid')), 'sha256'),
    'me***@ex***.invalid',
    decode(repeat('a5', 32), 'hex'),
    now() + interval '7 days'
  );

update private.family_invitations
  set status = 'accepted',
      accepted_by_user_id = '10000000-0000-4000-8000-000000000004',
      accepted_at = now()
  where id = '30000000-0000-4000-8000-000000000003';

update private.family_invitations
  set status = 'revoked'
  where id = '30000000-0000-4000-8000-000000000005';

-- 1 a 3. O preview do código certo devolve o status e o que a tela mostra.
select is(
  (
    select status
    from public.family_invite_code_preview(
      decode(repeat('a1', 32), 'hex'),
      decode(repeat('9a', 32), 'hex'),
      null
    )
  ),
  'ok',
  'o código certo devolve status ok'
);

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

-- 4. Código certo, e-mail errado: status próprio, porque só chega aqui quem já
-- tem o código na mão.
select is(
  (
    select status
    from public.family_invite_code_preview(
      decode(repeat('a1', 32), 'hex'),
      decode(repeat('9b', 32), 'hex'),
      extensions.digest(lower(trim('member-one@example.invalid')), 'sha256')
    )
  ),
  'email_mismatch',
  'código certo com outro e-mail devolve email_mismatch'
);

-- 5. Código certo com o e-mail do convite: ok.
select is(
  (
    select status
    from public.family_invite_code_preview(
      decode(repeat('a1', 32), 'hex'),
      decode(repeat('9c', 32), 'hex'),
      extensions.digest(lower(trim('member-two@example.invalid')), 'sha256')
    )
  ),
  'ok',
  'código certo com o e-mail do convite devolve ok'
);

-- 6 e 7. Código errado: resposta única e a TENTATIVA GRAVADA. Esta é a prova
-- que faltava na revisão anterior: quando a função lançava exceção, o insert da
-- tentativa era desfeito junto com a transação e o limite nunca contava erro.
select is(
  (
    select status
    from public.family_invite_code_preview(
      decode(repeat('ff', 32), 'hex'),
      decode(repeat('9a', 32), 'hex'),
      null
    )
  ),
  'unavailable',
  'código inexistente devolve unavailable'
);

select is(
  (
    select count(*)::integer
    from private.family_invite_code_attempts
    where code_hash = decode(repeat('ff', 32), 'hex')
  ),
  1,
  'o código errado, chamado pela função, deixa a tentativa gravada'
);

-- 8 e 9. Vencido e já usado: mesma resposta.
select is(
  (
    select status
    from public.family_invite_code_preview(
      decode(repeat('a2', 32), 'hex'),
      decode(repeat('9a', 32), 'hex'),
      null
    )
  ),
  'unavailable',
  'código vencido responde igual ao inexistente'
);

select is(
  (
    select status
    from public.family_invite_code_preview(
      decode(repeat('a3', 32), 'hex'),
      decode(repeat('9a', 32), 'hex'),
      null
    )
  ),
  'unavailable',
  'código já usado responde igual ao inexistente'
);

-- 10. Revogado: mesma resposta.
select is(
  (
    select status
    from public.family_invite_code_preview(
      decode(repeat('a5', 32), 'hex'),
      decode(repeat('9a', 32), 'hex'),
      null
    )
  ),
  'unavailable',
  'código revogado responde igual ao inexistente'
);

-- 11 e 12. Aceite real: devolve ok com o vínculo e move o convite para accepted.
select results_eq(
  $$
    select status, link_id is not null as has_link
    from public.family_invite_code_accept(
      decode(repeat('a1', 32), 'hex'),
      '10000000-0000-4000-8000-000000000002'::uuid,
      decode(repeat('9a', 32), 'hex')
    )
  $$,
  $$ values ('ok'::text, true) $$,
  'o código do e-mail certo cria o vínculo familiar e devolve ok'
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

-- 13 a 15. Uso único e retomada. O uso é o VÍNCULO, e ele é único por convite:
-- o mesmo aceitante que repete o código recebe `ok` e o MESMO vínculo (é a
-- retomada de quem ficou sem provisionamento), e qualquer outra pessoa recebe a
-- resposta genérica — um segundo vínculo nunca nasce.
select results_eq(
  $$
    select status, link_id
    from public.family_invite_code_accept(
      decode(repeat('a1', 32), 'hex'),
      '10000000-0000-4000-8000-000000000002'::uuid,
      decode(repeat('9a', 32), 'hex')
    )
  $$,
  $$
    select 'ok'::text, id
    from private.family_account_links
    where invitation_id = '30000000-0000-4000-8000-000000000001'
  $$,
  'o mesmo aceitante recebe ok e o vínculo que já existe (retomada idempotente)'
);

select is(
  (select count(*)::integer from private.family_account_links),
  1,
  'a retomada não cria um segundo vínculo para o convite'
);

select is(
  (
    select status
    from public.family_invite_code_accept(
      decode(repeat('a1', 32), 'hex'),
      '10000000-0000-4000-8000-000000000003'::uuid,
      decode(repeat('9a', 32), 'hex')
    )
  ),
  'unavailable',
  'outra pessoa com o código já usado recebe a resposta genérica'
);

-- 16 e 17. E-mail diferente do convite: mesma resposta — e a tentativa fica
-- gravada mesmo com o vínculo falhando dentro de accept_family_invitation.
delete from private.family_account_links
  where invitation_id = '30000000-0000-4000-8000-000000000001';

update private.family_invitations
  set status = 'pending',
      accepted_by_user_id = null,
      accepted_at = null,
      code_hash = decode(repeat('a4', 32), 'hex')
  where id = '30000000-0000-4000-8000-000000000001';

select is(
  (
    select status
    from public.family_invite_code_accept(
      decode(repeat('a4', 32), 'hex'),
      '10000000-0000-4000-8000-000000000003'::uuid,
      decode(repeat('9b', 32), 'hex')
    )
  ),
  'unavailable',
  'quem não é o e-mail convidado recebe a mesma resposta'
);

select is(
  (
    select count(*)::integer
    from private.family_invite_code_attempts
    where code_hash = decode(repeat('a4', 32), 'hex')
      and email_digest = extensions.digest(lower(trim('other-locality@example.invalid')), 'sha256')
  ),
  1,
  'o aceite que falha por e-mail diferente também deixa a tentativa gravada'
);

-- 18 a 20. O caminho certo não consome tentativa. Antes desta correção, o
-- preview, a validação antes do cadastro e o aceite gravavam três linhas: quem
-- começava com 13 erros era barrado no aceite, DEPOIS de a conta existir. Agora
-- só a tentativa que falhou é gravada.
delete from private.family_invite_code_attempts;

select is(
  (
    select status
    from public.family_invite_code_preview(
      decode(repeat('a4', 32), 'hex'),
      extensions.digest('origin-success', 'sha256'),
      extensions.digest(lower(trim('member-two@example.invalid')), 'sha256')
    )
  ),
  'ok',
  'o preview do código certo continua ok'
);

select is(
  (
    select status
    from public.family_invite_code_accept(
      decode(repeat('a4', 32), 'hex'),
      '10000000-0000-4000-8000-000000000002'::uuid,
      extensions.digest('origin-success', 'sha256')
    )
  ),
  'ok',
  'o aceite do código certo continua ok'
);

select is(
  (select count(*)::integer from private.family_invite_code_attempts),
  0,
  'preview e aceite com o código certo não gravam tentativa'
);

-- 21 a 24. Limite por origem, contado pelas chamadas da própria função: 15
-- tentativas erradas da mesma origem ficam gravadas, a 16ª devolve
-- rate_limited e não é contada, e o código CERTO depois do limite também é
-- barrado (o teto vem antes da consulta ao código).
delete from private.family_invite_code_attempts;

do $$
begin
  for i in 1..15 loop
    perform public.family_invite_code_preview(
      decode(repeat('fe', 32), 'hex'),
      decode(repeat('c1', 32), 'hex'),
      null
    );
  end loop;
end;
$$;

select is(
  (
    select count(*)::integer
    from private.family_invite_code_attempts
    where origin_digest = decode(repeat('c1', 32), 'hex')
  ),
  15,
  '15 tentativas erradas pela função gravam 15 linhas de tentativa'
);

select is(
  (
    select status
    from public.family_invite_code_preview(
      decode(repeat('fe', 32), 'hex'),
      decode(repeat('c1', 32), 'hex'),
      null
    )
  ),
  'rate_limited',
  'a 16ª tentativa da mesma origem devolve rate_limited'
);

select is(
  (
    select count(*)::integer
    from private.family_invite_code_attempts
    where origin_digest = decode(repeat('c1', 32), 'hex')
  ),
  15,
  'a tentativa recusada pelo limite não é gravada de novo'
);

select is(
  (
    select status
    from public.family_invite_code_preview(
      decode(repeat('a4', 32), 'hex'),
      decode(repeat('c1', 32), 'hex'),
      null
    )
  ),
  'rate_limited',
  'o código certo, depois do limite estourado, também devolve rate_limited'
);

-- 25 e 26. Limite por e-mail: 10 tentativas do mesmo endereço, cada uma de uma
-- origem diferente; a 11ª é recusada mesmo vindo de outra origem.
delete from private.family_invite_code_attempts;

do $$
declare
  v_email_digest bytea := extensions.digest(
    lower(trim('member-two@example.invalid')),
    'sha256'
  );
begin
  for i in 1..10 loop
    perform public.family_invite_code_preview(
      decode(repeat('fd', 32), 'hex'),
      extensions.digest('origin-' || i, 'sha256'),
      v_email_digest
    );
  end loop;
end;
$$;

select is(
  (
    select count(*)::integer
    from private.family_invite_code_attempts
    where email_digest = extensions.digest(lower(trim('member-two@example.invalid')), 'sha256')
  ),
  10,
  '10 tentativas erradas do mesmo e-mail gravam 10 linhas'
);

select is(
  (
    select status
    from public.family_invite_code_preview(
      decode(repeat('fd', 32), 'hex'),
      extensions.digest('origin-11', 'sha256'),
      extensions.digest(lower(trim('member-two@example.invalid')), 'sha256')
    )
  ),
  'rate_limited',
  'a 11ª tentativa do mesmo e-mail é recusada, mesmo de outra origem'
);

-- 27. O código não é legível por quem tem conta: sem grant na tabela.
set local role authenticated;
select throws_ok(
  $$ select code_hash from private.family_invitations limit 1 $$,
  '42501',
  null,
  'authenticated não lê o código de ninguém'
);
reset role;

-- 28. As funções são só do servidor.
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

-- 29 e 30. A contagem e o insert ficam sob uma trava de transação: uma pela
-- origem e outra pelo e-mail, sempre nessa ordem. A prova é o lock existir no
-- backend desta sessão DEPOIS do gate — uma trava de transação só é liberada no
-- commit/rollback. Digests novos, para não coincidir com trava já tomada
-- (a trava é reentrante e não criaria linha nova no pg_locks).
-- As chamadas de preparo ficam em DO: um SELECT solto imprime a linha do
-- resultado ("19", "ok"), e o leitor de TAP conta "ok" como teste a mais.
do $$
begin
  perform set_config(
    'bivaque.invite_code_lock_probe',
    (
      select count(*)::text
      from pg_catalog.pg_locks
      where locktype = 'advisory'
        and pid = pg_catalog.pg_backend_pid()
    ),
    false
  );

  perform private.family_invite_code_attempt_gate(
    decode(repeat('d1', 32), 'hex'),
    extensions.digest(lower(trim('lock-probe@example.invalid')), 'sha256')
  );
end;
$$;

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_locks
    where locktype = 'advisory'
      and pid = pg_catalog.pg_backend_pid()
  ),
  current_setting('bivaque.invite_code_lock_probe')::integer + 2,
  'o gate trava pela origem e pelo e-mail'
);

do $$
begin
  perform private.family_invite_code_attempt_gate(
    decode(repeat('d2', 32), 'hex'),
    null
  );
end;
$$;

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_locks
    where locktype = 'advisory'
      and pid = pg_catalog.pg_backend_pid()
  ),
  current_setting('bivaque.invite_code_lock_probe')::integer + 3,
  'sem e-mail, o gate trava só pela origem'
);

select * from finish();
rollback;
