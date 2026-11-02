# Mapa do lote 5 — Comunidade e grupos: protótipo × Next



Os caminhos estão completos a partir da raiz do repositório.

Estado do checkout: worktree `harness` (branch antiga; main documentada no AGENTS em `37702a86` — PRs #99–#105 não necessariamente presentes aqui). Nada foi executado contra runtime; este mapa é de código, e cada linha é verificável no checkout.



---



## 1. Tabela por tela/função do protótipo



### 1.1 Comunidade (navegação e estrutura)



| Função do protótipo | No Next? | Onde no Next | Divergência | Backend novo? |

|---|---|---|---|---|

| Página "Comunidade" com abas **Indicações / Grupos / Negócios** (`prototypes/bivaque-html/src/features/community/views.js:1-3`) | parcial | `apps/web/app/(shell)/community/page.tsx` + `apps/web/app/(shell)/community/view-switch.tsx:11-16` | O Next tem vistas **Conversa / Indicações** na mesma rota; Grupos é rota separada `/groups`; a aba Negócios não existe (há `/mercado`, `/negocio`). Título/subtítulo "O que a comunidade sabe fica disponível para quem chegar depois." (`views.js:1`) não existe; o Next mostra header da comunidade primária legada (`page.tsx:375-385`) ou `h1 "Comunidade"` fallback (`page.tsx:384`) | Não (estrutura). Aba Negócios depende das provas de lote 6 |

| Navegação inferior: **Início / Comunidade / Conversas / Você** (`prototypes/bivaque-html/src/shell/navigation.js:65`) | parcial | `apps/web/app/components/bivaque/bottom-nav.tsx:46-78`: **Início / Explorar / Comunidades / Perfil** | Segundo conjunto de navegação. O AGENTS raiz (out/2026) manda seguir o protótipo, mas a decisão "Comunidades" plural é dos arquivos legados. **INCERTO**: qual "navegação aprovada" o dono quer fixar no ADR do lote 5 | Não |

| Rota `/indicacoes` e `/indicacoes/[id]` | — | `apps/web/app/(shell)/indicacoes/page.tsx:12` (redirect para `/community?vista=indicacoes`), `indicacoes/[id]/page.tsx:13` (detalhe real) | Compatível: o endereço único do pedido é `/indicacoes/{id}` (`apps/web/lib/indications/indications.ts:40-51`) | Não |



### 1.2 Perguntas e respostas (aba Indicações)



| Função do protótipo | No Next? | Onde no Next | Divergência | Backend novo? |

|---|---|---|---|---|

| Faixa "N indicações resolvidas — busque antes de perguntar" (`views.js:4`) | não | — | Next tem cabeçalho fixo "O que você procura? Veja o que {cidade} já respondeu…" (`apps/web/app/components/indications/ask-indication.tsx:172-177`) sem a contagem | Não |

| Chips de filtro **Para ajudar / Resolvidas / Minhas**, padrão "Para ajudar" (`views.js:4-6`; default `questionFilter='help'` em `prototypes/bivaque-html/src/app/state.js:16`); nota "Perguntas sem resposta aparecem primeiro" (`views.js:6`) | parcial | `apps/web/app/components/indications/indications-panel.tsx:25-29`: filtros **Recentes / Sem resposta / Resolvidas** + chips de categoria (`:154-168`) | Sem "Para ajudar" (open **e não minhas**) e sem "Minhas" no painel; "Sem resposta" filtra `is_resolved=false` (`:61-68`), que inclui pedidos **com** respostas → rótulo mente sobre o conteúdo | Não (o `list_indications` aceita `p_resolved`/`p_query`; "minhas"/"para ajudar" precisam de filtro client/param — INCERTO se exige novo parâmetro de RPC) |

| Linha de pergunta: autor, cidade/topo, pílula Resolvida/N respostas/Sem resposta (`prototypes/bivaque-html/src/shell/primitives.js:24`) | sim | `apps/web/app/components/indications/indication-item.tsx:32-79` | Ordem/texto: Next mostra categoria·idade·grupo e trecho da resposta que casou; protótipo mostra autor·tópico e contagem | Não |

| Fim da lista "Não achou sua dúvida? Perguntar" (`prototypes/bivaque-html/src/shell/paged-list.js:45`) | parcial | caixa `AskIndication` sempre no topo (`indications-panel.tsx:129-134`) | Posição do gesto (topo vs. fim); texto "Não achou o que precisa? / Pedir à cidade" (`ask-indication.tsx:264-271`) | Não |

| Publicar pergunta em **dialog** com mín 8 máx 300, termos ≥2, parecidas resolvidas dentro do dialog (`prototypes/bivaque-html/src/features/community/editor.js:1-3`) | parcial | fluxo inline `ask-indication.tsx`: mín 3 (`apps/web/lib/indications/indications.ts:162-169`), máx 200 (`:38`, `ask-indication.tsx:189`), similares 5 (`:33`) + hits do Guia | Regra de validação e limites mudam; ordem "procurar → pedir" é a mesma ideia | Não obrigatório; CHECK do banco `title 3..200` (`supabase/migrations/20260802001100_recommendations.sql:31`) **não comporta** os 300 do protótipo |

| Detalhe da pergunta com pílula de status, seguidores, compartilhar, ⋮ (`prototypes/bivaque-html/src/features/community/question.js:4`) | parcial | `apps/web/app/components/indications/indication-detail.tsx:258-344` | Falta "Seguir respostas" (o Next oferece **Salvar**, `:290-314` — mecanismo equivalente: salvos recebem notificação de resposta, `supabase/migrations/20260821000012_recommendation_reply_followers.sql`); falta faixa "· editada"; "Resolvida" vs "Resolvido por quem pediu" (`:269`) | Não |

| Responder: min 5, máx 2000, botão "Enviar indicação" (`question.js:7`; validação `prototypes/bivaque-html/src/app/handlers.js:133`) | sim | `indication-detail.tsx:36-37,234-246` | Texto do botão ("Responder"/"Enviar" — autor vê "Complementar o pedido", `:480-503`, que o protótipo não tem) | Não |

| Edição/exclusão **pela autora** da pergunta (`prototypes/bivaque-html/src/features/community/manage.js:11-12,33-37,52-53`) | não | — | Nem no menu do pedido há "Editar pergunta"/"Excluir pergunta" (`indication-detail.tsx:316-341`: só share/report/reopen). O banco **já autoriza**: `recommendation_requests_update_own` / `_delete_own` (`supabase/migrations/20260802001100_recommendations.sql:158,166`) | Não (só UI) |

| Edição/exclusão de resposta própria (`manage.js:59-66`) | parcial | excluir: `indication-detail.tsx:409-420`; **editar não existe**. Policies já existem: `recommendation_replies_update_own/_delete_own` (`supabase/migrations/20260815220000_recommendation_reply_cycle.sql:105,112`) | Falta "Editar resposta" | Não |

| Marcar resolvida **sem escolher resposta** + reabrir limpa marcas (`manage.js:54`; `question.js:6`) | parcial | Next só resolve **por resposta** ("Ajudou a resolver", `indication-detail.tsx:434-472`; RPCs `mark_recommendation_reply_resolved`/`reopen_recommendation`/`clear_…` em `apps/web/lib/recommendations/resolution-rpcs.ts`, semântica `supabase/migrations/20260911025357_recon_035_resolved_reply.sql`) | Regra de resolução divergente (marca sem resposta não existe no modelo `resolved_reply_id`) | Provável: parâmetro/RPC se o dono confirmar |

| "Negócios relacionados" + botão Orçamento no detalhe (`question.js:8`) | não | Next mostra "No Guia da cidade" (`ask-indication.tsx:227-257`, `indication-detail.tsx:425-433`) — outro destino | Domínio de negócios é lote 6; aqui só registrar | Sim (lote 6) |

| "Ver origem" de resposta (`question.js:6`) | não | — | — | Sim (vínculo resposta↔negócio) |



### 1.3 Ocultar / Bloquear / Denunciar / Moderação



| Função do protótipo | No Next? | Onde no Next | Divergência | Backend novo? |

|---|---|---|---|---|

| **Ocultar pergunta para mim** (swipe/⋮; `prototypes/bivaque-html/src/features/profile/hidden.js:1-26`; `prototypes/bivaque-html/src/motion/gestures.js:40`) | não (UI) | "Ocultar publicação" existe no menu do card, mas é **estado efêmero de cliente** (`apps/web/app/(shell)/community/page.tsx:71,245-247,326`) | O banco está pronto para perguntas: `hidden_questions` + `list_indications` excluindo o ocultado + `list_hidden_questions` (`supabase/migrations/20261022130511_hidden_questions.sql:15-58`, `supabase/migrations/20261022130513_community_list_excludes_hidden.sql`), com teste pgTAP (`supabase/tests/hidden-questions.sql`) — **zero chamadas em `apps/web`** (grep sem hits) | Não (só UI) |

| Tela **Ocultados** (`hidden.js:12-15`) | não | — | Rota não existe (lista de rotas `(shell)`: sem `ocultados`) | Não |

| Faixa "Você ocultou esta pergunta" + Mostrar no endereço direto (`hidden.js:7`; `question.js:3`) | não | — | — | Não |

| **Bloquear pessoa**: some tudo dela (lista, busca, detalhe), fecha conversa, sem aviso à pessoa; desbloqueio devolve (`prototypes/bivaque-html/src/features/profile/blocks.js:1-38`) | parcial | Bloqueio existe **só para DMs**: `dm_blocks` (`supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:53-60`); UIs em `apps/web/app/(shell)/configuracoes/bloqueados/`, `apps/web/app/(shell)/denuncias/`, opção no `apps/web/app/components/bivaque/report-button.tsx:167` | Perguntas, respostas, publicações e comentários de pessoa bloqueada **continuam visíveis** no Next. O próprio protótipo avisa: "No back-end é um vínculo entre duas contas, não um nome" (`blocks.js:6`) | **Sim**: bloqueio de pessoa com filtro de leitura em posts/comments/replies/requests |

| "Conteúdo de pessoa que você bloqueou" + "Ver mesmo assim" (`blocks.js:14-16`) | não | — | — | Não (gate de cliente) |

| **Denunciar** com motivos spam/golpe/privacidade/ofensa/outro (`prototypes/bivaque-html/src/features/profile/demo-actions.js:94`; `prototypes/bivaque-html/src/features/owner/console.js:7`) | sim | `apps/web/app/components/bivaque/report-button.tsx` + alvo em `supabase/migrations/20260821000031_report_targets_enum.sql` (post, comment, group, message, recommendation_request, recommendation_reply) | Confirmar paridade de rótulos de motivo (não lido linha a linha) — **INCERTO** menor | Não |

| Conteúdo removido pela moderação aparece como **túmulo** ("Resposta removida pela moderação", `question.js:6`; `groups/views.js:85`; `prototypes/bivaque-html/src/features/listings/detail.js:3`) | não | No Next o conteúdo some por policy (`supabase/migrations/20260821000033_hideable_targets.sql`); pedido indisponível vira tela genérica "Este pedido não está disponível" (`indication-detail.tsx:211-225`) | Regra de exibição: some vs. placeholder | Provável: sinal de leitura seguro do estado removido |

| Painel do operador (fila de denúncias, decisão) | sim | `apps/web/app/(admin)/reports/` (`targets.ts:23-30`; `decision-form.tsx:61` "O conteúdo será ocultado da comunidade") + `resolve_report` (`supabase/migrations/20260821000034_resolve_report_rpc.sql`) | Domínio mais rico no protótipo é lote 8; o caminho do lote 5 (remoção moderada) existe | Não |



### 1.4 Grupos — lista e criação



| Função do protótipo | No Next? | Onde no Next | Divergência | Backend novo? |

|---|---|---|---|---|

| Aba **Grupos** dentro de Comunidade com busca, "Seus grupos", "Sugeridos para você", "Populares em {cidade}", badges de não lidas, pills Fechado/Admin/Aguardando/Encerrado/Automático (`groups/views.js:63-83`) | parcial | `apps/web/app/(shell)/groups/page.tsx`: "Seus grupos" (`:635-645`) e "Grupos próximos de você" (`:648-657`); busca só por nome (`:338-342`); cards `:380-506` | Sem seções "Sugeridos" (o RPC `suggest_groups_for_user` existe, `supabase/migrations/20260821000003_user_group_interests.sql:157`, mas **nenhuma tela de grupo o consome** — só onboarding/perfil usam o mecanismo), sem "Populares", sem linha de motivo (`views.js:57-62`), sem badge unread, sem pills; rótulos **Público/Privado** (`:391-393`) vs **Aberto/Fechado** do protótipo; busca do protótipo cobre nome+sobre+modelo (`:73`) | Não p/ busca; sim p/ unread/sugestão na tela |

| Botão "Criar grupo" no topo da aba (`community/views.js:1`) | sim | `groups/page.tsx:540-544` | Dialog do protótipo (`groups/editors.js:22-28`: nome 3..60, sobre ≤300, **modelo GTPL**, privacidade, **regras** ≤600, aviso "Quem cria administra…") vs formulário inline do Next só com nome/descrição/visibilidade (`:546-611`) | Sim: colunas `rules`, template; CHECKs de tamanho (`groups.name` é 2..80, `supabase/migrations/20260802001000_groups_moderation.sql:31`; description ≤500 `:32`) |

| Duplicate-name ao criar ("Já existe um grupo com esse nome") (`groups/handlers.js:18`) | não | Sem checagem client no Next; **INCERTO** se alguma policy unique cobre | — | Possível: constraint/RPC |

| **Turma de chegada** automática por ciclo nov–out, vinculada a chegada/partida, pill "Automático" (`groups/views.js:1-5,35-41,58-59`) | não | Nada. `declared_arrivals` é sinal para o operador de vila, não cria grupo (`supabase/migrations/20260820051230_declared_arrivals.sql:1-14`) | Funcionalidade inteiramente nova | **Sim**: criação/join automática, coluna `cycle`/`auto`, regra de ciclo |



### 1.5 Grupo — página, participação e administração



| Função do protótipo | No Next? | Onde no Next | Divergência | Backend novo? |

|---|---|---|---|---|

| Detalhe: capa/img, pill do modelo, meta "Aberto/Fechado · N membros · cidade", sobre, botões Participando+Avisos / Convidar / Gerenciar, `<details>` Regras, faixa de fechado, aviso fixado, "Próximo encontro", composer, chips **Tudo/Perguntas/Eventos** (`groups/views.js:96-114`) | parcial | `apps/web/app/(shell)/groups/[id]/page.tsx:337-493`: header nome+público/privado+descrição, ações entrar/sair/cancelar pedido, lista de membros (limit 10, `:292-300`), feed via `feed_group` | Sem capa, sem modelo, sem regras, sem fixado, sem avisos por grupo, sem filtros, sem "Próximo encontro", sem Convidar; contagem "N membros"/"Grupo novo" (`views.js:53`) não representada | Sim: colunas de grupo (abaixo) |

| Entrar (aberto) / **Pedir entrada** (fechado) / cancelar pedido (`groups/handlers.js:5-7,44`) | sim | `groups/[id]/page.tsx:350-382` + `join_group`; servidor deriva status da visibilidade (`:55-64`) | Pedido fechado no protótipo carrega **texto** ("note") (`handlers.js:6`); `group_memberships` não tem coluna de motivo (padrão existe para comunidades: `community_join_reasons`, `supabase/migrations/20260909014034_community_join_reason.sql:18`) | Sim (coluna/note) |

| Aprovar/recusar pedido pelo admin, com aviso ao aprovado (`handlers.js:13`; `openModeration` `:52`) | sim | `groups/page.tsx:467-476` (aprovar) e `groups/[id]/page.tsx:413-433` (rejeitar/remover); notificação de admissão (`supabase/migrations/20260802001400_personal_notifications.sql:104`) | "Cancelar pedido" vira delete da própria linha (`[id]/page.tsx:126-148`) — semanticamente ok | Não |

| Nomear moderador (`handlers.js:14`; `editors.js:32`) | sim | `add_group_moderator`/`remove_group_moderator` (`groups/page.tsx:277-311`); "Promover/Rebaixar" (`:478-498`) | Protótipo lista membros reais; Next usa id truncado/`display_name` (`:459`, `[id]:402`) | Não |

| Sair exige nomear moderador se admin sem mods (`handlers.js:10`) | não | `leaveGroupAction` deleta a membership sem checagem (`groups/[id]/page.tsx:67-94`) | Regra de negócio ausente | Não (RPC/checagem) |

| **Convidar por link** (`handlers.js:11`) | não (em grupos) | Convites existem só no produto legado de comunidades (`apps/web/app/(shell)/communities/[id]/invite/`) | — | Não |

| Gerenciar: aviso fixado ≤300, regras ≤600, trocar privacidade, switch "Permitir Oferta" (`editors.js:30-34`; save `handlers.js:15`) | não | Nenhuma dessas colunas em `groups` (`supabase/migrations/20260802001000_groups_moderation.sql:29-38`) + `is_deleted` (`supabase/migrations/20260802001600_reports.sql:56`) | | **Sim**: colunas `rules`, `pinned`, `allow_offers`; RPCs |

| **Encerrar grupo** (só leitura por 30 dias, reabrir no prazo, depois nada aparece) (`views.js:44-52`; `handlers.js:45-46`) | não | O próximo equivalente é **excluir** o grupo (`delete_group` RPC, `groups/[id]/page.tsx:205-225`) | Regra nova e mais brando que exclusão; admin do protótipo nunca "exclui" grupo de membros | **Sim**: `closed_at` + policies/filtros de leitura |

| Níveis de aviso por grupo **Tudo/Destaques/Nada** (`presets.js:12`; `handlers.js:8-9`) | não | Preferências globais (`supabase/migrations/20260806165606_notification_preferences.sql`); `notification_preferences` por usuário, não por grupo | | **Sim**: coluna por membership |

| Interesses do perfil (até 3) que geram sugestões (`editors.js:40-41`; `handlers.js:39-41`) | parcial | `user_group_interests` = pares usuário↔**grupo**, alimentados no onboarding/perfil (`apps/web/app/(shell)/profile/interests-actions.ts`), não chips de interesse com limite 3 na Comunidade | Modelo diferente (interesse=grupo vs interesse=tema); tela "Comunidade › Grupos" não mostra sugestões fundadas neles | Não (mecânica existe; decisão de produto no ADR) |



### 1.6 Publicações de grupo (feed, tipos, comentários)



| Função do protótipo | No Next? | Onde no Next | Divergência | Backend novo? |

|---|---|---|---|---|

| Tipos de publicação: **Publicação / Pergunta / Evento / Enquete / Oferta** (`groups/editors.js:6-20`) | parcial | Composer/`CreatePostModal` com tipos derivados do anexo (texto/foto/link) e audiência **cidade/comunidade/grupo** (`apps/web/app/components/bivaque/feed-post-create.tsx:104-125,282-288`; enum `post_type text/photo/link/poll` em `supabase/migrations/20260802000900_community_feed.sql:9-14`) | Sem tipo `event`/`offer`; sem `question` de grupo (pedidos de grupo vivem em `recommendation_requests.group_id`, `supabase/migrations/20260802001100_recommendations.sql:26-45`) | Sim para `offer`; eventos usam tabela própria (abaixo) |

| **"Também perguntar à cidade"** de pergunta de grupo, com link bidirecional (`editors.js:13`; `handlers.js:30`; `views.js:92`) | não | CHECK de origem é **excludente**: locality XOR group (`supabase/migrations/20260802001100_recommendations.sql:40-44`); nada liga post↔request | | **Sim**: vínculo post↔recommendation_request |

| Card com pílula por tipo, "Resolvida", Útil+contagem, comentários, menu ⋮ (`views.js:84-95`) | parcial | `apps/web/app/components/bivaque/feed-post-card.tsx:246-433`: autor/tempo/chip de alcance, texto, curtir (`post_reactions` `supabase/migrations/20260804212011_post_reactions.sql:7`), comentários inline, acompanhar (`post_follows` `supabase/migrations/20260915013344_post_follows.sql:13`), share, editar, denunciar, ocultar (local) | Sem pílulas de tipo; "Útil" do protótipo ≠ "curtir" (protótipo soma `useful`+liked); sem editar/excluir no feed de grupo | Não |

| **Enquete** com voto único, barras/% só após votar, trava pós-voto, sem voto se encerrado (`views.js:90`; `handlers.js:35`) | não | UI exclui enquete: "Sem bloco de enquete: o produto não tem enquete (prancha 44)" (`feed-post-card.tsx:333`); banco tem `poll_options jsonb` sem mesa de votos (grep `poll_vote*` = 0 hits) | Conflito direto protótipo × contrato anterior; o protótipo é a especificação | **Sim**: `poll_votes` + RPC + contagens no feed |

| **Encontro** como publicação: data/hora/local, "Vou/Confirmado", contagem de confirmados, aviso a quem confirmou quando muda/cancela (`views.js:89`; `manage.js:17,31,41`; `handlers.js:36`) | parcial | Tabela `events` com `group_id` (`supabase/migrations/20260802001200_events_rsvp.sql:10-33`), RSVP `interested/going` + `not_going` (`:35-41`; `supabase/migrations/20260821000007_event_rsvp_not_going.sql`), notificação de mudança a RSVP'd (`supabase/migrations/20260802001400_personal_notifications.sql:201`); a UI `/events` **não cria nem lista eventos por grupo** (grep `group_id` em `apps/web/lib/events` e `(shell)/events` = nada além de comentários de autorização) | O banco quase cobre; falta a tela e o formato "evento no feed do grupo" | Não essencial (reuso), sim para criação group-scoped na UI |

| CHECK de `events.venue` bloqueia palavras "rua/quadra/bairro/…" (`supabase/migrations/20260802001200_events_rsvp.sql:21-31`) | — | — | Exemplos do protótipo violariam o CHECK: "Quadra do Parque 10" (`groups/views.js:26`). Conflito com ADR-20260925-endereco-por-escolha (endereço por escolha do anunciante) | Ajuste de CHECK é decisão a registrar no ADR |

| **Oferta** do negócio do membro, 1/semana/grupo, só com página ativa, rótulo Oferta, proibido patrocinado (`editors.js:1-5,16`; `handlers.js:22,29`) | não | Nada em grupos; página de negócio existe (`supabase/migrations/20260926164158_member_business_page.sql`) | Domínio lote 6, mas a trava por grupo é do lote 5 | **Sim**: tipo/flag + limite semanal + vínculo post→negócio |

| Página **Publicação** com comentários, "Resolveu" pelo autor da pergunta-do-grupo, marcação de negócio em comentário (+indicação ao negócio), entrar-para-comentar (`views.js:115-126`; `handlers.js:37-38`) | parcial | Comentários inline no card (`feed-post-card.tsx:141-178,396-423`); sem rota `/publicacao/[id]`; `comments` sem coluna de resolução nem de negócio (`supabase/migrations/20260802000900_community_feed.sql:60-66`) | "Resolveu" não existe para posts de grupo; "negócio indicado" não existe | **Sim**: resolução em comentário (ou reuso de pedido+resposta via alsoCity); tag de negócio (lote 6) |

| Editar/excluir publicação do autor, inclusive evento/poll; excluído avisa confirmados (`manage.js:14-43,67-80`) | parcial | Editar texto/foto existe (`feed-post-card.tsx:425-431`, `feed-post-edit.tsx`); **excluir publicação não aparece no feed** por desenho ("O feed não usa este item" — `feed-post-menu.tsx:30-33`), embora o banco permita delete do autor (`supabase/migrations/20260802000900_community_feed.sql:93-94`) | Falta excluir; falta editar evento/poll | Não |

| Editar/excluir comentário próprio (`manage.js:81-88`) | não | `CommentItem` só renderiza + denunciar (`feed-post-card.tsx:38-51`) | Grant/policy de update do autor existem (`supabase/migrations/20260802000900_community_feed.sql:93-94`; policies não lidas linha a linha — **INCERTO**) | Não |



### 1.7 Aba Negócios da Comunidade



| Função do protótipo | No Next? | Onde no Next | Divergência | Backend novo? |

|---|---|---|---|---|

| Aba "Negócios": lista da cidade ordenada por nº de recomendações, filtra patrocinado, "Ver todos os negócios" (`community/views.js:3`) | não | `/mercado`, `/negocio`, `/explorar` (listas de rotas `(shell)`) | Contagem `recN` não tem equivalente lido aqui — **INCERTO** (domínio lote 6) | Sim (lote 6) |



---



## 2. Divergências de comportamento que mudam regra de negócio



1. **Bloqueio de pessoa não esconde conteúdo.** Protótipo: bloquear remove perguntas/respostas/publicações/comentários da pessoa em listas, busca e detalhe (`prototypes/bivaque-html/src/features/profile/blocks.js:1-6`, `prototypes/bivaque-html/src/app/state.js:37,48,52`). Next: bloqueio só fecha DM (`supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:53-60`); feeds e listas não filtram nada. O backend que existe **não é** o comportamento especificado.

2. **"Ocultar" pessoal existe no banco, não na tela; e o "Ocultar publicações" da tela é falso.** `hidden_questions` + filtro no `list_indications` estão prontos e testados (`supabase/migrations/20261022130511_hidden_questions.sql`, `supabase/migrations/20261022130513_community_list_excludes_hidden.sql`, `supabase/tests/hidden-questions.sql`) — nenhuma chamada em `apps/web`. Em contrapartida, `apps/web/app/(shell)/community/page.tsx:71,245-247,326` esconde publicações só até o reload, e a tela "Ocultados" não existe.

3. **Regra de publicação de pergunta.** Protótipo exige ≥8 caracteres e ≥2 termos, aceita até 300 (`prototypes/bivaque-html/src/features/community/editor.js:1,3`; `manage.js:53`). Next aceita ≥3 e limita 200 (`apps/web/lib/indications/indications.ts:29,37,162-169`), e o CHECK do banco fixa 3..200 (`supabase/migrations/20260802001100_recommendations.sql:31`). Não é só texto de formulário: a fronteira de conteúdo aceito muda.

4. **Resolução do pedido.** Protótipo permite marcar resolvida/reabrir sem escolher resposta, limpando todas as marcas (`manage.js:54`). Next só resolve por resposta marcada (`supabase/migrations/20260911025357_recon_035_resolved_reply.sql` D1–D2; RPCs em `apps/web/lib/recommendations/resolution-rpcs.ts`). Modelos incompatíveis sem decisão explícita.

5. **A autora não edita nem exclui a própria pergunta no Next**, embora o banco autorize (`supabase/migrations/20260802001100_recommendations.sql:158,166`), enquanto o protótipo trata autogestão como regra rodada 59 (`prototypes/bivaque-html/src/features/community/manage.js:1-4`). Excluir pergunta no protótipo também **remove as respostas junto** (`manage.js:33-36` — cascade: o banco tem `on delete cascade` `supabase/migrations/20260802001100_recommendations.sql:56`, coerente).

6. **Encerramento de grupo ≠ exclusão.** Protótipo: admin encerra; grupo fica só-leitura por 30 dias, reabre no prazo, depois some; nada de apagar (`prototypes/bivaque-html/src/features/groups/views.js:44-52`, `handlers.js:45-46`). Next: único caminho é `delete_group` (soft delete) (`groups/[id]/page.tsx:205-225`), sem estado de leitura.

7. **"Sem resposta" do Next não significa "sem resposta".** O filtro é `p_resolved=false` (`apps/web/app/components/indications/indications-panel.tsx:27,61-68`), incluindo pedidos já respondidos e não marcados. O chip equivalente do protótipo é "Para ajudar": `status==='open' && !mine` (`prototypes/bivaque-html/src/features/community/views.js:5`) — conjunto e ordem diferentes.

8. **Turma de chegada automática** (grupo por ciclo nov–out ligado a chegada/partida, join automático, pill Automático) não tem nenhum correspondente no Next/banco (`prototypes/bivaque-html/src/features/groups/views.js:1-5,35-41` vs `supabase/migrations/20260820051230_declared_arrivals.sql:1-14`, que é só sinal operacional).

9. **Enquetes**: o protótipo define voto único, visibilidade de % apenas pós-voto e trava quando grupo encerrado (`views.js:90`, `handlers.js:35`); o Next declara "o produto não tem enquete" (`feed-post-card.tsx:333`) e o banco não registra votos. Isso inverte uma decisão anterior registrada — o ADR do lote 5 precisa decidir.

10. **Sair de grupo como admin exige nomear moderador antes** (`prototypes/bivaque-html/src/features/groups/handlers.js:10`); o Next permite ao admin sair livremente deletando a própria membership (`groups/[id]/page.tsx:67-94`), potencialmente deixando o grupo órfão.

11. **Túmulo de moderação** ("Publicação/Resposta removida pela moderação" visível no lugar) (`prototypes/bivaque-html/src/features/community/question.js:6`, `groups/views.js:85`, `prototypes/bivaque-html/src/features/listings/detail.js:3`) vs. sumiço por policy (`supabase/migrations/20260821000033_hideable_targets.sql`) e tela genérica de indisponível (`indication-detail.tsx:211-225`). A experiência de "removido" é diferente e o critério de saída do lote exige "remoção moderada comprovada diretamente".

12. **Ofertas em grupo com limite semanal por pessoa** (`editors.js:1-5,16`, `handlers.js:22`) não existem no banco — e o CHECK `post_no_forbidden_terms` de `posts` **proíbe** palavras como "venda", "comercial" no conteúdo (`supabase/migrations/20260802000900_community_feed.sql:41-46`), e `recommendation_*` proíbem "oferta/preço/desconto" (`supabase/migrations/20260802001100_recommendations.sql:41-48`). Uma publicação "Oferta" colide com as guards atuais; precisa decisão + migration coordenada.

13. **CHECK de `events.venue` rejeita locais do próprio exemplo do protótipo** ("Quadra do Parque 10" casa `quadra`; bairro-like tokens em `supabase/migrations/20260802001200_events_rsvp.sql:21-31`). O ADR de endereço-por-escolha (25/09) já frouxou isso para anúncios, mas não para eventos — registrar no ADR.

14. **Nomenclatura de privacidade**: "Aberto/Fechado" com explicações por tela (`prototypes/bivaque-html/src/features/groups/editors.js:26`) vs "Público/Privado" (`apps/web/app/(shell)/groups/page.tsx:391-393`, `groups/[id]/page.tsx:345`) — texto de produto que o dono especificou; muda também a frase do CTA ("Pedir" vs "Solicitar"/"Pedir entrada").



## 3. O que o Next tem e o protótipo não tem



| Item | Evidência Next | Recomendação |

|---|---|---|

| Produto **"Comunidades" plural** (vilas): lista, detalhe, join com motivo, convites, indicar prestador, ownership transfer de comunidade | `apps/web/app/(shell)/communities/` (page.tsx, [id]/community-detail-screen.tsx, [id]/invite/, [id]/indicar-prestador/); tabelas `communities`, `community_memberships`, `community_join_reasons` (`supabase/migrations/20260909014034:18`), `community_invitations` (`supabase/migrations/20260821000002:24`); nav item "Comunidades" (`bottom-nav.tsx:64-72`) | O AGENTS raiz declara `communities`/`community_id` legado e não-obra-prima atual. Protótipo tem **uma** comunidade por cidade. **Candidato a remover/redirecionar — decisão R3 do dono, não presumir** |

| Vista **"Conversa"** em `/community` (feed `feed_community` com audiência de vila, header, rail, seções Hoje/Semana, "Você está em dia", deep link `?post=`, infinite scroll) | `apps/web/app/(shell)/community/page.tsx:168-190,286-332,407-531`; `supabase/migrations/20260805215020:90`, `supabase/migrations/20260925213256` | Protótipo coloca o feed urbano no **Início** e a Comunidade não tem aba Conversa (`prototypes/bivaque-html/src/features/community/views.js:1`). Reubicar ou remover a vista; não duplicar |

| **Guia dentro do fluxo de pedir** (hits `arrival_guide_entries` ao digitar e nas respostas) | `ask-indication.tsx:74-97,227-257`; `indication-detail.tsx:425-433`; `supabase/migrations/20260821000006_promote_reply_to_guide.sql` | Protótipo só lista perguntas resolvidas parecidas (`editor.js:2`). **Manter** (é a "memória" do ADR de 25/09) — registrar como extensão autorizada |

| **Salvar pedido** + aba Indicações em /salvos | `indication-detail.tsx:290-314`; `apps/web/lib/saves/saved-items.ts:7,193` | Protótipo tem "Seguir respostas" (`question.js:4`). Manter como implementação do acompanhar (unificar rótulo no ADR) |

| **Complementar o pedido** pelo autor (textarea com rótulo próprio) | `indication-detail.tsx:480-503` | Protótipo: autor responde como qualquer um (`question.js:6` "Sua indicação"). Manter/adaptar texto |

| **Transferir ownership / remover membros / rebaixar moderador** | `groups/[id]/page.tsx:96-122,178-203`; `groups/page.tsx:489-498` | Protótipo só nomeia. **Manter** (administração real; o protótipo é menos rico) |

| **Bloco de onboarding de grupo** ("Cumprimente-se / Compartilhe") | `groups/page.tsx:54-97` | Sem equivalente; provável remoção/redesenho no porte |

| **Reações "curtir"** (coração) no card | `feed-post-card.tsx:180-207,351-360`; `supabase/migrations/20260804212011` | Protótipo usa "Útil · N". Unificar no ADR |



## 4. Backend — o que falta × o que já existe e reaproveita



**Falta (tabela/coluna/RPC/policy) para o protótipo funcionar de verdade:**

1. **Bloqueio de pessoa cross-content**: tabela (ou generalização de `dm_blocks`) + filtros de leitura em `posts`, `comments`, `recommendation_requests`, `recommendation_replies` e feeds (protótipo `blocks.js:1-6`; hoje só `supabase/migrations/20260802001500:53`).

2. **Enquetes**: `poll_votes(post_id, user_id, option_idx, unique)` + contagens agregadas em `feed_group/feed_community`; hoje só `poll_options jsonb` sem voto (`supabase/migrations/20260802000900:31`).

3. **Colunas de grupo**: `rules text`, `pinned text`, `allow_offers bool`, `closed_at timestamptz` (com janela de 30 dias nas policies/filtros), nível de aviso por membership, `unread`/`last_viewed` por membership, template/imagem; CHECKs de tamanho alinhados (3..60 nome, ≤300 sobre) (`supabase/migrations/20260802001000:29-49` hoje nada disso).

4. **Turma de chegada**: flag `auto`/`cycle` + criação/join automática ligada a chegada/partida (hoje nada; `supabase/migrations/20260820051230` é só sinal de leitura).

5. **Vínculo "também perguntar à cidade"**: relação post↔request (coluna ou tabela), hoje o CHECK de origem é excludente locality XOR group (`supabase/migrations/20260802001100:40-44`).

6. **Resolução em comentário de grupo** ("Resolveu") — `comments` não tem coluna (`supabase/migrations/20260802000900:60-66`); alternativa: modelar pergunta de grupo como `recommendation_requests` (que já tem resolução por resposta) + link.

7. **Pedido com "motivo do pedido" em grupo fechado** (`groups/handlers.js:6`) — coluna em `group_memberships` (padrão pronto em `supabase/migrations/20260909014034`).

8. **Oferta**: tipo/flag + limite semanal por (grupo, pessoa) + vínculo post→business, renegociando os CHECKs anti-comercial (`supabase/migrations/20260802000900:41-46`, `20260802001100:41-48`) — domínio lote 6, fronteira registrada aqui.

9. **Eventos no grupo pela UI**: `events.group_id` existe, falta leitura/criação group-scoped e a frase de aviso a confirmados (notificação já existe, `supabase/migrations/20260802001400:201`); revisar CHECK de `venue` (item 2.13).

10. **Sinal de túmulo** para moderação (o removido some por policy; o protótipo quer placeholder) — precisa leitura do estado `is_deleted` sem vazar conteúdo (ex.: flag de "removido" no card, não o texto).

11. Se confirmada a resolução sem escolher resposta (2.4) — RPC/coluna de status próprio do pedido.



**Existe e pode ser reaproveitado (não recriar):**

- `list_indications` com busca, categoria, `p_resolved`, **exclusão do ocultado** (`supabase/migrations/20260926004501`, `supabase/migrations/20261022130513`); `hidden_questions` + `list_hidden_questions` + pgTAP (`supabase/migrations/20261022130511`, `supabase/tests/hidden-questions.sql`).

- Ciclo de resolução com marca por resposta: `resolved_reply_id`, RPCs mark/clear/reopen (`supabase/migrations/20260911025357`, `apps/web/lib/recommendations/resolution-rpcs.ts`); notify autor + salvos (`supabase/migrations/20260821000011/012`); reply→Guia (`supabase/migrations/20260821000006`).

- Feeds: `feed_group`/`feed_community` paginados com `my_follow`/`my_reaction` (`supabase/migrations/20260805215020:90,173`, `supabase/migrations/20260915013344`, `supabase/migrations/20260925213256`).

- Grupos: `create_group`, `join_group`, `approve_group_member`, `add/remove_group_moderator`, `transfer_group_ownership`, `delete_group`, RLS de visibilidade de membro fechado (`supabase/migrations/20260802001000`, `supabase/migrations/20260821000018`, `supabase/migrations/20260819010000`, `supabase/migrations/20260825143505`).

- Autoria sobre o próprio conteúdo já autorizada no banco: update/delete de requests/replies/posts/comments (`supabase/migrations/20260802001100:158,166`, `supabase/migrations/20260815220000:105,112`, `supabase/migrations/20260802000900:93-94`).

- Moderação: `reports` com alvos post/comment/group/message/recommendation_request/recommendation_reply, `resolve_report`, `list_open_reports`, `is_deleted` nos seis alvos (`supabase/migrations/20260802001600`, `supabase/migrations/20260821000030/031/032/033/034/035`); painel em `apps/web/app/(admin)/reports/`.

- `post_reactions`, `post_follows`/`feed_following`, `post_saves`, `recommendation_saves`; eventos+RSVP com `not_going` e notificação de mudança (`supabase/migrations/20260802001200`, `supabase/migrations/20260821000007/017`); `user_group_interests` + `suggest_groups_for_user` (prontos, só não consumidos na tela); notificações pessoais + admission (`supabase/migrations/20260802001400`).



## 5. Proposta de frentes paralelas (3–4)



Frontes com donos de arquivo separados; pontos de contato viram interfaces, não edição compartilhada.



- **Frente A — Ciclo da pergunta (Indicações).** UI: editar/excluir pergunta, editar resposta, filtros "Para ajudar"/"Minhas", faixas de ocultado/túmulo, texto 8..300. Arquivos: `apps/web/app/components/indications/*`, `apps/web/app/(shell)/indicacoes/*`, `apps/web/lib/indications/*`. Migration própria: CHECK de `title` (`3..200`→`8..300`) e, se o dono decidir, resolução sem resposta. Não toca em `groups` nem em `feed-post-*`.

- **Frente B — Grupo: estrutura e administração.** `groups/page.tsx`, `groups/[id]/page.tsx` **apenas seções de header/admin**, migrações de colunas de `groups`/`group_memberships` (rules, pinned, fechado, privacidade, notif, unread, motivo do pedido, encerrar/reabrir, turma automática). Não toca `feed-post-*` nem `components/indications/*`.

- **Frente C — Conteúdo do grupo.** Tipos de publicação no composer/card/detalhe (`publicacao`), enquete com `poll_votes`, evento no feed do grupo, "também perguntar à cidade", resolver comentário. Arquivos: `apps/web/app/components/bivaque/feed-post-*`, `apps/web/app/(shell)/community/feed-*`, migrações `posts`/`comments`/link post↔request. Contato com B: C lê as flags de B (encerrado → bloquear interação) — contrato = coluna + prop, sem editar os arquivos de B; executar B→C ou em worktrees com merge sequencial em `groups/[id]`.

- **Frente D — Bloqueio e ocultação pessoais.** Migration `user_blocks`/generalização + filtros de leitura em todas as listas; UI `/ocultados` + botão ocultar ligado a `hidden_questions` (DB pronto); listas `/configuracoes/bloqueados`/`denuncias` estendem para conteúdo. Arquivos: novos `app/(shell)/ocultados/`, `apps/web/lib/reports/*`, `apps/web/lib/security/*`; não toca `groups/[id]` nem `feed-post-create`.



Toda frente fecha com teste positivo **e** negativo por via de permissão (regra do AGENTS: acesso negado e remoção moderada comprovados diretamente), e as provas do critério de saída do lote (tabela §6 da auditoria, `docs/AUDITORIA_ADERENCIA_2026-10-19.md:432`) são por frente: entrada → ação → retorno → resolução em A (pergunta), B/C (grupo/publicação), D (ocultado/bloqueio/moderação).



**Nenhum arquivo foi editado.** Pontos marcados como INCERTO (paridade de motivos de denúncia, policies de update de comentários, "Acompanhando" do Início vs. protótipo, navegação "aprovada" de destino final, contagem `recN`) precisam de conferência ou decisão humana antes de entrar no ADR como fato.

