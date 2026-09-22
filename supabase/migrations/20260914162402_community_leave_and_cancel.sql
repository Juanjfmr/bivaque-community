-- Saída da comunidade e cancelamento do próprio pedido
-- (ADR-20260914-saida-de-comunidade, aprovado em 14/09/2026).
--
-- Duas ações do titular sobre a PRÓPRIA linha de community_memberships:
--   leave_community          — apaga a linha aprovada de quem sai;
--   cancel_community_request — apaga a linha pendente de quem desistiu.
--
-- A cascata não mora aqui: o trigger after delete (D7, 20260805214709)
-- transfere grupos do saído ao dono da comunidade, remove os group_memberships
-- dele e recusa a remoção do dono com "transfer community ownership before
-- removing the owner". Este RPC depende desse trigger de propósito: uma regra
-- duplicada aqui divergiria dele com o tempo.
--
-- Escrita nenhuma para authenticated: a tabela segue só-leitura para o cliente
-- e toda mutação passa por RPC security definer com auth.uid() resolvido no
-- servidor (o chamador real é o membro autenticado — não há service_role nesta
-- porta, ao contrário dos RPCs de moderação com p_caller_user_id).

create function public.leave_community(p_community_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.community_memberships
  where community_id = p_community_id
    and user_id = (select auth.uid())
    and status = 'approved';
end;
$$;

revoke all on function public.leave_community(uuid) from public;
revoke all on function public.leave_community(uuid) from anon;
grant execute on function public.leave_community(uuid) to authenticated;

create function public.cancel_community_request(p_community_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.community_memberships
  where community_id = p_community_id
    and user_id = (select auth.uid())
    and status = 'pending';
end;
$$;

revoke all on function public.cancel_community_request(uuid) from public;
revoke all on function public.cancel_community_request(uuid) from anon;
grant execute on function public.cancel_community_request(uuid) to authenticated;
