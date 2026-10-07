-- FIGMA-002 — compensação: a policy de insert de listings avaliava o público
-- por helper que RECONSULTA a tabela (private.listing_audience_reached(id)).
-- Em WITH CHECK, a linha em inserção ainda não é visível para uma consulta
-- nova dentro do mesmo comando — toda publicação legítima caía como violação
-- de RLS. O alcance do público agora é avaliado inline sobre as colunas da
-- linha nova (locality_id/community_id), sem reconsulta. A leitura (USING)
-- continua no helper: lá a linha já está committed e a reconsulta é correta.

drop policy if exists listings_insert_audience on public.listings;

create policy listings_insert_audience
on public.listings
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and (
    (locality_id is not null and exists (
      select 1 from public.locality_memberships lm
      where lm.locality_id = listings.locality_id
        and lm.user_id = (select auth.uid())
    ))
    or (community_id is not null and exists (
      select 1 from public.community_memberships cm
      where cm.community_id = listings.community_id
        and cm.user_id = (select auth.uid())
        and cm.status = 'approved'
    ))
  )
);
