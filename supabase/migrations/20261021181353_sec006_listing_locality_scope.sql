-- SEC-006 H1, parte 2 (coordenador, 2026-10-21): anuncio de cidade exige vinculo com a cidade.
--
-- A migration 20261021174504 passou a exigir participacao aprovada para anunciar numa comunidade
-- (caminho legado: o produto atual nao tem comunidades). O anuncio de cidade, que e o do produto,
-- seguia sem conferencia: com o `locality_id` de uma cidade so consultada (sem vinculo), o anuncio
-- era publicado nela. O prototipo (prova R02) proibe publicar em cidade consultada. A regra usa
-- private.is_locality_member, a mesma da leitura: vale o vinculo `current` e tambem o `leaving`,
-- porque quem esta de mudanca continua anunciando o desapego na cidade que deixa. Todas as condicoes
-- anteriores das duas policies continuam.

alter policy listings_insert_owner
on public.listings
with check (
  owner_user_id = (select auth.uid())
  and not public.is_account_suspended((select auth.uid()))
  and not private.account_deletion_requested((select auth.uid()))
  and (
    community_id is null
    or private.is_community_member(community_id)
  )
  and (
    locality_id is null
    or private.is_locality_member(locality_id)
  )
);

alter policy listings_update_owner
on public.listings
using (owner_user_id = (select auth.uid()))
with check (
  owner_user_id = (select auth.uid())
  and (
    community_id is null
    or private.is_community_member(community_id)
  )
  and (
    locality_id is null
    or private.is_locality_member(locality_id)
  )
);
