-- F04 (RUN-021): o E2E real cria e apaga as próprias fixtures locais com a
-- chave de serviço pelo PostgREST. A chave não tinha privilégio nessas
-- tabelas, então toda escrita de fixture voltava 403 e a falha só aparecia
-- como uma mensagem genérica de limpeza — 42501 "permission denied for table
-- groups" no CI do PR #153, nas três larguras.
--
-- Grants mínimos, um por operação da fixture: nada de acesso amplo. O `update`
-- alcança só a coluna de fixação (desafixar antes de apagar a publicação); o
-- `delete` cobre as tabelas de efeito que a própria fixture cria e as duas
-- raízes que ela precisa remover (publicação e grupo). Leitura já era
-- concedida em 20260821000016_grant_service_role_select_moderatable_content.
grant insert on table public.groups to service_role;
grant update (pinned_post_id) on table public.groups to service_role;
grant delete on table public.groups to service_role;

grant insert on table public.group_memberships to service_role;

grant delete on table public.posts to service_role;
grant delete on table public.notifications to service_role;
grant delete on table public.reports to service_role;
