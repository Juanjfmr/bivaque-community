-- RUN-024: a RLS usa o helper sem parâmetro já autorizado para authenticated.
-- is_current_user_operator(uuid) permanece exclusivo do servidor, sem enumeração de operadores.
alter policy operator_actions_select_operator on public.operator_actions
  using ((select private.is_operator()));

-- Manutenção pelo servidor e limpeza de fixtures locais, nunca escrita pela sessão de membro.
revoke all on public.operator_actions from service_role;
grant select, insert, delete on public.operator_actions to service_role;
