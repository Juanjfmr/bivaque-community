-- Publicação só dentro de um grupo (lote 5, N2 — migration 20261024100000).
--
-- O protótipo não tem feed da cidade: publicar existe só dentro de um grupo. A
-- recusa mora no banco (policy de insert), não na tela. Este teste prova o
-- positivo (grupo de que a pessoa participa passa) e os negativos que o ADR
-- declara como risco: publicação para a cidade inteira (sem grupo e sem vila) e
-- publicação de vila (sem grupo) são recusadas — inclusive por outro caminho
-- que não o compositor.
--
-- O escopo de escrita é o de sempre (`private.can_write_post_to`): a policy
-- nova ACRESCENTA `group_id is not null`, não substitui a checagem de
-- participação. É por isso que o terceiro negativo existe.

begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- As fixtures de comunidade trazem os grupos 800…001 (Aberto, da vila A) e
-- 800…002 (Fechado, da vila A); member-one (…001) participa dos dois e é dono
-- deles; member-two (…002) tem membership PENDENTE na vila A e não participa
-- de grupo nenhum.

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
    insert into public.posts (locality_id, user_id, group_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      '80000000-0000-4000-8000-000000000001',
      'text',
      'Combinado da horta no sabado'
    )
  $$,
  'N2+: membro publica no grupo de que participa'
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

select * from finish();
rollback;