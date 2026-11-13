-- AUTHZ-001 + AUTHZ-002 — PROPOSTA R3 / NAO E MIGRATION APLICADA.
-- NÃO executar em banco remoto.
-- Mover para migration NOVA gerada via CLI pinado apenas DEPOIS de:
--   1) reproduzir testes RED em banco local limpo;
--   2) aprovar contratos/ADR R3 (suspensão, exclusão e transferência);
--   3) confirmar consumidores de UPDATE direto e RPCs;
--   4) executar testes GREEN e revisão independente.
--
-- Comandos no checkout isolado do Bivaque:
--   npx pnpm@11.18.0 exec supabase migration new authz_write_freeze_and_group_columns
--   # copiar SQL revisado para arquivo GERADO pelo CLI em supabase/migrations/
--   npx pnpm@11.18.0 exec supabase db reset --local --no-seed
--   npx pnpm@11.18.0 exec supabase test db
--
-- NÃO alterar migrations históricas ou gravar no projeto conectado.
-- Preserva os critérios de autoria, visibilidade, escopo e soft-delete existentes.

-- 1. Posts: suspensão / exclusão de conta também proíbem UPDATE.
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

-- 3. Groups: remover grants de UPDATE nas colunas de identidade,
-- titularidade e localidade. Transferência usa RPC definer existente.
--
-- IMPORTANTE: REVOKE UPDATE ON TABLE NÃO REMOVE NECESSARIAMENTE GRANTS
-- por coluna. Revogar ambos de forma explícita.
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

-- Só colunas comuns, mantida a policy groups_update_owner,
-- guard_group_pinned_post e os RPCs de transferência.
grant update (name, description, visibility, rules, pinned_post_id)
  on public.groups to authenticated;

-- Guardas posteriores à aplicação (consultas de catálogo):
-- SELECT has_column_privilege('authenticated','public.groups','owner_user_id','UPDATE'); -- false
-- SELECT has_column_privilege('authenticated','public.groups','locality_id','UPDATE');    -- false
-- SELECT has_column_privilege('authenticated','public.groups','created_by','UPDATE');    -- false
-- Confirmar que funções SECURITY DEFINER continuam protegidas por autorizações
-- explícitas e não usam identidade de p_user_id no lugar de auth.uid().
