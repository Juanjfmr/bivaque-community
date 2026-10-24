# R2 — Matriz de permissão: grupos

Parte do rascunho R2, sujeita à aprovação do dono antes da migration. Atores, estados, valores de célula e contrato de bloqueio seguem [`R2-comum.md`](./R2-comum.md). O ADR aceito em 24/10/2026 elimina a vila: referências de grupo à comunidade abaixo mudam para localidade. O arquivo de protótipo é referência funcional, mas as telas de vila 40–43 não reintroduzem vila.

## 1. Objetos do grupo

`groups`, `group_memberships`, `group_join_reasons` e `group_join_attempts`, mais as funções identificadas pelo retrato como consumidoras desses objetos. `posts`, comentários, eventos, confirmações e perguntas são detalhados nas outras partes da matriz; esta parte registra quando o estado do grupo limita seus acessos.

## 2. Matriz por objeto

Nas tabelas abaixo, cada célula indica `aberto / fechado / encerrado`. “Membro” inclui dono, moderador e membro aprovado, salvo a ação administrativa que explicita papel. Grupo encerrado só é visível para quem participava dele; fica fora de busca e listas públicas. Operador acessa funções administrativas restritas, sem virar membro. `suspenso` e `em-exclusao` são estados de conta, não vínculos: qualquer leitura nessas colunas exige o mesmo vínculo/escopo e participação que autorizaria o ator equivalente, e os controles de conta podem retirar esse acesso; o estado nunca o concede. Não recebem escrita nesta proposta.

### `groups`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler apresentação e regras | sim / sim / sim | sim / sim / sim | sim / sim / sim | sim / sim / sim | sim / sim / não | sim / sim / não | não / não / não | sim se também tiver acesso autorizado ao grupo / idem / idem | sim se também tiver acesso autorizado ao grupo / idem / idem | sim / sim / sim | não / não / não |
| ler conteúdo e lista de membros | sim / sim / sim | sim / sim / sim | sim / sim / sim | sim / sim / sim | não / não / não | sim / não / não | não / não / não | sim se também for membro do grupo (Encerrado só se participou) / idem / idem | sim se também for membro do grupo (Encerrado só se participou) / idem / idem | sim / sim / sim | não / não / não |
| criar grupo | sim se verificado na cidade | sim se verificado na cidade | sim se verificado na cidade | nao | nao | sim se verificado na cidade | nao | nao | nao | so-rpc | nao |
| editar nome, descrição, regras e aberto/fechado | sim / sim / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc / so-rpc / so-rpc | nao / nao / nao |
| pedir reabertura / reabrir | nao / nao / sim se dono, sem prazo no protótipo | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc / so-rpc / so-rpc | nao / nao / nao |
| encerrar | sim / sim / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc / so-rpc / so-rpc | nao / nao / nao |
| excluir fisicamente | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc / so-rpc / so-rpc | nao / nao / nao |
| moderar apresentação do grupo | sim / sim / nao | sim / sim / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc / so-rpc / so-rpc | nao / nao / nao |

### `group_memberships`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler vínculo/roster | sim / sim / sim | sim / sim / sim | sim / sim / sim | sim / sim / sim | nao / nao / nao | sim / nao / nao | nao / nao / nao | sim se também tiver vínculo autorizado / idem / idem | sim se também tiver vínculo autorizado / idem / idem | sim / sim / sim | nao / nao / nao |
| entrar em grupo Aberto | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | sim / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc | nao |
| pedir entrada em grupo Fechado | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / sim / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc | nao |
| cancelar próprio pedido | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / sim / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc | nao |
| aprovar ou recusar pedido | nao / sim / nao | nao / sim / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc / so-rpc / so-rpc | nao / nao / nao |
| sair do grupo | sim se transferiu dono / sim se transferiu dono / nao | sim / sim / nao | sim / sim / nao | sim / sim / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc | nao |
| remover membro | sim / sim / nao | sim / sim / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc / so-rpc / so-rpc | nao |
| promover/rebaixar moderador | sim / sim / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc / so-rpc / so-rpc | nao |
| transferir propriedade | sim / sim / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc / so-rpc / so-rpc | nao |
| editar aviso individual | sim / sim / nao, apenas o próprio vínculo | sim / sim / nao, apenas o próprio vínculo | sim / sim / nao, apenas o próprio vínculo | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao | nao / nao / nao |

### `group_join_reasons`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler o próprio motivo | nao / sim / nao | nao / sim / nao | nao / nao / nao | nao / nao / nao | nao / sim / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc | nao |
| ler motivo de outra pessoa | nao / sim / nao, somente quem decide | nao / sim / nao, somente quem decide | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc | nao |
| criar/editar próprio motivo | nao / sim / nao, opcional e durante pedido pendente | nao / sim / nao, enquanto pendente | nao / nao / nao | nao / nao / nao | nao / sim / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc | nao |
| apagar após decisão ou expiração | so-rpc / so-rpc / so-rpc | so-rpc / so-rpc / so-rpc | so-rpc / so-rpc / so-rpc | so-rpc / so-rpc / so-rpc | so-rpc / so-rpc / so-rpc | so-rpc / so-rpc / so-rpc | so-rpc / so-rpc / so-rpc | so-rpc / so-rpc / so-rpc | so-rpc / so-rpc / so-rpc | so-rpc | nao / nao / nao |

### `group_join_attempts`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler ou escrever tentativas | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc | nao |
| consumir tentativa válida | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / sim / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | nao / nao / nao | so-rpc | nao |

## 3. Permissão por coluna

- `groups`: cidade e participantes leem `id`, `locality_id`, `name`, `description`, `rules`, `visibility` e datas de apresentação conforme a matriz. Só o criador envia `created_by` e `owner_user_id` ao criar; ambos ficam imutáveis por UPDATE direto. Só RPCs autorizadas alteram nome, descrição, regras e visibilidade. O grupo pertence a uma única cidade. `community_id` sai. O estado de encerramento fica em campo de estado dedicado, em vez de `is_deleted`; apenas o admin pode pedir encerramento/reabertura conforme transição aprovada.
- `group_memberships`: `user_id`, `group_id`, `joined_at`, `role` e `status` são leitura segundo a matriz; participante lê apenas suas próprias preferências `notify_level`. Papel e status nunca aceitam UPDATE direto: entrada, aprovação, remoção, moderação e transferência passam por RPCs. O usuário só altera seu próprio `notify_level` por RPC.
- `group_join_reasons`: texto privado ao solicitante e aos responsáveis por aprovar; nunca é público nem visível a membros em geral. Texto é opcional no pedido. Quando enviado, permanece de 1 a 300 caracteres; ausência do motivo é representada sem linha. Decisão apaga o motivo, assim como a rotina de retenção para pendências vencidas.
- `group_join_attempts`: sem SELECT/INSERT/UPDATE/DELETE direto por papéis de usuário; o mecanismo interno consome a tentativa e mantém o limite de três pedidos por grupo a cada 30 dias. Sem exposição de contagem ou histórico a membros.

## 4. Transições

- Grupo novo nasce `aberto` ou `fechado`, associado à localidade do criador verificado. Nome, descrição, regra e privacidade são validados no servidor. Limites de nome e descrição ficam em pergunta ao dono abaixo, pois o protótipo diverge do CHECK atual.
- `aberto → fechado` e `fechado → aberto`: somente dono/admin via RPC. Conteúdo passa a ser somente para membros em fechado; pedidos pendentes são tratados sem conceder acesso indevido. Nenhum update pode trocar `locality_id`, criador ou proprietário.
- `aberto|fechado → encerrado`: somente dono/admin via RPC; limpa pedidos pendentes, remove o grupo de busca/listas e conserva leitura somente a quem participava. Reabrir é ação do admin. O protótipo mostra prazo de 30 dias para reabrir/leitura, mas o ADR aceito diz encerramento sem prazo; consultar pergunta ao dono e manter acesso read-only até decisão, sem purgar conteúdo.
- Entrada Aberta concede status ativo imediatamente. Pedido Fechado cria status pendente, sem leitura do conteúdo. Aprovação é só do dono/moderador; recusa/cancelamento/decisão removem o motivo. A tentativa conta para o teto de três pedidos em 30 dias. Convite é link de navegação, nunca concessão de associação.
- Saída do dono exige transferir propriedade a outro membro antes de apagar o vínculo. Papel `owner` segue o proprietário; promoção/rebaixamento de moderador e transferência só por RPC. Ninguém promove a si mesmo nem altera `user_id`, `group_id`, `role` ou `status` por UPDATE.
- Sair/remover do grupo encerra a leitura de conteúdo e eventos privados para aquela pessoa. A participação em grupo encerrado não permite voltar a escrever. A semântica exata de retenção/retorno ao grupo depois de sair é pergunta ao dono.
- Um evento de grupo, publicação ou aviso fixado não pode escapar do escopo/privacidade do grupo. Toda leitura/escrita aplicável consulta o contrato `private.block_allows` da seção 5 de `R2-comum.md`; notificações de admissão, fixação e publicação também consultam `notificar`. Denúncia não consulta bloqueio; operador não é afetado; “Ver mesmo assim” só altera a leitura de detalhe de quem bloqueou.

## 5. Bloqueio

| Ação/consumidor | Consulta |
|---|---|
| Ler grupo e conteúdo do membro autor | `private.block_allows(actor, author, 'ler')`; metadados do grupo sem conteúdo seguem escopo de cidade/membership. |
| Publicar/comentar/responder/reagir | `private.block_allows(actor, autor, 'responder'/'comentar'/'reagir')` conforme o objeto. |
| Abrir/continuar conversa pelo contexto de grupo | `private.block_allows(actor, counterpart, 'contatar')`. |
| Aprovar/remover membro, administrar ou denunciar | Sem bloqueio para operador; denúncias nunca consultam bloqueio. Para ações entre membros, o bloqueio não retira poderes de moderação sem decisão expressa. |
| `notify_group_admission`, `notify_group_pin`, `notify_group_post` e `notify_comment` | Antes de inserir/enviar, `private.block_allows(actor, destinatário, 'notificar')`; entrega também confere itens já enfileirados. |

## 6. Regras do retrato

Cada ID abaixo vem da seção correspondente de [`R1-retrato.md`](./R1-retrato.md). Regras repetidas por funções compartilhadas conservam a mesma decisão em todas as tabelas. “Mantida” preserva a proteção enquanto o objeto/função é redesenhado; “mudada” registra a substituição. Nenhuma proteção de acesso é descartada por inferência.

| ID | objeto | o que protege, em uma linha | decisão | motivo |
|---|---|---|---|---|
| R1-078 | group_join_attempts | instante da tentativa | mantida | Registro interno conserva janela de 30 dias. |
| R1-079 | group_join_attempts | vínculo da tentativa ao grupo | mantida | Contagem continua isolada por grupo. |
| R1-080 | group_join_attempts | identidade da tentativa | mantida | Chave única continua necessária à integridade. |
| R1-081 | group_join_attempts | vínculo da tentativa à conta | mantida | Tentativas continuam por usuário. |
| R1-459 | group_join_attempts | FK do grupo com cascade | mantida | Integridade e limpeza acompanham a exclusão operacional do grupo. |
| R1-460 | group_join_attempts | PK da tentativa | mantida | Evita duplicidade de identidade. |
| R1-461 | group_join_attempts | FK da conta com cascade | mantida | Evita histórico órfão após exclusão da conta. |
| R1-462 | group_join_attempts | RLS habilitada | mantida | Tentativas seguem fora do alcance direto de usuários. |
| R1-463 | group_join_attempts | RLS forçada | mantida | Mantém a barreira também para owners não privilegiados. |
| R1-464 | group_join_attempts | grant operacional a service_role | mantida | A tabela continua restrita à operação interna; sem grant de usuário. |
| R1-224 | consume_group_join_attempt | contabiliza tentativa | mantida | Preserva o limite de pedidos no fluxo interno. |
| R1-082 | group_join_reasons | data de criação do motivo | mantida | Necessária à expiração/limpeza. |
| R1-083 | group_join_reasons | grupo do motivo | mantida | Motivo continua vinculado a um pedido de grupo. |
| R1-084 | group_join_reasons | texto obrigatório quando há linha | mantida | Motivo é opcional por ausência da linha; texto presente continua válido. |
| R1-085 | group_join_reasons | autor do motivo | mantida | Mantém privacidade e acesso próprio. |
| R1-465 | group_join_reasons | FK composta ao vínculo | mantida | Motivo só existe enquanto existir pedido/vínculo correspondente. |
| R1-466 | group_join_reasons | chave única por grupo e usuário | mantida | Um motivo por pedido ativo. |
| R1-467 | group_join_reasons | texto entre 1 e 300 caracteres | mantida | Motivo enviado segue limite; opcionalidade é não criar linha. |
| R1-468 | group_join_reasons | RLS habilitada | mantida | Motivo continua privado. |
| R1-469 | group_join_reasons | RLS forçada | mantida | Nenhum caminho de tabela ignora a política. |
| R1-470 | group_join_reasons | leitura só por autor ou moderador | mantida | Continua restrito ao solicitante e a quem decide o pedido. |
| R1-471 | group_join_reasons | grant total apenas a service_role | mantida | Operação interna permanece privilegiada. |
| R1-472 | group_join_reasons | SELECT autenticado sujeito à RLS | mantida | A policy continua limitando a leitura. |
| R1-262 | purge_stale_group_join_reasons | apaga motivos vencidos | mantida | Mantém o limite de 30 dias do ADR-20261023. |
| R1-274 | approve_group_member | decide pedido e remove motivo | mantida | Aprovação/decisão permanece ação restrita e limpa dado privado. |
| R1-298 | join_group | controla entrada/pedido | mudada | Passa a usar grupo por localidade e estados Aberto/Fechado/Encerrado, preservando verificação, limite e autorização. |
| R1-086 | group_memberships | grupo do vínculo | mantida | Chave do escopo de associação permanece. |
| R1-087 | group_memberships | data de entrada | mantida | Necessária a “Meus grupos” e à história da participação. |
| R1-088 | group_memberships | preferência privada de aviso | mantida | Valores Tudo/Destaques/Nada seguem o protótipo. |
| R1-089 | group_memberships | papel do vínculo | mantida | Dono/moderador/membro permanecem; alteração só por RPC. |
| R1-090 | group_memberships | estado do vínculo | mudada | Deve distinguir ativo e pedido pendente; encerramento é estado do grupo, não associação concedida. |
| R1-091 | group_memberships | usuário do vínculo | mantida | Associação continua por conta e não pode ser transferida. |
| R1-473 | group_memberships | FK do grupo com cascade | mantida | Preserva integridade referencial. |
| R1-474 | group_memberships | unicidade grupo/usuário | mantida | Impede associações e pedidos duplicados simultâneos. |
| R1-475 | group_memberships | FK do usuário com cascade | mantida | Evita associação órfã após exclusão de conta. |
| R1-476 | group_memberships | RLS habilitada | mantida | Associação continua protegida por linha. |
| R1-477 | group_memberships | RLS forçada | mantida | Impede bypass por owner sem privilégio. |
| R1-478 | group_memberships | remoção por moderador | mudada | Restrita a RPC que verifica papel, estado e transfere/retira vínculo corretamente; sem DELETE direto. |
| R1-479 | group_memberships | saída própria | mudada | Fluxo protegido passa por RPC, com transferência obrigatória para dono. |
| R1-480 | group_memberships | visibilidade dos vínculos | mudada | Aberto expõe participação autorizada; Fechado limita roster a membros; Encerrado só a participantes anteriores. |
| R1-481 | group_memberships | impede associação incompatível com vila | removida | A vila deixa de existir; entra validação de vínculo com localidade na regra de entrada. |
| R1-482 | group_memberships | aplica limite de pedidos | mantida | Continua impedindo contorno do limite por INSERT direto. |
| R1-483 | group_memberships | notifica decisão de admissão | mantida | Feedback ao solicitante permanece; trigger consulta bloqueio antes de notificar. |
| R1-484 | group_memberships | DELETE autenticado | mudada | Grant direto é revogado; saída/remoção usam RPC autorizada. |
| R1-485 | group_memberships | privilégios operacionais service_role | mantida | Operação interna mantém grant sem ampliar usuário. |
| R1-486 | group_memberships | leitura de group_id | mantida | Coluna só é retornada sob RLS. |
| R1-487 | group_memberships | leitura de joined_at | mantida | Coluna só é retornada sob RLS. |
| R1-488 | group_memberships | leitura de role | mantida | Papel é visível sob RLS e nunca editável diretamente. |
| R1-489 | group_memberships | leitura de status | mantida | Estado é visível sob RLS e nunca editável diretamente. |
| R1-490 | group_memberships | leitura de user_id | mantida | Identidade do roster segue a regra de visibilidade do grupo. |
| R1-200 | group_membership_role | valores de papel | mantida | Papéis atuais seguem úteis; atribuição só por RPC autorizada. |
| R1-201 | group_membership_status | valores de status | mudada | Precisa refletir pedido/ativo e os estados definidos para associação no novo fluxo. |
| R1-202 | group_notify_level | opções de aviso | mantida | `all`, `highlights`, `none` correspondem a Tudo, Destaques e Nada. |
| R1-217 | can_dm_between | autorização de conversa contextual | mudada | Só autoriza se as duas pessoas ainda podem ler agora o objeto contextual, além de aplicar bloqueio. |
| R1-219 | can_receive_invite_to_event | elegibilidade por evento/grupo | mudada | Remove a vila e valida elegibilidade conforme os estados novos do grupo; adaptação do auxiliar ocorre na mesma migration. |
| R1-222 | cascade_community_membership_downgrade | cascata de perda de acesso da vila | removida | A vila e sua associação deixam o produto e o banco nesta leva. |
| R1-223 | cascade_community_membership_loss | cascata de perda de acesso da vila | removida | Não há associação à vila para propagar; demais consumidores de grupo devem usar regras diretas. |
| R1-229 | dm_context_valid | valida contexto de conversa | mudada | Revalida no corpo se as duas pessoas ainda podem ler agora o grupo contextual; vínculos históricos não bastam. |
| R1-233 | group_notify_allows | destinatário/preferência de notificação | mantida | Preferência continua pessoal; entrega também verifica bloqueio. |
| R1-237 | indication_recipients | destinatários de pergunta em grupo | mudada | Considera membro ativo, grupo Aberto e localidade correspondente ao “Também perguntar à cidade”. |
| R1-244 | is_group_member | identifica membro ativo | mantida | Baseia acesso em vínculo ativo, não em pedido pendente. |
| R1-245 | is_group_moderator | identifica moderador/dono | mantida | Mantém autoridade administrativa sem autoelevação. |
| R1-246 | is_group_owner | identifica dono atual | mantida | Mantém verificação de dono, alinhada à transferência por RPC. |
| R1-254 | notify_group_pin | avisa sobre publicação fixada | mantida | Mantém evento de notificação e acrescenta consulta de bloqueio. |
| R1-255 | notify_group_post | avisa nova publicação | mantida | Mantém preferência por grupo e consulta bloqueio antes de notificar. |
| R1-270 | add_group_moderator | nomeia moderador | mudada | A RPC autoriza somente `private.is_group_owner`; moderador não pode promover membros. |
| R1-282 | create_group | cria grupo | mudada | Criação passa a exigir membro verificado da localidade e estado Aberto/Fechado, sem vila. |
| R1-283 | create_group_in_community | cria grupo dentro da vila | removida | A hierarquia intermediária é removida; grupos pertencem diretamente à cidade. |
| R1-289 | feed_community | feed da vila | removida | A vila sai; o feed de grupos permanece na função própria. |
| R1-290 | feed_following | feed seguido | mudada | Retira ramos de vila e aplica acesso de grupo e bloqueio em cada item. |
| R1-291 | feed_group | leitura do feed do grupo | mudada | Aplica os três estados, membership e bloqueio; encerrado é leitura só por participante. |
| R1-292 | feed_posts | leitura agregada de publicações | mudada | Remove escopo de vila e não contorna visibilidade do grupo. |
| R1-293 | finalize_account_deletion | limpeza de vínculos da conta | mudada | Mantém limpeza de associações/grupos, removendo somente ramos da vila conforme ADR. |
| R1-300 | list_available_groups_for_interests | sugestão/lista de grupos por interesse | mudada | Mantém filtro de localidade, não expõe conteúdo fechado e exclui grupos Encerrados dos resultados. |
| R1-315 | my_group_notify_level | lê preferência individual | mantida | Retorna apenas a preferência do próprio usuário. |
| R1-320 | profile_posts_for | posts do perfil condicionado a grupo | mudada | O corpo usa `private.can_access_post` (ou os mesmos filtros) e `private.block_allows(..., 'ler')`. |
| R1-327 | remove_group_moderator | remove moderador | mudada | A RPC autoriza somente `private.is_group_owner`; moderador não pode rebaixar moderadores. |
| R1-338 | set_group_notify_level | altera aviso individual | mantida | RPC altera somente preferência do chamador no próprio vínculo ativo. |
| R1-340 | settle_account_possessions | transfere/encerra posses na conta | mudada | Mantém tratamento de grupo e retira operações específicas de vila; detalhe de encerramento da conta fica fora desta matriz. |
| R1-341 | suggest_groups_for_user | sugere grupos | mudada | Sem exposição de conteúdo fechado e com grupos Encerrados excluídos dos resultados. |
| R1-343 | transfer_group_ownership | transfere propriedade | mantida | Mantém transferência explícita para outro membro antes da saída do dono. |
| R1-092 | groups | FK opcional para vila | removida | `community_id` sai na mesma leva que a vila. |
| R1-093 | groups | data de criação | mantida | Metadado de grupo continua. |
| R1-094 | groups | autor da criação | mantida | Auditoria/atribuição continua vinculada à conta criadora. |
| R1-095 | groups | descrição opcional | mantida | Descrição é visível conforme a regra de descoberta. |
| R1-096 | groups | identidade do grupo | mantida | Chave primária permanece estável. |
| R1-097 | groups | exclusão lógica por is_deleted | mudada | Substituída por estado `encerrado`, sem exclusão ordinária e com leitura conforme ADR. |
| R1-098 | groups | localidade obrigatória | mantida | Relação direta cidade/grupo é a estrutura aprovada. |
| R1-099 | groups | nome obrigatório | mantida | Nome continua obrigatório; limites aguardam decisão. |
| R1-100 | groups | usuário proprietário | mantida | Dono permanece explícito e só muda por transferência RPC. |
| R1-101 | groups | publicação fixada | mantida | Fixação referencia publicação do próprio grupo e segue RPC/guard. |
| R1-102 | groups | regras do grupo | mantida | Regras continuam parte da apresentação e gestão do grupo. |
| R1-103 | groups | visibilidade public/private | mudada | Valores viram Aberto/Fechado, com estado Encerrado e suas regras próprias. |
| R1-491 | groups | FK de community_id | removida | Vila sai, logo não há vínculo de grupo para comunidade. |
| R1-492 | groups | mesma localidade da comunidade | removida | Constraint de vila é desnecessária; locality_id direto permanece obrigatório. |
| R1-493 | groups | FK do criador para conta | mantida | Integridade e ciclo de vida da conta são mantidos. |
| R1-494 | groups | limite de descrição | mudada | Limite do protótipo (300) diverge de 500 atual; mudança aguarda resposta do dono. |
| R1-495 | groups | FK de localidade | mantida | Grupo continua ligado a localidade válida. |
| R1-496 | groups | limite de nome | mudada | Protótipo usa 3–60; schema usa 2–80; mudança aguarda resposta do dono. |
| R1-497 | groups | FK do proprietário | mantida | Dono permanece conta válida. |
| R1-498 | groups | FK da publicação fixada | mantida | Mantém integridade; regra também garante post do próprio grupo. |
| R1-499 | groups | PK do grupo | mantida | Identidade continua única. |
| R1-500 | groups | limite das regras | mantida | Limite 600 coincide com o protótipo; conteúdo segue editável só pelo admin. |
| R1-501 | groups | RLS habilitada | mantida | A tabela continua protegida por RLS. |
| R1-502 | groups | RLS forçada | mantida | A proteção continua inclusive contra owner comum. |
| R1-503 | groups | DELETE pelo dono | mudada | Exclusão é substituída por encerrar via RPC, sem DELETE autenticado. |
| R1-504 | groups | INSERT por membro verificado e criador/dono | mantida | Mantém criação restrita e identidade não falsificável. |
| R1-505 | groups | leitura por membro da localidade/comunidade | mudada | Remove teste da vila e discrimina resumo, conteúdo e encerramento por estado. |
| R1-506 | groups | UPDATE por dono | mudada | Atualização direta é limitada; transições e colunas sensíveis passam por RPC. |
| R1-507 | groups | bloqueia mudança de comunidade | removida | `community_id` deixa de existir; localidade permanece imutável. |
| R1-508 | groups | bloqueia soft delete autenticado | mudada | `is_deleted` sai; preserva-se proteção contra alteração direta do estado de encerramento. |
| R1-509 | groups | valida publicação fixada | mantida | Continua impedindo fixar conteúdo alheio/de outro grupo. |
| R1-510 | groups | notifica mudança de fixação | mantida | Mantém aviso, com bloqueio consultado antes da entrega. |
| R1-511 | groups | SELECT/INSERT/UPDATE autenticado | mudada | Mantém apenas privilégios necessários a operações protegidas; colunas/transições sensíveis ficam em RPC. |
| R1-512 | groups | privilégios operacionais service_role | mantida | Operação mantém os grants necessários sem ampliar acesso do usuário. |
| R1-513 | groups | UPDATE de is_deleted por service_role | removida | Coluna `is_deleted` é substituída pelo estado de encerramento e guardas/RPC correspondentes. |
| R1-203 | group_visibility | valores public/private | mudada | Enum passa a representar Aberto/Fechado; Encerrado é estado distinto do ciclo de vida. |
| R1-214 | can_access_event | acesso a evento de grupo | mudada | Remove dependência da vila e aplica visibilidade/estado do grupo e bloqueio. |
| R1-216 | can_access_post_scope | autorização do escopo de post | mudada | Retira vila e mantém validação de que post pertence ao grupo autorizado. |
| R1-226 | dispatch_indication_alerts | alertas de pergunta ligada a grupo | mudada | Só grupo Aberto, membro ativo e localidade coincidente podem gerar pergunta municipal. |
| R1-230 | enforce_group_community_membership | exige participação na vila | removida | Vila sai; regra substituída por localidade e membership de grupo sem pré-requisito de vila. |
| R1-231 | enforce_group_join_attempt_limit | bloqueia excesso de pedidos | mantida | Conserva limite de três tentativas em 30 dias. |
| R1-264 | reports_block_self | impede denúncia própria | mantida | Proteção contra autorrelato permanece no conteúdo de grupo. |
| R1-288 | delete_group | exclusão física/lógica de grupo | mudada | Operação é substituída por encerrar sem exclusão; autorização administrativa permanece. |
| R1-303 | list_group_activity | atividade por grupo/localidade | mudada | Como SECURITY DEFINER não passa pela RLS: contar somente publicações legíveis pelo leitor, considerando estado do grupo, visibilidade, conteúdo não removido e `block_allows(ler)`. |
| R1-305 | list_indications | inclui origem de pergunta em grupo | mudada | Leitura passa a aceitar origem dupla somente conforme regra do ADR-20261024. |
| R1-307 | list_open_reports | resolve alvo de denúncia do grupo | mantida | Operador autorizado conserva acesso à evidência necessária. |
| R1-318 | pin_group_post | fixa publicação do grupo | mantida | Ação segue restrita ao admin e à publicação do mesmo grupo. |
| R1-323 | record_user_group_interests | grava interesses usados em sugestão | mantida | Mantém seleção de interesse existente sem ampliar leitura de grupos. |
| R1-332 | resolve_report | resolve denúncia de conteúdo de grupo | mantida | Operador conserva ação restrita e evidência de moderação. |
| R1-339 | set_group_rules | edita regras do grupo | mantida | RPC segue restrita ao dono/admin e valida limite. |
| R1-345 | unpin_group_post | remove fixação | mantida | Ação segue restrita e preserva integridade do post. |

## 7. Testes negativos existentes

Cada referência é evidência atual a adaptar ao esquema novo; o ADR manda conservar os negativos do domínio.

| ID(s) | Testes que provam a regra hoje |
|---|---|
| R1-501–R1-502, R1-511–R1-513, R1-476–R1-490 | `supabase/tests/group-base.sql`, `supabase/tests/groups-public-private.sql`, `supabase/tests/rls-or-column-regression.test.sql` |
| R1-503–R1-506, R1-478–R1-480 | `supabase/tests/group-admin-cycle.sql`, `supabase/tests/group-membership-self-visibility.sql`, `supabase/tests/community-scope.sql` |
| R1-504, R1-495–R1-496, R1-493, R1-497 | `supabase/tests/group-base.sql`, `supabase/tests/groups-private-and-moderation-denials.sql` |
| R1-224, R1-231, R1-459–R1-464, R1-482 | `supabase/tests/group-join-reason.sql` (inclui teto e escrita direta), `supabase/tests/group-join-status.sql`, `supabase/tests/groups-private-and-moderation-denials.sql` |
| R1-262, R1-465–R1-472 | `supabase/tests/group-join-reason.sql` (privacidade, validade e limpeza do motivo) |
| R1-274, R1-298, R1-478–R1-484 | `supabase/tests/group-join-reason.sql`, `supabase/tests/group-admin-cycle.sql`, `supabase/tests/group-join-status.sql` |
| R1-270, R1-327, R1-343 | `supabase/tests/group-admin-cycle.sql`, `tests/e2e/group-admin-cycle.spec.ts` |
| R1-282, R1-283, R1-504 | `supabase/tests/group-base.sql`, `supabase/tests/community-scope.sql` |
| R1-291, R1-300, R1-341 | `supabase/tests/groups-public-private.sql`, `supabase/tests/user-group-interests.sql`, `tests/e2e/groups-state-truth.spec.ts` |
| R1-293, R1-340 | `supabase/tests/account-deletion.sql`, `supabase/tests/account-deletion-possession.sql`, `supabase/tests/transfer-degradation.sql` |
| R1-214, R1-219, R1-216, R1-244–R1-246 | `supabase/tests/event-rsvp-scope.sql`, `supabase/tests/group-event-server-actions-snapshot.sql`, `supabase/tests/group-event-detail-denials.sql` |
| R1-237, R1-305 | `supabase/tests/aviso-de-pedido.sql`, `supabase/tests/community-feed-denials.sql` |

E2E relacionado: `tests/e2e/group-base.spec.ts`, `group-join-reason.spec.ts`, `group-admin-cycle.spec.ts`, `groups-state-truth.spec.ts`, `group-event-detail-denials.spec.ts` e `event-invites.spec.ts`. Os cenários de motivo devem passar a aceitar ausência; nenhum teste de vila sobrevive como contrato de grupo.

## 8. Consumidores

- **Web direto:** `apps/web/app/(shell)/groups/page.tsx`, `groups/[id]/page.tsx`, `groups/[id]/group-join-requests.tsx`, `groups/[id]/join-request-actions.ts`, `apps/web/lib/security/group-access.ts`, `apps/web/lib/user-group-interests-rpcs.ts`, `apps/web/app/(shell)/profile/interests-section.tsx`, `profile/interests-actions.ts`, `apps/web/app/components/bivaque/feed-post-create.tsx`, `feed-post-audience.tsx`, `feed-post-card.tsx`, `feed-post.tsx`, `feed-right-rail.tsx`, `apps/web/app/(shell)/recommendations/page.tsx`, `explorar/busca/page.tsx`, `notifications/page.tsx`, `notifications/deep-links.ts`, `messages/conversation-inbox.tsx`, `inicio/return-strip.tsx`, `apps/web/app/(admin)/reports/targets.ts` e `apps/web/lib/reports/reports.ts`. Fluxos legados que citam vila/grupos e precisam ser retirados ou redirecionados: `apps/web/app/(shell)/communities/[id]/community-detail-data.ts`, `community-detail-loaders.ts`, `community-detail-screen.tsx`.
- **Web com referências textuais/auxiliares:** `apps/web/app/landing/landing.tsx`, `apps/web/app/(preauth)/onboarding/welcome/page.tsx`, `apps/web/app/components/shell/active-nav.ts`, `apps/web/lib/security/sanitize-next.ts`, `apps/web/app/components/bivaque/illustrations.tsx` e `apps/web/app/fonts/material-symbols-outlined-subset.txt`; revisar só se a busca confirmar que a referência trata de rota/copy de grupos.
- **Mobile:** `apps/mobile/app/(tabs)/groups.tsx`, `apps/mobile/app/(tabs)/_layout.tsx`; documentação referencial em `apps/mobile/README.md`.
- **Seed:** `supabase/seed.sql` cria grupos e `group_memberships`; ajustar para cidade/localidade, estados e papéis novos.
- **Testes/fixtures com referência ao objeto:** `supabase/tests/fixtures/{groups,communities,dm,regression,notifications,reports}.inc`, `supabase/tests/group-*.sql`, `groups-*.sql`, `community-scope.sql`, `event-rsvp-scope.sql`, `account-deletion*.sql`, `transfer-degradation.sql`, `user-group-interests.sql` e os E2E listados acima. A busca ampla também encontra estes testes de outras áreas por contexto de grupo: `supabase/tests/{aviso-de-pedido,community-feed-denials,community-feed-happy-path,community-feed-locality-reach,community-leave-cancel,community-presentation-access,dm-context-denials,event-invite-fanout,event-invite-rpc-exposure,event-questions,event-photos-storage,events-rsvp,full-regression,other-member-profile,post-scope-leak,provider-account-boundary,recommendations-health-scope,recommendations-reply-cycle,reports-denials,reports-resolution,rls-or-column-regression.test,transfer-scope-denials}.sql` e `tests/e2e/{close-label-ptbr,ds-029-conformance-probes,group-event-detail-denials,inicio-sem-feed,locale-copy-diacritics,manaus-pilot-denials,manaus-pilot-full-journey,onboarding-denials,reports-member-flow,synthetic-people-interaction,user-group-interests}.spec.ts`; a presença de um contexto de grupo não os torna todos testes de autorização destas quatro tabelas.

## 9. Perguntas ao dono

1. **Prazo de encerramento:** o protótipo diz leitura por 30 dias e janela de 30 dias para reabrir; o ADR aceito decide encerramento “sem prazo” e só leitura para antigos participantes, sem confirmar prazo. **Recomendação:** adotar o ADR: leitura sem expiração e reabertura sem prazo até decisão explícita, sem exclusão automática.
2. **Alcance de grupos Fechados:** o ADR diz que não membro vê nome, descrição e regras, sem explicitar se outra cidade pode ver esses metadados. **Recomendação:** limitar a descoberta à localidade selecionada e negar a outra cidade; publicar conteúdo só a membro aprovado.
3. **Suspensão/exclusão de conta:** não há regra específica para leitura, pedido pendente e saída de grupos para esses atores. **Recomendação:** suspenso e conta em exclusão não criam, entram, pedem, editam, moderam nem são aprovados; preservar leitura apenas se ainda autorizada pelo estado/membership, sem expor motivo de pedido.
4. **Prazos e limites de campos:** protótipo usa nome 3–60, descrição até 300, regras até 600 e aviso fixado de até 300; retrato atual usa nome 2–80, descrição até 500, regras até 600, e não há limite de fixação no objeto `groups`. **Recomendação:** adotar limites explícitos do protótipo para nome/descrição/aviso fixado e manter regras em 600.
5. **Reabrir grupo encerrado:** o protótipo limita a 30 dias; ADR diz encerramento sem prazo. **Recomendação:** usar a decisão mais recente do ADR, reabertura pelo admin sem prazo.
6. **Ler metadados de grupos de outra cidade:** atores incluem `outra-cidade`, mas o ADR não define descoberta nacional versus local. **Recomendação:** não conceder acesso transversal; negar até haver escolha explícita de escopo nacional.
7. **Interesses e funções de sugestão:** seletor de interesses e sugestões ficam fora do lote; o ADR não diz se `list_available_groups_for_interests`, `suggest_groups_for_user` e `record_user_group_interests` são removidos ou permanecem sem interface. **Recomendação:** preservar funções e grants atuais, sem usá-las como requisito para descobrir grupos nesta leva; removê-las só em decisão posterior.
8. **Saída e leitura posterior:** ADR diz que publicação continua no grupo ao sair, e que quem não participa de Fechado não lê conteúdo, mas não descreve leitura de posts próprios após saída. **Recomendação:** aplicar imediatamente o controle do grupo: saiu, deixa de ler o conteúdo privado; conservar autoria e conteúdo visível aos membros restantes.

