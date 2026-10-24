# R2 — Matriz de permissão: vila e fundação

Rascunho sujeito à aprovação do dono antes da migration. Atores, estados, valores de célula e contrato de bloqueio seguem [`R2-comum.md`](./R2-comum.md). Base: ADR-20261024 §1, §3–5; decisões de produto compatíveis do ADR-20261023; o protótipo é a referência funcional. A vila deixa de existir nesta versão; proteções não explicitamente dispensadas continuam valendo.

## 1. Objetos do grupo

`communities`, `community_memberships`, `community_invitations`, `community_join_reasons`, `provider_accounts`, `provider_invitations`, `provider_reach`, `listings`, `dm_conversations`, `notifications`, `reports`, policies relevantes de `storage.objects` e as funções citadas no retrato. A parte de mensagens cobre somente a conversa e a autorização de contexto; linhas de mensagem permanecem na fundação. A função `finalize_account_deletion` continua sendo consumidor transversal. A remoção de vila não autoriza quebrar exclusão de conta, mensagens, moderação, notificação ou acesso a prestador/anúncio.

## 2. Matriz por objeto

Objetos de vila são removidos na mesma leva e não têm leitura nem escrita após ela; referências antigas não concedem acesso. Nas demais tabelas, `sim` presume sessão válida, conta não suspensa e sem exclusão aberta, salvo linha que explicite outra condição. `suspenso` e `em-exclusao` são estados de conta, não papéis: só podem exercer permissões derivadas de titularidade, autoria ou escopo que já possuam, sujeitas aos controles de conta, que podem retirar acesso e nunca concedê-lo. Os atores e a ordem das colunas são exatamente os de `R2-comum.md`; `dono`, `moderador` e `membro` são papéis do grupo, e não substituem a condição explícita de titular (`próprio`) ou autoria (`autor`) para objetos sem grupo. Itens de operador são mediados por RPC/rota restrita e revalidam o papel no servidor.

### `communities`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler/criar/editar/excluir vila | nao | nao | nao | nao | nao | nao | nao | nao | nao | nao | nao |

### `community_memberships`, `community_invitations`, `community_join_reasons`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler/criar/alterar/apagar vínculo, convite ou motivo de vila | nao | nao | nao | nao | nao | nao | nao | nao | nao | nao | nao |

### `provider_accounts`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler própria conta de prestador | nao | nao | sim se conta própria | nao | nao | nao | nao | nao | nao | so-rpc | nao |
| criar/atestar conta | nao | nao | nao | nao | nao | nao | nao | nao | nao | so-rpc | nao |
| revogar conta | nao | nao | nao | nao | nao | nao | nao | nao | nao | so-rpc | nao |

### `provider_invitations`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler convite por token | nao | nao | nao | nao | nao | nao | nao | nao | nao | so-rpc | so-rpc |
| criar convite para prestador | nao | nao | nao | nao | nao | nao | nao | nao | nao | so-rpc | nao |
| aceitar/revogar convite | nao | nao | sim se destinatário autenticado e convite válido | nao | nao | nao | nao | nao | nao | so-rpc | nao |

### `provider_reach`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler alcance de prestador visível | sim se público na cidade autorizada | sim se público na cidade autorizada | sim se público na cidade autorizada | nao | nao | sim se catálogo público autorizado | sim se catálogo público autorizado | nao | nao | so-rpc | nao |
| criar/editar/apagar próprio alcance | sim se prestador ativo e escopo localidade | nao | sim se prestador ativo e escopo localidade | nao | nao | nao | nao | nao | nao | so-rpc | nao |

### `listings`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler anúncio publicado | sim se escopo permitido | sim se escopo permitido | sim se escopo permitido | nao | nao | sim se cidade do anúncio | sim se catálogo público autorizado | nao | nao | so-rpc | nao |
| ler rascunho próprio | sim | nao | sim se próprio | nao | nao | nao | nao | nao | nao | so-rpc | nao |
| criar anúncio | sim se autor próprio e cidade autorizada | nao | sim se cidade autorizada | nao | nao | sim se cidade própria | nao | nao | nao | so-rpc | nao |
| editar/pausar/reativar/encerrar/excluir | sim se próprio e transição válida | nao | sim se próprio e transição válida | nao | nao | nao | nao | nao | nao | so-rpc | nao |
| moderar anúncio de outra pessoa | nao | nao | nao | nao | nao | nao | nao | nao | nao | so-rpc | nao |

### `dm_conversations`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler própria conversa e contexto autorizado | sim se participante | sim se participante | sim se participante | nao | nao | nao | nao | nao | nao | so-rpc | nao |
| abrir conversa de contexto permitido | sim se elegível e `block_allows(contatar)` | sim se elegível e `block_allows(contatar)` | sim se elegível e `block_allows(contatar)` | nao | nao | nao | nao | nao | nao | so-rpc | nao |
| ler/abrir conversa arbitrária de terceiro | nao | nao | nao | nao | nao | nao | nao | nao | nao | nao | nao |

### `notifications`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler e marcar como lida notificação própria | sim se destinatário | sim se destinatário | sim se destinatário | sim se destinatário | sim se destinatário | sim se destinatário | sim se destinatário | sim se destinatário e controles de conta permitirem | sim se destinatário e controles de conta permitirem | so-rpc | nao |
| inserir/alterar notificação para si ou terceiro | nao | nao | nao | nao | nao | nao | nao | nao | nao | so-rpc | nao |
| gerar notificação a terceiro | nao | nao | nao | nao | nao | nao | nao | nao | nao | so-rpc | nao |

### `reports`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| criar denúncia sobre conteúdo acessível, inclusive bloqueado | sim se consegue ler o conteúdo | sim se consegue ler o conteúdo | sim se consegue ler o conteúdo | sim se consegue ler o conteúdo, inclusive em grupo Encerrado | sim se consegue ler o conteúdo | sim se consegue ler o conteúdo | nao | sim se consegue ler o conteúdo e controles de conta permitirem | sim se consegue ler o conteúdo e controles de conta permitirem | nao | nao |
| ler própria denúncia | sim se denunciante | sim se denunciante | sim se denunciante | nao | nao | nao | nao | nao | nao | so-rpc | nao |
| ler fila/detalhes e resolver | nao | nao | nao | nao | nao | nao | nao | nao | nao | so-rpc | nao |
| alterar estado/nota operacional diretamente | nao | nao | nao | nao | nao | nao | nao | nao | nao | so-rpc | nao |

### Policies de `storage.objects`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler/apagar objeto de `community-images` | nao | nao | nao | nao | nao | nao | nao | nao | nao | nao | nao |
| ler foto de evento | sim se o evento estiver acessível | sim se o evento estiver acessível | sim se o evento estiver acessível | nao | nao | nao | nao | nao | nao | so-rpc | nao |
| apagar própria foto de evento | sim se proprietário e autorizada | sim se proprietário e autorizada | sim se proprietário e autorizada | nao | nao | nao | nao | nao | nao | so-rpc | nao |

## 3. Permissão por coluna

- `communities`, `community_memberships`, `community_invitations` e `community_join_reasons`: tabelas, enum de vila, buckets e caminhos de imagem são retirados; não há leitura residual por usuário ou operador. Migração precisa remover também referências e políticas antes de eliminar as tabelas.
- `provider_accounts`: apenas a pessoa lê sua linha por RLS. Criação e atestação somente por operação autorizada; `community_id` sai, `locality_id` continua obrigatório. `auth_user_id`, `invited_by`, `locality_id`, `revoked_at` e `revoked_by` não aceitam alteração direta do prestador. Convite e revogação registram ator operacional conforme fluxo de operador.
- `provider_invitations`: permanece no schema privado, RLS habilitada e forçada, sem privilégio direto a `authenticated`/`anon`. Segredo continua guardado como digest; leitura pública de convite retorna somente dados mínimos para a pessoa destinatária decidir. `community_id` sai, `locality_id` permanece. Aceite só preenche `accepted_by_user_id` e `accepted_at` junto ao estado `accepted`; não pode aceitar em nome de terceiro nem auto-convidar.
- `provider_reach`: substituir `scope_type=community` por alcance de localidade; `scope_id` precisa corresponder à localidade autorizada da ficha. `source` pago continua sujeito ao ciclo de plano existente. Dono não altera a origem paga nem cria escopo de outra cidade por escrita direta.
- `listings`: `community_id` sai; `locality_id` passa a ser o único escopo e audiência, mantendo proteção por membership/escrita onde hoje existe. `owner_user_id`, `kind`, escopo, status de moderação e timestamps de sistema são protegidos contra forja direta. Campos de anúncio são editáveis pelo dono dentro das validações/estados do protótipo; operador modera por caminho restrito. Fotografia e dados de endereço seguem as regras já aprovadas da fundação.
- `dm_conversations`: `participant_a`/`participant_b` são imutáveis, distintos e ordenados; contexto e `context_id` só são definidos por abertura autorizada e não podem ser repontados por participante. Mensagens e marcadores de leitura permanecem privados de participantes. Conversas de contexto vila deixam de ser criadas; outros contextos válidos continuam.
- `notifications`: só destinatário lê e atualiza `read_at`; destinatário, tipo, alvo e ator são imutáveis para membros. Inserção continua por serviço confiável e verifica `block_allows(...,'notificar')` antes de enfileirar e no despacho, sem revelar bloqueio ao destinatário.
- `reports`: `reason` é privado à pessoa denunciante e à operação; `operator_note`, `status`, `resolved_at` e `resolved_by` só são alterados pela operação autorizada. `target_type` e `target_id` permanecem não-FK polimórficos, mas a RPC valida alvo existente/acessível e o tipo; auto-denúncia continua proibida. Denúncia de conteúdo oculto por bloqueio continua permitida.
- Storage: apagar regras de `community-images` e bucket correspondente. A política de foto de evento preserva a propriedade e validação do caminho; leitura consulta acesso atual ao evento/grupo, inclusive grupo Fechado, saída/remoção e bloqueio aplicável, em vez de inferir acesso só pela localidade.

## 4. Transições

- Vila, membership, convite e motivo não têm transição nova: tabelas e rotas são removidas; os redirecionamentos legados são destinos fechados da COM-004 e não recriam objeto.
- Prestador: somente operador cria convite/atesta. Um convite válido passa `pending → accepted` uma única vez, ligado à conta destinatária; `pending → revoked|expired` é terminal. Revogação da conta preserva evidência operacional. `locality_id` da conta e da ficha não pode migrar por UPDATE do prestador. O fluxo de auto criação de página por membro fica restrito a conta já autorizada; não concede atestação.
- Alcance: somente localidade; mutações de dono não mudam localidade da ficha, não elevam alcance nem convertem plano/origem pagos. A semântica exata de transição de `scope_type/scope_id` deve ser confirmada na pergunta ao dono quando não for determinada pelo contrato de marketplace existente.
- Anúncio: audiência é só cidade, como ADR-20261024 §1. `locality_id` não muda após a criação. Estados seguem o ciclo já implementado (rascunho/publicado/pausado/reservado/vendido/encerrado), mas qualquer transição que o protótipo não especifique permanece pergunta ao dono; validar na RPC `transition_listing`, nunca aceitar status arbitrário por UPDATE. Exclusão por conta continua passando por `finalize_account_deletion` e não remove a proteção de titularidade/moderação.
- Conversa: participantes não mudam após abertura. `context_type/context_id` precisam corresponder a um contexto existente e legível; conversas antigas de vila deixam de ser elegíveis. Serviço, anúncio, evento, pergunta, família e grupo permanecem sujeitos ao seu gate. Bloqueio fecha/nega contato sem expor qual lado bloqueou.
- Notificação: conteúdo/alvo nasce pelo evento do sistema, não pelo destinatário. `read_at: null → timestamp` é a transição de membro; não se permite voltar a não lida nem alterar destinatário/alvo. Preferências apenas suprimem envio aplicável. Para tipos de notificação `comments` e `events`, manter funções atuais até migração de seus domínios; a remoção dos tipos depende das regras das outras partes R2.
- Denúncia: `open → resolved` somente pelo operador via função autorizada; relato original não é apagado/alterado pela pessoa denunciada. `operator_note` é separado e não substitui evidência. Retenção após resolução e remoção de alvos ficam como pergunta ao dono se não houver política vigente conclusiva.
- RLS continua ligada e forçada em todas as tabelas restantes. Grants autenticados e `service_role` permanecem mínimos; nenhum caminho direto pode ampliar transições acima.

## 5. Bloqueio

A assinatura é fixa: `private.block_allows(p_actor uuid, p_author uuid, p_action text) returns boolean`, `stable`, `security definer`, `search_path = ''`; nesta leva o corpo sempre devolve `true`. Denunciar não consulta bloqueio; operador não é afetado. “Ver mesmo assim” é parâmetro explícito da leitura de detalhe e só vale para quem bloqueou, sem passar pela policy.

| Ação/consumidor | Consulta |
|---|---|
| Listar, buscar, abrir detalhes de negócio, prestador, anúncio ou conversa ligada a autor | `block_allows(actor, author, 'ler')` nas superfícies de leitura aplicáveis; conversa continua dependendo do participante/contexto. |
| Criar pedido/contato de negócio ou conversa de serviço | `block_allows(actor, provider, 'contatar')`; quando o ator do bloqueio está bloqueado pelo prestador, negar. |
| Enviar/continuar conversa privada | `block_allows(actor, counterpart, 'contatar')`; histórico do bloqueador permanece legível pelo bloqueado. |
| Emitir notificação sobre anúncio, negócio, mensagem ou resposta | `block_allows(actor, destinatário, 'notificar')` ao enfileirar e no envio; itens pendentes também são revalidados. |
| Criar/consultar/resolver denúncia | Sem consulta; bloquear não tira o canal de denúncia nem afeta operador. |
| Fotos e arquivos | Leitura aplica primeiro acesso ao objeto/contexto; se houver conteúdo de pessoa autora, aplica também `'ler'`. Exclusão própria é checada por titularidade, não por bloqueio. |

As ações `'responder'`, `'comentar'` e `'reagir'` são usadas pelas regras de conteúdo nas outras matrizes, não por estas tabelas de fundação. `private.notification_type_enabled` e `private.notification_type_key` não substituem a checagem de bloqueio.

## 6. Regras do retrato

Cada ID desta parte recebe uma decisão única. Regras compartilhadas preservam a mesma decisão entre rascunhos. A vila é removida conforme ADR-20261024 §4; constraints, FKs, policies, triggers ou grants de objetos removidos acompanham a remoção. Para fundação, “mudada” descreve a menor adaptação necessária; onde falta decisão explícita de produto, a regra de segurança fica mantida até aprovação.

| ID | objeto | o que protege, em uma linha | decisão | motivo |
|---|---|---|---|---|

| R1-001 | provider_invitations | accepted at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-002 | provider_invitations | accepted by user id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-003 | provider_invitations | community id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-004 | provider_invitations | created at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-005 | provider_invitations | display name | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-006 | provider_invitations | expires at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-007 | provider_invitations | id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-008 | provider_invitations | invitee email digest | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-009 | provider_invitations | inviter user id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-010 | provider_invitations | locality id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-011 | provider_invitations | status | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-012 | provider_invitations | token digest | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-019 | communities | banner path | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-020 | communities | created at | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-021 | communities | created by | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-022 | communities | description | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-023 | communities | id | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-024 | communities | is deleted | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-025 | communities | locality id | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-026 | communities | name | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-027 | communities | owner user id | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-028 | communities | thumbnail path | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-029 | community_invitations | accepted at | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-030 | community_invitations | accepted by user id | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-031 | community_invitations | community id | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-032 | community_invitations | created at | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-033 | community_invitations | expires at | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-034 | community_invitations | id | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-035 | community_invitations | inviter user id | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-036 | community_invitations | status | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-037 | community_invitations | token digest | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-038 | community_join_reasons | community id | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-039 | community_join_reasons | created at | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-040 | community_join_reasons | reason | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-041 | community_join_reasons | user id | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-042 | community_memberships | community id | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-043 | community_memberships | joined at | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-044 | community_memberships | role | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-045 | community_memberships | status | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-046 | community_memberships | user id | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-047 | dm_conversations | context id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-048 | dm_conversations | context type | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-049 | dm_conversations | created at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-050 | dm_conversations | id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-051 | dm_conversations | participant a | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-052 | dm_conversations | participant b | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-104 | listings | address | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-105 | listings | available until | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-106 | listings | category | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-107 | listings | closed at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-108 | listings | community id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-109 | listings | condition | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-110 | listings | created at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-111 | listings | description | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-112 | listings | id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-113 | listings | kind | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-114 | listings | locality id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-115 | listings | neighborhood | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-116 | listings | owner user id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-117 | listings | pickup note | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-118 | listings | price cents | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-119 | listings | published at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-120 | listings | status | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-121 | listings | title | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-122 | listings | updated at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-123 | notifications | action | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-124 | notifications | actor user id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-125 | notifications | created at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-126 | notifications | id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-127 | notifications | read at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-128 | notifications | recipient user id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-129 | notifications | target id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-130 | notifications | target type | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-131 | notifications | type | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-154 | provider_accounts | auth user id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-155 | provider_accounts | community id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-156 | provider_accounts | created at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-157 | provider_accounts | invited by | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-158 | provider_accounts | locality id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-159 | provider_accounts | revoked at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-160 | provider_accounts | revoked by | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-161 | provider_reach | active | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-162 | provider_reach | created at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-163 | provider_reach | provider id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-164 | provider_reach | scope id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-165 | provider_reach | scope type | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-166 | provider_reach | source | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-183 | reports | created at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-184 | reports | id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-185 | reports | operator note | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-186 | reports | reason | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-187 | reports | reporter user id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-188 | reports | resolved at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-189 | reports | resolved by | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-190 | reports | status | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-191 | reports | target id | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-192 | reports | target type | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-193 | provider_invitations | provider_invitation_status: pending/accepted/revoked/expired | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-194 | community_invitations | community_invitation_status: pending/accepted/revoked/expired | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-195 | community_memberships | community_membership_role: member/moderator/owner | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-196 | community_memberships | community_membership_status: pending/approved | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-197 | dm_conversations | dm_context_type: contextos elegiveis da conversa | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-204 | listings | listing_condition: new/used | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-205 | listings | listing_kind: item/property | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-206 | listings | listing_status: draft/active/paused/reserved/sold/closed | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-207 | notifications | notification_type: tipos de notificacao suportados | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-209 | provider_reach | provider_reach_scope: community/locality | mudada | Recria a validacao no escopo de localidade e preserva autorizacao, titularidade e visibilidade.|
| R1-210 | provider_reach | provider_reach_source: free/paid | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-212 | reports | report_status: open/resolved | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-213 | reports | report_target_type: tipos de alvo de denuncia | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-218 | function | private.can_read_listing | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-219 | function | private.can_receive_invite_to_event | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-220 | function | private.can_see_provider | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-221 | function | private.can_user_read_listing | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-223 | function | private.cascade_community_membership_loss | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-228 | function | private.dispatch_listing_alerts | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-229 | function | private.dm_context_valid | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-230 | function | private.enforce_group_community_membership | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-238 | function | private.is_community_image_owner | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-239 | function | private.is_community_member | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-240 | function | private.is_dm_blocked_by_other | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-241 | function | private.is_dm_blocked_either_way | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-242 | function | private.is_dm_participant | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-247 | function | private.is_provider_account | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-248 | function | private.move_member_business_reach | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-249 | function | private.notify_comment | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-250 | function | private.notify_event_change | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-251 | function | private.notify_event_question_message | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-252 | function | private.notify_event_rsvp | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-253 | function | private.notify_group_admission | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-254 | function | private.notify_group_pin | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-255 | function | private.notify_group_post | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-256 | function | private.notify_indication | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-257 | function | private.notify_invitation_accepted | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-258 | function | private.notify_recommendation_reply | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-259 | function | private.notify_recommendation_reply_followers | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-261 | function | private.property_details_require_property | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-265 | function | private.scrub_report_reason | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-266 | function | private.send_recurring_event_reminders | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-267 | function | public.accept_community_invitation | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-268 | function | public.accept_provider_invitation | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-269 | function | public.add_community_moderator | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-272 | function | public.answer_support_ticket | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-273 | function | public.approve_community_member | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-275 | function | public.can_manage_provider_profile | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-276 | function | public.cancel_community_request | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-279 | function | public.conversation_counterpart_name | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-280 | function | public.create_community | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-281 | function | public.create_community_invitation | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-283 | function | public.create_group_in_community | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-284 | function | public.create_member_business_page | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-285 | function | public.create_property_listing | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-286 | function | public.create_provider_invitation | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-287 | function | public.create_service_request | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-289 | function | public.feed_community | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-290 | function | public.feed_following | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-293 | function | public.finalize_account_deletion | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-294 | function | public.get_profile_neighborhood | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-295 | function | public.is_community_member | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-296 | function | public.is_current_user_community_moderator | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-297 | function | public.is_provider_account | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-299 | function | public.leave_community | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-301 | function | public.list_community_pending_arrivals | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-302 | function | public.list_community_providers | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-307 | function | public.list_open_reports | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-308 | function | public.list_pending_community_invitations | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-311 | function | public.mark_conversation_read | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-314 | function | public.my_account_kind | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-316 | function | public.open_conversation | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-317 | function | public.open_event_question | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-322 | function | public.read_provider_invitation | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-324 | function | public.reject_pending_user | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-325 | function | public.remove_community_member | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-326 | function | public.remove_community_moderator | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-329 | function | public.replace_listing_photo | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-330 | function | public.request_account_deletion | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-331 | function | public.request_community_membership | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-332 | function | public.resolve_report | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-333 | function | public.revoke_community_invitation | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-334 | function | public.revoke_provider_account | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-335 | function | public.search_providers | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-336 | function | public.send_conversation_message | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-337 | function | public.set_community_image | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-340 | function | public.settle_account_possessions | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-342 | function | public.transfer_community_ownership | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-344 | function | public.transition_listing | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-346 | function | public.update_member_business_page | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-347 | storage.objects | community_images_delete_owner | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-348 | storage.objects | community_images_select_reachable | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-349 | storage.objects | event_photos_delete_own | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-350 | storage.objects | event_photos_select_scoped | mudada | Remove dependencia de vila e conserva validacao/autorizacao aplicavel no escopo de cidade ou operador definido. |
| R1-366 | communities | communities banner path length | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-367 | communities | communities created by fkey | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-368 | communities | communities description check | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-369 | communities | communities id locality id key | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-370 | communities | communities locality id fkey | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-371 | communities | communities name check | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-372 | communities | communities owner user id fkey | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-373 | communities | communities pkey | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-374 | communities | communities thumbnail path length | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-375 | communities | regra estrutural | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-376 | communities | regra estrutural | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-377 | communities | communities select authenticated | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-378 | communities | grant SELECT ON TABLE "public"."communities" TO "authenticated" | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-379 | communities | grant SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."communities" TO "service role" | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-380 | community_invitations | community invitations accepted by user id fkey | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-381 | community_invitations | community invitations check | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-382 | community_invitations | community invitations community id fkey | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-383 | community_invitations | community invitations inviter user id fkey | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-384 | community_invitations | community invitations pkey | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-385 | community_invitations | community invitations token digest check | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-386 | community_invitations | community invitations token digest key | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-387 | community_invitations | regra estrutural | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-388 | community_invitations | regra estrutural | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-389 | community_invitations | grant ALL ON TABLE "public"."community invitations" TO "service role" | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-390 | community_join_reasons | community join reasons community id user id fkey | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-391 | community_join_reasons | community join reasons pkey | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-392 | community_join_reasons | community join reasons reason check | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-393 | community_join_reasons | regra estrutural | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-394 | community_join_reasons | regra estrutural | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-395 | community_join_reasons | community join reasons select author or moderator | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-396 | community_join_reasons | grant ALL ON TABLE "public"."community join reasons" TO "service role" | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-397 | community_join_reasons | grant SELECT ON TABLE "public"."community join reasons" TO "authenticated" | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-398 | community_memberships | community memberships community id fkey | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-399 | community_memberships | community memberships pkey | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-400 | community_memberships | community memberships user id fkey | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-401 | community_memberships | regra estrutural | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-402 | community_memberships | regra estrutural | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-403 | community_memberships | community memberships select comember | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-404 | community_memberships | cascade community membership downgrade trigger | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-405 | community_memberships | cascade community membership loss trigger | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-406 | community_memberships | grant ALL ON TABLE "public"."community memberships" TO "service role" | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-407 | community_memberships | grant SELECT ON TABLE "public"."community memberships" TO "authenticated" | removida | Vila nao existe no produto; regra exclusiva sai com tabela, coluna ou bucket conforme ADR-20261024 secao 4. |
| R1-408 | dm_conversations | dm conversations ordered | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-409 | dm_conversations | dm conversations participant a fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-410 | dm_conversations | dm conversations participant b fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-411 | dm_conversations | dm conversations pkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-412 | dm_conversations | dm conversations unique pair | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-413 | dm_conversations | dm conversations unique service request | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-414 | dm_conversations | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-415 | dm_conversations | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-416 | dm_conversations | dm conversations select participant | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-417 | dm_conversations | grant REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."dm conversations" TO "service role" | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-418 | dm_conversations | grant SELECT ON TABLE "public"."dm conversations" TO "authenticated" | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-514 | listings | listings address check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-515 | listings | listings audience exclusive | mudada | Recria a validacao no escopo de localidade e preserva autorizacao, titularidade e visibilidade.|
| R1-516 | listings | listings category check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-517 | listings | listings community id fkey | removida | Recria a validacao no escopo de localidade e preserva autorizacao, titularidade e visibilidade.|
| R1-518 | listings | listings condition item only | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-519 | listings | listings description check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-520 | listings | listings item required fields | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-521 | listings | listings locality id fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-522 | listings | listings neighborhood check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-523 | listings | listings neighborhood no cep | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-524 | listings | listings owner user id fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-525 | listings | listings pickup note check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-526 | listings | listings pkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-527 | listings | listings price cents check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-528 | listings | listings title check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-529 | listings | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-530 | listings | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-531 | listings | listings delete owner | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-532 | listings | listings insert owner | mudada | Recria a validacao no escopo de localidade e preserva autorizacao, titularidade e visibilidade.|
| R1-533 | listings | listings select scoped | mudada | Recria a validacao no escopo de localidade e preserva autorizacao, titularidade e visibilidade.|
| R1-534 | listings | listings update owner | mudada | Recria a validacao no escopo de localidade e preserva autorizacao, titularidade e visibilidade.|
| R1-535 | listings | listings audience immutable | mudada | Recria a validacao no escopo de localidade e preserva autorizacao, titularidade e visibilidade.|
| R1-536 | listings | listings guard status transition | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-537 | listings | listings set updated at | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-538 | listings | grant ALL ON TABLE "public"."listings" TO "service role" | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-539 | listings | grant SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."listings" TO "authenticated" | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-540 | notifications | notifications action check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-541 | notifications | notifications actor user id fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-542 | notifications | notifications pkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-543 | notifications | notifications recipient user id fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-544 | notifications | notifications target type check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-545 | notifications | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-546 | notifications | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-547 | notifications | notifications select recipient | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-548 | notifications | notifications update recipient | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-549 | notifications | grant SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notifications" TO "service role" | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-550 | notifications | grant SELECT,UPDATE ON TABLE "public"."notifications" TO "authenticated" | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-607 | provider_accounts | provider accounts auth user id fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-608 | provider_accounts | provider accounts community id fkey | removida | Recria a validacao no escopo de localidade e preserva autorizacao, titularidade e visibilidade.|
| R1-609 | provider_accounts | provider accounts invited by fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-610 | provider_accounts | provider accounts locality id fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-611 | provider_accounts | provider accounts pkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-612 | provider_accounts | provider accounts revoked by fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-613 | provider_accounts | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-614 | provider_accounts | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-615 | provider_accounts | provider accounts select self | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-616 | provider_accounts | grant SELECT ON TABLE "public"."provider accounts" TO "authenticated" | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-617 | provider_accounts | grant SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."provider accounts" TO "service role" | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-618 | provider_invitations | provider invitations accepted by user id fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-619 | provider_invitations | provider invitations check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-620 | provider_invitations | provider invitations check1 | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-621 | provider_invitations | provider invitations community id fkey | removida | Recria a validacao no escopo de localidade e preserva autorizacao, titularidade e visibilidade.|
| R1-622 | provider_invitations | provider invitations display name check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-623 | provider_invitations | provider invitations invitee email digest check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-624 | provider_invitations | provider invitations inviter user id fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-625 | provider_invitations | provider invitations locality id fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-626 | provider_invitations | provider invitations pkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-627 | provider_invitations | provider invitations token digest check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-628 | provider_invitations | provider invitations token digest key | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-629 | provider_invitations | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-630 | provider_invitations | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-631 | provider_reach | provider reach pkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-632 | provider_reach | provider reach provider id fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-633 | provider_reach | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-634 | provider_reach | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-635 | provider_reach | provider reach delete owner free community | mudada | Recria a validacao no escopo de localidade e preserva autorizacao, titularidade e visibilidade.|
| R1-636 | provider_reach | provider reach insert owner free community | mudada | Recria a validacao no escopo de localidade e preserva autorizacao, titularidade e visibilidade.|
| R1-637 | provider_reach | provider reach select scoped | mudada | Recria a validacao no escopo de localidade e preserva autorizacao, titularidade e visibilidade.|
| R1-638 | provider_reach | provider reach update owner free community | mudada | Recria a validacao no escopo de localidade e preserva autorizacao, titularidade e visibilidade.|
| R1-639 | provider_reach | grant ALL ON TABLE "public"."provider reach" TO "service role" | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-640 | provider_reach | grant SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."provider reach" TO "authenticated" | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-665 | reports | reports operator note check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-666 | reports | reports pkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-667 | reports | reports reason check | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-668 | reports | reports reporter user id fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-669 | reports | reports resolved by fkey | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-670 | reports | reports one open per reporter target idx | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-671 | reports | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-672 | reports | regra estrutural | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-673 | reports | reports insert authenticated | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-674 | reports | reports select reporter only | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-675 | reports | reports block self trigger | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-676 | reports | reports scrub reason before insert or update | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-677 | reports | grant SELECT,INSERT,UPDATE ON TABLE "public"."reports" TO "authenticated" | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |
| R1-678 | reports | grant SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."reports" TO "service role" | mantida | Preserva validacao, integridade ou fronteira de acesso; nenhum ADR autoriza afrouxar esta protecao. |

### Alertas de seguran?a da decis?o

- Removidas junto ?s tabelas de vila: RLS `ENABLE/FORCE` (R1-375?R1-376, R1-387?R1-388, R1-393?R1-394, R1-401?R1-402), policies e grants (R1-377?R1-379, R1-395?R1-397, R1-403, R1-406?R1-407, R1-347?R1-348). Nenhum desses objetos permanece acess?vel ap?s a migration.
- Removidos predicados/fluxos de autoriza??o que s? servem ? vila (R1-223, R1-230, R1-238?R1-239, R1-267, R1-269, R1-273, R1-276, R1-281, R1-283, R1-289, R1-295?R1-296, R1-299, R1-301, R1-308, R1-325?R1-326, R1-331, R1-333, R1-337, R1-342); gates de cidade, grupo, conta e opera??o dos dom?nios remanescentes precisam ser recriados na mesma migration quando aplic?vel.
- Mudadas as regras de audi?ncia/escopo: `provider_reach_scope` (R1-209), FK de comunidade (R1-608, R1-621), policies de alcance (R1-635?R1-638), audi?ncia/listagem (R1-515, R1-517, R1-532?R1-535) e `storage.objects` de fotos de evento (R1-350). A substitui??o exige localidade e mant?m verifica??o de dono/membership/acesso atual.
- Mudadas fun??es de leitura, convite, busca ou revoga??o que atravessam a vila e a funda??o (R1-218, R1-220?R1-221, R1-248, R1-268, R1-286, R1-302, R1-322, R1-334?R1-335); preservar checagem de conta, escopo e operador.

## 7. Testes negativos existentes

Os arquivos abaixo já contêm negativas para os contratos indicados; permanecem adaptados ao esquema novo conforme ADR-20261024 §3.5. A remoção das tabelas de vila elimina seus testes específicos, mas não as provas de conta, anúncio, mensagem, notificação, convite ou denúncia que continuam protegendo a fundação.

| Regra(s) | Prova negativa existente |
|---|---|
| R1-375–R1-379; R1-347–R1-348 | `supabase/tests/community-presentation-access.sql`, `community-images.sql`, `security-image-storage.sql`: isolamento de leitura/escrita e acesso ao bucket da vila. Estes casos de vila saem junto ao objeto; `security-image-storage.sql` e testes de storage restantes continuam para os buckets ativos. |
| R1-395, R1-403, R1-470; R1-331, R1-273, R1-325, R1-299, R1-342 | `supabase/tests/community-scope.sql`, `community-rpcs.sql`, `community-batch-approval.sql`, `community-leave-cancel.sql`, `community-join-reason.sql`, `community-owner-console-helper.sql`; `tests/e2e/community-batch-approval.spec.ts`. Protegem pedido, leitura, papel e moderação da vila; somente a parte de vila é removida. |
| R1-381, R1-385, R1-386, R1-387–R1-389; R1-267, R1-281, R1-308, R1-333 | `supabase/tests/community-invitations.sql`; `tests/e2e/community-invitations.spec.ts`. Digest, destinatário, estado e escopo do convite de vila deixam de existir; não reutilizar como autorização de prestador. |
| R1-608–R1-617; R1-154–R1-160; R1-268, R1-275, R1-284, R1-297, R1-314, R1-334, R1-346 | `supabase/tests/provider-account-boundary.sql`, `provider-revocation.sql`, `provider-member-business.sql`, `provider-member-business-transfer.sql`, `provider-contact-privacy.sql`; `supabase/tests/full-regression.sql`. Negativas preservam atestação, titularidade, revogação e privacidade após remover a vila. |
| R1-619–R1-630; R1-001–R1-012; R1-286, R1-322 | `supabase/tests/provider-invitation.sql`, `provider-invitation-read.sql`; `tests/e2e/manaus-pilot-denials.spec.ts` (seu escopo é o convite/onboarding de prestador quando aplicável). Conferem token expirado/usado, leitura pública mínima, digest e aceite por conta válida. |
| R1-631–R1-640; R1-161–R1-166; R1-220, R1-248, R1-275, R1-284, R1-334, R1-335 | `supabase/tests/provider-search-scope.sql`, `provider-showcase-scope.sql`, `provider-account-boundary.sql`. Negam busca/alcance fora da cidade ou por conta revogada; alcance `community` passa a ser negado/removido. |
| R1-514–R1-539; R1-104–R1-122; R1-218, R1-221, R1-228, R1-285, R1-329, R1-344 | `supabase/tests/listings-community-scope.sql`, `listings-locality-scope.sql`, `listing-market.sql`, `listings-moradia.sql`, `listing-lifecycle.sql`, `listing-transition-audience.sql`, `listing-alerts.sql`, `account-deletion-possession.sql`; `tests/e2e/manaus-pilot-denials.spec.ts`, `manaus-pilot-full-journey.spec.ts`, `journey-pedir-servico.spec.ts`. Negam anúncio fora da audiência, status inválido, dono alheio e acesso após exclusão; o teste de vila vira localidade. |
| R1-408–R1-418; R1-047–R1-052; R1-217, R1-229, R1-240–R1-242, R1-279, R1-287, R1-311, R1-316, R1-317, R1-336 | `supabase/tests/dm-context-allowed.sql`, `dm-context-denials.sql`, `service-request-conversation-per-request.sql`, `event-question-with-service-request.sql`, `event-questions.sql`, `service-request-open-cap.sql`; `tests/e2e/recon-032-messages.spec.ts`, `journey-pedir-servico.spec.ts`. Negam contexto não permitido, conversa fora do par e duplicação de conversa de pedido. |
| R1-540–R1-550; R1-123–R1-131; R1-228, R1-249–R1-259, R1-266, R1-293, R1-324, R1-332, R1-336, R1-340 | `supabase/tests/notification-denials.sql`, `notification-preferences-honored.sql`, `notifications-approved-events.sql`, `outbox-worker.sql`, `aviso-de-pedido.sql`, `account-deletion.sql`; `tests/e2e/recommendation-reply-notify.spec.ts`, `event-rsvp.spec.ts`. Negam leitura por não destinatário, tipo/canal desabilitado e envio sem evento elegível. O veto por bloqueio em fila ainda exige teste novo na frente D. |
| R1-665–R1-678; R1-183–R1-192; R1-264, R1-265, R1-293, R1-307, R1-330, R1-332 | `supabase/tests/reports-denials.sql`, `report-reason-scrub.sql`, `report-reporter-default.sql`, `report-resolution-unified.sql`, `reports-resolution.sql`, `reports-unified-targets.sql`, `list-open-reports.sql`, `account-deletion.sql`; `tests/e2e/reports-member-flow.spec.ts`, `reports-operator-flow.spec.ts`, `recon-032-denuncias.spec.ts`. Negam auto-denúncia, autor não denunciante lendo, scrub contornado e resolução fora de operador. Denúncia permanece disponível mesmo após bloquear. |
| R1-349–R1-350 | `supabase/tests/security-image-storage.sql`, `sec006-photo-invariants.sql`; `supabase/tests/event-photos-storage.sql` quando presente no ramo atual. Negam acesso de arquivo sem vínculo/permissão e exclusão por não proprietário. |

As negativas de eventos e respostas ligadas a grupo são ligadas também às regras R1 correspondentes em `R2-matriz-evento-pergunta.md`; esta parte trata apenas seus consumidores de fundação. Não foi encontrado E2E dedicado para todas as políticas de provider/listings; os testes pgTAP são a prova atual das fronteiras.

## 8. Consumidores

Busca feita por `rg` em `apps/web/`, `apps/mobile/`, `supabase/seed.sql` e testes. A mudança de schema exige adaptar todos os acessos abaixo e referências correlatas, sem editar tais arquivos nesta tarefa.

- **Vila e onboarding legado:** `apps/web/app/(owner)/communities/` (layout, moderation, pending, providers, actions), `apps/web/app/(shell)/communities/` (pages, actions, loaders, invites), `apps/web/lib/communities/`, `apps/web/lib/community-invite-rpcs.ts`, `apps/web/app/(preauth)/prestador-convite/[token]/page.tsx`, `apps/web/app/(shell)/cidade/[id]/`, `apps/web/app/components/bivaque/app-shell.tsx`, `apps/web/components/shell/active-nav.ts`, `apps/mobile/app/(tabs)/community.tsx`, `supabase/seed.sql`.
- **Prestador e pedidos:** `apps/web/app/(provider)/prestador/` (ações, conta, atendimento e pedidos), `apps/web/app/(shell)/prestadores/[id]/page.tsx`, `apps/web/app/(shell)/explorar/servicos/page.tsx`, `apps/web/lib/service-requests/`, páginas/admin de provider e onboarding-convite acima.
- **Anúncios e alcance:** `apps/web/app/(shell)/mercado/`, `imoveis/`, `meus-anuncios/`, `apps/web/lib/listings/` (`actions`, `client`, `highlights`, `lifecycle`, `queries`, `types`), `apps/web/app/(shell)/inicio/` (market-strip, loaders, retorno), `apps/web/app/(shell)/profile/[userId]/page.tsx`, `apps/web/lib/saves/saved-items.ts`, `supabase/seed.sql`.
- **Mensagens/notificações:** `apps/web/app/(shell)/messages/`, `pedidos/[id]/page.tsx`, `events/[id]/perguntas/`, `apps/web/app/components/bivaque/chat-thread.tsx`, `apps/web/app/(shell)/notifications/`, `apps/web/app/api/internal/outbox/route.ts`, `apps/web/app/(shell)/configuracoes/notification-channel-actions.ts`, `apps/web/lib/recommendations/trigger-label.ts`, `apps/mobile/src/auth/client.ts`, `feed-types.ts`, `publish.ts`.
- **Denúncias/exclusão/confiança:** `apps/web/app/(shell)/denuncias/`, `apps/web/app/(admin)/reports/`, `apps/web/app/api/admin/reports/[id]/route.ts`, `apps/web/lib/reports/reports.ts`, `apps/web/app/(shell)/configuracoes/trust-actions.ts`, `apps/web/app/api/internal/account-deletion/route.ts`, `apps/web/lib/rls-probe.ts`.
- **Testes e seed encontrados:** `supabase/seed.sql`; arquivos da seção 7; `tests/e2e/community-batch-approval.spec.ts`, `community-invitations.spec.ts`, `manaus-pilot-denials.spec.ts`, `manaus-pilot-full-journey.spec.ts`, `journey-pedir-servico.spec.ts`, `recon-032-messages.spec.ts`, `reports-member-flow.spec.ts`, `reports-operator-flow.spec.ts`, `recon-032-denuncias.spec.ts`, `recommendation-reply-notify.spec.ts` e `event-rsvp.spec.ts`.
- **Protótipo inspecionado:** `prototypes/bivaque-html/src/features/businesses/{catalog,detail,edit,plans}.js`; `listings/{catalog,detail,editor,filters,alerts,photos,wizard}.js`; `messaging/{views,actions,bubbles}.js`; `profile/{blocks,hidden,views,settings}.js`. Ele ancora negócio/anúncio em cidade e dono, permite contato contextual, bloqueio silencioso, denúncia, ocultação pessoal persistida no protótipo e gerenciamento pessoal. Dados locais do protótipo não substituem policy do servidor.

## 9. Perguntas ao dono

1. **A busca de prestadores fica nacional por catálogo com filtro de cidade, ou exige membership da localidade de atendimento?** O protótipo usa a cidade escolhida; ADR-20261024 remove o escopo de vila e mantém cidade. **Recomendação:** descoberta filtrada por localidade e catálogo nacional permitido; leitura de perfil só no alcance divulgado, sem transformar filtro em autorização de escrita.
2. **Membro pode criar sozinho uma página de negócio ou conta de prestador só nasce por convite/atestado do operador?** ADR-20261024 §6 diz que só operador convida e atesta; o protótipo mantém ação de indicar negócio, mas não define criação da conta atestada. **Recomendação:** permitir página de negócio não atestada conforme o protótipo, sem criar `provider_accounts` nem selo/alcance atestado; somente operador cria/ativa a conta.
3. **Aceite de convite de prestador habilita de imediato `provider_accounts`, ou ainda exige etapa de revisão do operador?** **Recomendação:** convite válido emitido pelo operador é a autorização; aceite só da conta cujo e-mail confere, e nenhuma informação do token é exposta além do necessário.
4. **`provider_reach` pode conter múltiplas localidades gratuitas/pagas simultâneas e quais transições de plano removem alcance?** Os ADRs desta frente só determinam saída de `community`; regras comerciais atuais não definem todo ciclo de escopo. **Recomendação:** manter limites e autorização atuais do serviço pago, sem ampliar escopo; permitir somente as localidades explicitamente cadastradas e verificadas pela função de alcance.
5. **Quais contextos autorizam iniciar DM direta pelo Bivaque após remover a vila?** Protótipo mostra contato por anúncio/serviço, e ADR-20261023 mantém Conversas como mensagens privadas; ele não autoriza conversa arbitrária. **Recomendação:** abrir apenas por CTA contextual validado em `dm_context_valid`; negar `shared_group` de vila e impedir DM genérica sem contexto elegível.
6. **Anúncios publicados precisam sempre de `locality_id`, inclusive rascunhos, ou rascunhos podem ficar sem audiência?** ADR-20261024 decide audiência publicada só na cidade, mas não especifica rascunho parcial. **Recomendação:** exigir localidade antes de publicar; permitir draft incompleto só ao dono e sem leitura pública, com escopo preenchido antes da transição a ativo.
7. **Qual o ciclo exato permitido ao dono para `active`, `paused`, `reserved`, `sold` e `closed`, e quando o anúncio pode ser excluído fisicamente?** O protótipo mostra editar, pausar/reativar e encerrar/excluir, mas não define todas as combinações nem retenção para denúncias. **Recomendação:** preservar `transition_listing` atual e os botões do protótipo, sem ampliar transições diretas; só exclusão física sem pendência/evidência e após retenção aprovada.
8. **Quais `report_target_type` permanecem para anúncios, negócios e mensagens, e qual visibilidade do estado/nota ao denunciante?** A interface de protótipo denuncia anúncio e página comercial, enquanto o retrato enumera tipos de reporte sem cobrir todos esses alvos. **Recomendação:** incluir apenas tipos com fluxo de moderação implementado, manter a denúncia privada ao autor e nunca revelar nota/decisão operacional.
9. **Quanto tempo manter texto e anexos da denúncia após resolver ou excluir conta/alvo?** O contrato atual protege contra acesso público, mas ADRs desta parte não definem retenção. **Recomendação:** preservar evidência restrita ao operador até o prazo de revisão definido na política de privacidade; apagar/anonymizar depois do prazo, sem a pessoa denunciada acessar.
10. **Qual destino final das funções `private.notification_type_enabled` e `private.notification_type_key` para tipos `comments` e `events` quando estas tabelas forem redesenhadas?** O gerador do retrato não lhes atribuiu IDs; ambas permanecem consumidores necessários de tipos compartilhados. **Recomendação:** manter a assinatura e a checagem da preferência, ajustar mapeamento só quando R2 das publicações/eventos fixar os tipos, sem eliminar notificação sem teste de destino.
11. **Conta suspensa ou em exclusão pode ler seus anúncios, conversas, notificações e denúncias para acompanhar resolução/saída?** ADRs mantêm suspensões e exclusão como controles da fundação, mas não detalham cada leitura. **Recomendação:** negar toda escrita e contato, permitir somente leituras próprias necessárias a retorno/encerramento e remoção de dados, sem leitura de terceiros nem reabertura de sessão privilegiada.

## Funções do retrato sem ID de regra

`private.notification_type_enabled` e `private.notification_type_key` são citadas por `R2-comum.md`, mas não aparecem com entrada `R1-xxx` no inventário de funções. Manter a validação de tipo, o escopo de preferência e a barreira de função privada; ajustar consumidores somente junto às matrizes de notificações de comentário e evento. A recomendação e a pergunta correspondente estão no item 10 acima; não se declara decisão de produto além da preservação de segurança.
