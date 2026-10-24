# R2 — Matriz de permissão: evento e pergunta

Parte do rascunho R2, sujeita à aprovação do dono antes da migration. Atores, estados, valores de célula e contrato do bloqueio seguem [`R2-comum.md`](./R2-comum.md). A fonte funcional é o protótipo; o ADR-20261024 redesenha o domínio e mantém o evento da cidade fora do redesenho, enquanto muda o evento ligado a grupo para herdar o acesso do grupo.

## 1. Objetos do grupo

`events`, `event_rsvps` e `recommendation_requests`, mais todas as funções listadas no retrato como consumidoras desses objetos. O evento de cidade permanece no produto; evento de grupo só é lido por quem pode ler o grupo. Pergunta de indicação pode ter origem na cidade, no grupo aberto ou em ambos.

## 2. Matriz por objeto

Em cada célula de evento, a ordem é `aberto / fechado / encerrado`. Para evento sem `group_id`, o acesso segue a cidade e as proteções atuais de membro verificado/ativo. Para evento com `group_id`, aplica-se o estado e o vínculo de participação do grupo. `pedido-pendente` não é membro. `suspenso` e `em-exclusao` são estados de conta, não papéis: qualquer `sim` nessas colunas pressupõe o mesmo vínculo/escopo do ator equivalente, sujeito aos controles de conta, que só podem retirar permissões. Operador administra por funções autorizadas e não ganha visibilidade de conteúdo por ser operador.

### `events`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler evento de grupo | sim / sim / sim | sim / sim / sim | sim / sim / sim | sim / sim / sim | não / não / não | sim / não / não | não / não / não | sim se também for membro do grupo (Encerrado só se participou) / idem / idem | sim se também for membro do grupo (Encerrado só se participou) / idem / idem | não / não / não | não / não / não |
| ler evento da cidade | sim / sim / sim | sim / sim / sim | sim / sim / sim | sim / sim / sim | sim / sim / sim | sim se membro elegível da cidade / idem / idem | não / não / não | sim se também for membro elegível da cidade / idem / idem | sim se também for membro elegível da cidade / idem / idem | não / não / não | não / não / não |
| criar evento de grupo | sim se ativo no grupo / idem / não | sim se ativo no grupo / idem / não | sim se ativo no grupo / idem / não | não / não / não | não / não / não | sim se grupo aberto ou fechado da própria cidade e participante verificado / não / não | não / não / não | não / não / não | não / não / não | so-rpc | não / não / não |
| criar evento da cidade | sim se membro verificado e ativo da cidade / idem / idem | sim se membro verificado e ativo da cidade / idem / idem | sim se membro verificado e ativo da cidade / idem / idem | não / não / não | não / não / não | sim se membro verificado e ativo da cidade / idem / idem | não / não / não | não / não / não | não / não / não | so-rpc | não / não / não |
| editar | sim se organizador / idem / não | sim se organizador / idem / não | sim se organizador / idem / não | não / não / não | não / não / não | sim se organizador / idem / idem | não / não / não | não / não / não | não / não / não | so-rpc | não / não / não |
| cancelar ou excluir | sim se organizador, conforme função / idem / não | sim se organizador, conforme função / idem / não | sim se organizador, conforme função / idem / não | não / não / não | não / não / não | sim se organizador, conforme função / idem / idem | não / não / não | não / não / não | não / não / não | so-rpc | não / não / não |
| moderar/encerrar evento | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | so-rpc se função administrativa autorizada | não / não / não |
| convidar membro | sim se função permitir e evento acessível / idem / idem | sim se função permitir e evento acessível / idem / idem | sim se função permitir e evento acessível / idem / idem | não / não / não | não / não / não | sim se função permitir e evento acessível / idem / idem | não / não / não | não / não / não | não / não / não | so-rpc | não / não / não |

### `event_rsvps`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler confirmações | sim se pode ler o evento / idem / idem | sim se pode ler o evento / idem / idem | sim se pode ler o evento / idem / idem | sim se pode ler o evento encerrado / idem / idem | não / não / não | sim se pode ler evento da cidade; não para evento de grupo fechado / idem / idem | não / não / não | sim se pode ler o evento / idem / idem | sim se pode ler o evento / idem / idem | não / não / não | não / não / não |
| criar/alterar a própria confirmação | sim se pode ler evento e não for organizador / idem / não | sim se pode ler evento e não for organizador / idem / não | sim se pode ler evento e não for organizador / idem / não | não / não / não | não / não / não | sim se pode ler evento e não for organizador / idem / idem | não / não / não | não / não / não | não / não / não | so-rpc | não / não / não |
| excluir a própria confirmação | sim se própria e evento acessível / idem / não | sim se própria e evento acessível / idem / não | sim se própria e evento acessível / idem / não | não / não / não | não / não / não | sim se própria e evento acessível / idem / idem | não / não / não | não / não / não | não / não / não | so-rpc | não / não / não |
| alterar confirmação de outra pessoa | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | so-rpc somente por função operacional autorizada | não / não / não |

### `recommendation_requests`

| Ação | dono | moderador | membro | membro-so-leitura | pedido-pendente | cidade | outra-cidade | suspenso | em-exclusao | operador | anonimo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ler pergunta de cidade | sim se membro da cidade conforme indicação / idem / idem | sim se membro da cidade conforme indicação / idem / idem | sim se membro da cidade conforme indicação / idem / idem | não / não / não | não / não / não | sim se membro elegível da cidade / idem / idem | não / não / não | sim se membro elegível da cidade / idem / idem | sim se membro elegível da cidade / idem / idem | não / não / não | não / não / não |
| ler pergunta de grupo | sim se participante ativo / idem / idem | sim se participante ativo / idem / idem | sim se participante ativo / idem / idem | sim se já participava e tem leitura do grupo encerrado / idem / idem | não / não / não | sim se grupo aberto e da própria cidade; fechado só participante / não / não | não / não / não | sim se também for membro do grupo (Encerrado só se participou) / idem / idem | sim se também for membro do grupo (Encerrado só se participou) / idem / idem | não / não / não | não / não / não |
| criar pergunta só na cidade | sim se membro elegível da cidade / idem / idem | sim se membro elegível da cidade / idem / idem | sim se membro elegível da cidade / idem / idem | não / não / não | não / não / não | sim se membro elegível da cidade / idem / idem | não / não / não | não / não / não | não / não / não | so-rpc | não / não / não |
| criar pergunta no grupo | sim se membro ativo do grupo / sim se membro ativo do grupo / não | sim se membro ativo do grupo / sim se membro ativo do grupo / não | sim se membro ativo do grupo / sim se membro ativo do grupo / não | não / não / não | não / não / não | sim se grupo aberto da própria cidade e membro ativo / não / não | não / não / não | não / não / não | não / não / não | so-rpc | não / não / não |
| também perguntar à cidade | sim se membro ativo de grupo aberto e cidade da pergunta igual à do grupo / não / não | sim se membro ativo de grupo aberto e cidade da pergunta igual à do grupo / não / não | sim se membro ativo de grupo aberto e cidade da pergunta igual à do grupo / não / não | não / não / não | não / não / não | sim se a regra acima for atendida / não / não | não / não / não | não / não / não | não / não / não | so-rpc | não / não / não |
| editar título e texto | sim se autor / idem / não | sim se autor / idem / não | sim se autor / idem / não | não / não / não | não / não / não | sim se autor / idem / idem | não / não / não | não / não / não | não / não / não | so-rpc | não / não / não |
| excluir própria pergunta | sim se autor / idem / não | sim se autor / idem / não | sim se autor / idem / não | não / não / não | não / não / não | sim se autor / idem / idem | não / não / não | não / não / não | não / não / não | so-rpc | não / não / não |
| resolver/reabrir pergunta ou marcar resposta | sim se autor, pela RPC correspondente / idem / não | sim se autor, pela RPC correspondente / idem / não | sim se autor, pela RPC correspondente / idem / não | não / não / não | não / não / não | sim se autor, pela RPC correspondente / idem / idem | não / não / não | não / não / não | não / não / não | so-rpc | não / não / não |
| moderar ou reter pergunta denunciada | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | não / não / não | so-rpc conforme fluxo de denúncia e retenção | não / não / não |

## 3. Permissão por coluna

- `events`: `id`, autoria, cidade, grupo, datas, status, recorrência, local, descrição e capa só são lidos depois de passar pela regra de acesso do evento; grupo fechado não revela local, data, presença ou outros detalhes a não membros em agenda, início, busca, perfil, notificações ou deep link. `organizer_id`, `locality_id`, `group_id`, `created_at`, `status` e campos de lembrete/recorrência não podem ser trocados por UPDATE direto. Organizador edita apenas os campos de conteúdo previstos pelo fluxo; estado cancelado/concluído e avanços recorrentes seguem funções existentes. A edição nunca move evento entre grupo/cidade nem muda organizador. O protótipo exige título, data, hora, local e descrição ao criar; pergunta ao dono abaixo registra a diferença com campos nullable do banco.
- `event_rsvps`: a pessoa só lê, insere, atualiza ou remove seu próprio vínculo, e somente se puder ler o evento. `user_id`, `event_id` e `occurrence_date` são imutáveis em atualização direta; status só pode ser um valor válido do enum e pertence àquela ocorrência. A lista de pessoas, além do acesso RLS à tabela, segue a mesma visibilidade do evento. O trigger que impede o organizador de confirmar a própria presença fica mantido até decisão explícita em contrário.
- `recommendation_requests`: `author_id`, `group_id`, `locality_id`, estado de resolução, respostas de resolução, exclusão e timestamps são imutáveis por escrita direta do autor; título e texto são editáveis apenas pelo autor, com marcação de edição. Escrita de estado passa pelas RPCs existentes. Motivo de exclusão/moderação fica fora da leitura comum; texto moderado mantém a retenção restrita ao operador conforme o fluxo de denúncia. Pergunta pode ter `locality_id` e `group_id` juntos somente quando a validação de “também perguntar à cidade” abaixo for atendida.

## 4. Transições

- Evento nasce ligado à cidade; pode estar ligado opcionalmente a um grupo da mesma cidade. Não migra entre cidade e grupo, nem troca organizador. Grupo Fechado recebe evento novo de membro ativo, com a visibilidade do grupo; somente Encerrado recusa. Evento existente segue leitura e escrita conforme estado e participação do grupo. Encerrar grupo torna o evento somente leitura para quem participava; sair ou ser removido retira acesso ao conteúdo e RSVP da pessoa. RPCs de edição/cancelamento, RSVP e pergunta também recusam mutações em evento/pergunta de grupo Encerrado.
- Edição de evento atualiza conteúdo pelo organizador; `status` só transita pelos fluxos autorizados de cancelamento/conclusão, e evento recorrente só avança pela rotina própria. A recorrência mantém o vínculo ao mesmo escopo e reavalia leitores e destinatários na hora da leitura/notificação.
- RSVP pode mudar entre `interested`, `going` e `not_going` somente para o próprio usuário e ocorrência. `event_id`, `user_id` e `occurrence_date` não mudam por UPDATE. Organizador não confirma presença própria enquanto a divergência com o protótipo não for decidida.
- Pergunta de cidade nasce com `locality_id` e sem `group_id`; pergunta de grupo nasce com `group_id` e sem `locality_id`; “também perguntar à cidade” permite ambos somente se o grupo for Aberto, não Encerrado, ativo para o autor e a localidade da pergunta for exatamente a do grupo. A checagem entra na policy de INSERT junto com a mudança do CHECK, nunca relaxada isoladamente.
- Título continua entre 8 e 300 caracteres conforme a decisão do dono no ADR-20261023; texto continua limitado pelo CHECK vigente. Autor edita/exclui a pergunta. Resolver, resolver sem resposta e reabrir seguem as RPCs, mantendo estado atual e última resposta resolvida conforme o ADR-20261023. Exclusão da pergunta continua levando respostas junto por cascade, como previsto no protótipo/ADR.
- Mudança posterior de visibilidade do grupo ou saída do autor pode afetar a aparição da pergunta de dupla origem nas Indicações da cidade. A regra de projeção/retirada não foi decidida; consultar o dono antes de fixá-la. Até lá, não se amplia leitura de pergunta de grupo por inferência.

## 5. Bloqueio

| Ação/consumidor | Consulta |
|---|---|
| Ler evento ou RSVP de evento de um autor em agenda, início, busca, detalhe, perfil e lista de confirmações | `private.block_allows(actor, author, 'ler')`, além do escopo de cidade/grupo. “Ver mesmo assim” só no detalhe para quem bloqueou e fora da policy. |
| Confirmar presença ou perguntar/responder no evento | `private.block_allows(actor, autor, 'responder')`; RSVP de pessoa sem conteúdo de autor consulta escopo e não inventa bloqueio entre participantes. |
| Ler pergunta/resposta | `private.block_allows(actor, author, 'ler')`. |
| Criar pergunta/responder/comentar/reagir | `private.block_allows(actor, autor, 'responder'/'comentar'/'reagir')` conforme o objeto. Denúncia nunca consulta bloqueio. |
| Abrir ou continuar conversa contextual sobre evento/pergunta | `private.block_allows(actor, counterpart, 'contatar')`. |
| Notificar mudança, RSVP, lembrete ou resposta | Antes de gerar e antes do envio de item enfileirado: `private.block_allows(actor, destinatário, 'notificar')`; não incluir local de evento de grupo fechado no corpo. |
| Operador | Não é afetado pelo bloqueio, conforme R2-comum. |

## 6. Regras do retrato

Cada ID de `events`, `event_rsvps` e `recommendation_requests`, incluindo enum, policies, triggers, grants e funções que citam essas tabelas, tem uma decisão. Referências da vila saem; regras de autorização permanecem ou ficam mais restritas. Funções compartilhadas aparecem com a mesma decisão em cada tabela em que o retrato as lista.

| ID | objeto | o que protege, em uma linha | decisão | motivo |
|---|---|---|---|---|
| R1-059 | events | referência à vila | removida | O evento deixa de apontar para `community_id`; cidade continua por `locality_id`. |
| R1-060 | events | caminho da capa | mantida | Mantém validação e acesso protegido ao arquivo. |
| R1-061 | events | data de criação | mantida | Mantém trilha temporal. |
| R1-062 | events | descrição | mantida | Mantém conteúdo e limite validado. |
| R1-063 | events | fim do evento | mantida | Mantém intervalo temporal quando informado. |
| R1-064 | events | vínculo opcional ao grupo | mantida | É o escopo de grupo aprovado; valida-se cidade e participação. |
| R1-065 | events | identidade do evento | mantida | Chave primária permanece. |
| R1-066 | events | controle de lembrete | mantida | Evita duplicar lembrete recorrente. |
| R1-067 | events | vínculo à cidade | mantida | Cidade continua necessária, inclusive para grupo compatível. |
| R1-068 | events | organizador obrigatório | mantida | Preserva autoria verificável. |
| R1-069 | events | dia da recorrência mensal | mantida | Mantém forma de recorrência validada. |
| R1-070 | events | ordinal da recorrência mensal | mantida | Mantém forma de recorrência validada. |
| R1-071 | events | tipo da recorrência | mantida | Mantém valores de recorrência validados. |
| R1-072 | events | dia da semana recorrente | mantida | Mantém forma de recorrência validada. |
| R1-073 | events | início do evento | mantida | Mantém data/hora necessária à agenda. |
| R1-074 | events | estado upcoming/cancelled/completed | mantida | Transições continuam por funções autorizadas. |
| R1-075 | events | título | mantida | Mantém conteúdo e tamanho validado no banco. |
| R1-076 | events | data de atualização | mantida | Mantém trilha de edição. |
| R1-077 | events | local | mantida | Local livre é permitido pelo ADR; acesso segue o grupo/cidade. |
| R1-433 | events | FK para comunidade | removida | Vila sai do domínio; grupo e cidade substituem esse vínculo. |
| R1-434 | events | mesma cidade da comunidade | removida | Não há comunidade intermediária; validação de grupo-cidade permanece por outra regra. |
| R1-435 | events | tamanho do caminho da capa | mantida | Impede caminho vazio ou excessivo. |
| R1-436 | events | tamanho da descrição | mantida | Preserva limite de conteúdo. |
| R1-437 | events | FK de localidade | mantida | Mantém referência a cidade existente e exclusão coerente. |
| R1-438 | events | FK do organizador | mantida | Mantém integridade com a conta. |
| R1-439 | events | chave primária | mantida | Mantém identidade única. |
| R1-440 | events | faixa do dia mensal | mantida | Rejeita dia fora de 1–31. |
| R1-441 | events | faixa do ordinal mensal | mantida | Rejeita ordinal fora de 1–4. |
| R1-442 | events | combinação dos campos recorrentes | mantida | Evita combinações incompletas/incompatíveis. |
| R1-443 | events | tipos de recorrência aceitos | mantida | Restringe a valores conhecidos. |
| R1-444 | events | faixa do dia da semana | mantida | Rejeita dia fora de 0–6. |
| R1-445 | events | exclusividade de escopo comunidade/grupo | mudada | A vila sai; `group_id` permanece opcional sobre a cidade, com consistência cidade-grupo obrigatória. |
| R1-446 | events | título mínimo e máximo | mantida | Preserva validação; divergência do tamanho no protótipo fica em pergunta ao dono. |
| R1-447 | events | tamanho do local | mantida | Preserva limite e local livre do ADR. |
| R1-448 | events | RLS habilitada | mantida | Continua barreira de acesso à tabela. |
| R1-449 | events | RLS forçada | mantida | Continua aplicável também a owner comum. |
| R1-450 | events | criação por organizador verificado e ativo na cidade | mudada | Mantém verificação/atividade e exige escopo coerente; evento de grupo requer membro ativo de grupo aberto ou fechado, nunca encerrado. |
| R1-451 | events | leitura por cidade, comunidade ou grupo | mudada | Remove vila e restringe todo evento de grupo a participantes atuais/legíveis; evento da cidade continua sob acesso da cidade. |
| R1-452 | events | edição só pelo organizador | mudada | Mantém autoria e restringe colunas/transições sensíveis por escopo. |
| R1-453 | events | notificação de mudança | mudada | Mantém aviso, confere bloqueio e omite local de evento de grupo fechado do corpo. |
| R1-454 | events | normalização do início recorrente | mantida | Mantém normalização antes de gravar. |
| R1-455 | events | validação da capa | mantida | Mantém validação de caminho e ownership do arquivo. |
| R1-456 | events | SELECT/INSERT/UPDATE autenticado | mudada | Mantém apenas os privilégios necessários e complementa com grants por coluna mínimos. |
| R1-457 | events | privilégios operacionais do service_role | mantida | Preserva operação interna; service_role continua fora do app público. |
| R1-458 | events | UPDATE de capa pelo service_role | mantida | Preserva rotina interna autorizada de arquivo. |
| R1-199 | events | valores de status do evento | mantida | `upcoming`, `cancelled` e `completed` continuam necessários e controlados. |
| R1-214 | private.can_access_event | acesso calculado ao evento | mudada | Implementa visibilidade de grupo aberto/fechado/encerrado sem vila. |
| R1-219 | private.can_receive_invite_to_event | elegibilidade para receber convite | mantida | Mantém validação de elegibilidade; `list_invitable_members_for_event` continua responsável pelo filtro de escopo e visibilidade do grupo. |
| R1-225 | private.default_event_rsvp_occurrence | ocorrência padrão da confirmação | mantida | Mantém integridade temporal da recorrência. |
| R1-232 | private.event_rsvps_block_self | impede organizador de confirmar presença própria | mantida | Proteção de integridade fica até o dono resolver a diferença com o protótipo. |
| R1-243 | private.is_event_locality_member | membership de cidade para evento | mantida | Preserva verificação de cidade; acesso de grupo também exige membership do grupo. |
| R1-252 | private.notify_event_rsvp | aviso de confirmação | mudada | Confere escopo atual e bloqueio antes de notificar. |
| R1-266 | private.send_recurring_event_reminders | lembretes recorrentes | mudada | Revalida acesso, RSVP e bloqueio no envio; omite detalhe privado do grupo. |
| R1-271 | public.advance_recurring_events | avanço de ocorrência recorrente | mantida | Mantém rotina e vínculos sob as constraints vigentes. |
| R1-278 | public.complete_event | conclusão do evento | mantida | Mantém transição por função autorizada. |
| R1-306 | public.list_invitable_members_for_event | lista de membros elegíveis para convite | mudada | Filtra por escopo novo e não revela membros/evento a não participantes. |
| R1-317 | public.open_event_question | abertura contextual de pergunta sobre evento | mantida | Mantém fluxo com validação de leitura do evento e do autor. |
| R1-319 | public.profile_events_for | eventos exibidos no perfil | mudada | Aplica visibilidade de grupo e bloqueio na leitura do perfil. |
| R1-053 | event_rsvps | data de criação da confirmação | mantida | Mantém trilha temporal. |
| R1-054 | event_rsvps | evento confirmado | mantida | Mantém FK e cascata do evento. |
| R1-055 | event_rsvps | data da ocorrência | mantida | Distingue confirmações de evento recorrente. |
| R1-056 | event_rsvps | estado da confirmação | mantida | Mantém enum validado. |
| R1-057 | event_rsvps | data de atualização | mantida | Mantém trilha de mudança do status. |
| R1-058 | event_rsvps | titular da confirmação | mantida | Mantém autoria por conta. |
| R1-419 | event_rsvps | FK e cascata ao evento | mantida | Remove RSVP órfã quando evento é apagado. |
| R1-420 | event_rsvps | unicidade por evento, usuário e ocorrência | mantida | Evita RSVP duplicada para a mesma ocorrência. |
| R1-421 | event_rsvps | FK e cascata à conta | mantida | Remove vínculo quando a conta é apagada. |
| R1-422 | event_rsvps | RLS habilitada | mantida | Mantém barreira de acesso. |
| R1-423 | event_rsvps | RLS forçada | mantida | Mantém proteção contra acesso por owner comum. |
| R1-424 | event_rsvps | exclusão própria | mudada | Só exclui o vínculo próprio enquanto o evento continua acessível. |
| R1-425 | event_rsvps | inserção própria e acesso ao evento | mudada | Mantém autoria, revalida a nova política do evento e impede RSVP sem participação. |
| R1-426 | event_rsvps | leitura sob acesso ao evento | mudada | RSVP herda o escopo do evento e não vaza a lista de grupo fechado. |
| R1-427 | event_rsvps | atualização própria | mudada | Mantém status próprio, mas impede trocar evento, usuário ou ocorrência. |
| R1-428 | event_rsvps | bloqueio de RSVP do organizador | mantida | Preserva proteção até decisão do dono sobre a divergência com o protótipo. |
| R1-429 | event_rsvps | ocorrência padrão | mantida | Mantém preenchimento coerente para eventos recorrentes. |
| R1-430 | event_rsvps | notificação após RSVP | mudada | Mantém aviso após mudança real e consulta bloqueio/destinatário. |
| R1-431 | event_rsvps | privilégios operacionais do service_role | mantida | Mantém uso interno sem expor esses privilégios ao membro. |
| R1-432 | event_rsvps | SELECT/INSERT/DELETE/UPDATE autenticado | mudada | Mantém privilégios necessários com RLS e grants por coluna mínimos. |
| R1-198 | event_rsvps | valores de status | mantida | `interested`, `going` e `not_going` permanecem os estados atuais. |
| R1-217 | private.can_dm_between | autorização de conversa contextual | mantida | Mantém a autorização de mensagens e exige contexto/evento ainda legível. |
| R1-229 | private.dm_context_valid | validação de contexto de mensagem | mantida | Preserva validação do contexto; permissões de leitura do objeto seguem as policies/RPCs próprias. |
| R1-250 | private.notify_event_change | notificação de mudança de evento | mudada | Confere escopo e bloqueio no envio e não inclui local privado. |
| R1-266 | private.send_recurring_event_reminders | lembretes recorrentes | mudada | Mesma decisão em `events`: revalida destinatário, RSVP, acesso e bloqueio. |
| R1-293 | public.finalize_account_deletion | limpeza de confirmações na exclusão de conta | mudada | Remove referências da vila e conserva a limpeza das RSVP próprias para evitar dado pessoal órfão. |
| R1-167 | recommendation_requests | autor da pergunta | mantida | Identidade de autoria segue conta autenticada. |
| R1-168 | recommendation_requests | corpo da pergunta | mantida | Mantém texto limitado e protegido. |
| R1-169 | recommendation_requests | categoria | mantida | Mantém categoria validada pelo enum. |
| R1-170 | recommendation_requests | data de criação | mantida | Mantém trilha temporal. |
| R1-171 | recommendation_requests | data de edição | mantida | Mantém indicador de edição. |
| R1-172 | recommendation_requests | vínculo opcional ao grupo | mantida | Mantém origem por grupo para a modalidade aprovada. |
| R1-173 | recommendation_requests | identidade da pergunta | mantida | Mantém chave primária. |
| R1-174 | recommendation_requests | exclusão lógica | mantida | Preserva o estado e a proteção contra alteração direta autenticada. |
| R1-175 | recommendation_requests | estado resolvido | mantida | Mantém resolução atual independente da resposta ligada. |
| R1-176 | recommendation_requests | última resposta resolvida | mantida | Mantém memória da última resolução. |
| R1-177 | recommendation_requests | vínculo opcional à cidade | mantida | Permite pergunta de cidade e origem simultânea grupo/cidade. |
| R1-178 | recommendation_requests | data de resolução | mantida | Mantém trilha do ciclo de resolução. |
| R1-179 | recommendation_requests | pessoa que resolveu | mantida | Mantém autoria da resolução. |
| R1-180 | recommendation_requests | resposta atualmente resolvida | mantida | Mantém referência opcional à resposta atual. |
| R1-181 | recommendation_requests | título | mantida | Mantém faixa 8–300 fixada pelo dono. |
| R1-182 | recommendation_requests | data de atualização | mantida | Mantém trilha de mudança. |
| R1-641 | recommendation_requests | origem exclusiva cidade ou grupo | mudada | Permite ambos preenchidos apenas para grupo aberto/não encerrado, membro ativo e cidade igual à do grupo; nenhum vínculo continua inválido. |
| R1-642 | recommendation_requests | FK do autor | mantida | Mantém integridade da autoria e cascata da conta. |
| R1-643 | recommendation_requests | limite do corpo | mantida | Preserva o limite de conteúdo existente. |
| R1-644 | recommendation_requests | FK do grupo | mantida | Mantém integridade do escopo e cascata da remoção de grupo. |
| R1-645 | recommendation_requests | FK da última resposta resolvida | mantida | Mantém referência segura e limpa ao apagar resposta. |
| R1-646 | recommendation_requests | FK da cidade | mantida | Mantém referência de cidade e cascata. |
| R1-647 | recommendation_requests | chave primária | mantida | Mantém identidade única. |
| R1-648 | recommendation_requests | FK de quem resolveu | mantida | Mantém integridade da autoria de resolução. |
| R1-649 | recommendation_requests | FK da resposta resolvida | mantida | Mantém referência segura e limpa ao apagar resposta. |
| R1-650 | recommendation_requests | tamanho do título | mantida | Faixa 8–300 foi decidida pelo dono no ADR-20261023. |
| R1-651 | recommendation_requests | RLS habilitada | mantida | Mantém barreira de acesso. |
| R1-652 | recommendation_requests | RLS forçada | mantida | Mantém proteção inclusive contra owner comum. |
| R1-653 | recommendation_requests | exclusão pelo autor | mantida | Mantém exclusão autoral; dependentes seguem cascade e fluxo aprovado. |
| R1-654 | recommendation_requests | inserção autenticada por origem | mudada | A combinação cidade+grupo exige membro ativo, grupo aberto/não encerrado e cidade coincidente na própria policy de INSERT. |
| R1-655 | recommendation_requests | leitura por autor, cidade ou grupo | mudada | Mantém leitura de cidade e de participante; origem dupla não contorna visibilidade do grupo. |
| R1-656 | recommendation_requests | atualização pelo autor | mudada | Mantém autoria e limita escrita direta a título/corpo; estado continua só pelas RPCs. |
| R1-657 | recommendation_requests | bloqueia soft delete direto autenticado | mantida | Preserva separação entre exclusão lógica de sistema e escrita autoral. |
| R1-658 | recommendation_requests | marca pergunta editada | mantida | Mantém carimbo automático de edição. |
| R1-659 | recommendation_requests | valida referências de resolução | mantida | Mantém integridade da resposta resolvida/última resposta. |
| R1-660 | recommendation_requests | SELECT/INSERT/DELETE autenticado | mudada | Mantém somente privilégios requeridos por RLS e pelo fluxo de exclusão. |
| R1-661 | recommendation_requests | privilégios operacionais do service_role | mantida | Mantém processamento interno sem expor operação ao membro. |
| R1-662 | recommendation_requests | UPDATE do corpo pelo autor | mantida | Preserva edição explícita do texto sob policy autoral. |
| R1-663 | recommendation_requests | UPDATE de soft delete pelo service_role | mantida | Preserva exclusão lógica restrita à operação interna. |
| R1-664 | recommendation_requests | UPDATE do título pelo autor | mantida | Preserva edição explícita do título sob policy autoral. |
| R1-211 | recommendation_requests | categorias de indicação | mantida | Mantém conjunto atual de categorias validado. |
| R1-217 | private.can_dm_between | autorização de conversa contextual | mantida | Mantém autorização de conversa e exige contexto de pergunta ainda acessível. |
| R1-226 | private.dispatch_indication_alerts | destinatários de alertas imediatos | mudada | Resolve a dupla origem sem duplicar destinatário e aplica escopo/bloqueio no envio. |
| R1-227 | private.dispatch_indication_digest | destinatários do resumo de indicações | mudada | Resolve cidade+grupo e revalida visibilidade antes de incluir pergunta no resumo. |
| R1-229 | private.dm_context_valid | validação de contexto de mensagem | mantida | Preserva validação do contexto; autorização da pergunta segue as policies/RPCs próprias. |
| R1-235 | private.guide_candidate_enqueue | entrada de candidata ao Guia | mantida | Mantém fila e elegibilidade atual; pergunta de grupo continua subordinada ao seu acesso. |
| R1-236 | private.guide_candidate_select_due | seleção de candidata vencida do Guia | mantida | Mantém seleção e critérios atuais de elegibilidade. |
| R1-237 | private.indication_recipients | lista de destinatários da indicação | mudada | Deduplica cidade/grupo e só inclui leitores autorizados pela origem. |
| R1-258 | private.notify_recommendation_reply | notificação de resposta ao autor | mudada | Confere acesso atual e bloqueio antes da geração e entrega. |
| R1-259 | private.notify_recommendation_reply_followers | notificação a quem segue respostas | mudada | Confere escopo, preferência e bloqueio antes da geração e entrega. |
| R1-263 | private.reopen_request_on_resolved_reply_delete | reabertura após apagar resposta resolvida | mantida | Preserva ciclo consistente da resolução. |
| R1-264 | private.reports_block_self | impede autodenúncia | mantida | Proteção de integridade da denúncia permanece independente do bloqueio social. |
| R1-277 | public.clear_recommendation_resolved_reply | limpeza segura de resposta resolvida | mantida | Preserva estado consistente ao remover referência. |
| R1-304 | public.list_hidden_questions | lista de perguntas ocultadas pelo usuário | mantida | Mantém ocultação pessoal de pergunta sem ampliar visibilidade pública. |
| R1-305 | public.list_indications | leitura e filtros de indicações | mudada | Inclui origem simultânea cidade/grupo e aplica escopo de leitura da pergunta. |
| R1-307 | public.list_open_reports | listagem operacional de denúncias abertas | mantida | Mantém acesso operacional restrito e evidência para revisão. |
| R1-309 | public.list_promotable_replies | respostas elegíveis para promoção ao Guia | mantida | Mantém critérios e autorização atuais, respeitando escopo de leitura. |
| R1-310 | public.list_question_replies | leitura de respostas da pergunta | mudada | Herda escopo da pergunta, exclusão/moderação e bloqueio. |
| R1-312 | public.mark_recommendation_reply_resolved | resolução por resposta | mantida | Mantém a RPC como via autorizada de transição. |
| R1-313 | public.mark_recommendation_resolved | resolução sem resposta | mantida | Mantém a RPC e o estado atual da pergunta. |
| R1-321 | public.promote_reply_to_guide_entry | promoção de resposta ao Guia | mantida | Mantém promoção explícita e registro de origem. |
| R1-328 | public.reopen_recommendation | reabertura da pergunta | mantida | Mantém reabertura e preservação da última resolução. |
| R1-332 | public.resolve_report | decisão operacional de denúncia | mantida | Preserva autorização operacional e evidência de moderação. |

## 7. Testes negativos existentes

Os testes abaixo são evidência de proteções atuais; a migration de redesenho deve adaptá-los ao esquema novo e manter os negativos relevantes, conforme o ADR. IDs são as regras da tabela que cada teste exerce.

| Teste | IDs da regra | Negativo que precisa continuar coberto |
|---|---|---|
| `supabase/tests/events-private-venue-denials.sql` | R1-450, R1-451, R1-452, R1-425 | Não verificado, outra cidade, não membro/espera, organizador falso, edição alheia, RSVP em nome alheio e RSVP de fora da cidade. |
| `supabase/tests/events-insert-returning.sql` | R1-450, R1-456 | `RETURNING` não pode permitir INSERT que a policy nega a membro não autorizado. |
| `supabase/tests/event-rsvp-scope.sql` | R1-451, R1-426, R1-425 | Pedido pendente e membro da cidade fora de grupo fechado não leem confirmações nem fazem RSVP. |
| `supabase/tests/event-rsvp-not-going.sql` | R1-428, R1-430 | Organizador não confirma próprio evento; status `not_going` não gera aviso indevido. |
| `supabase/tests/recurring-events.sql` | R1-225, R1-266, R1-271, R1-429 | Ocorrências e lembretes não duplicam nem escapam preferência/RSVP. |
| `supabase/tests/event-questions.sql` | R1-317, R1-654, R1-655 | Perguntas contextuais preservam acesso e não aceitam origem/contexto inválidos. |
| `supabase/tests/event-question-with-service-request.sql` | R1-317, R1-654 | Pergunta contextual não cria pedido de serviço para usuário/escopo não autorizado. |
| `supabase/tests/event-invite-rpc-exposure.sql` | R1-219, R1-306 | Função de elegibilidade não expõe lista de membros nem permite destinatário inválido. |
| `supabase/tests/recommendations-scope-denials.sql` | R1-641, R1-654, R1-655, R1-656, R1-660 | Outra cidade não lê, não membro não escreve, não autor não edita; relaxamento cidade+grupo deve agora rejeitar não membro, grupo fechado/encerrado e cidade divergente. |
| `supabase/tests/recommendations-scope.sql` | R1-653, R1-654, R1-655, R1-660 | Anônimo não lê; origem e leitura continuam no escopo permitido. |
| `supabase/tests/recommendations-health-scope.sql` | R1-654, R1-655 | Escritas/read paths de saúde mantêm escopo para membros autorizados. |
| `supabase/tests/recommendations-reply-cycle.sql` | R1-644, R1-654, R1-655 | Membro da cidade fora do grupo não lê pergunta de grupo e `group_id` arbitrário é negado. |
| `supabase/tests/recommendation-resolved-reply.sql` | R1-175, R1-176, R1-178, R1-180, R1-659, R1-263, R1-277, R1-312, R1-313, R1-328 | Referências/resolução inválidas e transições não autorizadas não alteram o ciclo. |
| `supabase/tests/rls-or-column-regression.test.sql` | R1-448–R1-458, R1-422–R1-432, R1-651–R1-664 | RLS, policies, grants e grants por coluna não podem sumir ou se alargar. |
| `tests/e2e/group-event-detail-denials.spec.ts` | R1-451, R1-426 | Usuário fora de grupo fechado não descobre detalhe nem confirmações. |
| `tests/e2e/event-rsvp.spec.ts` | R1-425, R1-426, R1-427, R1-424 | RSVP própria respeita acesso e identidade; remoção/cancelamento não altera RSVP alheia. |

## 8. Consumidores

Busca `rg` em `apps/web/`, `apps/mobile/`, `supabase/seed.sql` e testes. O app mobile não tem consumidor direto desses objetos no estado atual.

- **Eventos:** `apps/web/app/(shell)/events/` (agenda, detalhe, edição, ações, convites e perguntas); `apps/web/app/(shell)/inicio/` (agenda e eventos próximos); `apps/web/app/(shell)/explorar/busca/page.tsx`; `apps/web/app/(shell)/cidade/[id]/city-consult.tsx`; `apps/web/app/components/bivaque/city-reference.tsx` e `feed-right-rail.tsx`; `apps/web/app/(shell)/profile/[userId]/page.tsx`; `apps/web/app/(shell)/notifications/`; `apps/web/lib/search/groups.ts`, `lib/security/event-access.ts`, `lib/profile-rpcs.ts`, `lib/notifications/channel-preferences.ts`; `apps/web/app/api/internal/outbox/route.ts`.
- **Perguntas:** `apps/web/app/(shell)/recommendations/`; `apps/web/app/components/indications/ask-indication.tsx` e `indication-detail.tsx`; `apps/web/app/(shell)/guide/` e `profile/profile-indications.tsx`; `apps/web/lib/indications/indications.ts`, `lib/saves/saved-items.ts`, `lib/reports/reports.ts`; `apps/web/app/(admin)/reports/targets.ts`.
- **Seed:** `supabase/seed.sql` cria e altera `recommendation_requests`, cria `events` e `event_rsvps`; atualizar origens/valores de fixture quando o novo CHECK entrar.
- **Testes adicionais consumidores:** `supabase/tests/aviso-de-pedido.sql`, `community-question-cycle.sql`, `consulta-outra-cidade.sql`, `event-cover.sql`, `event-completion.sql`, `event-invite-fanout.sql`, `events-rsvp.sql`, `full-regression.sql`, `memoria-de-indicacoes.sql`, `notification-denials.sql`, `notification-preferences-honored.sql`, `notifications-approved-events.sql`, `recommendation-reply-notify.sql`, `report-resolution-unified.sql`, `saved-request-notify.sql`, `tests/e2e/event-invites.spec.ts`, `manaus-pilot-denials.spec.ts` e `manaus-pilot-full-journey.spec.ts`.

## 9. Perguntas ao dono

1. **Pergunta de dupla origem após mudança de grupo:** se o grupo ficar Fechado/Encerrado, ou o autor sair, a pergunta que também apareceu na cidade continua visível como pergunta de cidade, é retirada da cidade, ou conserva uma projeção pública sem o contexto do grupo? **Recomendação:** ocultar a projeção enquanto não houver decisão; não ampliar acesso de conteúdo originalmente privado.
2. **Lista de confirmações e RSVP após saída/remoção:** protótipo mostra contagem/estado pessoal, mas não define se membros do grupo podem ver nomes nem como remover as RSVP de quem perde o vínculo. **Recomendação:** leitura da lista só para quem já lê o evento e exclusão das próprias confirmações ao sair/ser removido, sem apagar histórico de outras pessoas.
3. **Organizador confirmar presença:** o protótipo representa o criador como participante inicial; o trigger atual proíbe RSVP do organizador. **Recomendação:** manter a proibição até decisão, evitando auto-notificação e contagem duplicada.
4. **Campos obrigatórios de evento:** o protótipo exige data, hora, local e descrição; banco permite `ends_at`, `venue` e `description` nulos e o editor atual do Next tem outro contrato. **Recomendação:** preservar constraints/validações vigentes durante o redesenho e só torná-los obrigatórios após aprovação explícita.
5. **Convites e pergunta ao organizador em evento de grupo:** ADR define visibilidade e RSVP, mas não detalha se convite/lista de elegíveis e mensagem contextual continuam em evento de grupo fechado. **Recomendação:** exigir que convidador e destinatário sejam participantes autorizados, sem expor evento ou roster a não membros.
6. **Leitura por conta suspensa ou em exclusão:** os documentos não fixam se essas contas mantêm leitura dos objetos que já podiam acessar. **Recomendação:** manter leitura somente sob as mesmas regras de cidade/grupo até a exclusão se concluir, e bloquear escrita durante suspensão ou exclusão; confirmar essa política antes da migration.

