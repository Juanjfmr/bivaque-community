-- A apresentação da comunidade deixa de ser privilégio de quem mora na cidade.
--
-- Decisão do dono em 15/09/2026: "não vejo problemas de revelar o nome ou o
-- estado da comunidade, a plataforma não trata de nada sigiloso ou secreto".
-- É ela que destrava o painel 1 da prancha 60 ("Você ainda não tem acesso a
-- esta comunidade"), que existia como componente e não podia existir como
-- instância: sem linha lida, a página só sabia dizer 404.
--
-- O que continua fechado, e é o que importa: PARTICIPAR. O pedido de entrada
-- passa por public.request_community_membership, que exige
-- private.is_locality_member da cidade da comunidade; o conteúdo (feed,
-- grupos, roster, pedidos) tem policies próprias e não é alcançado por esta.
--
-- `is_deleted = false` permanece: comunidade apagada não é estado, é ausência.
drop policy communities_select_locality_member on public.communities;

create policy communities_select_authenticated
on public.communities
for select
to authenticated
using (is_deleted = false);
