-- SEC-006 — nenhuma imagem de usuário chega ao Storage pelo cliente.
--
-- A limpeza de EXIF/GPS é feita no servidor (SEC-004). Enquanto o papel
-- `authenticated` puder fazer INSERT ou UPDATE direto em storage.objects, o
-- navegador pode pular a Server Action e gravar a foto original, com a
-- coordenada do aparelho. As policies abaixo eram as que permitiam isso.
--
-- A escrita passa a ser exclusiva das Server Actions com service_role, que
-- reconferem a mesma autorização antes de cada upload:
--   * anúncio (Moradia e Mercado): listings.owner_user_id = chamador;
--   * portfólio: can_manage_provider_profile(profile_id);
--   * pedido: service_requests.requester_user_id = chamador;
--   * evento, avatar e comunidade já usavam service_role.
--
-- Fora do escopo: leitura (SELECT) e exclusão (DELETE) continuam como estão;
-- `verification-documents` não é tocado (o PDF de identidade tem exceção
-- própria e já grava pelo servidor).

-- ── INSERT: removido dos seis buckets de imagem de usuário ──────────────────
drop policy if exists avatars_insert_own_folder on storage.objects;
drop policy if exists event_photos_insert_self on storage.objects;
drop policy if exists listing_photos_storage_insert_owner on storage.objects;
drop policy if exists community_images_insert_owner on storage.objects;
drop policy if exists provider_photos_insert_owner on storage.objects;
drop policy if exists service_request_photos_storage_insert_owner on storage.objects;

-- ── UPDATE: removido dos quatro buckets que ainda o permitiam ───────────────
-- (listing-photos e provider-photos já não tinham policy de UPDATE.)
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists event_photos_update_own on storage.objects;
drop policy if exists community_images_update_owner on storage.objects;
drop policy if exists service_request_photos_storage_update_owner on storage.objects;
