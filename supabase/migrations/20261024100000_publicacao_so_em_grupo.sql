-- Publicação só dentro de um grupo (lote 5, tarefa N2, ADR-20261023-comunidade-do-prototipo).
--
-- O protótipo não tem feed da cidade: na cidade há perguntas e respostas
-- (Indicações), e publicar existe só dentro de um grupo. A tela acompanha — o
-- compositor deixa de oferecer as audiências cidade e vila — e o BANCO é quem
-- recusa, para que nenhum outro caminho (RPC antiga, compositor de outra tela,
-- chamada direta ao PostgREST) reintroduza a publicação solta.
--
-- A recusa é da POLICY de insert, não de um CHECK na tabela: o seed de
-- desenvolvimento carrega publicações antigas de cidade (`group_id is null`) e
-- um CHECK derrubaria o `db reset` com seed. A policy vale para o papel
-- `authenticated`; o seed escreve como postgres, que não passa por RLS.
--
-- `community_id` continua podendo vir junto de `group_id` (é o vínculo de
-- "também perguntar à cidade", do C2). O que a policy exige é que a publicação
-- tenha um grupo. O escopo de escrita continua sendo o de sempre
-- (`private.can_write_post_to`): membro ativo da localidade e membro do grupo
-- (ou grupo Aberto da cidade), e nunca conta suspensa.

drop policy if exists posts_insert_locality_member on public.posts;
create policy posts_insert_locality_member
on public.posts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  -- A regra deste lote: sem grupo não há publicação. `community_id` sozinho
  -- (publicação de vila) e os dois nulos (publicação de cidade inteira) caem
  -- aqui, na mesma cláusula.
  and group_id is not null
  and private.can_write_post_to(locality_id, community_id, group_id)
  and not public.is_account_suspended(auth.uid())
);