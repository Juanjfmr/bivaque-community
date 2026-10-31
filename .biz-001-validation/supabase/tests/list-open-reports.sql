-- Onda H Task 4 — a triagem mostra o caso, nao um UUID (F164).
--
-- O card da fila exibia tipo, data, motivo e o id do alvo. Estas assercoes
-- travam o que o runbook §6 pede: o conteudo, o autor, e a reincidencia no
-- mesmo alvo.

begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

\ir fixtures/foundation.inc
\ir fixtures/reports.inc
\ir fixtures/recommendations.inc

-- member-two denuncia o post de member-one; other-locality denuncia o MESMO
-- post, para exercitar o contador de reincidencia.
insert into public.reports (id, reporter_user_id, target_type, target_id, reason, status)
values
  ('a0000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000002',
   'post', '60000000-0000-4000-8000-000000000001', 'post com conteudo abusivo', 'open'),
  ('a0000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000003',
   'post', '60000000-0000-4000-8000-000000000001', 'mesma publicacao, outro denunciante', 'open'),
  -- member-ONE denuncia a resposta: a reply da fixture e de member-two, e o
  -- gatilho de auto-denuncia (20260821000032) recusaria member-two aqui. Este
  -- teste ja caiu nisso uma vez — o gatilho funcionando.
  ('a0000000-0000-4000-8000-000000000103', '10000000-0000-4000-8000-000000000001',
   'recommendation_reply', '50000000-0000-4000-8000-000000000001',
   'resposta indica servico que nao existe', 'open');

-- Uma denuncia ja resolvida: nao pode aparecer na fila.
insert into public.reports (
  id, reporter_user_id, target_type, target_id, reason, status, resolved_at
) values (
  -- Idem: o comentario da fixture e de member-two.
  'a0000000-0000-4000-8000-000000000104', '10000000-0000-4000-8000-000000000001',
  'comment', '70000000-0000-4000-8000-000000000001', 'ja analisada', 'resolved', now()
);

-- Conta so as denuncias que ESTE teste criou. list_open_reports e security
-- definer e enxerga a tabela inteira; o seed de desenvolvimento carrega
-- denuncias abertas proprias (§seed.sql). Uma asserção sobre o total absoluto
-- passa num banco sem seed e falha num banco com seed — o mesmo teste dando
-- respostas diferentes conforme quem rodou o reset por ultimo.
select is(
  (select count(*)::int from public.list_open_reports()
    where id in (
      'a0000000-0000-4000-8000-000000000101',
      'a0000000-0000-4000-8000-000000000102',
      'a0000000-0000-4000-8000-000000000103',
      'a0000000-0000-4000-8000-000000000104'
    )),
  3,
  'a fila devolve as tres denuncias abertas do teste, e nao a ja resolvida'
);

select is(
  (select target_excerpt from public.list_open_reports()
    where id = 'a0000000-0000-4000-8000-000000000101'),
  'Post para teste de denuncia',
  'o card carrega o trecho do post denunciado'
);

select is(
  (select target_author_name from public.list_open_reports()
    where id = 'a0000000-0000-4000-8000-000000000101'),
  'Member One',
  'o card carrega o nome de quem escreveu o conteudo — nao o do denunciante'
);

select is(
  (select open_reports_on_target from public.list_open_reports()
    where id = 'a0000000-0000-4000-8000-000000000101'),
  2,
  'o contador mostra as duas denuncias abertas no mesmo alvo'
);

-- Alvo que a Task 1 acrescentou: a resposta de indicacao precisa aparecer com
-- trecho e autor como qualquer outro.
select is(
  (select target_author_name from public.list_open_reports()
    where id = 'a0000000-0000-4000-8000-000000000103'),
  'Member Two',
  'alvo novo (resposta de indicacao) tambem carrega autor'
);

select isnt(
  (select target_excerpt from public.list_open_reports()
    where id = 'a0000000-0000-4000-8000-000000000103'),
  null,
  'alvo novo (resposta de indicacao) tambem carrega trecho'
);

-- A fila e do operador. O painel roda como service_role atras do gate de
-- is_current_user_operator; membro comum nao executa.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  'select * from public.list_open_reports()',
  42501,
  null,
  'membro comum nao executa a fila de triagem'
);

select * from finish();
rollback;
