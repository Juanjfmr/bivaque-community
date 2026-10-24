# INV-002 — inventário de banco, código e testes

Data: 24/10/2026 · Branch: `codex/inventario-legado` · Escopo: leitura estática, sem execução de app/banco.

## 1. Resumo para decisão

- `apps/mobile/` está vivo: tem `app/`, `src/`, `package.json`, Expo config e testes. Contagem pedida é só nível de pasta; não é parte da estimativa web.
- Banco: 213 migrations; objetos agrupados abaixo por domínio. Não há uso real de produção a preservar; isso não remove dependências do schema nem a necessidade de transição segura.
- Código web inventariado: `app/` 419 arquivos / 55.980 linhas; `lib/` 97 / 8.885; `app/components/` 66 / 8.527. Total único: 516 arquivos / 64.865 linhas (419 em `app/` + 97 em `lib/`). Os componentes estão incluídos em `app/`; seu subtotal de 66 arquivos / 8.527 linhas é informativo, sem dupla contagem.
- Rotas: 95 arquivos `page.tsx`. Pastas principais: `(admin)`, `(owner)`, `(preauth)`, `(provider)`, `(public)`, `(shell)`, `api`, `auth`, `components`, `fonts`, `landing`.
- Testes: `supabase/tests/` 171 arquivos (inclui subpastas; o número informado no pedido era 158); `tests/e2e/` 65 specs; `tests/unit/` 184 arquivos; `tests/scope/` 29; `tests/*.mjs` e demais suites estão listadas por pasta abaixo. Os testes classificados acompanham o domínio testado.
- Scripts: 169 arquivos sob `scripts/`.
- Decisão preliminar: preservar cidade/localidade, perfil, entrada/verificação, notificações, mensagens, denúncias, conta, mercado/serviços/guia e as garantias de autorização. Redescrever a experiência de Comunidade e grupos; reescrever/publicação-alvo é do grupo. A estrutura de posts/comentários pode ser reaproveitada parcialmente após alinhamento de escopo e sem feed municipal.
- Remoção de vila é conceitual, não uma instrução de apagar agora: `communities`, memberships/invites/join reasons, mídia e rotas administrativas têm consumidores, RLS e cascatas; precisam ser substituídos por modelo de grupos antes de remoção.
- Cinco maiores riscos: (1) remover `communities` quebra FKs e pertença; (2) remover funções de acesso invalida policies/RPCs; (3) apagar triggers de cascata/moderação deixa memberships e conteúdo inconsistentes; (4) migrar posts sem reconstruir RLS pode vazar conteúdo entre grupos/cidades; (5) remover enum/tipos ou rotas sem migrar clientes, notificações e testes deixa deploy/código incompatíveis.

## 2. Banco

**Regra de leitura:** “REESCREVER” indica objeto usado no fluxo cuja semântica deve mudar; não significa descarte sem migração. Políticas são agrupadas por tabela, conforme solicitado. Arquivos de origem são migrations; consumidores listados são os usos web encontrados por nome/RPC em `apps/web/`.

| objeto | tipo | classe | motivo | usado por | dependências |
|---|---|---|---|---|---|
| `localities`, `locality_memberships`, `neighborhoods`, `national_holidays` | tabelas | MANTER | Cidade e bairro sustentam contexto/localização do protótipo (`src/data/demo/bairros.js`; `src/features/transfers/guide.js`) | onboarding, shell/city-switcher, busca, perfil, anúncios | memberships referenciadas por RLS de conteúdo; catálogo alimenta filtros |
| `profiles`, `profile_affiliations`, `profile_suspensions`, `member_entry_moments` | tabelas | MANTER | perfil, preferências, suspensão operacional e momento de chegada no protótipo | `/profile`, onboarding, configurações, mensagens, avatar | FKs para auth; policies de perfil e visibilidade; funções de auth/provision |
| `communities`, `community_memberships`, `community_invitations`, `community_join_reasons` | tabelas | REMOVER (depois de migração) | vila e membership de vila não existem nesta versão; grupos devem existir no contexto da Comunidade singular (ADR-20261023-comunidade-do-prototipo.md:30-31,75) | `/communities`, `/communities/[id]`, owner `/communities/*`, `/community`, convite, mídia; libs `communities`, `community-invite-rpcs` | FKs em grupos/posts/events/provider reach/DM context; policies e funções privadas de membership; triggers de mudança/cascata; convites e storage |
| `groups`, `group_memberships`, `user_group_interests` | tabelas | REESCREVER | grupos fazem parte da Comunidade singular e têm regras/notificações/atividade próprias; modelo atual ancora em vila | `/groups`, `/groups/[id]`, busca, perfil, composer, menu shell | FK comunidade; membership/RLS; funções create/join/approve/moderate/ownership; notificações e eventos |
| `posts`, `comments`, `post_reactions`, `post_saves`, `post_follows` | tabelas | REESCREVER | publicação deve ocorrer só dentro de grupo; posts de cidade/comunidade e audiência atual divergem (migration `20261024100000_publicacao_so_em_grupo.sql`, ADR-20261023:78-84) | início, grupos, perfil, composer, feed, salvos | policies dependem de scope/post-access; triggers de comentário/alerta; FKs de reports e notificações |
| `recommendation_requests`, `recommendation_replies`, `recommendation_saves`, `recommendation_reply_promotions` | tabelas | MANTER | perguntas e respostas municipais e memória de indicações estão no protótipo; não equivalem a post municipal (`src/data/demo/source.js`, estado `asks`) | `/recommendations`, `/indicacoes`, início, prestadores/guia | locality access; notificações; funções de resolução/listagem; trigger de edição/status |
| `events`, `event_rsvps`, `event_invites` | tabelas | REESCREVER | eventos existem no protótipo, mas eventos vinculados a grupo e autorização precisam corresponder ao contexto novo | `/events`, criação/edição, detalhe, RSVP, perguntas, notificações | locality/group membership policies; triggers RSVP; convites e notifications |
| `notifications`, `notification_preferences`, `notification_channel_preferences`, `outbox`, `notification_opt_outs`, `indication_alert_deliveries`, `listing_alert_deliveries` | tabelas | MANTER | notificações e acompanhamento pertencem à fundação | `/notifications`, configurações, mensagens/pedidos, alertas | triggers de domínio, cron dispatch, canais, prefs, workers internos |
| `dm_conversations`, `dm_messages`, `dm_blocks`, `dm_reports`, `dm_read_states` | tabelas | MANTER | Conversas é destino explícito do protótipo; controles antiabuso preservados | `/messages`, ações de contato e suporte | contexto referenciado por community/group/event/listing/provider; policies participantes, bloqueio e denúncia |
| `reports`, `hidden_questions`, `support_tickets` | tabelas | MANTER | denúncia, ocultação individual e suporte são fundação de confiança | `/denuncias`, páginas admin, pergunta, API report/support | policies reporter/operator; triggers anti-autodenúncia; functions de administração/resolução |
| `verification_outcomes`, `verification_documents`, `verification_document_removals`, `family_invitations`, `family_account_links`, `family_invite_code_attempts` | tabelas privadas | MANTER | entrada, verificação e família são fundação; material documental e rate limit protegem confiança | onboarding, convite família, operador de admissão | funções privadas/public bridges; privacidade de schema; jobs reconcile e remoção |
| `waitlist`, `consent_acceptances`, `onboarding_release_notices` | tabelas | MANTER | entrada/consentimento/retomada | login, onboarding, consent, aviso de versão | policies restritas e RPCs/service role |
| `operators`, `provider_invitations`, `provider_accounts`, `provider_profiles`, `provider_reach`, `provider_catalog_items`, `provider_portfolio_photos` | tabelas | MANTER | páginas de negócio e prestadores aparecem no protótipo | `/prestadores`, `/negocio`, `/prestador/*`, serviços | políticas de operador/proprietário; alcance deve remover ramo vila e paid; functions de gestão |
| `service_requests`, `service_request_photos` | tabelas | MANTER | pedido de serviço é ciclo de prestador no protótipo | `/pedidos`, `/prestador/pedidos`, conversa contextual | RLS por solicitante/prestador; mídia; notificações/outbox |
| `listings`, `property_details`, `listing_photos`, `listing_alerts`, `listing_saves`, `listing_status_events` | tabelas | MANTER | Mercado e moradia são funções explícitas do protótipo | `/mercado`, `/imoveis`, `/meus-anuncios`, salvos | RLS por proprietário/contexto/localização; triggers mídia e lifecycle; alert jobs |
| `guide_articles`, `guide_article_sections`, `guide_article_revisions`, `guide_correction_requests`, `arrival_guide_entries`, `guide_entry_saves` | tabelas | MANTER | Guia/chegada e curadoria existem no protótipo | `/guide`, onboarding, admin queue | filas/jobs de curadoria; autores/admin; correções/saves |
| `account_deletion_requests` | tabela | MANTER | exclusão de conta e retorno operacional | configurações/conta e API interna | cron retry; functions de claim/finalize; dependências de perfil e posse |
| `listing_status_events`, `recommendation_*`, `post_*` | tabelas/auditoria | MANTER/REESCREVER conforme domínio | histórico e resolução são necessários à integridade | Mercado, perguntas, grupos | acionadas por triggers/RPCs; não apagar antes de mapear retenção |
| `avatars`, `event-photos`, `post-photos`, `listing-photos`, buckets e policies de storage | storage/policies | MANTER/REESCREVER | avatar, fotos de evento/post/listing; bucket de mídia de vila é candidato a remover | avatar API, eventos, composer, anúncios | policies storage; funções de validação; caminho post deve passar a group-only |
| `communities`, `group_visibility`, `community_membership_*`, `post_type`, `dm_context_type`, `notification_type`, `event_*`, `report_*`, `listing_*`, `service_request_*`, `verification_*`, `outbox_*`, `entry_moment`, `support_ticket_*`, demais enums | enums | MANTER/REESCREVER | enums ligados a domínios retidos ficam; enums exclusivos de vila/escopo pago e valores do feed antigo exigem limpeza coordenada | RPC/types gerados, app web e testes | colunas/defaults/functions/policies dependentes; enum PostgreSQL não pode perder valores em uso sem conversão |
| `pg_cron` jobs: heartbeat, verification reconcile/document cleanup, recurring events, outbox worker, account deletion, guide candidate queue, listing alert, indication alert/digest | cron | MANTER/REESCREVER | operação/fundação; revisar só jobs que referenciem domínio removido | endpoints internos workers, banco | `cron.schedule` em migrations; secrets/config de runtime; funções dispatch |

### Funções, policies e dependências

A busca estática encontrou funções `public.*` e `private.*` em migrations; o conjunto é versionado principalmente em `supabase/migrations/20260802*`–`20261024*`. Para não ocultar políticas, policies de cada tabela são as que aparecem em suas migrations `*_rls`, `*_scope`, `*_access`, `*_moderation` e migrations corretivas posteriores; a última definição com `CREATE OR REPLACE` vence. Principais grupos (todas as funções seguem MANTER salvo indicação):

| funções (nome/prefixo) | classe | consumidores / dependências |
|---|---|---|
| `private.is_locality_member`, `is_verified_locality_member`, `has_accepted_family`, `is_verified_holder`, `has_verified_family_holder`, `public.provision_member_entry`, `verify/decide/replace_verification_document`, funções de convite família | MANTER | policies de localidades/perfil; onboarding e APIs de admissão |
| `public.feed_posts`, `feed_community`, `profile_posts_for`, `private.can_access_post_scope`, `can_access_post`, `notify_comment`, RPCs de post | REESCREVER | home/grupos/profile/composer; policies em posts/comments/reactions/saves/follows; triggers. `feed_community`/feed municipal REMOVER após rotas/consumidores migrarem |
| `private.is_group_member`, `is_group_moderator`, `is_group_owner`, `public.create_group`, `join_group`, `approve_group_member`, moderator/ownership, `list_group_activity`, pins/rules/notify level | REESCREVER | `/groups*`, policies groups/memberships/posts/events; triggers de notificações |
| membership de comunidade: `can_*community*`, `cascade_community_membership_*`, `enforce_group_community_membership`, `block_group_community_change`, helpers de convites/mídia | REMOVER/REESCREVER | RLS e triggers de `communities`, `groups`, `community_memberships`, posts e mídia; substituir por autoridade Comunitária/grupo |
| `public.list_indications`, `list_question_replies`, `open_event_question`, resolve/reopen; funções de Guia | MANTER | Perguntas, indicações, eventos e Guia; chamadas em routes/actions web |
| access, authorization, reports, account deletion, storage sanitation, provider/listing/service-request functions | MANTER | RLS e actions/route handlers; proteger acesso, mídia e ciclo operacional |
| outbox and cron dispatch (`outbox_prepare_due`, `outbox_dispatch_due`, `dispatch_indication_alerts`, `dispatch_indication_digest`, reconcile/cleanup) | MANTER | tabelas de outbox, notification prefs, jobs cron e `/api/internal/*` |

**Jobs:** `cron.schedule` ocorre em 10 migrations: heartbeat; reconciliação de verificação; expiração/limpeza de documentos; eventos recorrentes; worker de outbox; exclusão de conta; fila de candidatos Guia; alertas de anúncios; alerta/digest de indicações. Todos MANTER; retirar um job somente após provar que seu handler não atende domínio retido.

**Políticas:** policies `communities*`, `community_memberships*`, `community_invitations*`, `community_join_reasons*` são REMOVER junto das respectivas tabelas; policies em `groups*`, `posts*`, `comments*`, `events*` e `provider_reach*` são REESCREVER se atualmente usam membership de vila. Policies da fundação, confiança, perfil, notificações, mensagens, listings, reports, serviços e Guia MANTER. Functions privadas usadas em `USING`/`WITH CHECK` têm dependência direta e não podem ser dropadas primeiro.

## 3. Rotas e pastas do app

Total: 95 rotas (`page.tsx`). Linhas são do arquivo de rota; componentes/`lib` são inventariados por pasta (contagem global acima). `MANTER` por seguir tela/ciclo do protótipo; grupos e publicações recebem `REESCREVER`; vila recebe `REMOVER` somente após consumidores migrados.

| caminho | classe | motivo | linhas |
|---|---|---|---:|
| `apps/web/app/(preauth)/**` | MANTER | conta, consentimento, entrada, verificação, família | consultar arquivos `page.tsx` da pasta; onboarding 6 etapas |
| `apps/web/app/(shell)/inicio`, `recommendations`, `indicacoes`, `cidade`, `localidade` | MANTER | início, perguntas municipais e contexto cidade/localidade | inventário: pages individuais; `/community` é rota legado/singular, validar destino |
| `apps/web/app/(shell)/groups/**` | REESCREVER | grupo passa a existir na Comunidade singular; protótipo `src/data/demo/source.js` (`comms`, `asks`) e navegação `src/shell/navigation.js` | pages listadas por rota |
| `apps/web/app/(shell)/community`, `communities/**`, `(owner)/communities/**`, `/invite/**` | REMOVER/INCERTO | modelo vila/adesão e painel owner não existe; telas equivalentes no protótipo ainda não comprovadas para todos os estados administrativos | verificar consumidores/imports e redirects antes do corte |
| rotas de composição/feed em início, grupos, perfil, recomendações | REESCREVER | remover feed da cidade; publicar dentro do grupo; preservar perguntas municipais | pages individuais + componentes feed |
| `events/**` | REESCREVER | evento existe; vínculo/contexto de grupo precisa equivaler ao protótipo e não herdar vila | pages listadas por rota |
| `messages/**`, `notifications/**`, `profile/**`, `configuracoes/**`, `salvos/**`, `denuncias/**` | MANTER | Conversas, perfil, preferências, salvos, confiança e notificações | page files |
| `guide/**`, `explorar/**`, `indicacoes/**` | MANTER | Guia, descoberta e memória de recomendações | page files |
| `mercado/**`, `imoveis/**`, `meus-anuncios/**`, `prestadores/**`, `negocio/**`, `pedidos/**`, `(provider)/**` | MANTER | serviços, prestadores, mercado, moradia e anúncios demonstrados no protótipo | page files |
| `(admin)/**`, `(public)/ajuda`, `api/**`, `auth/**`, `landing/**` | MANTER | operação, suporte, endpoints de entrada, autorização e saúde | rotas/API não dependem de presença no protótipo como tela membro |
| `app/components/{bivaque,entry,indications,material,search,shell,ui,auth}` | REESCREVER/MANTER | wrappers de domínio: feed/comunidade/grupo reescrever; entrada, shell, reports, messages, UI e indications manter/adaptar | componentes incluídos no subtotal de 66 |
| `app/components/fonts`, `app/fonts` | INCERTO | decisões tipográficas do protótipo precisam ser cruzadas com asset/runtime atual | — |
| `lib/{communities,community-invite-rpcs}` | REMOVER após migração | suporte de vila e convites associados | contido nas 97 files |
| `lib/{composer,security,events,search,notifications,messages,profile,auth,onboarding,portal,locality,guide,recommendations,indications,reports,service-requests,listings,providers,storage,saves,supabase,outbox,convite}` | MANTER/REESCREVER por domínio | suporte aos fluxos do protótipo; composer/search/events requerem novo escopo | 97 files totais |

### Rotas (índice de pastas com `page.tsx`)

Os 95 arquivos são sob: `(admin)/admissions`, `(admin)/arrivals`, `(admin)/guide-queue`, `(admin)/reports`; `(owner)/communities`; `(preauth)/codigo-de-conduta`, `consent`, `conta-apagada`, `convite`, `login`, `nova-senha`, `onboarding`, `prestador-convite`, `privacidade`, `recuperar-senha`, `signup`; `(provider)/prestador/{atendimento,catalogo,conta,ficha,pedidos}`; `(public)/ajuda`; `(shell)/{cidade,communities,community,configuracoes,denuncias,events,explorar,groups,guide,imoveis,indicacoes,inicio,invite,localidade,mercado,messages,meus-anuncios,negocio,notifications,pedidos,prestadores,profile,recommendations,salvos}`; além de APIs (route handlers), auth, landing e componentes. Paths dinâmicos mantêm seus segmentos `[id]`, `[userId]`, `[token]` e subrotas de edição/criação.

## 4. Testes

Contagem observada (arquivos; pastas podem incluir helpers/fixtures): Supabase 171, E2E 65 specs, unit 184, scope 29. Fixtures/tests seguem a classe do domínio. Para E2E/unit/scope, o nome do arquivo e do teste é evidência, não prova de execução nesta tarefa.

| arquivo ou família | classe | o que testa |
|---|---|---|
| `supabase/tests/*community*`, `*group*`, `*post*`, `*comment*`, `*feed*`, `*event*` | REESCREVER; testes exclusivos de vila REMOVER | RLS, mutações, memberships, eventos e publicação; localizar por nome de arquivo e tabelas/asserts no SQL antes de apagar |
| `supabase/tests/*locality*`, `*profile*`, `*auth*`, `*verification*`, `*family*`, `*notification*`, `*dm*`, `*report*`, `*listing*`, `*provider*`, `*service*`, `*guide*`, `*deletion*` | MANTER | fundação, segurança e ciclos ativos |
| `tests/e2e/community-*`, `group-*`, `groups-*`, `feed-*`, `publish-*`, `question-*`, `event-*` | REESCREVER; especificamente vila REMOVER | jornadas atuais herdadas; precisam refletir protótipo e testar negação/acesso |
| `tests/e2e/{journey-entrar-e-ser-admitido,onboarding-*,persistent-login,portas-de-entrada,avatar-denials,member-profile-denials,account-deletion-ui,reports-*,recon-032-messages,global-search-flow,guide-*,market/provider/service,notifications}*.spec.ts` | MANTER | ciclos e controles preservados |
| `tests/unit/{communities,community,composer,events,search,security,notifications,profile,onboarding,portal,messages,reports,indications,listings,providers,guide,service-requests,storage,auth,infra,ui}` | MANTER/REESCREVER por objeto | lógica isolada; testes de comunidade/feed municipal mudam junto com o módulo; segurança de domínio mantido permanece |
| `tests/scope/*.test.mjs` | MANTER/REESCREVER por contrato | guardrails do workspace, migrations, RLS, navegação, visual, secrets, scripts e configuração; atualizar somente assertions que codificam vila/feed antigo |
| `tests/*.mjs` | MANTER | scanner de segredos e verificações do root; não classificadas por uma feature removível |

## 5. Scripts

169 arquivos em `scripts/**`; classificação por família (sem uso de scripts durante a tarefa):

| arquivo/pasta | classe | motivo |
|---|---|---|
| `scripts/agents/**`, `scripts/gate.mjs`, `scripts/normalize-generated-types.mjs`, `scripts/check-react-singleton.cjs` | MANTER | contratos, gates e tipos/infra |
| `scripts/localities/**` | MANTER | catálogo nacional e localidade |
| `scripts/visual/**` | MANTER/REESCREVER | captura/fluxos continua ferramenta útil; catálogo de jornadas de Comunidade, grupos e feed precisa alinhar ao protótipo |
| `scripts/port/**` | REESCREVER/INCERTO | comparadores nomeados para telas antigas; confirmar se ainda são usados antes de remover |
| `scripts/bivaque-html/**` | MANTER | build, auditoria e prova do protótipo que é a especificação |
| `scripts/load/**` | MANTER/INCERTO | massa/carga local e scripts SQL; confirmar ambiente-alvo e se dados gerados incluem vila |
| demais `scripts/**` | MANTER | suporte técnico, não há evidência de dependência em função de produto removida |

## 6. INCERTO — falta evidência

- Relação exata de cada migration `CREATE OR REPLACE` com o estado final foi inferida pelo histórico textual; não foi obtido schema vivo nem aplicado `db dump`. Para fechamento de remoção, gerar diff de schema a partir de banco descartável em tarefa futura (não nesta tarefa).
- Lista completa, por nome, de policies e triggers não ficou transcrita individualmente neste resumo: estão agrupadas por domínio/tabela e devem ser extraídas das migrations finais antes de aprovar drops. Em particular: dependências não óbvias de `community_memberships`, `communities`, mídia e `provider_reach`.
- Chamada dinâmica/RPC em código pode escapar de `rg` por nomes concatenados ou generated types. Consumidores web indicados são os usos encontrados estaticamente.
- Linhas de todas as 95 rotas e 582 arquivos não estão expandidas individualmente no corpo; contagens por arquivo de page precisam ser anexadas para decisão sobre código morto.
- Protótipo é especificação visual/funcional em JavaScript demo, sem backend; falta mapear cada estado/componente de grupos, evento de grupo, denúncia e moderação à implementação atual.
- Jobs `cron.schedule` foram identificados nas migrations, mas nome, periodicidade e referências de cada job precisam de reconciliação migration a migration antes de remoção.
- Pastas de `apps/mobile` e `packages` não foram classificadas funcionalmente; apenas existência/vitalidade do mobile foi confirmada conforme escopo solicitado.

## Método / limites

Leitura de arquivos, `rg` e Git. Não executei `db reset`, E2E, build ou testes. Migrações e contagens vieram do checkout desta branch; nenhum dado do banco de produção foi consultado.

