-- Publicação só dentro de um grupo (lote 5, N2 — migration 20261024100000).
--
-- O protótipo não tem feed da cidade: publicar existe só dentro de um grupo. A
-- recusa mora no banco (policy de insert + gatilho de UPDATE), não na tela.
--
-- Este teste prova o positivo (grupo de que a pessoa participa passa, e uma
-- edição legítima continua passando) e os negativos que o ADR declara como
-- risco: publicação para a cidade inteira (sem grupo e sem vila), publicação de
-- vila (sem grupo) e, pelo gatilho, o UPDATE que tira o grupo ou troca de
-- grupo — o caminho que contornava a policy de insert. Prova também que o
-- perfil (`profile_posts_for`) não lista a publicação sem grupo.
--
-- O escopo de escrita é o de sempre (`private.can_write_post_to`): a policy
-- nova ACRESCENTA `group_id is not null`, não substitui a checagem de
-- participação. É por isso que o negativo do grupo Fechado existe.

begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- As fixtures de comunidade trazem os grupos 800…001 (Aberto, da vila A) e
-- 800…002 (Fechado, da vila A); member-one (…001) participa dos dois e é dono
-- deles; member-two (…002) tem membership PENDENTE na vila A e não participa
-- de grupo nenhum. As fixtures também deixam duas publicações de member-one: a
-- 900…001 (vila A, sem grupo) e a 900…002 (grupo 800…001).

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

-- ── POSITIVO: publicar no grupo de que é membro ────────────────────────────

select lives_ok(
  $$
    insert into public.posts (id, locality_id, user_id, group_id, post_type, content)
    values (
      '90000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      '80000000-0000-4000-8000-000000000001',
      'text',
      'Combinado da horta no sabado'
    )
  $$,
  'N2+: membro publica no grupo de que participa'
);

-- Edição legítima continua passando: o gatilho só recusa a MUDANÇA de grupo,
-- não qualquer update.
select lives_ok(
  $$
    update public.posts
    set content = 'Combinado da horta no domingo'
    where id = '90000000-0000-4000-8000-000000000101'
  $$,
  'N2+: editar a publicação mantendo o grupo continua permitido'
);

-- ── NEGATIVO: o grupo não pode sair nem trocar depois de criado ────────────

select throws_ok(
  $$
    update public.posts
    set group_id = null
    where id = '90000000-0000-4000-8000-000000000101'
  $$,
  42501,
  null,
  'N2-: o autor não consegue tirar o grupo de uma publicação'
);

select throws_ok(
  $$
    update public.posts
    set group_id = '80000000-0000-4000-8000-000000000002'
    where id = '90000000-0000-4000-8000-000000000101'
  $$,
  42501,
  null,
  'N2-: o autor não consegue trocar a publicação de grupo'
);

-- ── NEGATIVO: sem grupo não há publicação ──────────────────────────────────

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Aviso para a cidade inteira'
    )
  $$,
  42501,
  null,
  'N2-: publicação para a cidade (sem grupo e sem vila) é recusada'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, community_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001',
      'text',
      'Aviso só para a vila'
    )
  $$,
  42501,
  null,
  'N2-: publicação de vila (sem grupo) é recusada'
);

-- ── NEGATIVO: ter grupo não basta; a participação continua valendo ──────────

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, group_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '80000000-0000-4000-8000-000000000002',
      'text',
      'Entrando na conversa fechada'
    )
  $$,
  42501,
  null,
  'N2-: não-membro do grupo Fechado continua recusado'
);

-- ── NEGATIVO: o perfil não lista publicação sem grupo ──────────────────────
--
-- A leitura do perfil vai como o app a chama: service_role, com o viewer
-- explícito. A publicação de grupo (900…002) aparece; a publicação de vila sem
-- grupo (900…001) não. O claim do JWT é limpo — sem ele, `auth.uid()` continua
-- no último `set_config` e o guard da função recusa o viewer explícito.

reset role;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);

select isnt_empty(
  $$
    select id from public.profile_posts_for(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
    where id = '90000000-0000-4000-8000-000000000002'::uuid
  $$,
  'N2+: o perfil lista a publicação de grupo'
);

select is_empty(
  $$
    select id from public.profile_posts_for(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
    where id = '90000000-0000-4000-8000-000000000001'::uuid
  $$,
  'N2-: o perfil NÃO lista a publicação sem grupo'
);

select * from finish();
rollback;