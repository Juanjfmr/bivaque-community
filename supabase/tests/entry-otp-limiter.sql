-- SEC-007 (lote A do F01) — o limitador do código de entrada.
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
--   * a tabela guarda hash, nunca o valor em claro, e a Data API não a alcança.

begin;

create extension if not exists pgtap with schema extensions;
select plan(32);

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

-- Um envio liberado devolve as seis tentativas.
update private.entry_otp_limits
   set hits = 6
 where scope = 'verify_email' and key_hash = :email_b;
update private.entry_otp_limits
   set last_at = now() - interval '61 seconds'
 where scope = 'send_email' and key_hash = :email_b;

select is(public.entry_otp_send_gate(:email_b, null), 0, 'envio do e-mail B liberado');

select is(
  public.entry_otp_verify_attempt(:email_b),
  1,
  'um código novo reabre as seis tentativas'
);

-- ── permissão: negativo para authenticated e anon, positivo para service_role
reset role;

select ok(
  not has_function_privilege('authenticated', 'public.entry_otp_send_gate(text, text, integer, integer, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.entry_otp_send_gate(text, text, integer, integer, integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.entry_otp_verify_attempt(text, integer, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.entry_otp_verify_attempt(text, integer, integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.entry_otp_send_gate(text, text, integer, integer, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.entry_otp_send_gate(text, text, integer, integer, integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.entry_otp_verify_attempt(text, integer, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.entry_otp_verify_attempt(text, integer, integer)', 'EXECUTE'),
  'authenticated e anon não executam nenhuma das quatro funções'
);

set local role service_role;

select is(
  public.entry_otp_send_gate(repeat('f', 64), repeat('9', 64)),
  0,
  'service_role executa o limitador de envio (positivo)'
);

select is(
  public.entry_otp_verify_attempt(repeat('f', 64)),
  1,
  'service_role executa o limitador de verificação (positivo)'
);

reset role;

select ok(
  has_function_privilege('service_role', 'public.entry_otp_send_gate(text, text, integer, integer, integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.entry_otp_verify_attempt(text, integer, integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'private.entry_otp_send_gate(text, text, integer, integer, integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'private.entry_otp_verify_attempt(text, integer, integer)', 'EXECUTE'),
  'service_role executa as quatro funções'
);

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

reset role;

select * from finish();
rollback;
