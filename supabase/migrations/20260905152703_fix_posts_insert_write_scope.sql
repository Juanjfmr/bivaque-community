-- Restaura as garantias que a recriação de policies pela migration
-- 20260901124348 (account suspension) deixou cair, e fecha um vazamento
-- anterior que ela herdou. Achado rodando o estado pgTAP canônico
-- (db reset --no-seed + test:db), que estava quebrado desde bb6803f e
-- por isso nunca tinha validado a migration de suspensão.
--
-- 1) posts_insert_locality_member perdeu duas cláusulas:
--    a. user_id = (select auth.uid()) — sem ela, qualquer membro
--       autenticado podia inserir post atribuído a outro user_id
--       (impersonação). O anexo do próprio ADR-20260901 traz a cláusula
--       no exemplo (auth.uid() = user_id); a implementação divergiu.
--    b. can_write_post_to virou can_access_post_scope — read scope no
--       lugar de write scope. Membro com origem degradada para
--       read_only (D51, onda T) voltava a conseguir publicar na origem.
--       transfer-degradation.sql test 4 pegou: wanted 42501, caught none.
--
-- 2) post_reactions_insert_locality_member usava read scope
--    (can_access_post) desde antes da onda T: como as duas policies de
--    INSERT são permissivas (OR), a de read scope anulava o write check
--    que a onda T colocou na post_reactions_insert_self. Alinhada ao
--    write scope agora — mesma leitura de D51 ("Insert and update of
--    posts, comments, post_reactions gain the active check").
--
-- O veto de suspensão (AND NOT is_account_suspended) do ADR-20260901 é
-- preservado nas duas policies. comments_insert_member e
-- post_reactions_insert_self já estavam corretas na 124348 e não são
-- tocadas.

drop policy if exists posts_insert_locality_member on public.posts;
create policy posts_insert_locality_member
on public.posts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_write_post_to(locality_id, community_id, group_id)
  and not public.is_account_suspended(auth.uid())
);

drop policy if exists post_reactions_insert_locality_member on public.post_reactions;
create policy post_reactions_insert_locality_member
on public.post_reactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.posts p
    where p.id = post_reactions.post_id
      and private.can_write_post_to(p.locality_id, p.community_id, p.group_id)
  )
  and not public.is_account_suspended(auth.uid())
);
