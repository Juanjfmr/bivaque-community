# R2 — Matriz de permissão: publicações

Rascunho para aprovação do dono. Estados e atores seguem `R2-comum.md`; o grupo fornece o escopo e a visibilidade às publicações. Publicação é sempre vinculada a um grupo. Grupo Aberto: membros verificados da cidade podem ler; Fechado: somente participantes; Encerrado: participantes anteriores leem, sem interação. “Outra cidade” não recebe acesso por mudar filtro ou URL. Conteúdo moderado como removido não volta por ação do autor; denúncia continua permitida mesmo quando o conteúdo está oculto/bloqueado.

## 1. Objetos do grupo

`posts`, `comments`, `post_reactions` (“Útil”), `post_saves`, `post_follows` e a tabela nova `hidden_posts` (sem regra R1). `events` e respostas a eventos ficam no rascunho de evento/pergunta. Enquete, Oferta, ordenação por “Útil” e seus efeitos ficam fora desta matriz conforme ADR-20261023 §4 e ADR-20261024 §9.

## 2. Matriz por objeto

Quando uma célula marca `A/F`, a ação é negada em `E`; `idem` repete a célula equivalente imediatamente à esquerda. Célula sem abreviação de estado vale nos três estados apenas quando a ação independe de ler ou interagir com uma publicação específica (por exemplo, retirar vínculo próprio).

Nas células, `A/F/E` indica o resultado em Aberto/Fechado/Encerrado; a condição após `se` vale nos estados indicados. Moderar conteúdo continua exclusivo do operador, com a capacidade de moderação pertinente; papel de grupo não concede acesso operacional. Suspensão e exclusão aberta negam criação/interação. Operador preserva acesso administrativo e de evidência conforme autorização de operação.

### `posts`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler | A/F: sim; E: sim se participava | A/F: sim; E: sim se participava | A/F: sim; E: sim se participava | E: sim se participava | A/F/E: não | A: sim; F/E: não | A/F/E: não | A/F: sim se tem leitura; E: sim se participava | A/F: sim se tem leitura; E: sim se participava | sim, para operação autorizada | não |
| criar | A/F: sim | A/F: sim | A/F: sim | não | não | A/F/E: não | A/F/E: não | não | não | não como operador; ato com identidade de membro segue as mesmas regras | não |
| editar | A/F: sim se autor | A/F: sim se autor | A/F: sim se autor | não | não | não | não | não | não | não como autor; moderação não altera autoria | não |
| excluir própria | A/F: sim se autor e não removida pela moderação | A/F: sim se autor e não removida pela moderação | A/F: sim se autor e não removida pela moderação | não | não | não | não | não | não | não | não |
| moderar/remover | não | não | não | não | não | não | não | não | não | sim se operador autorizado; preservar evidência | não |
| fixar/desafixar | A/F: sim se autorização de dono | A/F: sim se autorização de moderador | não | não | não | não | não | não | não | sim se operador autorizado | não |
| ocultar para mim / mostrar | sim | sim | sim | sim se ainda tem leitura | sim se lê a publicação | sim se a publicação é legível | não | sim se a publicação é legível | sim se a publicação é legível | não como operador | não |
| denunciar | A/F/E: sim se consegue identificar o conteúdo | A/F/E: sim se consegue identificar o conteúdo | A/F/E: sim se consegue identificar o conteúdo | E: sim se consegue identificar o conteúdo | sim se consegue identificar o conteúdo | A: sim se consegue identificar o conteúdo | não | sim se consegue identificar o conteúdo | sim se consegue identificar o conteúdo | não como denunciante | não |

### `comments`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler | A/F: sim; E: sim se participava | A/F: sim; E: sim se participava | A/F: sim; E: sim se participava | E: sim se participava | A/F/E: não | A: sim; F/E: não | A/F/E: não | A/F: sim se tem leitura; E: sim se participava | A/F: sim se tem leitura; E: sim se participava | sim, para operação autorizada | não |
| criar | A/F: sim | A/F: sim | A/F: sim | não | não | A/F/E: não | A/F/E: não | não | não | não como membro | não |
| editar próprio | A/F: sim se autor e não removido | A/F: sim se autor e não removido | A/F: sim se autor e não removido | não | não | não | não | não | não | não como autor; moderação é ação separada | não |
| excluir próprio | A/F: sim se autor e não removido | A/F: sim se autor e não removido | A/F: sim se autor e não removido | não | não | não | não | não | não | não como autor | não |
| moderar/remover | não | não | não | não | não | não | não | não | não | sim se operador autorizado; preservar evidência | não |
| denunciar | A/F/E: sim se consegue identificar o comentário | idem | idem | E: sim se consegue identificar | sim se consegue identificar | A: sim se consegue identificar | não | sim se consegue identificar | sim se consegue identificar | não como denunciante | não |

### `post_reactions` (“Útil”)

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler/contagem | A/F: sim se lê a publicação; E: sim se participava | idem | idem | E: sim se participava | não | A: sim; F/E: não | não | A/F: sim se tem leitura; E: sim se participava | A/F: sim se tem leitura; E: sim se participava | sim, para operação autorizada | não |
| reagir | A/F: sim, uma reação própria por publicação | idem | idem | não | não | A/F/E: não | não | não | não | não como membro | não |
| retirar própria reação | A/F: sim se é sua | idem | idem | não | não | não | não | não | não | não como membro | não |

### `post_saves`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler lista própria | sim; somente suas publicações salvas ainda legíveis | idem | idem | idem, se ainda legíveis | não | A: sim, somente itens legíveis salvos pela própria pessoa | não | sim, somente itens legíveis salvos pela própria pessoa | sim, somente itens legíveis salvos pela própria pessoa | não como operador | não |
| salvar | A/F: sim se pode ler e interagir com a publicação | idem | idem | não | não | A: sim se pode ler e interagir; F/E: não | não | não | não | não como membro | não |
| remover dos salvos | sim se é seu vínculo | idem | idem | sim se é seu vínculo | não | sim se é seu vínculo | não | sim se é seu vínculo | sim se é seu vínculo | não | não |

### `post_follows`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler lista própria | sim, sem revelar vínculos de outras pessoas | idem | idem | idem | não | sim, somente os próprios vínculos | não | sim, somente os próprios vínculos | sim, somente os próprios vínculos | não como operador | não |
| seguir | A/F: sim se pode ler e interagir com a publicação | idem | idem | não | não | A: sim se pode ler e interagir; F/E: não | não | não | não | não como membro | não |
| deixar de seguir | sim se é seu vínculo | idem | idem | sim se é seu vínculo | não | sim se é seu vínculo | não | sim se é seu vínculo | sim se é seu vínculo | não | não |

### `hidden_posts`

Vínculo pessoal `(user_id, post_id)`, sem ocultar para outras pessoas nem retirar a publicação do servidor. Quem ocultou deixa de vê-la nas listas e pode restaurar pela lista “Ocultados”; detalhe direto pode mostrar aviso neutro e ação “Mostrar”, respeitando a autorização de leitura. Grupo encerrado, publicação removida ou bloqueio não são contornados por “Mostrar”. Denunciar não consulta a ocultação. Recomendação: chave primária composta, FK com cascata, RLS habilitada e forçada; `SELECT/INSERT/DELETE` apenas pelo próprio usuário e `INSERT` condicionado à leitura autorizada. Sem `UPDATE` direto.

## 3. Permissão por coluna

- `posts.user_id`, `group_id`, `locality_id`, `id`, `created_at` e `post_type` não são alteráveis pelo autor após criar. Publicação não troca nem perde grupo. `content`, `photo_path` e `link_url` só podem ser editados pelo autor enquanto não moderados; conteúdo removido não pode ser restaurado pelo autor. `poll_options` não tem uso nesta leva; confirmar a remoção do campo junto à pergunta sobre enquete. `is_deleted` não é editável pelo autor; operador autorizado mantém a trilha de moderação/evidência.
- `comments.user_id`, `post_id`, `id`, `created_at` e `is_deleted` não são editáveis pelo autor. Só `content` pode ser alterado pelo autor em comentário não removido e em grupo que aceita interação. Moderador de grupo não ganha permissão implícita de modificar conteúdo alheio; remoção é moderação operacional autorizada.
- `post_reactions.user_id` / `post_id`, `post_saves.user_id` / `post_id` e `post_follows.user_id` / `post_id` são identidade do vínculo, sem `UPDATE`; usuário cria/exclui somente vínculo próprio. Não expor a identidade dos reagentes ou seguidores por acesso direto ao objeto; feeds podem devolver apenas contagem e a reação/seguimento da sessão atual, sob leitura autorizada.
- `hidden_posts` só revela ao próprio usuário sua ocultação e metadados necessários para desfazer. A política do vínculo não substitui a política de leitura de `posts`.
- Gravação/moderação por serviço fica limitada às colunas necessárias e a função autorizada. Grants não substituem RLS nem autorização por ação.

## 4. Transições

- `posts`: criação exige `group_id` existente e participação ativa, grupo Aberto ou Fechado, conta não suspensa e sem exclusão aberta. `locality_id` acompanha a cidade do grupo. `community_id` sai. `post_type` não pode trocar; a composição de anexo continua coerente com os CHECKs. Autor edita somente conteúdo editável; nunca autoria, horário, localidade ou grupo. O autor pode excluir a própria publicação conforme o protótipo; conteúdo removido pela moderação não pode ser ressuscitado. Encerrado é só leitura para antigos participantes e não aceita criação/edição/reação/comentário/salvamento/seguimento novo.
- `comments`: criados apenas por participante ativo em publicação não removida, legível e que aceita interação. `post_id` e `user_id` são imutáveis; autor edita ou exclui o próprio comentário, nunca um comentário alheio; edição não restaura remoção de moderação. Conteúdo removido por autor/operador mantém o marcador necessário ao fluxo e evidência operacional.
- `post_reactions`, `post_saves`, `post_follows`: só inserção/exclusão do vínculo da sessão; unicidade impede reações/seguimentos duplicados conforme chave. Salvamento/seguimento/reação não tornam publicação legível nem ativa. Ao apagar publicação/conta, FKs/cascata ou finalização autorizada limpam vínculos dependentes.
- `hidden_posts`: somente criar/remover vínculo próprio; não muda publicação nem visibilidade para terceiros.
- Nenhuma transição direta altera papel/status de grupo ou repõe conteúdo moderado. Os atos do operador são auditáveis. Duração de retenção da publicação/comentário excluído pelo autor e restauração operacional após recurso ainda precisam de decisão do dono.

## 5. Bloqueio

As leituras de feed, detalhe, comentários, reações/contagens, salvos, seguidos, perfil e atividade consultam `private.block_allows(actor, author, 'ler')`, propagando a filtragem aos dados agregados e prévias. Criar comentário usa `comentar`; reagir usa `reagir`; notificações de publicação/comentário usam `notificar` para cada destinatário. Salvar/seguir são ações sobre conteúdo: recomendação é consultar `ler` e `reagir` antes de criar vínculo. Excluir vínculo próprio, editar/excluir o próprio conteúdo e denunciar não chamam bloqueio; denúncia permanece disponível a quem bloqueou. “Ver mesmo assim” só é parâmetro do detalhe por quem bloqueou, não concede escrita, agregação nem notificação. Operador não é afetado. `notify_group_post`, `notify_group_pin` e `notify_comment` devem filtrar cada destinatário antes de enfileirar; o worker/outbox deve conferir novamente antes de envio. Corpo da função de bloqueio continua `true` nesta leva.

## 6. Regras do retrato

| ID | objeto | o que protege, em uma linha | decisão | motivo |
|---|---|---|---|---|
| R1-013 | comments.content | conteúdo textual do comentário | mantida | Campo continua necessário ao comentário; limites ficam como contrato atual até pergunta sobre o protótipo. |
| R1-014 | comments.created_at | data de criação | mantida | Metadado necessário à ordenação e contexto; não editável pelo usuário. |
| R1-015 | comments.id | identidade do comentário | mantida | Identidade estável necessária a detalhe, edição, denúncia e moderação. |
| R1-016 | comments.is_deleted | estado de remoção | mantida | Preserva soft delete, evidência de moderação e exclusão sem ressuscitar conteúdo. |
| R1-017 | comments.post_id | vínculo comentário-publicação | mantida | Comentário pertence à publicação e segue a autorização dela. |
| R1-018 | comments.user_id | autoria | mantida | Autoria não pode ser falsificada nem transferida. |
| R1-132 | post_follows.created_at | data do vínculo | mantida | Metadado necessário; sem permissão de alteração pelo usuário. |
| R1-133 | post_follows.post_id | publicação seguida | mantida | Vínculo segue sujeito à leitura autorizada da publicação. |
| R1-134 | post_follows.user_id | dono do vínculo | mantida | Limita vínculo à sessão e impede seguir em nome de terceiro. |
| R1-135 | post_reactions.created_at | data da reação | mantida | Metadado necessário; não editável pelo usuário. |
| R1-136 | post_reactions.id | identidade da reação | mantida | Mantém identidade estável do registro. |
| R1-137 | post_reactions.post_id | publicação reagida | mantida | Reação só se refere a publicação existente e autorizada. |
| R1-138 | post_reactions.user_id | autor da reação | mantida | Reação é da própria sessão; não revelar lista de identidades. |
| R1-139 | post_saves.post_id | publicação salva | mantida | Vínculo só guarda publicação existente e legível. |
| R1-140 | post_saves.saved_at | data do salvamento | mantida | Mantém ordenação da lista pessoal; sem edição direta. |
| R1-141 | post_saves.user_id | dono do salvo | mantida | Salvos permanecem privados da própria pessoa. |
| R1-142 | posts.community_id | vínculo com vila | removida | A vila não existe no produto; coluna e ramo saem no redesenho aceito. |
| R1-143 | posts.content | conteúdo da publicação | mantida | Conteúdo segue sujeito a limites, autorização de edição e moderação. |
| R1-144 | posts.created_at | data da publicação | mantida | Necessária ao feed; não editável pelo autor. |
| R1-145 | posts.group_id | vínculo com grupo | mudada | Passa de opcional a obrigatório: toda publicação pertence a grupo. |
| R1-146 | posts.id | identidade da publicação | mantida | Identidade estável para URL, comentários, vínculos e denúncia. |
| R1-147 | posts.is_deleted | estado de remoção | mantida | Remoção continua sem restauração pelo autor e mantém evidência. |
| R1-148 | posts.link_url | anexo de link | mantida | Mantido com validação de URL e coerência com o tipo. |
| R1-149 | posts.locality_id | cidade da publicação | mantida | Cidade do grupo continua sendo escopo de consistência e autorização. |
| R1-150 | posts.photo_path | anexo de foto | mantida | Mantido sujeito à política de storage e à leitura da publicação. |
| R1-151 | posts.poll_options | opções de enquete | removida | Enquete está explicitamente fora desta leva pelo ADR-20261023 §4 e ADR-20261024 §9. |
| R1-152 | posts.post_type | tipo de publicação | mudada | Retira `poll` desta leva; tipos restantes devem refletir publicação/pergunta/foto/link, confirmar a enumeração final com o dono. |
| R1-153 | posts.user_id | autoria | mantida | Autoria obrigatória, derivada da sessão e imutável. |
| R1-208 | public.post_type | valores da enum | mudada | `poll` está fora da leva; enumeração final dos tipos restantes fica condicionada à resposta do dono. |
| R1-351 | comments_content_check | tamanho do comentário | mantida | Mantém limite como validação de entrada; qualquer ajuste de tamanho exige decisão explícita. |
| R1-352 | comments_pkey | identidade única | mantida | Evita colisão de comentários. |
| R1-353 | comments_post_id_fkey | integridade e cascata | mantida | Comentário não pode ficar órfão; exclusão da publicação limpa dependentes. |
| R1-354 | comments_user_id_fkey | integridade de autoria | mantida | Conta inexistente não pode ser autora; exclusão da conta limpa dependentes. |
| R1-355 | comments RLS ENABLE | aplicação de políticas | mantida | RLS segue ligada na tabela de domínio. |
| R1-356 | comments RLS FORCE | aplicação forçada de políticas | mantida | RLS forçada também para owner, conforme ADR-20261024 §3. |
| R1-357 | comments_delete_own | exclusão pelo autor | mantida | Protótipo permite excluir comentário próprio; só linha própria e não removida. |
| R1-358 | comments_insert_member | criação no escopo | mudada | Recriar para membro ativo do grupo e post interagível; manter anti-spoofing, suspensão e exclusão. |
| R1-359 | comments_select_via_post | leitura no escopo | mudada | Substituir acesso legado por visibilidade do grupo, estado, moderação e `block_allows(ler)`. |
| R1-360 | comments_update_own | edição pelo autor | mudada | Protótipo exige edição própria; fixar coluna editável e impedir alteração de vínculo/autoria ou restauração de removido. |
| R1-361 | block_soft_delete_comments | bloqueio de soft delete direto | mantida | Preserva a barreira que impede o usuário de contornar fluxo de remoção. |
| R1-362 | notify_comment_trigger | notificação de comentário | mudada | Manter aviso e preferência; consultar bloqueio por destinatário antes de enfileirar e no envio. |
| R1-363 | comments authenticated grants | acesso SQL do membro | mantida | Grants mínimos seguem necessários; UPDATE/DELETE continuam limitados por RLS e colunas/fluxos autorizados. |
| R1-364 | comments service_role grants | operação de serviço | mantida | Serviço conserva privilégios operacionais mínimos para persistência e moderação. |
| R1-365 | comments UPDATE(is_deleted) service_role | remoção operacional | mantida | Mantém escrita de remoção pelo serviço para moderação autorizada e preservação de evidência. |
| R1-551 | post_follows_pkey | um vínculo por pessoa/post | mantida | Impede duplicidade do vínculo por chave composta. |
| R1-552 | post_follows_post_id_fkey | integridade do post seguido | mantida | Impede vínculo órfão e limpa ao excluir publicação. |
| R1-553 | post_follows_user_id_fkey | integridade do seguidor | mantida | Impede vínculo sem conta e limpa em exclusão de conta. |
| R1-554 | post_follows RLS ENABLE | aplicação de políticas | mantida | RLS permanece ligada. |
| R1-555 | post_follows RLS FORCE | aplicação forçada de políticas | mantida | RLS permanece forçada. |
| R1-556 | post_follows_delete_own | deixar de seguir | mantida | A pessoa remove apenas o próprio vínculo. |
| R1-557 | post_follows_insert_own | seguir post | mudada | Acrescentar autorização de leitura/interação no novo escopo; manter vínculo próprio e bloqueio de exclusão. |
| R1-558 | post_follows_select_own | privacidade de seguimento | mudada | Manter lista própria e excluir posts removidos; filtrar por leitura atual e bloqueio. |
| R1-559 | post_follows service_role grants | acesso operacional | mantida | Privilégio de serviço permanece restrito à operação necessária. |
| R1-560 | post_follows authenticated grants | acesso do membro | mantida | Só SELECT/INSERT/DELETE; sem UPDATE direto ou ampliação de grants. |
| R1-561 | post_reactions_pkey | identidade única da reação | mantida | Preserva chave primária da reação. |
| R1-562 | post_reactions_post_id_fkey | integridade do post reagido | mantida | Impede reação órfã e limpa ao apagar publicação. |
| R1-563 | post_reactions_post_id_user_id_key | uma reação por pessoa/post | mantida | Evita duplicidade de “Útil” por pessoa e publicação. |
| R1-564 | post_reactions_user_id_fkey | integridade do autor da reação | mantida | Impede vínculo sem usuário e limpa na exclusão da conta. |
| R1-565 | post_reactions RLS ENABLE | aplicação de políticas | mantida | RLS permanece ligada. |
| R1-566 | post_reactions RLS FORCE | aplicação forçada de políticas | mantida | RLS permanece forçada. |
| R1-567 | post_reactions_delete_own | retirar reação própria | mantida | A pessoa só remove a própria reação. |
| R1-568 | post_reactions_insert_locality_member | reagir com autorização | mudada | A regra de grupo substitui vila/localidade; manter sessão própria, não suspensa, sem exclusão e post interagível. |
| R1-569 | post_reactions_insert_self | reagir com autorização | removida | É policy duplicada e permissiva em conjunto com a policy de `INSERT` acima; recriar uma única policy equivalente restritiva. |
| R1-570 | post_reactions_select_locality_member | ler reações | mudada | Manter leitura somente junto ao post autorizado e não removido, acrescentando bloqueio; não expor lista de autores. |
| R1-571 | post_reactions service_role grants | acesso operacional | mantida | Privilégios de serviço não ampliam acesso de membros. |
| R1-572 | post_reactions authenticated grants | acesso do membro | mantida | Só SELECT/INSERT/DELETE; sem UPDATE direto. |
| R1-573 | post_saves_pkey | um salvo por pessoa/post | mantida | Preserva unicidade do vínculo pessoal. |
| R1-574 | post_saves_post_id_fkey | integridade do post salvo | mantida | Impede salvo órfão e limpa ao excluir publicação. |
| R1-575 | post_saves_user_id_fkey | integridade da pessoa | mantida | Impede salvo sem usuário e limpa na exclusão da conta. |
| R1-576 | post_saves RLS ENABLE | aplicação de políticas | mantida | RLS permanece ligada. |
| R1-577 | post_saves RLS FORCE | aplicação forçada de políticas | mantida | RLS permanece forçada. |
| R1-578 | post_saves_delete_own | remover salvo próprio | mantida | A pessoa remove apenas seus vínculos. |
| R1-579 | post_saves_insert_own | salvar post legível | mudada | Manter vínculo próprio, acrescentando escopo de grupo, leitura, bloqueio e estado interagível. |
| R1-580 | post_saves_select_own | privacidade dos salvos | mudada | Manter lista própria e ocultar linha removida; exige leitura atual e filtro de bloqueio. |
| R1-581 | post_saves service_role grants | acesso operacional | mantida | Privilégios de serviço permanecem mínimos. |
| R1-582 | post_saves authenticated grants | acesso do membro | mantida | Só SELECT/INSERT/DELETE; sem UPDATE direto ou grant novo. |
| R1-583 | post_link_requires_link_type | coerência do anexo | mantida | Link continua válido somente com o tipo correspondente. |
| R1-584 | post_link_type_requires_url | coerência do tipo link | mantida | Tipo link continua exigindo URL. |
| R1-585 | post_photo_requires_photo_type | coerência da foto | mantida | Foto continua válida somente com o tipo correspondente. |
| R1-586 | post_poll_requires_poll_type | coerência da enquete | removida | Regra exclusiva da enquete, funcionalidade fora desta leva; retirada junto ao campo/tipo. |
| R1-587 | posts_community_id_fkey | vínculo com vila | removida | Remove referência ao objeto de vila removido no redesenho aceito. |
| R1-588 | posts_community_same_locality | consistência vila-cidade | removida | Constraint dependia exclusivamente da coluna/vila que sai; consistência grupo-cidade será recriada. |
| R1-589 | posts_content_check | tamanho da publicação | mantida | Mantém limite de conteúdo e proteção contra entrada fora do contrato. |
| R1-590 | posts_link_url_check | URL segura/formato | mantida | Preserva validação do destino de link. |
| R1-591 | posts_locality_id_fkey | integridade da cidade | mantida | Publicação continua associada a cidade existente. |
| R1-592 | posts_pkey | identidade da publicação | mantida | Mantém identidade única e estável. |
| R1-593 | posts_single_scope | exclusividade de escopo | mudada | Recriar como `group_id` obrigatório e consistente com cidade, removendo escopo de vila e publicação sem grupo. |
| R1-594 | posts_user_id_fkey | integridade da autoria | mantida | Conta deve existir; autoria não é substituível. |
| R1-595 | posts RLS ENABLE | aplicação de políticas | mantida | RLS permanece ligada. |
| R1-596 | posts RLS FORCE | aplicação forçada de políticas | mantida | RLS permanece forçada conforme ADR-20261024 §3. |
| R1-597 | posts_delete_own | exclusão da própria publicação | mudada | Preservar exclusão própria do protótipo, sem permitir exclusão/resgate de conteúdo removido pela moderação. |
| R1-598 | posts_insert_locality_member | publicação no escopo | mudada | Manter `group_id` obrigatório, sessão própria, grupo/cidade consistentes, suspensão e exclusão bloqueadas. |
| R1-599 | posts_select_locality_member | leitura do post | mudada | Recriar com estado/associação de grupo, conteúdo não removido, bloqueio e sem vazar estado privado. |
| R1-600 | posts_update_own | edição própria | mudada | Limitar UPDATE às colunas de conteúdo; vínculo, autoria, tipo e estado de remoção ficam imutáveis ao autor. |
| R1-601 | block_soft_delete_posts | bloqueio de soft delete direto | mantida | Preserva barreira contra autor restaurar/apagar via UPDATE direto. |
| R1-602 | notify_group_post_trigger | notificação de publicação | mudada | Mantém evento e consulta bloqueio por destinatário antes de enfileirar e no envio. |
| R1-603 | posts_group_immutable | grupo imutável | mantida | ADR veda publicação trocar ou perder o grupo. |
| R1-604 | posts authenticated grants | acesso do membro | mantida | Grants mínimos sem substituir RLS e regras por coluna. |
| R1-605 | posts service_role grants | operação de serviço | mantida | Serviço conserva somente acesso operacional necessário. |
| R1-606 | posts UPDATE(is_deleted) service_role | moderação de remoção | mantida | Mantém remoção operacional autorizada e evidência, vedada ao autor. |
| R1-215 | private.can_access_post | autorização de leitura | mudada | Recriar com grupo, estado, moderação e `block_allows(ler)`; não depender de vila. |
| R1-216 | private.can_access_post_scope | autorização de escopo | mudada | Remover argumento `community_id` e validar cidade/grupo com as regras novas; negação permanece fechada. |
| R1-234 | private.guard_group_pinned_post | integridade da publicação fixada | mantida | Protege fixação a publicação do grupo e evita referência incompatível. |
| R1-249 | private.notify_comment | emissão de alerta | mudada | Preservar destinatários/preferências válidos e chamar bloqueio `notificar` antes de criar alerta. |
| R1-264 | private.reports_block_self | integridade de denúncia | mantida | Impede auto-denúncia e segue fora do bloqueio para permitir denunciar conteúdo oculto. |
| R1-260 | private.post_accepts_interaction | estado interagível do post | mudada | Recriar para negar post removido, grupo encerrado e interação vedada, sem dispensar autorização de leitura nem consulta ao bloqueio. |
| R1-289 | public.feed_community | feed de vila | removida | Feed de vila sai com a vila; não é feed de cidade nem autorização para ler grupos. |
| R1-290 | public.feed_following | feed de publicações seguidas | mudada | Preservar feed pessoal, remover vila e filtrar cada linha por grupo, acesso, remoção e bloqueio. |
| R1-291 | public.feed_group | feed de grupo | mudada | Preservar feed do protótipo com checagem do chamador, estado do grupo, conteúdo e bloqueio. |
| R1-292 | public.feed_posts | feed agregado de cidade | mudada | Recriar apenas como agregação autorizada de grupos e da cidade; acesso direto precisa validar membro e não pode contornar grupo Fechado. |
| R1-293 | public.finalize_account_deletion | limpeza de dados da conta | mudada | Remover referências à vila e manter limpeza de reações, salvos, follows e autoria conforme política aprovada de exclusão. |
| R1-303 | public.list_group_activity | atividade do grupo | mantida | Mantém atividade restrita ao grupo; a política de leitura do post aplica escopo e bloqueio sem ampliar o acesso. |
| R1-307 | public.list_open_reports | fila de denúncias | mantida | Acesso restrito à operação, preservando evidência de publicação/comentário. |
| R1-318 | public.pin_group_post | fixar publicação | mantida | Ato restrito a papel autorizado e publicação do próprio grupo; conteúdo oculto/removido não deve ser fixado. |
| R1-320 | public.profile_posts_for | publicações no perfil | mantida | Mantém publicações de perfil condicionadas à leitura autorizada do conteúdo e não amplia escopo de grupo. |
| R1-332 | public.resolve_report | resolver denúncia | mantida | Resolução continua restrita ao operador e não elimina evidência do conteúdo reportado. |

## 7. Testes negativos existentes

Adaptar os casos ao novo esquema e conservar a proteção, conforme ADR-20261024 §3.5. Os casos marcados como positivos não substituem os negativos indicados.

| Regra | Prova negativa existente |
|---|---|
| R1-358, R1-598, R1-593 | `supabase/tests/publicacao-so-em-grupo.sql` (sem grupo e sem autorização) e `supabase/tests/community-feed-denials.sql` (não membro, cidade/escopo incompatível, suspensão); `tests/e2e/denied-publish.spec.ts` (conta suspensa não publica). |
| R1-359, R1-599, R1-215, R1-216, R1-291, R1-292 | `supabase/tests/post-scope-leak.sql` (não membro, outra cidade e grupo fechado não vazam por RLS/RPC); `supabase/tests/community-scope.sql`; `supabase/tests/community-feed-denials.sql`; `supabase/tests/other-member-profile.sql` (pedido pendente/outro grupo e outra cidade); `supabase/tests/community-feeds.sql`. |
| R1-360, R1-357, R1-597, R1-600 | `supabase/tests/community-feed-happy-path.sql` exercita escrita própria; `supabase/tests/moderated-content-write.sql`, `supabase/tests/reports-denials.sql` e `supabase/tests/reports-resolution.sql` protegem remoção/moderação e impedem edição/restauração indevida. |
| R1-361, R1-601, R1-147 | `supabase/tests/moderated-content-write.sql`, `supabase/tests/moderated-content-select.sql` e `supabase/tests/reports-resolution.sql` (conteúdo removido não volta e não aparece no feed). |
| R1-557, R1-558, R1-579, R1-580 | `supabase/tests/post-follows.sql` (post sem leitura não vaza no feed pessoal; anônimo não lê) e `supabase/tests/post-scope-leak.sql` (não membro não salva). |
| R1-568, R1-569, R1-570 | `supabase/tests/post-reactions.sql` (não membro não reage nem lê reação) e `supabase/tests/post-scope-leak.sql` (sem interação em grupo privado). |
| R1-552, R1-553, R1-562, R1-564, R1-574, R1-575, R1-353, R1-354 | `supabase/tests/account-deletion.sql` verifica cascatas/dependências e nega escrita na conta em exclusão; `supabase/tests/full-regression.sql` cobre escopo da conta. |
| R1-362, R1-249, R1-602 | `supabase/tests/notification-denials.sql`, `supabase/tests/notification-preferences-honored.sql`, `supabase/tests/notifications-approved-events.sql` e `supabase/tests/outbox-worker.sql` cobrem destinatário, preferência e envio. Bloqueio de notificações ainda precisa de caso novo. |
| R1-264, R1-307, R1-332 | `supabase/tests/reports-denials.sql`, `supabase/tests/report-resolution-unified.sql`, `supabase/tests/reports-resolution.sql` e `supabase/tests/reports-unified-targets.sql` cobrem denúncia, acesso operacional e resolução. |
| R1-290, R1-291, R1-292, R1-303, R1-320 | `supabase/tests/post-scope-leak.sql`, `supabase/tests/other-member-profile.sql`, `supabase/tests/community-feeds.sql` (adaptar feed de vila removido), `supabase/tests/group-base.sql` e `supabase/tests/transfer-scope-denials.sql`. |
| R1-293 | `supabase/tests/account-deletion.sql` (exclusão da conta e limpeza de vínculos). |

Não localizei teste E2E que prove diretamente a negação de leitura/escrita destas tabelas por papel/estado; `tests/e2e/group-base.spec.ts`, `tests/e2e/publish-golden-slice.spec.ts` e `tests/e2e/feed-attachment-publish.spec.ts` cobrem fluxos positivos e falhas do compositor. Os E2E de autoria/moderação e bloqueio precisam ser acrescentados na R3; não considerar ausência de E2E como autorização.

## 8. Consumidores

Levantamento por `rg` em `apps/web/`, `apps/mobile/`, `supabase/seed.sql` e testes:

- Web: `apps/web/app/components/bivaque/feed-post-card.tsx` lê/escreve comentários, reações e follows; `feed-post-create.tsx`, `feed-post-edit.tsx`, `feed-post-audience.tsx` criam/editam; `apps/web/app/(shell)/communities/[id]/community-detail-screen.tsx` usa `feed_posts`; `apps/web/app/(shell)/profile/[userId]/page.tsx` e `apps/web/lib/profile-rpcs.ts` usam `profile_posts_for`; notificações/outbox em `apps/web/app/(shell)/notifications/page.tsx`, `apps/web/app/(shell)/inicio/return-strip.tsx`, `apps/web/app/api/internal/outbox/route.ts`; denúncias em `apps/web/app/(admin)/reports/targets.ts` e `apps/web/lib/reports/reports.ts`; exclusão em `apps/web/app/api/internal/account-deletion/route.ts`; sonda em `apps/web/lib/rls-probe.ts`.
- Mobile: `apps/mobile/app/(tabs)/community.tsx`, `apps/mobile/src/auth/publish.ts`, `apps/mobile/src/auth/reactions.ts`, `apps/mobile/src/components/ReactionButton.tsx` e `apps/mobile/src/auth/purge.ts`.
- Seed: `supabase/seed.sql` popula posts, reações e comentários e associa conteúdo de demonstração; adaptar todo insert ao `group_id` obrigatório e remover enquete se a decisão se confirmar.
- Testes de tabela/feed: `community-feed-denials.sql`, `community-feed-happy-path.sql`, `community-feed-locality-reach.sql`, `community-feeds.sql`, `community-scope.sql`, `feed-comunidade-paginado.sql`, `group-base.sql`, `post-follows.sql`, `post-reactions.sql`, `post-scope-leak.sql`, `publicacao-so-em-grupo.sql`, `other-member-profile.sql`, `account-deletion.sql`, `full-regression.sql`, `rls-or-column-regression.test.sql`, `moderated-content-select.sql`, `moderated-content-write.sql`, `reports-denials.sql`, `reports-resolution.sql`, `notification-denials.sql`, `notification-preferences-honored.sql`, `notifications-approved-events.sql`, `outbox-worker.sql`, `event-photos-storage.sql`, `security-image-storage.sql`, `transfer-scope-denials.sql` e testes unitários/E2E citados acima.

## 9. Perguntas ao dono

1. **Quais tipos de publicação permanecem no primeiro corte?** O protótipo mostra publicação, pergunta, foto/link e evento; ADR-20261023 exclui enquete e Oferta da leva. **Recomendação:** remover `poll`/`poll_options` e manter os tipos suportados pelo fluxo atual, sem reintroduzir enquete/Oferta.
2. **O autor pode editar e excluir publicação após comentários, reações, salvamentos, seguidores ou fixação?** O protótipo confirma edição/exclusão própria de comentário e exclusão própria de publicação, mas não fixa retenção nem efeito sobre as respostas. **Recomendação:** permitir editar texto/anexo; exclusão lógica; manter comentários/evidência sem expor conteúdo removido, retirar fixação e impedir ressurreição.
3. **Qual é a autorização exata de moderação de publicações e comentários pelo operador, incluindo recurso/restauração e retenção da evidência?** **Recomendação:** somente operador autorizado, ação auditada, ocultar de superfícies comuns e não restaurar via autor; definir retenção antes da migration.
4. **“Útil” permanece como uma reação única por publicação, visível apenas como contagem e reação própria?** O ADR-20261023 fixa o rótulo e proíbe ordenação nesta leva, mas não decide visibilidade de identidades. **Recomendação:** manter comportamento de toggle e não expor lista de pessoas.
5. **Posts salvos e seguidos permanecem acessíveis em grupo Encerrado se a pessoa participava antes?** **Recomendação:** permitir leitura/remover do vínculo enquanto ainda tem leitura de participante anterior, sem criar novos vínculos.
6. **Uma publicação/comentário ocultado por pessoa deve continuar abrível por URL direta?** O módulo `profile/hidden.js` sugere faixa e “Mostrar”, sem retirar conteúdo da comunidade. **Recomendação:** só abrir se a política geral ainda autorizar a leitura; “Mostrar” restaura apenas a lista pessoal.

