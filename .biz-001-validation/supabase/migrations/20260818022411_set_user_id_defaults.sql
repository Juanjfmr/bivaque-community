-- set_user_id_defaults: user_id passa a ter default auth.uid() nas três
-- superfícies de conteúdo escritas pelo cliente.
--
-- O UI cria post, comentário e reação sem enviar user_id (feed-post.tsx:
-- handleSubmit / handleAddComment / handleReaction), contando com um default
-- que nunca existiu. As três colunas são `not null`, então o INSERT era
-- rejeitado pela RLS (`user_id = auth.uid()` avalia null -> false) — o
-- "Publicar" falhava com "new row violates row-level security policy".
--
-- A policy já exige user_id = auth.uid(); o default torna a coluna
-- auto-preenchida pelo servidor, fechando o caminho de escrita e ficando
-- como defesa em profundidade para qualquer cliente futuro que omita a coluna.

alter table public.posts
  alter column user_id set default auth.uid();

alter table public.comments
  alter column user_id set default auth.uid();

alter table public.post_reactions
  alter column user_id set default auth.uid();
