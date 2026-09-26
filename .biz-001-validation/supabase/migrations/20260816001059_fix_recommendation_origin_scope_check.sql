-- Fix da política de insert de recommendation_requests: o CHECK de escopo
-- (recommendation_origin_scope, 23514) voltou a ser exercitável pelo Data API.
--
-- A onda F (20260815220000_recommendation_reply_cycle.sql) estreitou a policy
-- para exigir exatamente um escopo, o que faz a RLS responder 42501 antes de o
-- CHECK disparar. A defesa em profundidade ficou inalcançável pelo caminho do
-- cliente e o teste commitado recommendations-scope-denials.sql (teste 10)
-- regrediu. Com ambos os escopos setados, a RLS agora deixa o CHECK decidir:
-- a rejeição volta a ser 23514 e a cobertura do teste permanece.

drop policy if exists recommendation_requests_insert_locality
  on public.recommendation_requests;

create policy recommendation_requests_insert_locality
on public.recommendation_requests
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and (
    (
      locality_id is not null
      and group_id is null
      and private.is_locality_member(locality_id)
    )
    or (
      locality_id is null
      and group_id is not null
      and private.is_group_member(group_id)
    )
    -- Ambos setados: a RLS não decide escopo inválido — o CHECK
    -- recommendation_origin_scope rejeita (23514). Sem este branch, a RLS
    -- responderia 42501 antes do CHECK e a defesa em profundidade ficaria
    -- sem cobertura de teste.
    or (locality_id is not null and group_id is not null)
  )
);