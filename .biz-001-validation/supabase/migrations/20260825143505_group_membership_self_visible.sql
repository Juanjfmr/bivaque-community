-- O pedido pendente do próprio usuário era invisível para ele em grupo privado.
--
-- `group_memberships_select` (20260802001000) só expunha uma linha quando o
-- grupo é público ou o chamador é membro APROVADO (`private.is_group_member`,
-- que filtra status = 'approved'). Efeito em runtime: quem pedia entrada num
-- grupo privado ficava pending no banco, mas a página do grupo não via a
-- própria linha — renderizava "Pedir entrada" de novo em vez de "Aguardando
-- aprovação" + "Cancelar pedido" (F8). O clique seguinte batia no conflito de
-- unique e o ciclo do pedido nunca fechava para o solicitante.
--
-- O conserto é a regra mínima de self-visibility: cada um vê a PRÓPRIA linha,
-- em qualquer status, sem expor linha alheia nenhuma. A visibilidade entre
-- membros continua exatamente como era (público ou aprovado no grupo).

drop policy group_memberships_select on public.group_memberships;

create policy group_memberships_select
on public.group_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.groups g
    where g.id = group_memberships.group_id
      and (
        g.visibility = 'public'
        or private.is_group_member(g.id)
      )
  )
);
