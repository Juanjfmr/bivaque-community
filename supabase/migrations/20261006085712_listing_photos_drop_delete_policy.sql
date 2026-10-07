-- FIGMA-002 — compensação: remove a policy permissiva de DELETE em
-- storage.objects criada em 20261006083013_listings_property_domain.sql.
--
-- O guard de casa (supabase/tests/storage-policies.sql) mantém uma allowlist
-- fechada de policies de delete em storage.objects (avatars_delete_own e
-- event_photos_delete_own): remoção de objeto é caminho de servidor
-- privilegiado, como em verification-documents — a server action do dono apaga
-- o objeto via client de serviço na mesma ação que remove a linha de
-- listing_media (ADR de mídia D3: "remover a imagem do recurso remove o
-- objeto"). Policy de delete no bucket não acrescenta autorização real e
-- alargava a superfície; a leitura derivada e a escrita do dono permanecem.

drop policy if exists listing_photos_delete_owner on storage.objects;
