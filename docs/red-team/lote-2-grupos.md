# Lote 2 — Red Team de Produto: Grupos (RT-12 a RT-16)

Auditoria realizada em 2026-08-10 contra o código atual. A régua é o contrato
C5 de `docs/red-team/camada-0-contratos.md`; F1-F14 de
`docs/red-team/lote-1-ancoras.md` não são repetidos. A rubrica das dez
dimensões foi aplicada, mas, conforme o recorte, este relatório registra apenas
onde houve falha.

---

## RT-12 — Descobrir grupo

### F60 · O detalhe ignora RLS e expõe membros de grupo privado por deep link

- **Promessa:** grupos públicos e privados têm metadata descobrível, mas a
  lista de membros e o conteúdo de um grupo privado exigem membership
  `approved`; grupos dentro de comunidade também respeitam o contêiner.
- **Comportamento:** depois de apenas confirmar que existe um usuário
  autenticado, o detalhe troca para o cliente com `SUPABASE_SERVICE_ROLE_KEY`.
  Busca o grupo somente por `id` e `is_deleted`, sem localidade/comunidade, e
  lê até dez memberships aprovadas com `profiles.display_name`, contornando
  todas as policies. Assim, um usuário autenticado com consentimento e um UUID
  conhecido pode abrir metadata fora de seu escopo e a lista de membros de um
  grupo privado; o join com `profiles` também contorna a visibilidade do perfil.
- **Evidência:** `apps/web/app/(shell)/groups/[id]/page.tsx:97-143`;
  `apps/web/lib/supabase/server.ts:4-17`;
  `supabase/migrations/20260802001000_groups_moderation.sql:122-128,158-174`;
  `supabase/migrations/20260805214709_community_scope.sql:329-343`.
- **Severidade:** P0.
- **Veredicto:** MODIFY — aplicar a identidade cookie-scoped do usuário às
  leituras ou expor uma RPC que devolva metadata/membros segundo C5; nunca usar
  `service_role` para montar esta tela.
- **Balde:** A — correção inequívoca de privacidade e autorização.

### F61 · A rota de detalhe existe, mas a lista não permite abri-la

- **Promessa:** a linha 5a/5d do MAP está “Corrigida” porque `/groups/[id]`
  entrega detalhe, membros e feed.
- **Comportamento:** cada resultado de `/groups` é um `<div>` sem `Link`,
  `href`, clique no título ou CTA “Ver grupo”. A única navegação encontrada
  para `/groups/${id}` é uma notificação de aprovação. Um grupo público recém-
  ingressado e um grupo já pertencente ao usuário continuam sem caminho normal
  da listagem para o detalhe. **[inferência por busca de referências a
  `/groups/${id}` no frontend]**
- **Evidência:** `apps/web/app/(shell)/groups/page.tsx:374-439`;
  `apps/web/app/(shell)/notifications/page.tsx:121-131`;
  `docs/journeys/MAP.md:247-250`.
- **Severidade:** P1.
- **Veredicto:** MODIFY — tornar nome/card um link real para o detalhe.
- **Balde:** A — destino existente com affordance ausente.

### F62 · “Buscar grupos” procura somente no nome

- **Promessa:** o campo genérico “Buscar grupos...” sugere busca sobre a
  informação visível do grupo.
- **Comportamento:** o filtro client-side compara apenas `group.name`; a
  descrição, embora renderizada no card, não participa. Não há categorias nem
  outro critério de descoberta. Grupos sem membros também aparecem, pois a
  consulta carrega todas as linhas de `groups` e não filtra por membership ou
  contagem.
- **Evidência:** `apps/web/app/(shell)/groups/page.tsx:166-178,331-336,374-390,511-523`.
- **Severidade:** P2.
- **Veredicto:** MODIFY — ou declarar “Buscar por nome”, ou incluir a descrição
  no filtro; não vender busca mais ampla que a implementada.
- **Balde:** A — alinhamento inequívoco entre label e comportamento.

---

## RT-13 — Entrar ou solicitar entrada

### F63 · A solicitação privada é criada, mas o próprio solicitante não consegue vê-la

- **Promessa:** “Solicitar” deve virar feedback persistente “Aguardando
  aprovação”.
- **Comportamento:** `join_group` cria corretamente a membership privada como
  `pending`, mas a policy de SELECT só mostra memberships privadas a membros
  já `approved`. Ao recarregar, a query do próprio usuário não recebe sua linha
  pendente; o branch “Aguardando aprovação” fica inalcançável na listagem e o
  botão volta a “Solicitar”. Cliques seguintes fazem `on conflict do nothing`
  e não produzem feedback novo.
- **Evidência:** `apps/web/app/(shell)/groups/page.tsx:172-178,223-239,394-409`;
  `supabase/migrations/20260802001000_groups_moderation.sql:158-174,272-304`;
  `supabase/tests/groups-public-private.sql:123-151`.
- **Severidade:** P1.
- **Veredicto:** MODIFY — tornar o estado pendente próprio observável sem abrir
  a lista privada, por policy own-row ou RPC de estado, e cobrir a transição na
  UI.
- **Balde:** A — incoerência objetiva entre estado persistido e feedback.

### F64 · Pedido pendente não pode ser cancelado e “rejeição” não fecha um ciclo

- **Promessa:** solicitar entrada implica um ciclo compreensível: aguardar,
  cancelar, ser aprovado ou saber que foi rejeitado e o que pode fazer depois.
- **Comportamento:** para `pending`, a UI oferece apenas um chip/disabled
  button; não há cancelar. Na gestão existe somente “Aprovar”; não há rejeitar
  ou remover o pedido. O enum possui apenas `pending|approved`, portanto uma
  rejeição teria de apagar a linha; não há notificação de rejeição. Se a linha
  for apagada por uma via externa, `join_group` permite solicitar de novo; se
  não for, fica pendente indefinidamente.
- **Evidência:** `apps/web/app/(shell)/groups/page.tsx:405-409,441-493`;
  `apps/web/app/(shell)/groups/[id]/page.tsx:172-175`;
  `supabase/migrations/20260802001000_groups_moderation.sql:22-25,202-222,313-346`;
  `supabase/migrations/20260802001400_personal_notifications.sql:102-135`.
- **Severidade:** P1.
- **Veredicto:** MODIFY — decidir se rejeição é estado auditável ou remoção e,
  em ambos os casos, fechar cancelamento, feedback e regra de nova tentativa.
- **Balde:** B — a semântica de rejeição e re-tentativa é decisão do dono.

---

## RT-14 — Criar grupo

### F65 · Qualquer verificado pode criar grupos ilimitados e homônimos

- **Promessa:** criação aberta a qualquer membro verificado precisa continuar
  útil sob abuso e não degradar a descoberta.
- **Comportamento:** a RPC verifica elegibilidade e cria owner atomicamente,
  mas a tabela só limita tamanho do nome/descrição. Não há unicidade por
  localidade/comunidade, quota, cooldown ou rate limit; a RPC também não faz
  nenhuma dessas verificações. **[inferência]** Um único membro verificado pode
  criar repetidamente grupos vazios com o mesmo nome, e todos entram na lista.
- **Evidência:** `supabase/migrations/20260802001000_groups_moderation.sql:29-41,226-255`;
  `apps/web/app/(shell)/groups/page.tsx:166-178,597-643`.
- **Severidade:** P1.
- **Veredicto:** MODIFY — definir proteção mínima contra duplicação e spam antes
  de ampliar o piloto.
- **Balde:** B — normalização de nome, quota e tratamento de homônimos exigem
  política de produto.

### F66 · A UI chama localidade de “comunidade” e não explica Grupo × Comunidade

- **Promessa:** Localidade, Comunidade e Grupo são entidades distintas: grupo
  pode ser top-level ou pertencer a uma comunidade, enquanto comunidade é uma
  subdivisão administrada separadamente.
- **Comportamento:** `/groups` chama o conjunto de “Grupos da sua comunidade” e
  diz que qualquer “membro da comunidade” entra em grupo público, mas o form
  envia `profileLocalityId` para `create_group` e nem modela `community_id`.
  Existe outra RPC, `create_group_in_community`, sem superfície. O usuário não
  consegue saber se “comunidade” é Manaus, um agrupamento intermediário ou um
  sinônimo de grupo.
- **Evidência:** `apps/web/app/(shell)/groups/page.tsx:23-32,202-208,502-509,563-584`;
  `supabase/migrations/20260805214709_community_scope.sql:17-23`;
  `supabase/migrations/20260805215419_community_rpcs.sql:231-274`;
  `docs/red-team/camada-0-contratos.md:76-92`.
- **Severidade:** P1.
- **Veredicto:** SPLIT — explicitar a hierarquia e decidir onde se criam grupos
  top-level versus grupos internos; até lá, corrigir a copy para “localidade”.
- **Balde:** B — a arquitetura e nomenclatura de produto dependem do dono.

---

## RT-15 — Administração do grupo

### F67 · As três server actions do detalhe não recebem a sessão do usuário

- **Promessa:** no detalhe, membro entra/sai e owner transfere ownership.
- **Comportamento:** `joinGroupAction`, `leaveGroupAction` e
  `transferOwnershipAction` criam diretamente o cliente de `service_role` e
  chamam `auth.getUser()` nele. Esse cliente não recebe cookies nem access
  token e tem `persistSession: false`; portanto não representa o usuário da
  request e cai em `unauthenticated`. **[inferência estática]** Além disso, o
  join aceita `desiredStatus` vindo de input hidden e faz `upsert` privilegiado
  em vez de chamar `join_group`; uma correção que apenas injete autenticação
  permitiria adulterar `pending` para `approved` em grupo privado.
- **Evidência:** `apps/web/app/(shell)/groups/[id]/page.tsx:17-86`;
  `apps/web/lib/supabase/server.ts:4-17`;
  `supabase/migrations/20260802001000_groups_moderation.sql:270-304`.
- **Severidade:** P1.
- **Veredicto:** MODIFY — autenticar com o cliente cookie-scoped e delegar join
  à RPC, que deriva status da visibilidade no servidor; não confiar em
  `desiredStatus` do formulário.
- **Balde:** A — fluxo quebrado e fronteira de autorização objetivamente errada.

### F68 · Administração está fragmentada e não oferece remoção, rejeição ou exclusão

- **Promessa:** owner/moderator administram membros e o owner resolve sucessão
  ou encerramento do grupo.
- **Comportamento:** owner e moderator recebem o mesmo painel na listagem para
  aprovar, promover e rebaixar; transferência aparece só no detalhe e está
  quebrada por F67. Não existe UI para rejeitar pedido, remover membro ou
  excluir grupo. O banco tem policy genérica para moderador apagar membership;
  para grupo, existe policy de delete do owner, mas não há `DELETE` grant a
  `authenticated`, então exclusão não é sequer uma capacidade client-side
  utilizável. A gestão fica dividida entre duas telas sem caminho entre elas.
- **Evidência:** `apps/web/app/(shell)/groups/page.tsx:192-193,428-496`;
  `apps/web/app/(shell)/groups/[id]/page.tsx:211-235`;
  `supabase/migrations/20260802001000_groups_moderation.sql:149-154,217-222,313-505`;
  `supabase/migrations/20260802001000_groups_moderation.sql:64-71`.
- **Severidade:** P1.
- **Veredicto:** MODIFY — decidir o conjunto mínimo de gestão e reuni-lo em uma
  superfície coerente, com permissões diferentes quando owner e moderator não
  forem equivalentes.
- **Balde:** B — remoção, rejeição e encerramento são escolhas de governança do
  produto.

### F69 · O owner pode apagar a própria membership e deixar o grupo sem governança

- **Promessa:** sucessão ocorre por transferência de ownership; o grupo sempre
  mantém um owner operacional.
- **Comportamento:** o detalhe testa `isApproved` antes de `isOwner`, então
  mostra “Sair” também ao owner. A action apaga a membership sem exigir
  transferência. Mesmo com F67 bloqueando essa action hoje, a policy e o grant
  de `group_memberships` permitem que o owner apague a própria linha via Data
  API; `groups.owner_user_id` permanece apontando para ele, mas
  `private.is_group_owner` deixa de reconhecê-lo. **[inferência a partir das
  constraints/policies]** O grupo fica sem alguém capaz de transferir ownership.
- **Evidência:** `apps/web/app/(shell)/groups/[id]/page.tsx:46-61,148-170`;
  `supabase/migrations/20260802001000_groups_moderation.sql:43-50,70-71,202-207,430-478`.
- **Severidade:** P1.
- **Veredicto:** MODIFY — bloquear saída/delete da membership owner até uma
  transferência válida e preservar o invariante no banco, não só na UI.
- **Balde:** A — invariante de integridade inequívoco.

### F70 · Transferência só enxerga dez membros sem ordenação

- **Promessa:** o owner transfere ownership para qualquer membro aprovado.
- **Comportamento:** a consulta de membros aplica `.limit(10)` sem ordenação; o
  `<select>` é construído exclusivamente com esse recorte. Em grupos maiores,
  membros aprovados elegíveis ficam arbitrariamente ausentes.
- **Evidência:** `apps/web/app/(shell)/groups/[id]/page.tsx:136-143,211-234`;
  `supabase/migrations/20260802001000_groups_moderation.sql:471-479`.
- **Severidade:** P2.
- **Veredicto:** MODIFY — carregar candidatos de transferência por busca ou
  paginação, sem usar o preview de membros como lista administrativa completa.
- **Balde:** A — capacidade prometida é truncada por implementação.

---

## RT-16 — First-use do grupo

### F71 · “0 de 3 passos” é decoração gamificada, não estado rastreado

- **Promessa:** a barra comunica progresso do usuário em três passos de
  onboarding do grupo.
- **Comportamento:** `ProgressBar` recebe literalmente `value={0}` e a copy é
  fixa em “0 de 3”; o bloco exibe somente dois cartões. Não existe leitura ou
  escrita de progresso: ele nasce de `recentlyJoinedGroupId` em memória após o
  join público e desaparece ao fechar/recarregar. A busca no frontend não
  encontrou outra referência a esse onboarding.
- **Evidência:** `apps/web/app/(shell)/groups/page.tsx:57-107,119-120,223-233,351-356,527-531`.
- **Severidade:** P1.
- **Veredicto:** REMOVE — retirar contagem/barra até haver passos reais e
  rastreados; manter, no máximo, orientação editorial sem falsa progressão.
- **Balde:** B — REMOVE de feature é decisão do dono do produto.

### F72 · O first-use manda publicar, mas não existe criação de post no grupo

- **Promessa:** “Compartilhe — Publique sua primeira mensagem” é uma próxima
  ação realizável após entrar.
- **Comportamento:** o cartão não é link nem botão. O detalhe só renderiza
  posts existentes e não monta composer. O modal de criação usado no feed
  aceita apenas `localityId` e insere `locality_id`, sem `group_id`; não foi
  encontrada outra inserção group-scoped no frontend. **[inferência por busca
  de `group_id` nas inserções do app]**
- **Evidência:** `apps/web/app/(shell)/groups/page.tsx:82-97`;
  `apps/web/app/(shell)/groups/[id]/page.tsx:239-252`;
  `apps/web/app/components/bivaque/feed-post.tsx:508-513,556-623`.
- **Severidade:** P1.
- **Veredicto:** MODIFY — implementar publicação group-scoped e transformar a
  sugestão em CTA, ou remover a promessa até a ação existir.
- **Balde:** A — affordance/promise sem caminho funcional.

### F73 · “Salvar” e “Ocultar publicação” são affordances inertes no detalhe

- **Promessa:** bookmark e menu de uma publicação permitem salvar ou ocultar o
  item.
- **Comportamento:** o detalhe instancia `FeedPost` com
  `isBookmarked={false}`, mas sem `onBookmarkToggle` e sem `onHide`. No
  componente, o bookmark e os itens de menu apenas chamam esses callbacks
  opcionais. Portanto o clique em salvar/ocultar não faz nada e o estado nunca
  muda. Compartilhar e comentar têm handlers e não entram neste finding.
- **Evidência:** `apps/web/app/(shell)/groups/[id]/page.tsx:243-247`;
  `apps/web/app/components/bivaque/feed-post.tsx:58-103,119-129,297-316`.
- **Severidade:** P1.
- **Veredicto:** REMOVE — ocultar os controles quando os callbacks não existem,
  ou MODIFY passando implementações reais; botão morto não pode permanecer.
- **Balde:** A — affordance fraud com resposta inequívoca.

### F74 · O detalhe mascara falha do feed como “Nenhuma publicação ainda”

- **Promessa:** o detalhe mostra `feed_group` respeitando o escopo, como afirma
  a linha 5d do MAP.
- **Comportamento:** a RPC é chamada pelo cliente de `service_role`, sem a
  identidade cookie-scoped. `feed_group` exige
  `private.is_locality_member(...)` e usa `auth.uid()` para membership/reação;
  com o JWT de serviço, não há `auth.uid()` do usuário. **[inferência
  estática]** O resultado tende a ser vazio mesmo para membro aprovado. A tela
  ignora o campo `error` da RPC e transforma qualquer falha/negação em
  `feed=[]`, exibindo “Nenhuma publicação ainda”, uma conclusão factual falsa.
- **Evidência:** `apps/web/app/(shell)/groups/[id]/page.tsx:113-146,239-251`;
  `apps/web/lib/supabase/server.ts:4-17`;
  `supabase/migrations/20260805215020_community_feeds.sql:173-239`;
  `docs/journeys/MAP.md:250`.
- **Severidade:** P1.
- **Veredicto:** MODIFY — executar a RPC com o JWT do usuário e tratar erro
  separadamente de empty state.
- **Balde:** A — falso vazio e identidade de autorização incorreta.

---

## Placar do lote

| Balde | Findings | Total |
|---|---|---:|
| A — correção inequívoca | F60, F61, F62, F63, F67, F69, F70, F72, F73, F74 | 10 |
| B — decisão do dono | F64, F65, F66, F68, F71 | 5 |

| Severidade | Findings | Total |
|---|---|---:|
| P0 | F60 | 1 |
| P1 | F61, F63-F69, F71-F74 | 12 |
| P2 | F62, F70 | 2 |
