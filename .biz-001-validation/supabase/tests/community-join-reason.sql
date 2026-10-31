-- O motivo do pedido de participação: quem escreveu e quem analisa leem; o
-- restante da comunidade, não.
--
-- O caso que justifica a tabela separada é o assert 4. A política
-- community_memberships_select_comember entrega a linha de membership inteira
-- a qualquer membro aprovado — é assim que o roster funciona e está certo.
-- Se o motivo fosse coluna daquela tabela, ele viajaria junto com o roster e a
-- tela estaria prometendo uma restrição que o banco não aplica. Aqui o
-- membro aprovado comum lê o roster e não lê a justificativa.

begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- Uma terceira comunidade para o caso do motivo em branco, porque os dois
-- solicitantes disponíveis já ocupam as vagas livres das outras duas.
insert into public.communities (
  id, locality_id, name, description, created_by, owner_user_id
)
values (
  '70000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000001',
  'Vila Terceira',
  'Terceira vila da mesma cidade',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

-- O dono da Vila Vizinha (002) nao tem linha de membership na fixture, e sem
-- ela ele nao modera nada: is_current_user_community_moderator exige membership
-- aprovada com papel moderator/owner, e o approve_community_member usa
-- exatamente esse teste. A linha entra aqui para o ator "quem analisa" ser o
-- mesmo que o RPC de aprovacao aceitaria.
insert into public.community_memberships (community_id, user_id, role, status)
values
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'owner', 'approved');

-- ── hidden-member (004) pede entrada na Vila Vizinha com um motivo escrito.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.request_community_membership(
       '70000000-0000-4000-8000-000000000002',
       'Moro na quadra ao lado e conheco os vizinhos'
     ) $$,
  'solicitante grava pedido e motivo na mesma chamada'
);

-- ── POSITIVO: o autor le o proprio motivo.
select is(
  (
    select count(*)::int from public.community_join_reasons
    where community_id = '70000000-0000-4000-8000-000000000002'
      and user_id = '10000000-0000-4000-8000-000000000004'
  ),
  1,
  'autor do pedido le o proprio motivo'
);

-- ── POSITIVO: quem analisa (owner da comunidade) le o motivo.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::int from public.community_join_reasons
    where community_id = '70000000-0000-4000-8000-000000000002'
  ),
  1,
  'owner da comunidade le o motivo de quem pediu entrada'
);

-- ── NEGATIVO: membro aprovado comum enxerga o roster e NAO enxerga o motivo.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::int from public.community_memberships
    where community_id = '70000000-0000-4000-8000-000000000002'
  ),
  3,
  'membro aprovado comum continua enxergando o roster'
);

select is(
  (
    select count(*)::int from public.community_join_reasons
    where community_id = '70000000-0000-4000-8000-000000000002'
  ),
  0,
  'membro aprovado comum NAO le o motivo de quem pediu entrada'
);

-- ── Motivo em branco nao vira linha: o campo e opcional de verdade.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select public.request_community_membership(
  '70000000-0000-4000-8000-000000000003',
  '     '
);

reset role;
set local role service_role;

select is(
  (
    select count(*)::int from public.community_join_reasons
    where community_id = '70000000-0000-4000-8000-000000000003'
  ),
  0,
  'motivo em branco nao cria linha'
);

select * from finish();
rollback;
