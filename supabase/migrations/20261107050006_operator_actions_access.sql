-- RUN-024: a RLS usa o helper sem parâmetro já autorizado para authenticated.
-- is_current_user_operator(uuid) permanece exclusivo do servidor, sem enumeração de operadores.
alter policy operator_actions_select_operator on public.operator_actions
  using ((select private.is_operator()));

-- Trilha só de acréscimo, inclusive para o servidor e as fixtures locais.
revoke all on public.operator_actions from service_role;
grant select, insert on public.operator_actions to service_role;
