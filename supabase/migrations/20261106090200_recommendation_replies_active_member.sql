-- RUN-017 (3/4): responder pergunta exige vínculo ativo.
--
-- A policy recommendation_replies_insert (20260815220000) só pergunta se o
-- autor enxerga a recomendação. can_see_locality_recommendation aceita qualquer
-- linha de locality_memberships, inclusive access = 'read_only', que é o
-- vínculo de quem está de saída e só pode ler. Também não havia veto de conta
-- suspensa, diferente das policies de INSERT mais recentes.
--
-- is_active_locality_member (20260820000000) já existe e é o predicado que o
-- restante da escrita usa: mesma coluna, mesmo lugar. O ramo de grupo fica
-- como estava — grupo não tem estado read_only.

drop policy recommendation_replies_insert on public.recommendation_replies;

create policy recommendation_replies_insert
on public.recommendation_replies
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and not public.is_account_suspended((select auth.uid()))
  and exists (
    select 1
    from public.recommendation_requests req
    where req.id = recommendation_replies.request_id
      and (
        (
          req.locality_id is not null
          and private.is_active_locality_member(req.locality_id)
        )
        or (
          req.group_id is not null
          and private.is_group_member(req.group_id)
        )
      )
  )
);
