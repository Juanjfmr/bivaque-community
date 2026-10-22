# Auditoria de aderência: Bivaque real (Next.js + Supabase) × protótipo HTML

Data: 19/10/2026. Autor: Codex (gpt-6.1-sol, esforço high), só leitura, sobre `28e6fbde` (main `6c6947c1` + R69).
Pedido: `prompt.md` desta auditoria, a pedido do dono antes de confirmar a "opção A" (Next vira o protótipo).

**Conferência pelo Claude (Opus):** H1, H2 e H3 foram verificados no código e se confirmam. A última policy
`posts_select_locality_member` (20260805214709) não olha `is_deleted`; `provider_profiles` tem `grant select`
na tabela inteira (20260825185327:139) e nenhuma policy usa `contact_is_public`; o worker de exclusão
(`apps/web/app/api/internal/account-deletion/route.ts:74`) avança o offset sobre a lista já reduzida.
Os demais achados não foram reverificados.

---

## 1. Veredito

**Sim: dá para seguir a opção A aproveitando Next.js, React e Supabase.**
A base contém mecanismos úteis de autenticação, admissão, autorização, conteúdo, anúncios, conversas e operação.
**O trabalho, porém, não é apenas trocar a pele:** há contratos de produto incompatíveis e capacidades ausentes.
Antes da abertura, precisam ser corrigidos os defeitos de moderação, telefone privado, purga de conta e tratamento de mídia identificados abaixo.
Antes de integrar suas respectivas telas, precisam ser reconciliados bairros, negócios gratuitos municipais, propostas, bloqueios, suporte e exclusão de conta.
Cobrança pode permanecer dormente; não encontrei cobrança real implementada no Next.
A estratégia técnica é aproveitável; **a aderência funcional integral e a prontidão para lançamento não estão comprovadas**.

### Escopo e método

Auditoria realizada na branch `codex/lancamento`, revisão **`28e6fbde98ffe34c015ae5c74cf92c96ff26ddb9`**, com árvore limpa. O diff sobre `6c6947c1` confirma que a rodada 69 modifica o protótipo e suas provas, sem alterar o backend ou o aplicativo Next.

Foram feitas leituras estáticas e consultas locais de Git e do kanban, em três frentes isoladas. **Nenhum arquivo foi alterado. Não houve acesso à rede ou a banco, aplicação de migrations, execução de testes, build ou navegador.**

Inventário encontrado:

| Artefato | Quantidade |
|---|---:|
| Migrations SQL | 184 |
| Arquivos SQL em `supabase/tests` | 133 |
| Tabelas de aplicação remanescentes nas migrations | 65 |
| Arquivos de testes unitários inventariados | 144 |
| Arquivos de testes de escopo | 26 |
| Specs E2E Playwright | 58 |
| Páginas Next `page.tsx` | 93 |
| Nomes de rota registrados no protótipo | 33 |
| Scripts de prova de rodadas do HTML | 70 |

Essas contagens medem arquivos e definições, **não testes aprovados ou funcionalidades concluídas**.

Nas evidências abaixo:

- `P/` significa `prototypes/bivaque-html/src/`.
- `W/` significa `apps/web/app/`.
- `M/<prefixo>` identifica a migration de prefixo único em `supabase/migrations/`.
- Caminhos de telas Next sem grupo explícito pertencem normalmente a `W/(shell)/`.

---

### 2. Frente 1 — Banco × protótipo

### 2.1 Matriz por entidade e jornada

“Serve como está” significa que a estrutura principal pode ser reaproveitada. Não certifica sua execução em ambiente implantado.

| Entidade/jornada | Classificação | O que aproveita e o que precisa mudar | Evidência |
|---|---|---|---|
| **Pessoa e identidade** | **Serve como está** como fundamento | Auth e UUID oferecem identidade real e contas independentes. Não transportar a identificação por nome usada na simulação. | `M/20260802000100_locality_profile_foundation.sql`; `P/app/state.js:29` |
| **Perfil** | **Existe mas precisa mudar** | Nome, bio, avatar e leitura autorizada existem. Falta bairro do perfil e sua visibilidade conforme o protótipo. A exposição da afiliação tem divergência de governança descrita adiante. | `M/20260911024732_profile_bio.sql`; `M/20260918011938_profile_affiliations_no_bulk_read.sql`; `P/features/profile/hood-privacy.js` |
| **Entrada/admissão** | **Existe mas precisa mudar** | Consentimento, estados privados, tentativas, documentos, decisão e reconciliação são reaproveitáveis. Adaptar etapas, mensagens e promessas operacionais do protótipo. Reconhecimento por IA não está entregue. | `M/20260815132000_verification_documents.sql`; `M/20260815133000_verification_attempt_limit.sql`; `M/20260922153901_approve_identity_without_locality.sql`; `P/features/entry/account.js:46` |
| **Família** | **Serve como está** no núcleo | Convite com digest, destinatário vinculado ao e-mail, validade, aceite e conta independente existem. Integrar a nova interface e comprovar entrega real. Convite familiar não concede comunidade privada. | `M/20260802000200_private_trust_family_foundation.sql`; `M/20260815130000_family_invite_email_binding.sql`; `M/20260915230000_family_invite_resend.sql` |
| **Cidade** | **Existe mas precisa mudar** | Catálogo nacional IBGE, memberships, transferência e consulta a outra cidade já existem. Reconciliar o público de cada conteúdo e a diferença entre explorar e publicar. | `M/20260817022250_locality_ibge_catalog.sql:20`; `M/20260925161111_consulta_outra_cidade.sql` |
| **Bairro** | **Falta** como domínio estruturado | Há texto livre em anúncios e alertas. Faltam catálogo/normalização, zonas, centroides, aliases, bairro do perfil e atendimento por bairro. Busca por CEP/localização ainda é simulação do HTML. | `M/20260911043053_listings_market_and_homes.sql:51,180`; `P/data/demo/bairros.js`; `P/shell/hood-picker.js:33` |
| **Comunidades** | **Existe mas precisa mudar** | Entidade genérica, pedidos, aprovação, moderadores, posse, convites, imagens e saída existem. Reorganizar sua apresentação conforme o protótipo sem confundir bairro com permissão privada. | `M/20260805215419_community_rpcs.sql`; `M/20260915235000_community_presentation_read.sql` |
| **Grupos e publicações** | **Existe mas precisa mudar** | Membership, privacidade por container, moderação, posts, comentários, enquetes e exclusão têm base existente. Mapear ofertas de negócios, encerramento e demais regras novas. Corrigir leitura de conteúdo moderado. | `M/20260802001000_groups_moderation.sql`; `M/20260805214709_community_scope.sql`; `M/20260821000018_delete_group_rpc.sql` |
| **Perguntas e respostas** | **Existe mas precisa mudar** | Pedidos de indicação, respostas, resolução, salvos, avisos e memória existem. Faltam correspondência integral com indicação de negócio, ocultação pessoal e bloqueio abrangente do protótipo. | `M/20260802001100_recommendations.sql`; `M/20260926004501_memoria_de_indicacoes.sql` |
| **Indicação direta de negócio** | **Falta** no contrato demonstrado | Respostas de indicação não equivalem a indicar uma página, acumular relatos vinculados ao negócio, salvar negócio ou indicar negócio ainda sem responsável. Não localizei domínio equivalente completo. | `P/features/businesses/detail.js:2`; `M/20260825185327_provider_showcase.sql`; `M/20260802001100_recommendations.sql` |
| **Desapegos** | **Existe mas precisa mudar** | `listings`, fotos, rascunhos, lifecycle e favoritos existem. Adaptar atributos, filtros, bairro, mapa e interações do protótipo. | `M/20260911043053_listings_market_and_homes.sql:39`; `M/20260911043436_listing_lifecycle.sql` |
| **Imóveis** | **Existe mas precisa mudar** | Modelo de anúncio com `property_details`, custos separados, fotos e favoritos existe. Faltam equivalência de filtros, comparação, mapa e contrato de bairro. | `M/20260911043053_listings_market_and_homes.sql:112`; `P/features/listings/compare.js`; `P/features/listings/map.js` |
| **Alertas de busca** | **Existe mas precisa mudar** | `listing_alerts`, entregas e preferências existem; o tipo permite item e imóvel. Faltam filtros adicionais do protótipo, inclusive distância a partir do bairro. | `M/20260911043053_listings_market_and_homes.sql:174`; `M/20260911051005_listing_alert_deliveries.sql`; `P/features/listings/alerts.js` |
| **Negócios/prestadores** | **Existe mas precisa mudar** | Página, catálogo, portfólio, busca e página de membro existem. Civil continua atrelado à comunidade; membro já pode ter alcance municipal gratuito. Reconciliar assunção de página, especialidades, bairros, pausa e suspensão. | `M/20260825185327_provider_showcase.sql`; `M/20260926164158_member_business_page.sql`; `M/20260927005841_member_business_page_follows_owner.sql` |
| **Pedido direto** | **Serve como está** como modalidade | Pedido para um prestador, criação idempotente, conversa e acompanhamento existem. Não confundir essa modalidade com pedido aberto. | `M/20260911032309_service_requests.sql:28`; `M/20260922160100_conversation_per_request.sql` |
| **Pedido aberto e propostas** | **Falta** | Não há domínio para até cinco propostas, valores estruturados, validade, escolha exclusiva, recusas, conclusão e desistência no contrato do protótipo. | `P/features/requests/model.js:1`; `M/20260923120000_service_request_open_cap.sql:9` |
| **Conversas** | **Existe mas precisa mudar** | Participantes, contexto, mensagens, leitura, bloqueio e conversas por pedido existem. Adaptar novos contextos de proposta e recursos secundários do HTML. | `M/20260802001500_contextual_dm_abuse_controls.sql`; `M/20260911105119_service_request_tracking.sql:56` |
| **Avisos/notificações** | **Existe mas precisa mudar** | Inbox, leitura, preferências, outbox e jobs são reaproveitáveis. Novas propostas, chamados e ações do painel precisam de produtores e destinos. Push demonstrado no HTML não equivale a entrega implantada. | `M/20260911054812_notification_channel_preferences.sql`; `M/20260814174705_outbox_worker.sql` |
| **Eventos/agenda** | **Existe mas precisa mudar** | RSVP, convites, recorrência, informações ao organizador e conclusão existem. Conferir campos, transições e concorrência contra o protótipo. | `M/20260802001200_events_rsvp.sql`; `M/20260820052745_recurring_events.sql`; `M/20260911051230_event_question_thread.sql` |
| **Guia** | **Existe mas precisa mudar** | O banco oferece acervo curado, artigos, revisão, correção e salvos. Isso não corresponde ao roteiro pessoal de chegada e seu progresso. | `M/20260910202110_guide_article.sql`; `M/20260923200000_guide_candidate_queue.sql`; `P/features/transfers/guide.js:1` |
| **Plano/checklist pessoal** | **Falta** | Guia editorial não é checklist individual de chegada/saída. Não encontrei persistência correspondente ao progresso pessoal do protótipo. | `P/features/home/views.js`; `P/features/transfers/guide.js`; `prototypes/bivaque-html/docs/ADAPTERS.md` |
| **Denúncias e moderação** | **Existe mas precisa mudar** | Modelo unificado e resolução operacional existem. Incluir novos alvos, especialmente proposta/pedido aberto, e corrigir a leitura direta de conteúdo removido. | `M/20260821000031_report_targets_enum.sql`; `M/20260821000034_resolve_report_rpc.sql`; `P/features/owner/review.js:43` |
| **Bloqueios** | **Existe mas precisa mudar** | Banco bloqueia contatos e algumas interações. Não reproduz integralmente ocultação global e discrição prometidas no protótipo. | `M/20260802001500_contextual_dm_abuse_controls.sql:274`; `P/app/state.js:37`; `P/features/profile/blocks.js` |
| **Ocultar para mim** | **Falta** com persistência | `is_deleted` é moderação global. Não deve ser usado para representar ocultação individual reversível. | `P/features/profile/hidden.js:2`; `W/(shell)/community/page.tsx:71,326` |
| **Apagar conta** | **Existe mas precisa mudar** | Há pedido, bloqueios de interação, purga e tratamento de posses. Existem defeito de paginação e diferença material entre os efeitos prometidos pelas interfaces. | `M/20260915101543_account_deletion.sql`; `M/20260918114238_settle_account_possessions.sql`; `W/api/internal/account-deletion/route.ts:74` |
| **Ajuda/chamados** | **Falta** como sistema de chamados | O Next oferece suporte por e-mail, sem o ciclo de protocolo, acompanhamento e resposta do protótipo. | `W/(shell)/ajuda/page.tsx:4`; `P/features/support/help.js:75` |
| **Painel do dono** | **Existe parcialmente, precisa mudar** | Operadores, admissões, denúncias, chegadas e curadoria existem. Faltam console integrado e capacidades nacionais de cidades, negócios e equipe demonstradas no HTML. | `M/20260806040949_operator_authorization.sql`; `M/20260806100231_restrict_operator_roster.sql`; `P/features/owner/console.js:92` |

**Duas correções importantes em relação à documentação antiga:**

1. **Anúncios, rascunhos, favoritos e enquetes não estão ausentes da base atual.** `ADAPTERS.md` foi produzido por mapeamento nominal de uma base anterior e declara não ter conferido colunas e policies. Sua afirmação de ausência dessas estruturas não pode orientar o porte atual.
2. **Saúde já deixou de exigir grupo.** A constraint antiga é removida em `20260926004501_memoria_de_indicacoes.sql:25`. Não seria correto apontar a regra de agosto como bloqueio atual às perguntas municipais.

### 2.2 Cidade, bairro, comunidade e vila

**O banco não precisa ser substituído por ser “de vilas”.** `communities` é entidade genérica; o catálogo de localidades já é nacional. A separação entre cidade, comunidade e grupo continua útil para autorização.

O desalinhamento está em três pontos:

| Ponto | Situação encontrada | Consequência |
|---|---|---|
| Cidade nacional | Catálogo IBGE e consulta a outras cidades existem. | Aproveitar, preservando a diferença entre consulta e direito de publicação. |
| Bairro | Apenas texto livre em partes do modelo. | Falta a base para normalização, mapa, distância e atendimento por bairro. |
| Alcance civil gratuito | Prestador civil nasce vinculado à comunidade que o indicou. | Não cumpre “página gratuita e completa para a cidade inteira” sem adaptação. |

**Selecionar bairro ou cidade não pode conceder acesso a conteúdo privado de comunidade.** A mudança de organização visual não elimina essa fronteira.

### 2.3 Alcance pago e lançamento gratuito

A rodada 69 desliga planos e patrocínio no protótipo por `paidPlans()`, falso por padrão. A evidência está em `P/features/businesses/plans.js:7–23` e `prototypes/bivaque-html/docs/ROUND_69.md:12–44`.

No banco:

- `provider_reach_source` continua permitindo `free` e `paid`.
- O civil mantém alcance gratuito comunitário.
- A página de membro admite alcance municipal gratuito.
- `search_providers` não usa pagamento para ordenar.
- Não encontrei integração transacional de assinatura, checkout ou webhook Asaas no Next.

**Recomendação:** conservar o legado pago sem ativação, reconciliar o alcance gratuito municipal e impedir que `paid` determine exposição ou vantagem no lançamento. Não há motivo para implementar cobrança agora.

O ADR de alcance pago continua descrevendo o modelo anterior. A decisão posterior de lançamento gratuito deve orientar a entrega; cobrança só retorna com o novo ADR previsto pela rodada 69.

### 2.4 Cobertura de RLS

**As 65 tabelas remanescentes têm `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` declarados nas migrations.** Isso não significa que suas policies sejam suficientes: os achados de posts/comentários e telefone demonstram a diferença.

O inventário abaixo cobre as tabelas criadas pela aplicação. Não certifica a configuração efetivamente aplicada em uma instância Supabase.

| Tabelas | Fronteira declarada no SQL |
|---|---|
| `private.verification_outcomes`, `private.verification_documents`, `private.family_invitations`, `private.family_account_links`, `private.provider_invitations` | Sem acesso direto de tabela para `anon`/`authenticated`; acesso por serviço/RPC autorizado. |
| `localities`, `locality_memberships`, `profiles` | Catálogo/consulta autorizada, memberships próprias e perfis com regras de pertencimento e exclusão. |
| `profile_affiliations`, `profile_suspensions` | Afiliação própria; terceiros por RPC dirigida a um alvo. Suspensão própria para leitura e serviço para escrita. |
| `waitlist`, `consent_acceptances` | Acesso de serviço. |
| `communities`, `community_memberships`, `community_join_reasons`, `community_invitations` | Descoberta, pertencimento, motivos restritos ao solicitante/moderador e alterações por RPCs. Convites sem acesso direto de usuário. |
| `groups`, `group_memberships`, `user_group_interests` | Container e membership; gestão por dono/moderador. Interesses por wrappers de serviço. |
| `posts`, `comments`, `post_reactions`, `post_saves`, `post_follows` | Escopo do conteúdo e autoria. **Posts/comentários têm falha na exclusão moderada.** Salvos e acompanhamentos são próprios. |
| `recommendation_requests`, `recommendation_replies`, `recommendation_saves`, `recommendation_reply_promotions` | Autor/container, exclusão lógica e operações próprias. Promoção por serviço/curadoria. |
| `events`, `event_rsvps`, `event_invites` | Escopo do evento, organizador e participante. Consulta externa não abre automaticamente participantes. |
| `dm_conversations`, `dm_messages`, `dm_blocks`, `dm_read_states` | Participantes e contexto; bloqueio e autoria no envio. **O bloqueado pode ler a linha do bloqueio.** |
| `reports`, `notifications` | Denunciante e destinatário, respectivamente; resolução operacional. |
| `notification_preferences`, `notification_channel_preferences`, `outbox`, `notification_opt_outs` | Preferências próprias; fila e opt-outs por serviço. |
| `provider_accounts`, `provider_profiles`, `provider_reach`, `provider_catalog_items`, `provider_portfolio_photos` | Conta própria e alcance da ficha; gestão autorizada. **Telefone não público continua selecionável por quem alcança a ficha.** |
| `service_requests`, `service_request_photos` | Solicitante e prestador destinatário; criação/transições por RPC. |
| `listings`, `property_details`, `listing_photos`, `listing_saves` | Porta canônica de leitura do anúncio; escrita do dono; favoritos próprios. |
| `listing_alerts`, `listing_status_events`, `listing_alert_deliveries` | Dono; produção controlada de eventos e entregas. |
| `arrival_guide_entries`, `guide_articles`, `guide_article_sections`, `guide_article_revisions`, `guide_correction_requests`, `guide_entry_saves` | Publicação/escopo do acervo; revisões operacionais; correções e salvos próprios. |
| `operators`, `account_deletion_requests`, `national_holidays`, `indication_alert_deliveries` | Sem acesso direto geral de usuário; RPCs/serviço conforme finalidade. |

`dm_reports` foi eliminado por `20260825175718_drop_dm_reports_unified.sql`, após unificação em `reports`; não é uma tabela desprotegida esquecida.

### 2.5 Dados pessoais, localização e seed

| Dado | Resultado da leitura |
|---|---|
| **CPF bruto** | Não encontrei coluna de CPF no perfil ou resultado persistido da verificação. O fluxo persiste resultado/classificação. Isso não certifica ausência em logs externos ou ambientes implantados. |
| **Senha** | O protótipo não a persiste. No produto real, a credencial pertence ao Auth; a regra não significa eliminar a autenticação por senha. |
| **CEP** | Não há coluna dedicada no esquema de produto. O protótipo bloqueia CEP no valor de bairro, inclusive rascunho: `P/shell/hood-picker.js:11–25`. Texto livre ainda precisa de tratamento correspondente no servidor. |
| **Coordenadas individuais** | Não há coluna dedicada encontrada. **Fotos podem conservar coordenadas em EXIF**, pois a remoção depende do cliente. |
| **Centro de bairro** | O protótipo usa centroides aproximados públicos. São distintos da coordenada individual do aparelho. A amostra cobre quatro cidades, não uma base nacional entregue. |
| **Endereço** | `listings.address` existe por decisão expressa em `20260925174442_endereco_por_escolha.sql`. Local de evento também pode conter endereço. Não classifiquei esses campos autorizados como vazamento de endereço residencial de perfil. |
| **Força Armada/OM** | Existem como autodeclaração opcional em `profile_affiliations`, com visibilidade inicialmente desligada. A aprovação técnica de setembro supera a proibição genérica anterior; permanece o conflito de exposição/governança descrito nos riscos. |
| **Posto/patente** | Não há atributo dedicado encontrado. A constraint da OM rejeita termos comuns, mas é `NOT VALID`: não certifica registros antigos nem bloqueia toda informação disfarçada em texto livre. |
| **Documentos** | Armazenamento privado e acesso operacional estreito são reaproveitáveis. A purga tem defeito concreto; portanto, não está demonstrado descarte sem resíduos. |
| **Seed** | `supabase/seed.sql:5` identifica massa durável local, com identidades fictícias. Há cenários de outras localidades, mas o volume concentra-se em Manaus. Não demonstra operação nacional ou base nacional de bairros. |

Filtros genéricos antigos de vocabulário foram removidos deliberadamente; mensagens também podem aceitar endereço por decisão posterior. **A ausência de atributos estruturados proibidos não significa impossibilidade de alguém escrever PII em qualquer conteúdo.**

---

### 3. Frente 2 — Telas Next × protótipo

### 3.1 Correspondência dos 33 nomes de rota

Registro do protótipo: `P/shell/navigation.js:4`, com despacho em `:112`.

**“Equivalente” abaixo significa equivalência do núcleo funcional encontrado em código.** Continua pendente a verificação de runtime e dos recursos secundários.

| Rota do protótipo | Rota Next | Estado e diferença |
|---|---|---|
| `#inicio` | `/inicio` | **Diverge no comportamento.** Hub baseado em comunidade primária e seções condicionais, diferente da composição aprovada. `W/(shell)/inicio/page.tsx:25–47`. |
| `#comunidade` | `/community`, `/communities`, `/groups` | **Diverge.** Protótipo reúne conteúdos e grupos da cidade; Next distribui em containers e usa comunidade primária. `community/page.tsx:120–169`. |
| `#conversas` | `/messages` | **Equivalente no núcleo de inbox.** Há leitura real de conversas, mensagens e estados. Recursos secundários precisam de cotejo. `messages/conversation-inbox.tsx:133–227`. |
| `#conversa/<id>` | `/messages/[id]` | **Equivalente no núcleo de conversa autorizada.** Exige adaptação de identidade/contexto e recursos do protótipo. `messages/[id]/page.tsx:33–50`. |
| `#voce` | `/profile` | **Diverge.** Distribuição diferente de momento, família, alertas, pedidos, negócio e configurações. `profile/page.tsx:33–41,91–96`; `P/features/profile/views.js:4`. |
| `#busca` | `/explorar/busca` | **Equivalente no núcleo de busca agrupada.** Tipos, filtros e resultados precisam ser alinhados. `explorar/busca/page.tsx:97–113`. |
| `#catalogo` | `/mercado` ou `/imoveis` | **Diverge.** Alias do protótipo depende de filtro em memória; Next separa verticais. `P/features/listings/catalog.js:8–13`. |
| `#desapegos` | `/mercado` | **Diverge.** Busca e filtros existem; mapa por bairros e conjunto de interações não são equivalentes. `mercado/page.tsx:141–156`; `P/features/listings/catalog.js:13`. |
| `#imoveis` | `/imoveis` | **Diverge.** Busca e alertas existem; não localizei mapa de bairros ou comparação equivalentes. `imoveis/page.tsx:85–92,163–226`. |
| `#anuncio/<id>` | `/mercado/[id]`, `/imoveis/[id]` | **Diverge.** Detalhe único polimórfico versus dois detalhes; adaptar galeria, gestos, compartilhamento e ações. `P/shell/navigation.js:46`; `imoveis/[id]/page.tsx:32–56`. |
| `#negocios` | `/explorar/servicos` | **Diverge.** Catálogo de prestadores por alcance versus negócios indicados, inclusive sem responsável. `explorar/servicos/page.tsx:125`; `P/features/businesses/detail.js:2–5`. |
| `#negocio/<id>` | `/prestadores/[id]`, `/negocio` | **Diverge.** Next separa ficha pública e editor; protótipo inclui indicação, assunção, métricas e estados da página. `negocio/page.tsx:25–32`. |
| `#pergunta/<id>` | `/indicacoes/[id]` | **Diverge.** Responder, salvar, denunciar e resolver existem; a tela não corresponde integralmente a acompanhar, útil, origem, negócio vinculado e ocultação. `W/components/indications/indication-detail.tsx:242,298,446`; `P/features/community/question.js:4–7`. |
| `#grupo/<id>` | `/groups/[id]` | **Diverge na organização e no contexto.** Ingresso, administração e feed existem. `groups/[id]/page.tsx:60,114,220,324`. |
| `#publicacao/<grupo~post>` | Sem detalhe dedicado equivalente | **Só no protótipo como tela recuperável própria.** Next apresenta `FeedPost` inline; isso não substitui a URL de detalhe. `P/features/groups/views.js:115`; `groups/[id]/page.tsx:324`. |
| `#evento/<id>` | `/events/[id]`, `/events/[id]/perguntas` | **Equivalente no núcleo de detalhe, presença e informações.** Reconciliar edição, cancelamento e apresentação. |
| `#agenda` | `/events` | **Equivalente no núcleo de agenda.** Há filtros, próprios eventos, convites e RSVP. `events/page.tsx:119–138,739–752`. |
| `#salvos` | `/salvos` | **Diverge.** Next oferece indicações, Guia, Mercado e Imóveis; não carrega negócios como tipo. Protótipo também compara imóveis. `salvos/page.tsx:27–33`; `P/features/profile/views.js:9`. |
| `#meus-anuncios` | `/meus-anuncios` | **Diverge.** Gestão real existe; estados, agrupamentos, excluir/desfazer e apresentação precisam corresponder ao HTML. `meus-anuncios/page.tsx:46–58,183`. |
| `#minhas` | `/profile`, parcialmente | **Só no protótipo como tela dedicada de histórico próprio.** Seção de indicações no perfil não equivale ao mesmo contrato. `P/features/profile/views.js:13`; `profile/page.tsx:31`. |
| `#guia` | `/guide` | **Diverge.** Roteiro de cinco passos versus catálogo editorial curado com artigos/correções. `P/features/transfers/guide.js:1`; `guide/page.tsx:124–127`. |
| `#pedidos` | `/pedidos`, `/prestador` | **Diverge estruturalmente.** Pedido aberto/propostas versus solicitações diretas a prestador determinado. `pedidos/page.tsx:83–85`; `P/features/requests/model.js:1–18`. |
| `#pedido/<id>` | `/pedidos/[id]`, `/prestador/pedidos/[id]` | **Diverge estruturalmente.** Não há comparação/escolha de até cinco propostas. `pedidos/[id]/page.tsx:24–38,123–128`. |
| `#dono` | `/admissions`, `/reports`, `/arrivals`, `/guide-queue` | **Diverge.** Existem ferramentas de operação, não o console integrado aprovado. `P/features/owner/console.js:92–101`. |
| `#entrar` | `/`, `/login`, `/signup`, onboarding | **Diverge na composição.** Núcleo de autenticação e admissão aproveitável; subetapas abaixo. |
| `#privacidade` | `/privacidade` | **Equivalente na finalidade de leitura pública.** Não foi realizado cotejo jurídico integral dos textos. |
| `#conduta` | `/codigo-de-conduta` | **Equivalente na finalidade de leitura pública.** Mesma ressalva sobre os textos. |
| `#ocultados` | Sem equivalente | **Só no protótipo.** Lista persistente e restauração; Next mantém ocultação apenas no estado da página. `P/features/profile/hidden.js:12–21`; `community/page.tsx:71,326`. |
| `#bloqueados` | `/configuracoes/bloqueados` | **Diverge no contrato completo.** Gestão existe, mas abrangência e discrição do bloqueio precisam mudar. |
| `#ajuda[/assunto]` | `/ajuda` | **Diverge.** FAQ por assunto e chamados versus orientações e suporte por e-mail. `P/features/support/help.js:50–56`; `ajuda/page.tsx:4–7`. |
| `#contato` | Apenas `mailto` em `/ajuda` | **Só no protótipo como formulário e jornada.** `P/features/support/help.js:58–65`. |
| `#chamados` | Sem equivalente | **Só no protótipo.** Histórico, resposta e aviso de retorno. `P/features/support/help.js:71–89`. |
| `#apagar-conta` | `/configuracoes/conta` | **Diverge no efeito prometido.** Protótipo remove perguntas/anúncios/página e anonimiza respostas; Next informa preservação de publicações atribuídas ao nome. `P/features/support/help.js:92–104`; `configuracoes/conta/page.tsx:445`. |

### 3.2 Subrotas de entrada e painel

| Protótipo | Next | Diferença relevante |
|---|---|---|
| `#entrar` sem complemento | `/` | Landing e amostra pública por cidade precisam ser portadas. |
| `#entrar/login`, `/conta` | `/login`, `/signup` | Reaproveitar Auth real. Não transportar autenticação simulada nem pular confirmação efetivamente exigida pelo provedor. |
| `#entrar/aceite` | `/consent` | Preservar aceite versionado e recuperação de cadastro parcial/Google. |
| `#entrar/cpf` | `/onboarding` | Adaptar feedback, mantendo limites e consulta no servidor. |
| `#entrar/resultado`, `/analise` | `/onboarding/status`, `/onboarding/documento` | Protótipo distingue não localizado, fonte indisponível e análise. Promete até dois dias úteis e aviso por e-mail/celular; isso exige operação real. `P/features/entry/account.js:53–66`. |
| `#entrar/cidade` | `/onboarding/locality`, `/onboarding/perfil` | Protótipo reúne cidade, momento e nome. |
| `#entrar/boas-vindas` | `/onboarding/welcome` | Mesma finalidade, composição diferente. |
| `#entrar/senha` | `/recuperar-senha`, `/nova-senha` | O HTML simula envio; Next precisa conservar recuperação real e sessão apropriada. |
| `#entrar/convite` | `/onboarding?invite=...` | Convite familiar. **Não é** `/invite/[token]`, que trata convite comunitário. |
| `#entrar/apagada` | Estado pós-exclusão | Não há equivalência do efeito completo. |
| `#dono/filas` | `/admissions`, `/reports`, `/guide-queue` | Filas separadas existem; unificação, assumir e desfazer não estão demonstrados integralmente. |
| `#dono/cidades` | `/arrivals`, parcialmente | Chegadas não equivalem à gestão nacional de cidades. |
| `#dono/negocios`, `/equipe` | Sem console global equivalente | Administração comunitária não substitui administração da plataforma. |

### 3.3 Rotas presentes somente no Next como páginas independentes

Muitas correspondem a overlays ou estados do protótipo. Sua existência não as torna código morto.

| Rotas Next | Fazem sentido no produto atual? |
|---|---|
| `/auth/confirmar-email`, `/auth/callback-error`, `/nova-senha` | **Sim.** Estados reais de autenticação e recuperação. |
| `/explorar`, `/localidade`, `/cidade/[id]` | **Capacidades úteis.** Adaptar à navegação e aos seletores aprovados. |
| `/communities`, `/communities/[id]`, `/groups` | **Preservar mecanismos; reorganizar exposição.** Não deixar os containers antigos determinarem a navegação nova. |
| `/communities/[id]/invite`, `/invite/[token]` | **Úteis se mantido o convite comunitário.** Separar claramente da entrada familiar. |
| `/communities/[id]/admin` e subrotas `pending`, `moderators`, `providers`, `media` | **Sim para gestão autorizada.** Não equivalem ao Painel do dono. |
| `/profile/[userId]`, `/profile/editar`, `/profile/interests` | **Sim**, respeitando os campos autorizados e a fronteira de exposição. |
| `/configuracoes`, `/configuracoes/notificacoes`, `/configuracoes/familia`, `/notifications` | **Sim.** São contrapartidas de funções que o HTML abre em folhas ou diálogos. |
| `/mercado/novo`, `/mercado/[id]/editar`, `/imoveis/novo`, `/imoveis/[id]/editar` | **Sim.** Editores reais a portar. |
| `/imoveis/alertas` | **Sim, com adaptação.** O protótipo também prevê alertas de desapegos. |
| `/events/novo`, `/events/[id]/editar`, `/events/[id]/perguntas` | **Sim.** Contrapartidas de criação, edição e informações. |
| `/guide/[id]`, `/guide/[id]/correcao`, `/guide/sugerir` | **Capacidades existentes úteis**, mas não substituir silenciosamente o roteiro aprovado pelo catálogo legado. |
| `/negocio`, `/negocio/catalogo` | **Sim.** Gestão própria a integrar à experiência aprovada. |
| `/prestador`, `/prestador/ficha`, `/prestador/catalogo`, `/prestador/atendimento`, `/prestador/conta`, `/prestador/pedidos/[id]`, `/prestador-convite/[token]` | **Sim para operação do prestador.** Adaptar alcance gratuito, cidade/bairro e propostas. |
| `/pedidos/novo` | **Precisa mudar.** Hoje exige prestador definido. |
| `/communities/[id]/indicar-prestador` | **Precisa ampliar/mudar.** Indicação comunitária de prestador não entrega negócio municipal ainda sem responsável. |
| `/denuncias`, `/denuncias/nova`, `/denuncias/[id]` | **Sim.** Jornadas de confiança reais. |
| `/admissions/[id]`, `/reports/[id]` | **Sim.** Detalhes operacionais podem integrar o painel novo. |
| `/recommendations`, `/indicacoes` | **Manter como compatibilidade quando útil.** São aliases/redirecionamentos, não novos módulos. |

### 3.4 Portar Material Web para Next/React

**É arquiteturalmente viável, mas a compatibilidade executada não foi verificada nesta auditoria.**

| Aspecto | Avaliação |
|---|---|
| Material Web | O bundle `2.5.0` já está vendorizado no protótipo. Não depende de CDN para os componentes. |
| React 19 | Usar os elementos `md-*` por componentes/adaptadores cliente, verificando propriedades, eventos, slots e formulários. |
| SSR | O registro de `customElements` precisa ficar na fronteira cliente. Não importar indiscriminadamente o bundle em execução de servidor. |
| TypeScript | Declarar as tags e seus contratos; não resolver tudo com `any` ou atributos incorretos. |
| DOM | Não transplantar o IIFE que escreve `root.innerHTML` para dentro de uma árvore React que também controla o mesmo DOM. |
| CSS | Portar tokens, regras e composição; reconciliar CSS global e imports atuais de HeroUI para evitar conflito. |
| Fontes/ícones | Protótipo usa Roboto Flex e Material Symbols Rounded embutidos; Next usa Public Sans. Isso precisa ser igualado para fidelidade visual. |
| Contratos do repositório | `tests/scope/workspace-foundation.test.mjs:66–79` ainda exige HeroUI. A adoção aprovada de Material precisa atualizar conscientemente esse contrato. |

Evidências: `apps/web/package.json`, `W/layout.tsx:11–32`, `W/globals.css:4`, `P/styles/fonts.css`, `P/styles/base.css:3–8`, `P/shell/navigation.js:112`.

### 3.5 Reaproveitamento das provas e comparação visual

**IDs, `data-action` e `data-value` podem e devem ser preservados quando representam a mesma ação. Isso preserva seletores, não a prova completa.**

O harness atual depende de:

- `localStorage` e chave `bivaque-material-web-v3`;
- `window.Bivaque.inspect()`;
- navegação por `location.hash`;
- alteração direta de fixtures locais;
- simulação de falha substituindo `Storage.prototype.setItem`;
- servidor próprio que entrega o HTML concatenado.

Evidências: `scripts/bivaque-html/proof-harness.mjs:10–19,25–32,93–115,136–173`.

O reaproveitamento correto é transportar **cenários, seletores e resultados esperados** para um adaptador de rotas e fixtures do aplicativo real. Acrescentar contas distintas, persistência após reload, negativas de autorização e falhas de servidor. Não expor uma porta de alteração de estado privado apenas para fazer o harness antigo passar.

| Impedimento atual à comparação captura × captura | O que equalizar |
|---|---|
| Fixtures, nomes, fotos e IDs diferentes | Dataset sintético equivalente, com mapeamento de IDs e permissões reais. |
| Relógio e aleatoriedade | O harness fixa data/UUIDs; o Next também depende do relógio do servidor e banco. |
| Fontes, ícones e CSS | Roboto Flex/Material Symbols/Material Web versus Public Sans/HeroUI. |
| Estado da interface | Conta, cidade, filtros, overlays, scroll, foco e avisos. |
| Carregamento | Fontes, imagens decodificadas, componentes Material e carregamento dos dados reais. |
| Ambiente | Mesmos viewports, alturas, tema, locale, timezone e preferência de movimento. |
| Baseline anterior à R69 | A retirada do Patrocinado altera legitimamente a Início. A referência R68 não pode reprovar essa decisão. |

`capture-support.mjs:3–27,51–110` documenta parte dessas condições. `ROUND_69.md:58–62` registra que a nova base visual ficará para o fechamento do lote.

**Não foi produzida nem inspecionada captura nesta auditoria. Fidelidade visual, acessibilidade em execução e ausência de overflow permanecem não verificadas.**

---

### 4. Frente 3 — Qualidade e segurança

### 4.1 Fundamentos que sustentam o aproveitamento

| Área | O que existe | Limite |
|---|---|---|
| Autenticação | Proxy e handlers usam `auth.getUser()`; operações administrativas resolvem usuário real e verificam operador. | Cada action/handler continua precisando de autorização própria. |
| Admissão | Consentimento atual consultado no banco; provisionamento exige estado de verificação apropriado. | Configuração e operação implantadas não verificadas. |
| Service role | Cliente privilegiado concentrado no servidor, com segredo de ambiente e sessão não persistida. | Bypassa RLS; sua segurança depende do caller. Há falha concreta em upload descrita abaixo. |
| Documentos | Rota administrativa verifica operador, consulta documento, assina acesso por 60 segundos e responde sem cache. | Não certifica retenção/purga completa. |
| Workers | Segredos próprios, resposta 503 quando não configurados e comparação com `timingSafeEqual`. | Configuração e acionamento real não verificados. |
| Portal | Consulta no servidor, timeout, classificação e persistência de resultado sem CPF bruto no RPC. | Nenhuma consulta real foi feita; cobertura das três Forças e comportamento sob carga não foram comprovados. |
| Logs/Sentry | Scrubbers e `beforeSend` conectados. | Não são filtro universal de PII nem prova de ausência de vazamento. |
| Autorização | Muitas RPCs e testes de escopo positivos/negativos já existem. | Policies presentes não significam policies corretas; mocks também podem reproduzir premissas erradas. |

### 4.2 Testes, gate e CI

| Camada | Cobertura encontrada | O que falta ou não comprova |
|---|---|---|
| **pgTAP** | Papéis, escopos, privilégios, RPCs, Storage, exclusão, afiliação e regressões. | Não executa as actions Next, não examina EXIF e não detecta sozinho a paginação do worker HTTP. |
| **Unitários** | Portal, consentimento, provisionamento, limites, scrubbers, outbox e exclusão com mocks. | Há teste de paginação que confirma o offset errado. Faltam falhas de lookup nas preferências do outbox. |
| **E2E Next** | Sessão, gates, admissão, grupos, eventos, negócios, pedidos, operação e exclusão em três viewports. | Ter spec não prova execução atual. `photo-upload.spec.ts` verifica o seletor, sem enviar arquivo/inspecionar EXIF. Exclusão de conta não confirma purga completa. |
| **Provas HTML** | Cenários e seletores extensos das rodadas. | Provam a simulação local. Precisam ser adaptadas para persistência e autorização reais. |
| **Gate local** | Lint → tipos → build condicionado ao env → testes → secrets. | Pode sair verde sem build; não inclui pgTAP/E2E. `--fast` executa só lint/tipos. |
| **CI de PR** | Stack local, env antes do build, drift de tipos, reset sem seed, pgTAP/lint, reset com seed, E2E paralelo e `@stateful` serial; artefatos preservados. | Configuração não é resultado. Não foi consultado CI de `28e6fbde`. |
| **Deploy de migrations** | Executa após seu job de gate. | Não depende explicitamente do pipeline completo de PR; pode prosseguir com gate sem build/banco/E2E. Proteção de merge não verificada. |
| **Scanner de segredos** | Arquivos rastreados e padrões de credenciais/CPF/JWT. | Não certifica transcripts, ambientes, rotação ou segredos já expostos. |

Evidências principais: `scripts/gate.mjs:28–59,89–113`, `.github/workflows/pull-request-ci.yml`, `.github/workflows/deploy-migrations.yml:36–42`, `tests/unit/infra/account-deletion-route.test.ts:231–240`, `tests/e2e/photo-upload.spec.ts:9`.

**O PASS da rodada 69 é um resultado registrado, não reexecutado aqui.** O próprio relatório informa que o build web foi pulado: `ROUND_69.md:48–56`.

### 4.3 Pendências e bloqueios: o que ainda vale

| Card/documento | Leitura atual |
|---|---|
| **`MVP-05-TEST-BASELINE`** | Continua pertinente: comprovar baseline completo da revisão entregue. O impedimento financeiro de Actions de setembro foi superado no próprio card; não deve ser repetido como estado atual. |
| **`TEST-MASSA-JORNADAS`** | Continua pertinente. Há dívida de execução completa, isolamento de fixtures e regressões da campanha; resultados antigos não certificam este commit. |
| **`FIGMA-WEB-ATUAL`** | Seu objetivo visual precisa ser reconciliado com o HTML como referência atual. Evidências técnicas permanecem úteis; fidelidade ao Figma anterior não é aceite do protótipo. |
| **`G-TASK-3`** | Continua aberto com implementação de página de membro e pgTAP registrados, mas ciclo de navegador/capturas pendentes. Acrescentar a reconciliação do civil gratuito municipal. |
| **`RECON-029-EVENTO-PERGUNTA`** | Banco e telas têm evidências históricas; ciclo completo pergunta → resposta → presença → cancelamento permanece uma lacuna registrada. |
| **`RECON-034`** | Leitura de imagens comprovada historicamente; interação de envio/troca/remoção no navegador permanece parcial. |
| **`BLOCK-RESEND`** | Conta/domínio/DNS já constam como realizados. O pendente é runtime implantado e entrega real; não recriar o que já foi feito. |
| **`BLOCK-LEGAL-ENTRY`** | Distingue Alpha fechado de abertura pública. Não bloqueia automaticamente o Alpha autorizado; a formalização e prova de aceite implantado continuam pendentes para abertura pública. |
| **`BLOCK-LEGAL-AI`** | Continua pertinente para reconhecimento por IA e transferência a terceiros. O fallback manual autorizado não equivale a IA entregue. |
| **`BLOCK-AFFILIATION`** | Aprovação técnica existe; o portão de exposição continua declarado, mas o código permite exposição. Precisa ser reconciliado. |
| **`BLOCK-ASAAS`** | Pode continuar dormente. CNPJ/cobrança não devem bloquear o lançamento gratuito. |
| **`REPO-SECRETS-ROTATION`** | Pendente de comprovação operacional. Não li nem divulguei valores de `.env.local`. |
| **`RECON-052`**, marcado concluído | O defeito de paginação invalida a conclusão de purga sem resíduos. Precisa de correção e nova prova. |
| **Cards mobile** | Não bloqueiam a conclusão web, conforme a autoridade atual. |
| **`WEB-OG-METADATABASE`** | Continua dependendo do domínio canônico. Não foi verificada implantação. |

O quadro declara zero drifts, mas a leitura encontrou divergências entre documentos, protótipo e código. **Não atualizei cards porque esta auditoria foi expressamente somente leitura.**

### 4.4 Código e documentação desalinhados

| Item | Tratamento recomendado |
|---|---|
| `ADAPTERS.md` | Reconstruir o mapa com o schema atual. Não criar novamente anúncios, favoritos ou enquetes que já existem. |
| `PRODUCT_STATUS.md` | Reconciliar login, navegação, afiliação, suspensão, Mercado/Moradia e evidências atuais. A seção de entrada ainda descreve login sem senha, enquanto o código atual possui fluxo por senha. |
| `BIVAQUE.md` | Preservar como histórico onde conflita com produto nacional atual, navegação HTML e lançamento gratuito. |
| `HANDOFF.md` do protótipo | Ainda contém pendência comercial anterior à decisão R69. Usar `ROUND_69.md` para o lançamento gratuito. |
| Contrato HeroUI | Atualizar deliberadamente para Material; não manter dois sistemas como autoridade visual concorrente. |
| Waitlist | Consta como código obsoleto com remoção pendente em `PRODUCT_STATUS.md`, seção “Linhas obsoletas”. |
| Código pago no HTML | É dormência deliberada atrás de `BIVAQUE_LABS.paidPlans`, não cobrança ativa. Manter separado do aceite do lançamento. |
| Aliases e rotas auxiliares | Não apagar automaticamente: callbacks, recuperação, denúncia e compatibilidade continuam necessários. |

---

### 5. Riscos por severidade

**Nenhum CRITICAL foi confirmado por esta auditoria estática.** Isso não equivale a ausência de vulnerabilidades críticas em runtime.

### HIGH

| ID | Achado, cenário e evidência | Ação necessária |
|---|---|---|
| **H1** | **Conteúdo moderado continua legível diretamente.** As últimas policies SELECT de posts/comentários verificam container, mas não `is_deleted`. Um membro autorizado ao escopo pode consultar conteúdo removido pela Data API, apesar de o feed escondê-lo. `20260805214709_community_scope.sql:204–292`; reconhecimento do problema em `20260821000033_hideable_targets.sql:14`. | Corrigir a fronteira canônica de leitura e testar SELECT direto, inclusive comentários e recurso pai removido. |
| **H2** | **Telefone não público é selecionável.** `provider_profiles` concede SELECT completo; a policy verifica alcance, não `contact_is_public`. Membro que alcança a ficha pode obter o telefone com a opção desligada. `20260825185327_provider_showcase.sql:26–27,139,148–152`. | Proteger a informação no banco/API, com negativos para leitura direta. |
| **H3** | **Purga pode concluir deixando mídia pessoal.** O worker apaga uma página e aumenta o offset sobre a coleção reduzida. Com 101 objetos, apaga 100, consulta offset 100, encontra vazio e pode finalizar com um restante. `W/api/internal/account-deletion/route.ts:74,79,84,239`. | Paginar sem saltar objetos removidos; testar coleção mutável e confirmar ausência de resíduos antes da finalização. |
| **H4** | **Coordenadas podem persistir em EXIF.** Uploads validam MIME/tamanho e enviam bytes sem saneamento no servidor. Bypass do canvas cliente pode conservar GPS. `apps/web/lib/listings/actions.ts:63–80`; `W/(shell)/events/upload-photo-action.ts:22–43`; `docs/PRODUCT_STATUS.md:94`. | Garantir tratamento na fronteira confiável e revisar uploads diretos permitidos pelo Storage. |
| **H5** | **Pedido aberto não é suportado pelo backend.** Conectar a tela aprovada ao RPC atual produziria pedido direto para um destinatário. O limite de cinco existente é de pedidos abertos por par, não propostas. `20260911032309_service_requests.sql:28`; `20260923120000_service_request_open_cap.sql:9–12,114–116`. | Implementar domínio/transições/autorização próprios. O ADR de 15/10 autoriza somente o protótipo, explicitamente: `ADR-20261015-pedido-aberto-e-propostas.md:108–122`. |
| **H6** | **Exclusão promete efeitos incompatíveis.** HTML remove perguntas/anúncios/página e anonimiza respostas; Next informa que publicações ficam atribuídas ao nome. `P/features/support/help.js:92–104`; `W/(shell)/configuracoes/conta/page.tsx:445`. | Reconciliar efeito, retenção e textos antes de portar a confirmação. Não apresentar sucesso com semântica diferente. |
| **H7** | **Afiliação pode ser exposta antes do portão declarado.** UI aceita visibilidade, action persiste e RPC permite terceiro da mesma cidade. Não há gate de governança nos caminhos examinados. `profile/editar/page.tsx:366,414`; `profile/affiliation-actions.ts:100–122`; `profile/[userId]/page.tsx:157–164,232`; `20260918011938_profile_affiliations_no_bulk_read.sql:36–74`. | Reconciliar implementação e portão descrito na ADR e `BLOCK-AFFILIATION` antes da abertura pública. É divergência comprovada; não é prova de ilegalidade ou exposição já ocorrida em produção. |

### MEDIUM

| ID | Achado, cenário e evidência | Ação necessária |
|---|---|---|
| **M1** | **Upload privilegiado aceita sessão sem reconfirmar membership.** A action exige `getUser()` e usa service role; a Storage policy normal exige membership. `W/(shell)/events/upload-photo-action.ts:30–43`; `20260821000015_event_photos_bucket.sql:29–39`. | Aplicar a mesma autorização na action e testar chamada por conta não admitida. Exploração HTTP não executada aqui. |
| **M2** | **Outbox pode enviar após falha na consulta de preferências/opt-out.** Erro vira coleções vazias e ausência de bloqueio. `W/api/internal/outbox/route.ts:128–143,171–174`; `apps/web/lib/notifications/channel-preferences.ts:77–105`. | Falhar sem enviar quando não for possível determinar a preferência; testar falha de lookup. |
| **M3** | **Deploy de schema pode ocorrer sem pipeline completo.** Workflow depende do gate, que pode pular build; não depende explicitamente de pgTAP/E2E do push. `.github/workflows/deploy-migrations.yml:36,42,69`; `scripts/gate.mjs:51–57,113`. | Vincular promoção à evidência apropriada da revisão; verificar proteção de merge. |
| **M4** | **Bloqueio pode ser descoberto e não tem o alcance do HTML.** SELECT permite bloqueador ou bloqueado; não há filtro global equivalente nos conteúdos. `20260802001500_contextual_dm_abuse_controls.sql:274–280`; `P/app/state.js:37–52`. | Separar veto de contato, ocultação pessoal e discrição; implementar o contrato aprovado. |
| **M5** | **Proteção global do Portal depende do ambiente.** Guard devolve `null` sem configuração; verificação prossegue sem throttle global. `apps/web/lib/portal/guard.ts:12`; `verifyAndProvision.ts:69`. | Validar configuração obrigatória e comportamento sob indisponibilidade antes da abertura. A cota por usuário não substitui teto global. |
| **M6** | **Bairro livre pode receber informação que a UI promete não guardar.** Não há domínio nacional nem validação equivalente de CEP no servidor para todos os campos. `listings_market_and_homes.sql:51,180`; `P/shell/hood-picker.js:11–25`. | Normalização/validação na escrita, incluindo rascunhos e atendimento do negócio. |
| **M7** | **Gratuidade municipal não está uniforme.** Civil continua gratuito na comunidade; membro já tem página municipal. `provider_showcase.sql:191–255`; `20260926164158_member_business_page.sql`. | Reconciliar alcance civil e sua leitura autorizada para R69. |
| **M8** | **Provas antigas podem dar falso aceite do porte.** Harness altera estado local e simula falha de Storage, sem provar backend. `proof-harness.mjs:10–19,93–115`. | Portar cenários para atores, permissões e persistência reais. |
| **M9** | **Suporte e ocultação pessoal não fecham no Next.** Copiar as telas produziria jornadas sem backend. `W/(shell)/ajuda/page.tsx:4–7`; `P/features/support/help.js:75–89`; `P/features/profile/hidden.js`. | Entregar operação e persistência junto das interfaces. |

### LOW e endurecimento

| Item | Evidência e limite |
|---|---|
| Scrubbing não universal | `apps/web/lib/logger.ts:54–58` não trata strings em arrays da mesma maneira que campos; `pii-scrub.ts` não elimina integralmente toda chave potencialmente sensível. Não encontrei caller suficiente para afirmar incidente por esses caminhos. |
| Baseline visual anterior | `ROUND_69.md:58–62` registra diferença autorizada em relação à R68. Atualizar a referência antes de usar comparação estrita como gate. |
| Drift documental | `ADAPTERS.md`, `PRODUCT_STATUS.md`, `HANDOFF.md` e regras anteriores podem induzir reconstrução duplicada ou restauração de produto superado. |
| Superfície de bypass | `BIVAQUE_AUTH_BYPASS` e liberação de `/api` por prefixo continuam merecendo endurecimento e conferência operacional. Evidência: `apps/web/proxy.ts:35–46`; card `PROXY-SURFACE-RISK`. Não foi demonstrado acesso indevido por esses caminhos nesta auditoria. |

---

### 6. Plano sugerido, em lotes por dependência

Este é um plano de resolução derivado da auditoria; nenhuma etapa foi executada.

| Lote | Entrega | Critério de saída |
|---|---|---|
| **0 — Referência e contratos** | Fixar R69 como alvo; atualizar mapa real de adaptadores e correspondência de rotas; reconciliar exclusão, afiliação e escopos. Formalizar o backend de propostas, cuja aprovação existente é restrita ao protótipo. | Contratos verificáveis, sem recriar estruturas existentes nem restaurar planos pagos. |
| **1 — Correções de segurança** | Resolver H1–H4, M1–M3 e o portão de exposição da afiliação. Revisar chamadas privilegiadas e configuração do Portal. | Negativos de Data API, action e Storage; purga sem resíduos; mídia sem coordenadas; preferências respeitadas também sob falha. |
| **2 — Fundação de dados do produto atual** | Bairro/normalização e perfil; alcance municipal gratuito uniforme; indicação/salvos de negócio; ocultação pessoal; proposta transacional, suporte e progresso pessoal. Incluir novas entidades na moderação e exclusão. | Schema, grants, RLS e transições entregues juntos; migrations a partir do zero e testes positivos/negativos. |
| **3 — Piloto visual com a landing** | Material Web, fontes, ícones, tokens e componentes básicos; portar landing e entrada pública. Atualizar contrato HeroUI. | Build real e comparação visual em 375/768/1440, com teclado, foco e estados. Não depende de portar todo o backend para demonstrar a viabilidade visual. |
| **4 — Entrada, perfil e contexto** | Login, cadastro, confirmação, recuperação, aceite, CPF, documento, análise manual autorizada, família, cidade/bairro e chegada. | Duas contas completam caminhos reais; falhas retomáveis; e-mail entregue; nenhuma aprovação simulada concede acesso. |
| **5 — Comunidade e grupos** | Navegação aprovada; pergunta/resposta, indicação de negócio, acompanhamento, resolução, publicações, ocultados, bloqueios e administração. | Entrada → ação → retorno → resolução, com acesso negado e remoção moderada comprovados diretamente. |
| **6 — Negócios, pedidos e conversas** | Página gratuita completa, indicação/assunção, atendimento por bairro, pedido aberto/direto, até cinco propostas, escolha, conclusão/desistência e avisos. | Concorrência na quinta proposta/escolha; acesso às fotos e mensagens por ator; retorno do prestador pela UI. |
| **7 — Desapegos e imóveis** | Catálogos, detalhes, galeria, publicação/edição, rascunho, pausa/encerramento, favoritos, comparação, alertas e mapa autorizado. | Persistência, filtros coerentes, falha com preservação e alertas entregues. CEP/coordenada individual não persistidos. |
| **8 — Agenda, Guia e operação completa** | Agenda e informações ao organizador; roteiro/progresso de chegada; Painel integrado, cidades, negócios, equipe e chamados. | Cada fila tem produtor, responsável, decisão e retorno. Ferramentas mínimas de operação já devem acompanhar os módulos dos lotes anteriores. |
| **9 — Aceite integral da revisão portada** | Adaptar provas HTML; executar gate com build, reset limpo, pgTAP/lint, tipos e E2E; comparar visualmente com a referência correta e realizar auditoria de acessibilidade. | Evidências vinculadas ao SHA final, revisão independente e runtime por ator. Publicação depende desse resultado, não de um PASS histórico. |

**Podem esperar:** cobrança/Asaas, monetização, analytics dependente de governança, reconhecimento documental por IA enquanto preservado o fallback manual autorizado, e mobile.

**Não podem esperar até depois da abertura:** correções de privacidade e autorização, efeitos verdadeiros de exclusão, retorno operacional por e-mail, moderação efetiva e as capacidades necessárias às telas efetivamente disponibilizadas.

O resultado desta auditoria é **base reaproveitável com correções e adaptação funcional necessárias**. Build, migrations aplicadas, testes, entregas externas, fidelidade visual e operação em produção de `28e6fbde` permanecem **não verificados**, pelos limites de somente leitura e ausência de rede/banco definidos no pedido.