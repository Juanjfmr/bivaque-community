-- SEC — o veto de suspensão faltava na policy de insert de recommendation_requests.
--
-- O ADR-20260901 pede `AND NOT is_account_suspended()` em toda escrita de
-- conteúdo; 20260816001059 recriou a policy sem a cláusula e as versões
-- anteriores nunca a tiveram. Recria a policy com o veto, preservando
-- exatamente o restante do texto (inclusive o branch de ambos os escopos, que
-- mantém o CHECK recommendation_origin_scope decidindo 23514). O helper mora em
-- public (20260911033327 moveu o estado para public.profile_suspensions), não
-- em private. Provado em supabase/tests/perguntas-vetam-conta-suspensa.sql.

drop policy if exists recommendation_requests_insert_locality
  on public.recommendation_requests;

create policy recommendation_requests_insert_locality
on public.recommendation_requests
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and not public.is_account_suspended((select auth.uid()))
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
