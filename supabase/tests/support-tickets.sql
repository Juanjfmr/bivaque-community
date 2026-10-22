-- Chamados de ajuda (ADR-20261022, secao 3).
--
-- O que esta suite prova, contra o schema real:
--   * so quem tem conta abre, e por funcao - o cliente nao escreve na tabela;
--   * o chamado usa o e-mail da conta, e o limite de abertura por pessoa
--     recusa o sexto chamado aberto e o decimo primeiro em 24 h;
--   * cada pessoa le so os proprios chamados;
--   * so operador responde, e responder grava a resposta, muda a situacao,
--     cria o aviso no app e enfileira o e-mail no outbox;
--   * o titular le a resposta, mas NAO le quem respondeu (answered_by);
--   * apagar a conta apaga os chamados (pela purga e pelo cascade), a resposta
--     que ficou no outbox e a autoria de quem respondeu.

begin;

create extension if not exists pgtap with schema extensions;
select plan(50);

\ir fixtures/foundation.inc

-- Um operador ativo e um revogado, como em is-current-user-operator.sql.
insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000000b', 'op-active@example.invalid'),
  ('10000000-0000-4000-8000-00000000000c', 'op-revoked@example.invalid');

insert into public.operators (auth_user_id, notes) values
  ('10000000-0000-4000-8000-00000000000b', 'fixture: active operator'),
  ('10000000-0000-4000-8000-00000000000c', 'fixture: revoked operator');

update public.operators
   set revoked_at = now()
 where auth_user_id = '10000000-0000-4000-8000-00000000000c';

-- â”€â”€ 1. a tabela nao e do cliente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

select is(
  has_table_privilege('authenticated', 'public.support_tickets', 'INSERT'),
  false,
  'authenticated nao insere chamado direto na tabela'
);

select is(
  has_table_privilege('authenticated', 'public.support_tickets', 'UPDATE'),
  false,
  'authenticated nao altera chamado direto na tabela'
);

select is(
  has_table_privilege('authenticated', 'public.support_tickets', 'DELETE'),
  false,
  'authenticated nao apaga chamado direto na tabela'
);

select is(
  has_table_privilege('anon', 'public.support_tickets', 'SELECT'),
  false,
  'anonimo nao le a tabela de chamados'
);

-- O vocabulario do chamado e fechado: assunto e situacao sao enums, nao texto
-- livre. O ADR lista os cinco assuntos e as duas situacoes.
select is(
  (
    select string_agg(e.enumlabel::text, ',' order by e.enumsortorder)
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'support_ticket_topic'
  ),
  'conta,comunidade,anuncios,seguranca,outro',
  'o assunto e um entre conta, comunidade, anuncios, seguranca e outro'
);

select is(
  (
    select string_agg(e.enumlabel::text, ',' order by e.enumsortorder)
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'support_ticket_status'
  ),
  'open,answered',
  'a situacao e aberto ou respondido, e nada mais'
);

-- â”€â”€ 2. anonimo nao abre chamado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);

select throws_ok(
  $$ select public.open_support_ticket('conta', 'Quero falar com o suporte do app.') $$,
  '42501',
  null,
  'anonimo nao abre chamado'
);

-- â”€â”€ 3. quem tem conta abre, com o e-mail da conta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.open_support_ticket('conta', 'Nao consigo trocar a senha da minha conta.') $$,
  'membro autenticado abre chamado pela funcao'
);

select is(
  (select email from public.support_tickets
    where user_id = '10000000-0000-4000-8000-000000000001'),
  'member-one@example.invalid',
  'o chamado usa o e-mail da conta, nao um e-mail digitado'
);

select is(
  (select status::text || '|' || (reply is null)::text || '|' || (answered_at is null)::text
     from public.support_tickets
    where user_id = '10000000-0000-4000-8000-000000000001'),
  'open|true|true',
  'chamado novo nasce aberto, sem resposta e sem data de resposta'
);

-- 4) o texto tem tamanho minimo e maximo
select throws_ok(
  $$ select public.open_support_ticket('conta', 'curto') $$,
  '22023',
  null,
  'texto com menos de 10 caracteres e recusado'
);

select throws_ok(
  $$ select public.open_support_ticket('conta', repeat('a', 1001)) $$,
  '22023',
  null,
  'texto com mais de 1000 caracteres e recusado'
);

-- â”€â”€ 5. cada pessoa le so os proprios chamados â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

select is(
  (select count(*) from public.support_tickets),
  1::bigint,
  'quem abriu le o proprio chamado'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.support_tickets),
  0::bigint,
  'outra pessoa nao le o chamado de alguem'
);

-- 6) e nao escreve direto na tabela (nem com grant, nem com policy)
select throws_ok(
  $$ insert into public.support_tickets (user_id, email, topic, body)
     values ('10000000-0000-4000-8000-000000000002',
             'member-two@example.invalid',
             'conta',
             'insert direto na tabela de chamados') $$,
  '42501',
  null,
  'insert direto na tabela e negado'
);

select throws_ok(
  $$ update public.support_tickets set status = 'answered' $$,
  '42501',
  null,
  'update direto na tabela e negado'
);

-- â”€â”€ 7. o gate de operador vem antes de qualquer leitura â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
--
-- O id passado nao existe de proposito: quem nao e operador nao pode descobrir
-- nem se o chamado existe.

select throws_ok(
  $$ select public.answer_support_ticket(
       '99999999-0000-4000-8000-000000000001'::uuid,
       'resposta de quem nao e operador'
     ) $$,
  '42501',
  null,
  'quem nao e operador nao responde (e nao descobre se o chamado existe)'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-00000000000c', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.answer_support_ticket(
       '99999999-0000-4000-8000-000000000001'::uuid,
       'resposta de operador revogado'
     ) $$,
  '42501',
  null,
  'operador revogado nao responde'
);

-- â”€â”€ 8. o operador responde: resposta, situacao, aviso e e-mail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
--
-- O chamado do membro 002 entra aqui com id fixo porque a fila da operacao
-- entrega o id, nao a pergunta: e assim que o operador responde.

reset role;

insert into public.support_tickets (id, user_id, email, topic, body)
values (
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'member-two@example.invalid',
  'comunidade',
  'Quero entender como funciona a moderacao das perguntas.'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-00000000000b', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.answer_support_ticket(
       '70000000-0000-4000-8000-000000000001'::uuid,
       'A moderacao segue as regras publicadas na Ajuda. Obrigado por perguntar.'
     ) $$,
  'operador ativo responde o chamado'
);

-- O resto da secao le como o banco inteiro: a resposta nao e do operador, e a
-- fila de envio nao tem grant para o cliente.
reset role;

select is(
  (select status::text || '|' || reply || '|' || (answered_at is not null)::text
          || '|' || (answered_by = '10000000-0000-4000-8000-00000000000b')::text
     from public.support_tickets
    where id = '70000000-0000-4000-8000-000000000001'),
  'answered|A moderacao segue as regras publicadas na Ajuda. Obrigado por perguntar.|true|true',
  'responder grava resposta, data e quem respondeu, e muda para answered'
);

select results_eq(
  $$ select type::text, action, target_type, actor_user_id
       from public.notifications
      where recipient_user_id = '10000000-0000-4000-8000-000000000002' $$,
  $$ values ('support_answered'::text, 'answered'::text, 'support_ticket'::text, null::uuid) $$,
  'a resposta cria o aviso no app para o dono, sem expor quem respondeu'
);

select results_eq(
  $$ select recipient, channel::text, type
       from public.outbox
      where type = 'support_answered' $$,
  $$ values ('member-two@example.invalid'::text, 'email'::text, 'support_answered'::text) $$,
  'a resposta poe o e-mail na fila de envio para o dono'
);

-- O e-mail leva a resposta (no protótipo a resposta chega por e-mail).
select is(
  (select payload ->> 'reply' from public.outbox where type = 'support_answered'),
  'A moderacao segue as regras publicadas na Ajuda. Obrigado por perguntar.',
  'o e-mail na fila leva o texto da resposta'
);

-- ── 8.1. o titular le a resposta, nao quem respondeu ──────────────────────
--
-- `answered_by` e dado da operacao. O grant de leitura e por coluna, sem ela:
-- um grant da tabela inteira entregaria o UUID de quem respondeu em qualquer
-- `select *` feito pelo dono do chamado.

select is(
  has_table_privilege('authenticated', 'public.support_tickets', 'SELECT'),
  false,
  'authenticated nao tem leitura da tabela inteira de chamados'
);

select is(
  has_column_privilege('authenticated', 'public.support_tickets', 'answered_by', 'SELECT'),
  false,
  'o grant de leitura nao inclui answered_by'
);

select is(
  has_column_privilege('authenticated', 'public.support_tickets', 'reply', 'SELECT'),
  true,
  'o grant de leitura inclui a resposta'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.support_tickets
    where id = '70000000-0000-4000-8000-000000000001'),
  1::bigint,
  'o titular continua lendo o proprio chamado depois da resposta'
);

select throws_ok(
  $$ select answered_by from public.support_tickets
      where id = '70000000-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'o titular nao le answered_by'
);

select throws_ok(
  $$ select * from public.support_tickets
      where id = '70000000-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'select * tambem nao entrega answered_by'
);

reset role;

-- 9) um chamado respondido nao se responde duas vezes
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-00000000000b', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.answer_support_ticket(
       '70000000-0000-4000-8000-000000000001'::uuid,
       'segunda resposta para o mesmo chamado'
     ) $$,
  '55000',
  null,
  'chamado ja respondido e recusado'
);

-- ── 10. limite de abertura por pessoa ─────────────────────────────────────
--
-- O limite e de cinco ABERTOS. O membro 001 tem 1 aberto da secao 3; os quatro
-- abaixo fecham a cota. A versao anterior desta suite abria o sexto com um unico
-- chamado respondido no historico: passaria mesmo se respondidos ainda
-- consumissem o limite. Aqui a fronteira e exercitada dos dois lados.
reset role;

insert into public.support_tickets (id, user_id, email, topic, body)
values
  ('70000000-0000-4000-8000-000000000011',
   '10000000-0000-4000-8000-000000000001',
   'member-one@example.invalid',
   'outro',
   'chamado aberto para preencher o limite de abertos'),
  ('70000000-0000-4000-8000-000000000012',
   '10000000-0000-4000-8000-000000000001',
   'member-one@example.invalid',
   'outro',
   'chamado aberto para preencher o limite de abertos'),
  ('70000000-0000-4000-8000-000000000013',
   '10000000-0000-4000-8000-000000000001',
   'member-one@example.invalid',
   'outro',
   'chamado aberto para preencher o limite de abertos'),
  ('70000000-0000-4000-8000-000000000014',
   '10000000-0000-4000-8000-000000000001',
   'member-one@example.invalid',
   'outro',
   'chamado aberto para preencher o limite de abertos');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.support_tickets
    where user_id = '10000000-0000-4000-8000-000000000001'
      and status = 'open'),
  5::bigint,
  'a pessoa chega a cinco chamados abertos'
);

select throws_ok(
  $$ select public.open_support_ticket('outro', 'Este e o sexto chamado aberto da pessoa.') $$,
  '54000',
  null,
  'o sexto chamado aberto e recusado'
);

-- Responder um dos cinco abertos devolve a vaga.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-00000000000b', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.answer_support_ticket(
       '70000000-0000-4000-8000-000000000011'::uuid,
       'Resposta que libera uma vaga no limite de abertos.'
     ) $$,
  'o operador responde um dos cinco chamados abertos'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.open_support_ticket('comunidade', 'Quero entender como entro em um grupo.') $$,
  'chamado respondido libera a vaga de aberto'
);

select is(
  (select count(*) from public.support_tickets
    where user_id = '10000000-0000-4000-8000-000000000001'
      and status = 'open'),
  5::bigint,
  'a nova abertura devolve a pessoa aos cinco abertos'
);

-- Limite de 24 h: a quarta pessoa nao tem nenhum aberto.
reset role;

select is(
  (select count(*) from public.support_tickets
    where user_id = '10000000-0000-4000-8000-000000000004'
      and status = 'open'),
  0::bigint,
  'a quarta pessoa nao tem chamado aberto antes do teste de 24 h'
);

insert into public.support_tickets (
  user_id, email, topic, body, status, reply, answered_by, answered_at, created_at
)
select '10000000-0000-4000-8000-000000000004',
       'hidden-member@example.invalid',
       'conta',
       'chamado anterior desta pessoa, ja respondido',
       'answered',
       'resposta anterior',
       '10000000-0000-4000-8000-00000000000b',
       now() - interval '2 hours',
       now() - interval '2 hours'
from generate_series(1, 10);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.open_support_ticket('conta', 'Este e o decimo primeiro chamado em 24 horas.') $$,
  '54000',
  null,
  'o decimo primeiro chamado em 24 h e recusado'
);

-- A janela e de 24 h, nao um veto permanente.
reset role;

update public.support_tickets
   set created_at = now() - interval '25 hours'
 where user_id = '10000000-0000-4000-8000-000000000004';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.open_support_ticket('conta', 'Depois de 24 horas a pessoa volta a poder abrir.') $$,
  'passadas 24 h a pessoa volta a abrir chamado'
);

-- â”€â”€ 12. exclusao de conta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.open_support_ticket('seguranca', 'Quero registrar um problema de seguranca.') $$,
  'a quinta pessoa abre um chamado antes de sair'
);

reset role;

select is(
  (select count(*) from public.support_tickets
    where user_id = '10000000-0000-4000-8000-000000000005'),
  1::bigint,
  'o chamado da quinta pessoa existe antes da purga'
);

-- A resposta é enfileirada para o e-mail da conta naquele momento.
-- O id é capturado como dono do banco: o operador não lê a fila de outra pessoa
-- (a policy de select é só do titular), e na operação real o id vem da fila.
select set_config(
  'bivaque.ticket_005',
  (select id::text from public.support_tickets
    where user_id = '10000000-0000-4000-8000-000000000005'),
  true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-00000000000b', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.answer_support_ticket(
       current_setting('bivaque.ticket_005')::uuid,
       'Resposta que nao pode sobreviver a exclusao da conta.'
     ) $$,
  'o operador responde o chamado antes da exclusao'
);

reset role;

select is(
  (select count(*) from public.outbox
    where payload ->> 'ticket_id' = current_setting('bivaque.ticket_005')),
  1::bigint,
  'a resposta esta no outbox antes da exclusao'
);

-- A pessoa troca o e-mail DEPOIS de receber a resposta. A limpeza por endereço
-- (purge_account_contact_data) procura o endereço novo; a mensagem antiga do
-- outbox só sai se a purga souber ligá-la ao chamado pelo payload.
update auth.users
   set email = 'non-member-changed@example.invalid'
 where id = '10000000-0000-4000-8000-000000000005';

select public.purge_account_contact_data(
  '10000000-0000-4000-8000-000000000005',
  'non-member-changed@example.invalid'
);

insert into public.account_deletion_requests (user_id, requested_at, due_at)
values (
  '10000000-0000-4000-8000-000000000005',
  now() - interval '16 days',
  now() - interval '1 day'
);

select is(
  public.finalize_account_deletion('10000000-0000-4000-8000-000000000005'),
  'purged',
  'a purga da conta roda depois do vencimento'
);

select is(
  (select count(*) from public.support_tickets
    where user_id = '10000000-0000-4000-8000-000000000005'),
  0::bigint,
  'a purga apaga os chamados da pessoa'
);

select is(
  (select count(*) from public.outbox
    where payload ->> 'ticket_id' = current_setting('bivaque.ticket_005')),
  0::bigint,
  'a purga apaga do outbox a resposta do chamado, mesmo com o e-mail trocado'
);

select is(
  (select count(*) from public.outbox
    where payload ->> 'reply' = 'Resposta que nao pode sobreviver a exclusao da conta.'),
  0::bigint,
  'nem o texto da resposta fica no outbox'
);

-- O cascade da FK, para o caso de a conta ser apagada de vez.
insert into public.support_tickets (user_id, email, topic, body)
values ('10000000-0000-4000-8000-000000000003',
        'other-locality@example.invalid',
        'outro',
        'chamado de quem sera apagado pelo cascade');

select is(
  (select count(*) from public.support_tickets
    where user_id = '10000000-0000-4000-8000-000000000003'),
  1::bigint,
  'o chamado existe antes do cascade'
);

delete from auth.users where id = '10000000-0000-4000-8000-000000000003';

select is(
  (select count(*) from public.support_tickets
    where user_id = '10000000-0000-4000-8000-000000000003'),
  0::bigint,
  'apagar a conta apaga os chamados pelo cascade'
);

-- ── 13. a exclusao do operador preserva a resposta e apaga a autoria ──────
--
-- A exclusao real e soft delete, logo o ON DELETE SET NULL da FK de
-- answered_by nao dispara. Sem o UPDATE na purga, o UUID de quem respondeu
-- ficaria no chamado de outra pessoa para sempre.

insert into public.account_deletion_requests (user_id, requested_at, due_at)
values (
  '10000000-0000-4000-8000-00000000000b',
  now() - interval '16 days',
  now() - interval '1 day'
);

select is(
  public.finalize_account_deletion('10000000-0000-4000-8000-00000000000b'),
  'purged',
  'a purga da conta do operador roda'
);

select is(
  (select (answered_by is null)::text || '|' || (reply is not null)::text
     from public.support_tickets
    where id = '70000000-0000-4000-8000-000000000001'),
  'true|true',
  'a purga apaga a autoria (answered_by) e preserva a resposta'
);

select * from finish();

rollback;
