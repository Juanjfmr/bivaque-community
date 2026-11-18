-- AUTHZ-001 + AUTHZ-002 (R3, aceito por delegação — ver
-- docs/decisions/ADR-20261118-congelamento-de-escrita-e-colunas-de-grupo.md).
--
-- AUTHZ-001: o ADR-20260901 pede que suspensão bloqueie toda escrita de
-- conteúdo. As policies de INSERT de posts e comments já vetavam conta suspensa
-- e conta com pedido de exclusão; as de UPDATE e DELETE (versão de
-- 20261019222259) não. Este arquivo acrescenta os dois vetos a USING e a WITH
-- CHECK, preservando exatamente autoria, soft delete e escopo de escrita.
--
-- AUTHZ-002: 20261107093000 regranteou UPDATE em groups incluindo
-- owner_user_id, created_by, locality_id, community_id e is_deleted. A policy
-- groups_update_owner decide a linha, não a coluna: o dono trocava a
-- titularidade e a autoria por UPDATE direto. Titularidade muda pela RPC
-- transfer_group_ownership; exclusão pela RPC delete_group; is_default pela
-- set_group_default. O grant fica só nas colunas editáveis pelas telas.
-- Provado em supabase/tests/authz-suspension-write-freeze.sql e
-- supabase/tests/authz-group-sensitive-columns.sql.

-- 1. Posts
alter policy posts_update_own on public.posts
using (
  not is_deleted
  and user_id = (select auth.uid())
  and not public.is_account_suspended((select auth.uid()))
  and not private.account_deletion_requested((select auth.uid()))
)
with check (
  not is_deleted
  and user_id = (select auth.uid())
  and private.can_write_post_to(locality_id, community_id, group_id)
  and not public.is_account_suspended((select auth.uid()))
  and not private.account_deletion_requested((select auth.uid()))
);

alter policy posts_delete_own on public.posts
using (
  not is_deleted
  and user_id = (select auth.uid())
  and not public.is_account_suspended((select auth.uid()))
  and not private.account_deletion_requested((select auth.uid()))
);

-- 2. Comments: mesmo veto, sem enfraquecer a checagem do post pai.
alter policy comments_update_own on public.comments
using (
  not is_deleted
  and user_id = (select auth.uid())
  and not public.is_account_suspended((select auth.uid()))
  and not private.account_deletion_requested((select auth.uid()))
)
with check (
  not is_deleted
  and user_id = (select auth.uid())
  and exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and private.can_write_post_to(p.locality_id, p.community_id, p.group_id)
  )
  and not public.is_account_suspended((select auth.uid()))
  and not private.account_deletion_requested((select auth.uid()))
);

alter policy comments_delete_own on public.comments
using (
  not is_deleted
  and user_id = (select auth.uid())
  and not public.is_account_suspended((select auth.uid()))
  and not private.account_deletion_requested((select auth.uid()))
);

-- 3. Groups: REVOKE no nível da tabela não remove grants por coluna; revogar
-- os dois explicitamente e regrantear só as colunas comuns. groups_update_owner,
-- guard_group_pinned_post e as RPCs definer continuam valendo.
revoke update on table public.groups from authenticated;
revoke update (
  community_id,
  created_by,
  description,
  is_deleted,
  locality_id,
  name,
  owner_user_id,
  pinned_post_id,
  rules,
  visibility
) on public.groups from authenticated;

grant update (name, description, visibility, rules, pinned_post_id)
  on public.groups to authenticated;
