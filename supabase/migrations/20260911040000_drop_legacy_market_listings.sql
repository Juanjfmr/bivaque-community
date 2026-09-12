-- RECON-039 — reconciliação do domínio `listings`.
--
-- Duas migrations criaram, cada uma, um domínio `listings` completo e
-- incompatível: `20260911034950_market_listings.sql` (RECON-025, Mercado) e
-- `20260911043053_listings_market_and_homes.sql` (RECON-027, Moradia). O
-- canônico é o do RECON-027; o arquivo do RECON-025 foi REMOVIDO da pasta de
-- migrations no mesmo lote.
--
-- Por que este arquivo existe, e por que com este timestamp no passado:
-- o banco local compartilhado já aplicou `20260911034950` antes deste lote. Como
-- a regra local proíbe apagar/recriar o banco e proíbe editar migration já
-- aplicada, os objetos legados (tipos, tabelas, funções e policies) precisam ser
-- removidos por uma migration ADITIVA que rode ANTES de
-- `20260911043053`. O timestamp fica entre os dois de propósito.
--
-- Num banco limpo o tipo `public.listing_status` não existe (o arquivo legado
-- saiu da pasta) e o bloco é um no-op: a definição canônica nasce do zero no
-- `20260911043053`. A guarda existe para que o `drop function
-- private.listing_reachable(public.listing_status, ...)` não tente resolver
-- tipos que não existem no replay limpo.
--
-- A função `private.dm_context_valid` é derrubada aqui em ambos os mundos e
-- recriada no `20260911043053` com o ramo `listing` já sobre as colunas
-- canônicas (`owner_user_id` + `private.can_read_listing`). Derrubá-la antes evita
-- que um `drop` de `private.listing_reachable` esbarre na dependência da função
-- `language sql` legada.

do $repair$
begin
  if not exists (
    select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
       and t.typname = 'listing_status'
  ) then
    -- Banco limpo: a definição legada nunca existiu nesta máquina.
    return;
  end if;

  -- Policies de storage criadas pelo lote do Mercado. Duas delas têm o mesmo
  -- nome das policies canônicas e fariam o `create policy` do 20260911043053
  -- colidir.
  drop policy if exists listing_photos_storage_select_reachable on storage.objects;
  drop policy if exists listing_photos_storage_insert_owner on storage.objects;
  drop policy if exists listing_photos_storage_update_owner on storage.objects;
  drop policy if exists listing_photos_storage_delete_owner on storage.objects;

  -- Funções `language sql` que leem `public.listings` precisam cair antes da
  -- tabela: o Postgres registra a dependência do corpo.
  drop function if exists private.dm_context_valid(
    uuid, uuid, public.dm_context_type, uuid
  );
  drop function if exists private.can_write_listing_object(text);
  drop function if exists private.can_read_listing_object(text);

  -- Tabelas (o trigger e as policies caem junto). As policies de `listings`,
  -- `listing_photos` e `listing_saves` dependem de `private.listing_reachable`,
  -- então a função só pode cair depois delas.
  drop table if exists public.listing_saves;
  drop table if exists public.listing_photos;
  drop table if exists public.listings;

  drop function if exists private.listing_reachable(
    public.listing_status, uuid, public.listing_audience, uuid, uuid
  );

  -- O trigger function sobrevive ao `drop table`; a função fica órfã sem isto.
  drop function if exists private.listings_guard_mutation();

  -- Tipos por último: só podem cair quando nenhuma coluna/função os usa.
  drop type if exists public.listing_audience;
  drop type if exists public.listing_status;
  drop type if exists public.listing_kind;
end;
$repair$;
