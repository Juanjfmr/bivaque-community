-- SEC-006 H1 (revisao final de 2026-10-21) - o publico do anuncio e conferido
-- na escrita, nao so na leitura.
--
-- A policy de INSERT herdada de 20260911043053 (alterada em 20260915101543)
-- conferia dono, suspensao e pedido de exclusao. Com `community_id` de uma
-- comunidade da qual a pessoa nao participa, o anuncio era publicado nela: a
-- leitura (`private.can_read_listing`) exigia vinculo aprovado, mas a escrita
-- nao. A RPC `create_property_listing` e SECURITY INVOKER e herda exatamente
-- esta policy, entao a correcao cobre os dois caminhos.
--
-- O UPDATE tambem reconfere o publico. O trigger
-- `listings_audience_immutable` ja impede trocar cidade/comunidade depois de
-- criado; o que faltava era impedir que o dono que perdeu o vinculo aprovado
-- continuasse escrevendo no anuncio que ficou na comunidade.
--
-- `locality_id`: o modelo atual nao exige vinculo de localidade para publicar
-- (a unica regra existente e a exclusividade cidade XOR comunidade, em
-- `listings_audience_exclusive`). Nada foi ampliado aqui alem do que o achado
-- H1 pede; o anuncio de cidade continua como estava.

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
);
