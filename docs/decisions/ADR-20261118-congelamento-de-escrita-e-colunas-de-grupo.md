# ADR-20261118-congelamento-de-escrita-e-colunas-de-grupo

Status: Aceito por delegação — aguarda ratificação

Data: 18/11/2026

## Contexto

A auditoria de autorização de 13/11 (PR #213, rascunho, `docs/security/refatoracao-autorizacao-auditoria-20261113.md`
naquele branch) apontou dois P0 por leitura de catálogo. Em 18/11 os dois foram reproduzidos em
Supabase local zerado, na `main` `0ef76ed7`, pelos testes pgTAP do #213: 6 asserções vermelhas,
o resto da suíte verde.

- **AUTHZ-001.** O [ADR-20260901-account-suspension](ADR-20260901-account-suspension.md) diz que
  suspensão bloqueia toda escrita de conteúdo, com leitura preservada. As policies de INSERT de
  `posts` e `comments` vetam conta suspensa e conta com pedido de exclusão; as de UPDATE e DELETE
  (versão de `20261019222259`) não. Uma conta suspensa editava e apagava o próprio post e comentário
  pela Data API. A migration de 06/11 (`20261106141329`) corrigiu só o INSERT de perguntas.
- **AUTHZ-002.** A migration `20261107093000_grupos_cidade_padrao` regranteou UPDATE em `groups` com
  `owner_user_id`, `created_by`, `locality_id`, `community_id` e `is_deleted`. A policy
  `groups_update_owner` decide a linha, não a coluna: o dono trocava titularidade e autoria por
  UPDATE direto, sem a RPC `transfer_group_ownership` e seus vetos.

## Decisão

1. As policies `posts_update_own`, `posts_delete_own`, `comments_update_own` e
   `comments_delete_own` passam a exigir `not public.is_account_suspended((select auth.uid()))` e
   `not private.account_deletion_requested((select auth.uid()))`, em `USING` e em `WITH CHECK`. Autoria,
   soft delete e escopo de escrita ficam como estavam. Suspensão vencida (`expires_at` no passado)
   não congela, porque o helper já a ignora.
2. O UPDATE de `authenticated` em `groups` fica só em `name`, `description`, `visibility`, `rules` e
   `pinned_post_id`. Titularidade muda pela `transfer_group_ownership`; exclusão pela `delete_group`;
   `is_default` pela `set_group_default`. `community_id` (legado), `locality_id`, `created_by`,
   `owner_user_id` e `is_deleted` não são mais escritas pela Data API.
3. A mudança vai numa migration nova, `20261118030820_authz_write_freeze_and_group_columns`, gerada
   pela CLI; nenhuma migration aplicada é editada.

## Consequências

- A recusa do soft delete direto de grupo passa de P0001 (trigger `block_soft_delete_groups`) para
  42501 (privilégio de coluna). O trigger continua como segunda barreira; `reports-denials.sql`
  passa a esperar 42501.
- Nenhuma tela grava as colunas retiradas: a web antiga exclui e transfere grupo pelas RPCs, e a
  rota do app `grupos/publicacoes/[id]/acoes` grava direto só `pinned_post_id`, que continua no grant.
- Sob RLS o UPDATE recusado pelo `USING` volta sem erro e com zero linhas. A edição de publicação da
  web antiga (`feed-post-edit.tsx`) passa a pedir a linha de volta e trata zero linhas como falha,
  para a conta congelada não ver "Alterações salvas".
- Conta com pedido de exclusão também deixa de editar e apagar o próprio conteúdo enquanto o pedido
  existir, coerente com o INSERT. Cancelar o pedido devolve a escrita.
- Suspensão sem prazo tira do titular o meio de apagar sozinho o próprio conteúdo público; o
  caminho é o suporte, como no ADR-20260914 (conteúdo público permanece depois da exclusão).
- A mesma falta de veto no UPDATE/DELETE existe em `recommendation_requests`,
  `recommendation_replies`, `listings`, `listing_photos`, `events` e em `groups`/`create_group`
  (auditoria de 18/11). Não é introduzida nem piorada aqui; segue no cartão AUTHZ-006.
- Fora deste ADR, ficam no relatório de 13/11: AUTHZ-003 (policy duplicada em `post_reactions`),
  AUTHZ-004 (grants de RPC definer a `anon`) e AUTHZ-005 (inventário por camada).

## Provas

- `supabase/tests/authz-suspension-write-freeze.sql` (20 asserções): ativo edita e apaga, suspenso
  lê mas não edita nem apaga post e comentário, suspensão vencida volta a editar e apagar, pedido de
  exclusão congela as quatro escritas e preserva a leitura, e
  cancelar o pedido devolve a escrita.
- `supabase/tests/authz-group-sensitive-columns.sql` (15 asserções): privilégios de coluna (retiradas e mantidas), dono edita
  nome, dono não troca `owner_user_id`, `created_by` nem `locality_id`, moderador não administra nem
  se promove.
- `test:db` completo: 184 arquivos, 2.996 asserções, PASS; `db:lint` sem achados.
