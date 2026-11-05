-- SEC-007 e SEC-008 (lotes A e A2 do F01) — o limitador do código de entrada.
--
-- O que este arquivo prova:
--   * o envio libera o primeiro pedido e recusa o reenvio antes de 60 s, com os
--     segundos que faltam;
--   * o teto por hora vale por e-mail e por IP, e o pedido recusado não gasta a
--     cota do IP;
--   * a inundação de um e-mail NÃO afeta outro e-mail;
--   * a verificação aceita seis tentativas por código e recusa a sétima, e um
--     envio liberado devolve as seis;
--   * só service_role executa (positivo); authenticated e anon são recusados
--     (negativo), nas pontes públicas e nas funções do schema private;
--   * a tabela guarda hash, nunca o valor em claro, e a Data API não a alcança;
--   * (SEC-008) teto global de envio como disjuntor alto, que o pedido recusado
--     não gasta; teto de verificação por IP consumido antes do e-mail, que a
--     recusa também não gasta; o envio liberado NÃO reabre as tentativas (só
--     `entry_otp_send_confirmed`, depois do GoTrue); RLS forçada na tabela e
--     nenhum privilégio de tabela para anon e authenticated; estado da conta.

begin;

create extension if not exists pgtap with schema extensions;
select plan(75);

-- Hashes sintéticos (sha256 hex de 64 caracteres); a tabela nunca vê e-mail.
\set email_a '''aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'''
\set email_b '''bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'''
\set ip_x '''1111111111111111111111111111111111111111111111111111111111111111'''
\set ip_y '''2222222222222222222222222222222222222222222222222222222222222222'''

-- A lógica corre com o dono do banco para poder envelhecer as linhas (a tabela
-- do schema private não tem grant para nenhum papel da Data API); a seção de
-- permissão no fim repete a chamada com cada papel.

-- ── envio: o primeiro passa, o reenvio imediato não ─────────────────────────
select is(
  public.entry_otp_send_gate(:email_a, :ip_x),
  0,
  'o primeiro envio do e-mail é liberado'
);

select ok(
  public.entry_otp_send_gate(:email_a, :ip_x) between 1 and 60,
  'o reenvio imediato é recusado com os segundos que faltam (1 a 60)'
);

select is(
  (select hits from private.entry_otp_limits where scope = 'send_email' and key_hash = :email_a),
  1,
  'o pedido recusado não conta no teto do e-mail'
);

select is(
  (select hits from private.entry_otp_limits where scope = 'send_ip' and key_hash = :ip_x),
  1,
  'o pedido recusado não gasta a cota do IP'
);

-- ── isolamento: outro e-mail não sente o primeiro ───────────────────────────
select is(
  public.entry_otp_send_gate(:email_b, :ip_x),
  0,
  'o cooldown de um e-mail não afeta outro e-mail, nem no mesmo IP'
);

-- ── cooldown vence com o tempo ──────────────────────────────────────────────
update private.entry_otp_limits
   set last_at = now() - interval '61 seconds'
 where scope = 'send_email' and key_hash = :email_a;

select is(
  public.entry_otp_send_gate(:email_a, :ip_x),
  0,
  'passados 60 s o reenvio é liberado'
);

-- ── teto por hora do e-mail: a inundação de um e-mail ───────────────────────
-- Já foram 2 envios do e-mail A. Mais quatro (cada um passado o cooldown) fecham 6.
do $$
begin
  for i in 1..4 loop
    update private.entry_otp_limits
       set last_at = now() - interval '61 seconds'
     where scope = 'send_email'
       and key_hash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    perform public.entry_otp_send_gate(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '1111111111111111111111111111111111111111111111111111111111111111'
    );
  end loop;
end
$$;

select is(
  (select hits from private.entry_otp_limits where scope = 'send_email' and key_hash = :email_a),
  6,
  'seis envios na hora esgotam o teto do e-mail A'
);

update private.entry_otp_limits
   set last_at = now() - interval '61 seconds'
 where scope = 'send_email' and key_hash = :email_a;

select ok(
  public.entry_otp_send_gate(:email_a, :ip_x) > 60,
  'o sétimo envio na hora é recusado e o tempo de espera passa do cooldown'
);

select ok(
  public.entry_otp_send_gate(:email_b, :ip_x) between 1 and 60,
  'depois da inundação do e-mail A, o e-mail B ainda está no cooldown dele, não no de A'
);

update private.entry_otp_limits
   set last_at = now() - interval '61 seconds'
 where scope = 'send_email' and key_hash = :email_b;

select is(
  public.entry_otp_send_gate(:email_b, :ip_x),
  0,
  'a inundação do e-mail A não impede o e-mail B de receber o código'
);

select is(
  (select hits from private.entry_otp_limits where scope = 'send_ip' and key_hash = :ip_x),
  8,
  'os pedidos recusados do e-mail A não gastaram a cota do IP (8 envios liberados)'
);

-- ── janela da hora reabre ───────────────────────────────────────────────────
update private.entry_otp_limits
   set window_start = now() - interval '2 hours',
       last_at = now() - interval '2 hours'
 where scope = 'send_email' and key_hash = :email_a;

select is(
  public.entry_otp_send_gate(:email_a, :ip_x),
  0,
  'passada a hora, o e-mail A volta a receber'
);

-- ── teto por hora do IP ─────────────────────────────────────────────────────
select ok(
  public.entry_otp_send_gate(:email_a, :ip_y, 60, 6, 1) between 1 and 60,
  'o e-mail A ainda está no cooldown (teste do IP abaixo usa outro e-mail)'
);

select is(
  public.entry_otp_send_gate(repeat('c', 64), :ip_y, 60, 6, 1),
  0,
  'o primeiro envio do IP Y passa com teto de 1 por hora'
);

select ok(
  public.entry_otp_send_gate(repeat('d', 64), :ip_y, 60, 6, 1) > 0,
  'o segundo e-mail no mesmo IP estoura o teto do IP'
);

select is(
  public.entry_otp_send_gate(repeat('d', 64), :ip_x),
  0,
  'o teto de um IP não afeta outro IP'
);

select throws_ok(
  $$ select public.entry_otp_send_gate('quem@example.invalid') $$,
  'P0001', null,
  'chave que não é hash é recusada: o e-mail em claro nunca entra'
);

-- ── verificação: seis tentativas, a sétima é recusada ───────────────────────
select is(
  public.entry_otp_verify_attempt(:email_a),
  1,
  'a primeira tentativa de verificação é a número 1'
);

do $$
begin
  for i in 2..5 loop
    perform public.entry_otp_verify_attempt(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    );
  end loop;
end
$$;

select is(
  public.entry_otp_verify_attempt(:email_a),
  6,
  'a sexta tentativa ainda é consumida: é ela que invalida o código no servidor'
);

select is(
  public.entry_otp_verify_attempt(:email_a),
  0,
  'a sétima tentativa é recusada pelo limite'
);

select is(
  public.entry_otp_verify_attempt(:email_b),
  1,
  'as tentativas do e-mail A não gastam as do e-mail B'
);

update private.entry_otp_limits
   set window_start = now() - interval '11 minutes'
 where scope = 'verify_email' and key_hash = :email_a;

select is(
  public.entry_otp_verify_attempt(:email_a),
  1,
  'passada a validade do código (10 min) a janela reabre'
);

-- O envio liberado pelo portão NÃO devolve as tentativas: só a confirmação do
-- GoTrue (`entry_otp_send_confirmed`) o faz. Se o GoTrue recusar o reenvio, o
-- código antigo segue vivo com as tentativas que já gastou.
update private.entry_otp_limits
   set hits = 6
 where scope = 'verify_email' and key_hash = :email_b;
update private.entry_otp_limits
   set last_at = now() - interval '61 seconds'
 where scope = 'send_email' and key_hash = :email_b;

select is(public.entry_otp_send_gate(:email_b, null), 0, 'envio do e-mail B liberado');

select is(
  public.entry_otp_verify_attempt(:email_b),
  0,
  'o portão liberar o envio não reabre as tentativas: o GoTrue ainda não confirmou'
);

select lives_ok(
  format('select public.entry_otp_send_confirmed(%L)', :email_b),
  'a confirmação do envio pelo GoTrue é aceita'
);

select is(
  public.entry_otp_verify_attempt(:email_b),
  1,
  'depois da confirmação do envio, um código novo reabre as seis tentativas'
);

select throws_ok(
  $$ select public.entry_otp_send_confirmed('quem@example.invalid') $$,
  'P0001', null,
  'a confirmação também recusa chave que não é hash'
);

-- ── teto global de envio (SEC-008) ──────────────────────────────────────────
-- Teto 2 por hora para o projeto inteiro, com e-mails e IPs diferentes.
select is(
  public.entry_otp_send_gate(repeat('1', 64), repeat('a', 64), 60, 6, 30, 100),
  0,
  'envio com teto global folgado passa (marca o contador global)'
);

update private.entry_otp_limits
   set hits = 0, window_start = now(), last_at = null
 where scope = 'send_global';

select is(
  public.entry_otp_send_gate(repeat('1', 64), repeat('a', 64), 0, 6, 30, 2),
  0,
  'primeiro envio sob teto global 2 passa'
);

select is(
  public.entry_otp_send_gate(repeat('2', 64), repeat('b', 64), 0, 6, 30, 2),
  0,
  'segundo envio, de outro e-mail e outro IP, passa'
);

select ok(
  public.entry_otp_send_gate(repeat('31', 32), repeat('13', 32), 0, 6, 30, 2) >= 1,
  'o terceiro envio, de outro e-mail e outro IP, bate no teto global'
);

select is(
  (select hits from private.entry_otp_limits where scope = 'send_global'),
  2,
  'o pedido recusado pelo teto global não conta nele'
);

select ok(
  not exists (
    select 1 from private.entry_otp_limits
     where key_hash in (repeat('31', 32), repeat('13', 32)) and hits > 0
  ),
  'o pedido recusado pelo teto global não gasta a cota do e-mail nem a do IP'
);

select ok(
  pg_get_function_arguments('public.entry_otp_send_gate(text, text, integer, integer, integer, integer)'::regprocedure)
    like '%p_global_hourly integer DEFAULT 500',
  'o teto global padrão (500 por hora) é disjuntor de abuso, não a cota de uma pessoa'
);

select ok(
  pg_get_function_arguments('public.entry_otp_send_gate(text, text, integer, integer, integer, integer)'::regprocedure)
    like '%p_ip_hourly integer DEFAULT 8',
  'o envio por IP padrão é 8 por hora (a faixa pedida é 5 a 10)'
);

select ok(
  pg_get_function_arguments('public.entry_otp_send_gate(text, text, integer, integer, integer, integer)'::regprocedure)
    like '%p_email_hourly integer DEFAULT 6',
  'o envio por e-mail continua em 6 por hora'
);

select is(
  public.entry_otp_send_gate(repeat('41', 32), repeat('14', 32), 0),
  0,
  'com os padrões, um envio passa e começa a contar nos três tetos'
);

select is(
  (select hits from private.entry_otp_limits where scope = 'send_ip' and key_hash = repeat('14', 32)),
  1,
  'o envio conta no teto por IP'
);

-- ── verificação por IP (SEC-008) ────────────────────────────────────────────
select is(
  public.entry_otp_verify_attempt(repeat('4', 64), 6, 600, repeat('d', 64), 2),
  1,
  'verificação com IP: a primeira tentativa do IP passa'
);

select is(
  public.entry_otp_verify_attempt(repeat('5', 64), 6, 600, repeat('d', 64), 2),
  1,
  'o mesmo IP, outro e-mail: a segunda tentativa do IP passa'
);

select ok(
  public.entry_otp_verify_attempt(repeat('6', 64), 6, 600, repeat('d', 64), 2) < 0,
  'o mesmo IP girando por um terceiro e-mail é recusado, com valor negativo'
);

select ok(
  public.entry_otp_verify_attempt(repeat('6', 64), 6, 600, repeat('d', 64), 2) between -600 and -1,
  'o valor negativo são os segundos até a janela do IP reabrir (no máximo 10 minutos)'
);

select is(
  (select count(*)::integer from private.entry_otp_limits
    where scope = 'verify_email' and key_hash = repeat('6', 64)),
  0,
  'a recusa do IP vem antes do e-mail e não gasta a cota do e-mail'
);

select is(
  (select hits from private.entry_otp_limits where scope = 'verify_ip' and key_hash = repeat('d', 64)),
  2,
  'a recusa também não gasta a cota do IP'
);

select is(
  public.entry_otp_verify_attempt(repeat('6', 64), 6, 600, repeat('e', 64), 2),
  1,
  'outro IP não sente o teto do primeiro'
);

select is(
  public.entry_otp_verify_attempt(repeat('7', 64), 6, 600, null, 2),
  1,
  'sem IP confiável vale só o limite por e-mail'
);

update private.entry_otp_limits
   set window_start = now() - interval '11 minutes'
 where scope = 'verify_ip' and key_hash = repeat('d', 64);

select is(
  public.entry_otp_verify_attempt(repeat('8', 64), 6, 600, repeat('d', 64), 2),
  1,
  'passada a janela de 10 minutos o IP volta a poder verificar'
);

select ok(
  pg_get_function_arguments('public.entry_otp_verify_attempt(text, integer, integer, text, integer)'::regprocedure)
    like '%p_ip_max integer DEFAULT 30',
  'o teto padrão da verificação por IP é 30 por janela de 10 minutos'
);

do $$
begin
  for i in 1..30 loop
    perform public.entry_otp_verify_attempt(
      repeat(to_hex(i % 16), 64), 6, 600,
      '9999999999999999999999999999999999999999999999999999999999999999'
    );
  end loop;
end
$$;

select is(
  (select hits from private.entry_otp_limits where scope = 'verify_ip' and key_hash = repeat('9', 64)),
  30,
  'trinta tentativas de um IP em 10 minutos são aceitas'
);

select ok(
  public.entry_otp_verify_attempt(repeat('a', 64), 6, 600, repeat('9', 64)) < 0,
  'com os valores padrão, a 31ª tentativa do IP em 10 minutos é recusada'
);

-- ── estado da conta (tipo de link que invalida o código) ────────────────────
reset role;

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('80000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'confirmada@example.invalid', now(), '', '', '', '',
   '{}', '{}', now(), now()),
  ('80000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'pendente@example.invalid', null, '', '', '', '',
   '{}', '{}', now(), now());

select is(
  public.entry_otp_account_state('Confirmada@Example.invalid'),
  'confirmed',
  'conta confirmada: estado confirmed, sem diferenciar maiúsculas'
);

select is(
  public.entry_otp_account_state('pendente@example.invalid'),
  'unconfirmed',
  'conta ainda não confirmada: estado unconfirmed'
);

select is(
  public.entry_otp_account_state('ninguem@example.invalid'),
  'none',
  'e-mail sem conta: estado none (nada para invalidar, nenhuma conta é criada)'
);

-- ── RLS forçada e nenhum privilégio de tabela (SEC-008, L2) ─────────────────
select ok(
  (select relrowsecurity and relforcerowsecurity
     from pg_class
    where oid = 'private.entry_otp_limits'::regclass),
  'private.entry_otp_limits tem RLS ligada E forçada (relforcerowsecurity)'
);

select ok(
  not has_table_privilege('anon', 'private.entry_otp_limits', 'SELECT')
  and not has_table_privilege('anon', 'private.entry_otp_limits', 'INSERT')
  and not has_table_privilege('anon', 'private.entry_otp_limits', 'UPDATE')
  and not has_table_privilege('anon', 'private.entry_otp_limits', 'DELETE')
  and not has_table_privilege('anon', 'private.entry_otp_limits', 'TRUNCATE')
  and not has_table_privilege('anon', 'private.entry_otp_limits', 'REFERENCES'),
  'anon não tem privilégio nenhum na tabela do limitador'
);

select ok(
  not has_table_privilege('authenticated', 'private.entry_otp_limits', 'SELECT')
  and not has_table_privilege('authenticated', 'private.entry_otp_limits', 'INSERT')
  and not has_table_privilege('authenticated', 'private.entry_otp_limits', 'UPDATE')
  and not has_table_privilege('authenticated', 'private.entry_otp_limits', 'DELETE')
  and not has_table_privilege('authenticated', 'private.entry_otp_limits', 'TRUNCATE')
  and not has_table_privilege('authenticated', 'private.entry_otp_limits', 'REFERENCES'),
  'authenticated não tem privilégio nenhum na tabela do limitador'
);

select is(
  (select count(*)::integer
     from pg_policy
    where polrelid = 'private.entry_otp_limits'::regclass),
  0,
  'a tabela não tem policy: com RLS forçada, ninguém além de papel que ignora RLS lê linha'
);

select ok(
  not exists (
    select 1 from private.entry_otp_limits
     where key_hash !~ '^[0-9a-f]{64}$'
  ),
  'toda chave guardada é um hash hex de 64 caracteres'
);

-- ── permissão: negativo para authenticated e anon, positivo para service_role
reset role;

select ok(
  not has_function_privilege('authenticated', 'public.entry_otp_send_gate(text, text, integer, integer, integer, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.entry_otp_send_gate(text, text, integer, integer, integer, integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.entry_otp_verify_attempt(text, integer, integer, text, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.entry_otp_verify_attempt(text, integer, integer, text, integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.entry_otp_send_confirmed(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.entry_otp_send_confirmed(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.entry_otp_account_state(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.entry_otp_account_state(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.entry_otp_send_gate(text, text, integer, integer, integer, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.entry_otp_send_gate(text, text, integer, integer, integer, integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.entry_otp_verify_attempt(text, integer, integer, text, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.entry_otp_verify_attempt(text, integer, integer, text, integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.entry_otp_send_confirmed(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.entry_otp_send_confirmed(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.entry_otp_account_state(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.entry_otp_account_state(text)', 'EXECUTE'),
  'authenticated e anon não executam nenhuma das oito funções'
);

select ok(
  has_function_privilege('service_role', 'public.entry_otp_send_gate(text, text, integer, integer, integer, integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.entry_otp_verify_attempt(text, integer, integer, text, integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.entry_otp_send_confirmed(text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.entry_otp_account_state(text)', 'EXECUTE')
  and has_function_privilege('service_role', 'private.entry_otp_send_gate(text, text, integer, integer, integer, integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'private.entry_otp_verify_attempt(text, integer, integer, text, integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'private.entry_otp_send_confirmed(text)', 'EXECUTE')
  and has_function_privilege('service_role', 'private.entry_otp_account_state(text)', 'EXECUTE'),
  'service_role executa as oito funções'
);

select is(
  (select count(*)::integer from pg_proc
    where pronamespace in ('public'::regnamespace, 'private'::regnamespace)
      and proname in ('entry_otp_send_gate', 'entry_otp_verify_attempt')),
  4,
  'só existe uma assinatura de cada função do limitador (as do SEC-007 foram removidas)'
);

set local role service_role;

select is(
  public.entry_otp_send_gate(repeat('0f', 32), repeat('9', 64)),
  0,
  'service_role executa o limitador de envio (positivo)'
);

select is(
  public.entry_otp_verify_attempt(repeat('0f', 32), 6, 600, repeat('8', 64)),
  1,
  'service_role executa o limitador de verificação (positivo)'
);

select lives_ok(
  format('select public.entry_otp_send_confirmed(%L)', repeat('0f', 32)),
  'service_role confirma o envio (positivo)'
);

select is(
  public.entry_otp_account_state('pendente@example.invalid'),
  'unconfirmed',
  'service_role lê o estado da conta (positivo)'
);

select throws_ok(
  $$ select count(*) from private.entry_otp_limits $$,
  '42501', null,
  'nem service_role lê a tabela direto: só as funções do limitador'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.entry_otp_send_gate(repeat('e', 64), null) $$,
  '42501', null,
  'authenticated não consome nem esgota o limite de ninguém (envio)'
);

select throws_ok(
  $$ select public.entry_otp_verify_attempt(repeat('e', 64)) $$,
  '42501', null,
  'authenticated não consome tentativas de ninguém (verificação)'
);

select throws_ok(
  $$ select public.entry_otp_send_confirmed(repeat('e', 64)) $$,
  '42501', null,
  'authenticated não reabre tentativas de ninguém'
);

select throws_ok(
  $$ select public.entry_otp_account_state('pendente@example.invalid') $$,
  '42501', null,
  'authenticated não consulta o estado da conta de ninguém'
);

select throws_ok(
  $$ select count(*) from private.entry_otp_limits $$,
  '42501', null,
  'authenticated não lê a tabela do limitador'
);

reset role;
set local role anon;

select throws_ok(
  $$ select public.entry_otp_send_gate(repeat('e', 64), null) $$,
  '42501', null,
  'anon não executa o limitador de envio'
);

select throws_ok(
  $$ select public.entry_otp_verify_attempt(repeat('e', 64)) $$,
  '42501', null,
  'anon não executa o limitador de verificação'
);

select throws_ok(
  $$ select public.entry_otp_send_confirmed(repeat('e', 64)) $$,
  '42501', null,
  'anon não reabre tentativas de ninguém'
);

select throws_ok(
  $$ select public.entry_otp_account_state('pendente@example.invalid') $$,
  '42501', null,
  'anon não consulta o estado da conta de ninguém'
);

reset role;

select * from finish();
rollback;
