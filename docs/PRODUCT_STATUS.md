# Estado implementado — Bivaque Community

> **O que o produto faz hoje.** Este documento descreve o código que existe, não o produto
> que foi decidido. Para visão, decisões e roadmap, ver [`BIVAQUE.md`](BIVAQUE.md).
>
> Substitui [`docs/journeys/MAP.md`](journeys/MAP.md), que misturava estado e intenção e,
> por isso, marcava como "Corrigida" linha cujo ciclo de usuário não fechava.
>
> Última reconciliação: **2026-08-19 (sessão D2 1-6)**. Atualizar ao fim de cada onda.

## Como ler

- **Estado atual** — o que o código faz. Nunca o que a migration permite.
- **Estado-alvo** — o que a decisão em `BIVAQUE.md` determina.
- **Lacuna** — a distância entre os dois, em uma frase.
- **Evidência** — arquivo:linha. Detalhe em [`docs/red-team/`](red-team/).
- **Onda** — quando fecha, conforme `BIVAQUE.md` §13.

**Confiança da evidência:** `[V]` verificado nesta sessão lendo o arquivo; `[A]` levantado
na auditoria de 2026-08-10 e não reconferido linha a linha. Reconfirmar `[A]` antes de PR.

**Regra de atualização:** uma linha só sai daqui quando o usuário fecha o ciclo — entrada,
ação, feedback, acompanhamento e o sad path principal. Capacidade em migration não fecha
linha. Foi ignorar isto que produziu o MAP anterior.

**"Onda A (código feito)"** é um terceiro estado, e existe porque o segundo erro é tão fácil
quanto o primeiro. O código foi escrito e revisado, mas a suíte que prova o comportamento
ainda não rodou — no caso da onda A, os dois specs de E2E de negação foram escritos,
commitados e nunca executados, porque o banco está sem seed. Não é "pronto" e não é
"parado": é pronto e não verificado, e a distinção some se não estiver escrita.

**E2E executado em 2026-08-16** (primeiro lote, ver "O que não foi verificado"): a suíte
completa rodou com seed e a execução serial (`--workers=1`) passou por inteiro. O que o
lote não cobre continua "código feito": o callback real via magic link/Google OAuth (o
mailpit local não responde — os specs injetam a sessão via password grant), o Portal da
Transparência real (nunca chamado por design) e a decisão manual do operador na fila de
admissões.

---

## 1. Entrada e admissão

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| Login | E-mail com magic link e Google, sem affordances de senha | igual | — | `login/components/bivaque-sign-in.tsx` `[V]` | B |
| Callback | `next` validado como caminho interno antes do redirect | igual | o E2E do fluxo de admissão rodou (lote 16/08, serial verde); o callback real via magic link continua fora — o mailpit local não responde, specs injetam a sessão | `auth/callback/route.ts`, `lib/security/sanitize-next.ts` `[V]` | A (código feito) |
| Falha de callback | redireciona para tela humana com "voltar para o login" | tela humana com recomeço | falta o E2E do sad path | `auth/callback/route.ts`, `auth/callback-error/page.tsx` `[V]` | A (código feito) |
| Gate do shell | middleware checa consentimento, sessão e membership; `/onboarding` e `/onboarding/status` ficam fora do shell; `my_verification_status()` (RPC SECURITY DEFINER, sem parâmetros) faz o roteamento por estado real — `verified` sem membership → `/onboarding/locality`; `pending`/`temporary_error`/`rejected` → `/onboarding/status`; `null` (nunca verificou) → `/onboarding`. (D2 Task 1, commit `331f0f9`.) | derivar do estado real de verificação | falta o E2E dos estados `pending`/`rejected` | `middleware.ts:9-154`, `20260820000002_my_verification_status.sql` `[V]` | D (código feito) |
| Verificação de CPF | Portal, síncrono, aborta em 10s; CPF com máscara e validação de dígito no cliente e no servidor. Confere **elegibilidade nacional** (não endereço) — o Estado atesta, e a localidade é escolhida no passo pós-elegibilidade (P0 Tasks 4 e 5). O catálogo de UFs do passo de escolha (`/api/localities`) é lido pelo cliente `service_role` do route handler — a migration `20260819001923_grant_service_role_localities_select.sql` concedeu o `SELECT` faltante para o `service_role`, fechando o 500 que bloqueava o caso "elegível sem membership" (`/onboarding/locality` clean na run `2026-08-19T00-25-29-509Z`). **Onda T Tasks 1-3 fechadas** (commits `1b3a94a`, `1284dbb`, `8bafb2a`): `locality_memberships` ganhou `kind`/`leaving_at`/`access` com índices únicos parciais (uma current por user, no máximo uma leaving); `declare_locality_transfer(p_destination, p_term_date)` é a RPC SECURITY DEFINER que converte a current em leaving e cria a nova current atomicamente; `provision_member_locality` substitui o upsert da P0; `degrade_locality_origins()` é o job diário que flips access para read_only sem remover linha; `reverse_locality_transfer(p_user_id)` cancela removendo a destination row (a pessoa nunca morou lá) e devolvendo a origem a current/active; policies de write em posts/comments/post_reactions exigem `can_write_post_to(locality_id, community_id, group_id)` que combina o escopo existente com o check de active. **T4-T6 da T** (seletor de localidade, sinal de chegadas, E2E+auditoria) estão **bloqueados pela onda E** — dependem dos containers definidos lá. | dual-path: Portal + upload auditado | falta a decisão manual do operador e o E2E do dual-path; T4-T6 da onda T dependem da E | `verifyAndProvision.ts:97-133`, `20260819021416_locality_transfer.sql`, `20260820000000_locality_degradation.sql`, `20260820000001_grant_service_role_declare_transfer.sql` `[V]` | T (T1-T3 fechados, T4-T6 bloqueados pela E) / D |
| Upload de documento | upload privado (PDF/JPEG/PNG, 10MB) com TTL de 7 dias; metadata na fila de documentos do operador; `decide_verification_document(approved, rejected)` é a RPC SECURITY DEFINER que o operador usa — aprovar provisiona a membership no primeiro locality existente do usuário e marca `verified`; rejeitar grava `rejection_reason` e `reviewed_by/At` para auditoria. `read_verification_document_path()` retorna o storage path por requisição (signed URL fica no console, nunca persistida). TTL purge diário via `verification_documents_purge_expired()` + cron `bivaque-verification-document-ttl-purge`. (D2 Task 6, commit `b115f6a`.) | caminho de exceção auditado, TTL curto, decisão manual, e-mail avisando | falta o e-mail do outbox (Step 4 da Task 6) e o E2E do envio; o upload-side locality fica como follow-up da Task 6 completa | `20260820000007_verification_document_decision.sql`, `supabase/tests/verification-documents.sql` `[V]` | D (decisão+TTL fechados; e-mail pendente) |
| `pending` | timeout, HTTP não-2xx e 429 do Portal produzem `pending` | timeout e instabilidade produzem `pending` | falta o E2E do produtor | `lib/portal/client.ts:14-19,108-121`, `tests/unit/portal/verify-cpf.test.ts` `[V]` | A (código feito) |
| Tela de status | consulta `read_verification_status` no servidor e reconcilia com membership | derivar do servidor e reconciliar | falta o E2E do fluxo | `onboarding/status/page.tsx:28-67` `[V]` | A (código feito) |
| Recurso de rejeição | retentativa limitada a 3/hora em janela rolante no servidor; upload de documento e waitlist ligados na tela de status; a decisão do operador existe (RPC `decide_verification_document`, fatia D2 Task 6) | retentativa limitada + caso na fila de admissões auditada | falta o e-mail de aviso via outbox (Step 4 da D2 Task 6) e o E2E dos caminhos de negação; o **pending** ainda não tem reconciliação automática — D2 Task 2 fechou a fatia CPF-free com teto de 5 tentativas e handoff ao operador (job `bivaque-verification-reconcile` a cada 15 min); a re-verificação automática no Portal está bloqueada por decisão do dono (não armazenar CPF cru) | `onboarding/status/page.tsx`, `verifyAndProvision.ts`, `20260820000003_verification_reconcile.sql`, `20260820000007_verification_document_decision.sql`, `supabase/tests/verification-reconcile.sql`, `supabase/tests/verification-documents.sql` `[V]` | D (reconciliação e decisão fechados; re-verify no Portal pendente) |
| CPF no cliente | não é guardado; resíduo antigo é removido no boot | não guardar | — | `onboarding/page.tsx:104-108`, `lib/onboarding/storage.ts` `[V]` | **A** |
| Welcome | gateado por membership real no middleware | gatear por membership real | falta o E2E do gate | `middleware.ts:100-104` `[V]` | A (código feito) |
| Waitlist | **obsoleta (P0 Task 8).** A UI de entrada — "Entrar na lista de espera de outras localidades" em `onboarding/page.tsx` e o link na tela de rejected em `onboarding/status/page.tsx` — foi removida; rejeição é de elegibilidade, não de geografia. O branch `join-waitlist` em `api/onboarding/route.ts` e a função `addToWaitlist` em `verifyAndProvision.ts` ficaram sem chamador de UI. | coletar a localidade desejada | o caminho de UI não existe mais; a remoção do schema (`public.waitlist`, RPC `add_to_waitlist`, `20260802000600_onboarding_consent_waitlist.sql`, pgTAP `onboarding-consent-waitlist.sql`) é trabalho seguinte com prazo — ver "Linhas obsoletas" abaixo | `onboarding/page.tsx`, `onboarding/status/page.tsx` (sem waitlist) `[V]` | obsoleta (P0 Task 8) |
| Consentimento | cookie só faz gate de navegação; aceite versionado é gravado em `consent_acceptances` e o `/api/onboarding` exige o registro no servidor; `CONSENT_VERSION`/`CODE_OF_CONDUCT_VERSION` são a fonte única em `@bivaque/domain` (consumers: middleware, consent page/form/actions, onboarding route, verifyAndProvision, document-actions); tela exibe `CODIGO_DE_CONDUTA.md` e `PRIVACIDADE.md` a partir dos arquivos versionados em duas caixas roláveis com role=region + tabIndex (a11y). (D2 Task 3, commit `2ba3620`.) | aceite versionado, com código de conduta | falta o E2E do aceite persistido | `consent/page.tsx`, `consent-form.tsx`, `consent/actions.ts`, `packages/domain/src/consent.ts`, `api/onboarding/route.ts`, `tests/scope/consent-version.test.mjs`, `supabase/tests/consent-acceptances.sql` `[V]` | D (código feito) |

## 2. Convites

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| Convite de membro | **não existe** | link com atribuição e escopo de comunidade; verificação obrigatória | não há motor de crescimento | — | E |
| Convite familiar — envio | gera token, devolve o token uma vez para renderizar `/onboarding?invite=<token>` com botão copiar, grava digest, enfileira `outbox` (canal `email`, tipo `family_invite`; entrega é D1); seção mostra o hint mascarado (`jo***@gm***.com`) por convite | link copiável pelo titular | o e-mail ainda não é entregue (D1/Resend bloqueado por chave) | `profile/family-invite-section-actions.ts`, `profile/family-invite-section.tsx`, `20260820000004_family_invite_delivery.sql`, `supabase/tests/family-invite-hint.sql` `[V]` | D (código feito; entrega D1) |
| Convite familiar — aceite | seleciona por token, status e expiração; vincula ao usuário autenticado; confere o `invitee_email_digest` para que um link encaminhado não provisione quem abriu | conferir o `invitee_email_digest` | — | `20260815130000_family_invite_email_binding.sql`, `supabase/tests/family-invite-email-binding.sql` `[V]` | D (código feito) |
| Convite familiar — sad paths | quatro ramos distintos com errcodes separados: `not_found`/e-mail divergente (404 — mesma resposta para evitar enumeração), `expired` (410), `already_used` (409), `revoked` (410); rota mapeia o errcode para HTTP e mensagem humana, nunca ecoa o `error.message` cru do banco no 500 (D2 Task 5, commit `bdc5981`); `acceptFamilyInvitationAndProvision` propaga o errcode via `wrapped.code` para a rota enxergar | quatro ramos distintos | — | `20260820000005_family_invite_sad_paths.sql`, `api/onboarding/route.ts:168-200`, `tests/unit/onboarding/family-invite-sad-paths-route.test.ts`, `supabase/tests/family-invite-sad-paths.sql` `[V]` | D (código feito) |
| Lista de convites | mostra data de envio/expiração e o hint mascarado por convite (`jo***@gm***.com`); revalidação por `list_pending_invites_with_hint` | identificar o destinatário sem expor e-mail | — | `profile/family-invite-section.tsx:87-103`, `supabase/tests/family-invite-hint.sql` `[V]` | D (código feito) |

## 3. Perfil e identidade

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| Visibilidade | estado único por `locality_memberships` (P0 Task 3 mudou a chave primária para `(user_id, locality_id)`); escolha removida da UI | estado único; um perfil por pessoa, e a localidade vive na membership | — | `20260814052814_remove_hidden_visibility.sql`, `20260802000100_locality_profile_foundation.sql` (PK composta em P0 Task 3) `[V]` | B |
| Endpoint de avatar | lê o perfil do alvo com o cliente autenticado e deixa a RLS de `profiles` decidir; erro vira 500 e ausência vira 404; `service_role` só assina o arquivo | igual | — falta só o E2E, que nunca rodou | `api/avatar/[userId]/route.ts` `[V]` | A (código feito) |
| Avatar no cabeçalho | cabeçalho renderiza só a inicial; a foto aparece na seção e no feed | uma fonte só | três representações do mesmo usuário | `profile/page.tsx:245-272`, `profile/avatar-section.tsx:14-20` `[A]` | E |
| Selo "Membro verificado" | exibido publicamente | removido | proibido pelo contrato, e redundante numa rede onde todos são verificados | `[A]` | **A** |
| Perfil de outro membro | **não existe**; `/profile` sempre lê a sessão | existe, com histórico | a copy de privacidade pressupõe uma tela que não há | `profile/page.tsx:117-133` `[A]` | E |
| Afiliação declarada | **não existe** | força, situação, OM e turma, opcionais | depende do ADR R3 da OM; a regra `forbidden-copy` da auditoria visual (onda C, Task 6) fica adiada até o ADR ser aprovado | — | E |
| Aba "Publicações" | chama `feed_posts` da `LocalityContext.current.id` (P0 Task 7) e corta 20 | filtrar pelo titular | mostra post de terceiro como histórico do usuário | `profile/page.tsx:38-45,274-308`, `lib/locality-context.tsx` `[V]` | E |
| Aba "Eventos" | lê os dez próximos eventos, sem filtro | eventos do titular | nenhuma relação com quem está olhando | `profile/page.tsx:47-52` `[A]` | E |
| Política de nomes | normalização Unicode NFC + bloqueio de caracteres de controle e marcas bidi; comprimento 2-80 (P0 Task 5) | normalizar Unicode, barrar controle e bidi | — (a política está aplicada no único lugar onde tem como ser aplicada, o passo pós-elegibilidade) | `20260802000100:31-40` `[V]` | E |

## 4. Comunidade, grupos e feed

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| Camada de comunidade | rotas `/communities` e `/communities/[id]` ligam descoberta, pedido de entrada, fila básica de aprovação e `feed_community` | vila como subcomunidade, com entrada, feed, moderação | a home ainda é o feed municipal; falta seletor de audiência, guia de chegada e aprovação em lote com afiliação | `communities/page.tsx`, `communities/[id]/page.tsx`, `communities/actions.ts`, `20260805211933`, `20260805214709`, `20260805215020`, `20260805215419` `[V]` | E |
| Fila de aprovação | fila básica de pedidos na página da comunidade, com aprovar/recusar por moderador | lista em lote, com afiliação visível e delegação | falta seleção em lote, afiliação visível e delegação de moderação | `communities/[id]/page.tsx`, `community_rpcs.sql` `[V]` | E |
| Feed municipal | a home prioriza `feed_community` da primeira comunidade aprovada; sem comunidade, mantém `feed_posts` da **`LocalityContext.current.id`** (P0 Task 7 removeu `PILOT_LOCALITY_ID`; a resolução é feita no shell, não via constante). Sessão 2026-08-18 (`866faa9`) corrigiu os dois consumidores que ainda liam a locality pela rota antiga: `communities/page.tsx:35-49` (resolve via `locality_memberships.order('joined_at').limit(1).maybeSingle()`, espelhando o shell) e `recommendations/page.tsx` (mesma resolução, client-side) | **deixa de ser sala** (D48): vira alcance de post. A home passa a ser o feed da vila | falta separar a referência municipal (guia de chegada, eventos e vitrine) do feed; post sem comunidade ainda cai na locality corrente | `(shell)/community/page.tsx`, `(shell)/communities/page.tsx:35-49`, `(shell)/recommendations/page.tsx`, `lib/locality-context.tsx` `[V]` | E |
| Estado vazio honesto | **Implementado (P0 Task 9).** Feed, eventos e guia ramificam o `EmptyState` em `lib/locality-density.ts`: abaixo do §3.4 (30 ativos/semana, proxy `locality_memberships.count`), a copy é "Você é dos primeiros aqui."; no resto, é a copy padrão. Ação (Publicar / Criar evento) sempre presente; guia não tem ação direta — sugestões entram pela curadoria do operador, em F. **Sessão 2026-08-18** incluiu `/onboarding/locality` no `capture.mjs` (`331ebda`) e fixou o locator do `Select` Estado em `two-localities.spec.ts` (`2a6f135`), com o spec `empty-locality.spec.ts` tendo o `getByRole("main")` aplicado (`363639a`) — auditoria fecha em `/onboarding/locality` clean nas 3 viewports, mas o estado vazio de **2ª UF** continua pendente do `db:reset` com 2ª UF (Task 10 Step 3) | copy em todas as três superfícies geográficas; sem condicional sobre Manaus (decisão 7 do ADR) | a métrica é proxy até `profiles.last_active_at` chegar; spec E2E em árvore, execução pendente de Task 10; estado vazio em 2ª UF pendente do dono | `apps/web/lib/locality-density.ts`, `tests/unit/localities/locality-density.test.ts`, `community/page.tsx`, `events/page.tsx`, `guide/page.tsx`, `tests/e2e/empty-locality.spec.ts`, `tests/e2e/two-localities.spec.ts`, `scripts/visual/capture.mjs` `[V]` | P0 |
| Seletor de audiência | seletor no modal de publicação lista as comunidades aprovadas e Manaus; post ganha `community_id` | escolher vila ou Manaus antes de publicar. É o mecanismo que substitui o feed municipal e satisfaz a regra 2 da §12 | falta ligar o feed municipal ao alcance Manaus e validar visualmente | `feed-post.tsx` `[V]` | E |
| Guia de chegada | rota `/guide` exibe só itens aprovados e filtra por categoria; fila do operador em `/guide-queue` aprova ou rejeita sugestões; parser e adaptador DeepSeek existem, mas a chamada externa fica desligada por governança | referência curada e buscável de Manaus: colégio, hospital, transportadora, despachante. Curadoria nasce das respostas de indicação, com **IA sugere → operador aprova** (D49) | falta fechar a governança LGPD e ligar o gatilho real às respostas da onda F | `guide/page.tsx`, `(admin)/guide-queue/page.tsx`, `lib/guide/ai-curation.ts`, `lib/guide/deepseek.ts`, `20260815181708_arrival_guide.sql`, `20260815210000_arrival_guide_curation.sql`, `supabase/seed.sql` `[V]` | E |
| Composer — foto e enquete | botões Foto/Link/Enquete abrem o compositor com o tipo | upload real de foto | "Foto" pede caminho de texto, não upload de arquivo; enquete e link fecham o ciclo | `feed-composer.tsx:58-86`, `feed-post.tsx:653-661` `[V]` | F |
| Detalhe de grupo | leitura inteira pelo cliente autenticado, com `error` lido em cada consulta e `notFound()` na negação; lista de membros por consulta separada; `service_role` saiu da renderização. **Sessão 2026-08-18** adicionou `default auth.uid()` em `posts`, `comments` e `post_reactions` (`20260818022411_set_user_id_defaults.sql`) — o cliente omite `user_id` e a RLS `user_id = auth.uid()` rejeitava como "new row violates row-level security policy"; o default fecha a escrita como defesa em profundidade, e o cenário de 5 personas (`tests/e2e/synthetic-people-interaction.spec.ts`) roda verde em feed/notificação/grupo | igual | E2E reexecutado pendente de seed. **As Server Actions no topo do arquivo continuam com `service_role`** — linha própria abaixo | `groups/[id]/page.tsx`, `feed-post.tsx`, `20260818022411_set_user_id_defaults.sql`, `tests/e2e/synthetic-people-interaction.spec.ts` `[V]` | A (código feito) |
| ~~Vazamento da lista de membros~~ | **o achado estava exagerado.** A consulta original usava embed `profiles!inner`, e **não existe FK de `group_memberships` para `profiles`** — as duas referenciam `auth.users` em separado, então o PostgREST nunca resolveu o embed. O código descartava o `error` e renderizava vazio | — | o que vazava era o **metadado** do grupo (nome, visibilidade), não os dez nomes. A lista estava quebrada para todo mundo, inclusive para quem tinha direito. Descoberto pelo E2E ao exigir leitura do `error` | `20260802001000_groups_moderation.sql` (sem FK); `groups/[id]/page.tsx` `[V]` | A (corrigido) |
| Gestão de grupo | entrar, sair, aprovar, transferir posse | fechar cancelamento, rejeição, remoção, exclusão | ciclo do administrador incompleto | `groups/page.tsx:441-496` `[A]` | F |
| **Server Actions de grupo e evento** | **Onda F Task 1 fechada** (commits `b3c192b`, `24b8c1b`, `17c0ad5`). A medição (Step 1) confirmou o primeiro desfecho: `lib/supabase/server.ts:12-17` cria o cliente `service_role` com `persistSession: false`, então `getUser()` devolve nulo e toda ação lançava "unauthenticated" — entrar em grupo e marcar presença em evento estavam quebrados para todo mundo. Step 2-3 reescreveram as seis ações (`joinGroupAction`, `leaveGroupAction`, `transferOwnershipAction`, `setRsvpAction`, `cancelRsvpAction`, `completeEventAction`) para autenticar via cookies e escrever pelo cliente autenticado — mesmo padrão de `communities/actions.ts`. `completeEventAction` fica com `service_role` porque a RPC `complete_event` é service_role-only (uma das duas exceções que o plano autoriza). `joinGroupAction` agora chama a RPC `join_group` (que deriva status de `groups.visibility`: público → `approved`, privado → `pending`), tirando `desiredStatus` do form. Step 2b adicionou a policy `event_rsvps_delete_self` para `cancelRsvpAction` (group_memberships_delete_self já existia de 2026-08-02). Step 4 escreveu o pgTAP `group-join-status.sql` com sete casos. | igual | nada restante nesta linha — o caminho feliz e o caminho negativo estão cobertos; os testes E2E (Step 4 do plano, separados) seguem pendentes por dependência de seed | `groups/[id]/page.tsx`, `events/[id]/page.tsx`, `20260819010000_self_delete_policies.sql`, `tests/group-join-status.sql` `[V]` | F (F1 fechado, T2-T6 dependem da E) |
| Busca / diretório | **não existe** | filtro por força, situação, OM e turma | é o que o WhatsApp não faz, e não existe | — | E |

## 5. Eventos

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| Detalhe de evento | leitura pelo cliente autenticado, com `notFound()` na negação | igual | — falta só o E2E, que nunca rodou | `events/[id]/page.tsx` `[V]` | A (código feito) |
| RSVP | `interested` e `going` | incluir "não vou"; avisar o organizador na mudança | organizador não sabe quem desistiu | `events/[id]/page.tsx:161-194` `[A]` | F |
| Convite de evento | migration, RLS e UI de aceitar/recusar existem | envio pelo organizador + notificação | não há caminho de envio; o comentário no código dizendo que o mecanismo não existe está desatualizado | `20260806171204_event_invites.sql`, `events/event-invites-section.tsx:26-120`, comentário obsoleto em `events/page.tsx:334` `[A]` | F |
| Encontro recorrente | **não existe** | padrão de primeira classe | é a tese central do produto | — | F |

## 6. Indicações

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| Explorar | 6 grupos e 4 eventos por recência | mesmos, com link para o detalhe | card de grupo não abre `/groups/[id]`; evento aponta para a lista genérica | `recommendations/page.tsx:519-565,588-615` `[A]` | F |
| Pedir indicação | formulário publica e a aba Pedidos lista os pedidos visíveis, lê as respostas e permite responder | listagem, detalhe e resposta visível | falta autor/notificação de resposta e link do Explorar para o detalhe | `recommendation-requests.tsx`, `recommendations/page.tsx`, `20260815220000_recommendation_reply_cycle.sql` `[V]` | F |
| Controle do autor | autor edita/exclui o pedido na UI; autor de resposta ganhou `update`/`delete` no banco | autor encontra, edita e exclui | a UI de resposta ainda não expõe editar/excluir a própria resposta | `recommendation-requests.tsx`, `20260815220000_recommendation_reply_cycle.sql` `[V]` | F |
| Escopo do pedido | formulário escolhe Manaus ou um grupo do qual o autor participa e envia `locality_id`/`group_id` de acordo | escopo escolhido, com Saúde começando em grupo | Saúde ainda não é forçada a começar em grupo | `recommendations/page.tsx`, `recommendation-requests.tsx` `[V]` | F |
| `group_id` | FK para `groups`, insert checa membership de grupo e RLS expõe pedido/resposta apenas ao grupo | FK e checagem na mesma migration que expuser o escopo | falta E2E do escopo de grupo | `20260815220000_recommendation_reply_cycle.sql`, `supabase/tests/recommendations-reply-cycle.sql` `[V]` | F |
| Salvas | botão Salvar/Salvo nos cards de pedido e a aba Salvas continua lendo os salvos | salvar de verdade, com destino | falta notificação de resposta para quem salvou | `recommendation-requests.tsx`, `recommendations/page.tsx` `[V]` | F |

## 7. Vitrine

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| Ficha de prestador | **não existe** | identidade + catálogo + portfólio (D45) | prova social e avisos ficam para depois de F e H | — | G |
| Conta de prestador | **não existe** | usuário do Auth com papel, sem membership (D37) | sem membership nenhuma policy de conteúdo casa — a fronteira precisa nascer na mesma migration que o tipo de conta | — | G |
| Dashboard do prestador | **não existe** | anúncio, métrica e caixa de pedidos | depende do PostHog para a métrica | — | G |
| Busca de prestador | **não existe** | filtro exato por categoria e vila + `pg_trgm` no nome (D44) | — | — | G |
| Alcance pago | **não existe** | assinatura por Asaas, checkout hospedado, webhook liga a flag (D41) | exige CNPJ | — | G |

## 8. Mensagens e notificações

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| DM entre membros | superfície publicada e funcional no caminho feliz | **adiada** — a superfície fica, o acesso entre membros não abre | — | `messages/page.tsx` `[A]` | — |
| Conversa membro ↔ prestador | **não existe** | contexto `provider` na máquina que já existe (D36) | exige corrigir antes: bloqueio contornável pelo bloqueador (P0), criação por ordem de UUID, contexto declarado não validado | `20260802001500:185-211`, `supabase/tests/dm-context-denials.sql:389-451` `[A]` | G |
| Inbox | lista e marca como lida com cliente anônimo, sob RLS; cliques navegam | igual | **não há vazamento próprio aqui** — verificado em 2026-08-11. Os destinos `/groups/:id` e `/events/:id` é que leem com `service_role`, e se corrigem na onda A. O que resta é a notificação de aceite familiar, que abre o perfil do próprio titular | `notifications/page.tsx:121-144` `[V]` | E |
| Preferências | comentário e evento consultam `notification_preferences`; DM e menção saíram da tela | só sobrevive canal com produtor | mensagens e menções seguem sem produtor, mas não são mais prometidas | `20260814053908_honour_notification_preferences.sql`, `notification-preferences-section.tsx` `[V]` | B |
| E-mail transacional | **não existe** | resposta a pedido e lembrete de encontro | sem ele não há canal de retorno próprio | — | D |
| Push e SMS | não existem | permanecem fora | — | — | — |

## 9. Moderação e operação

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| Denúncia | `reports` cobre post, comentário e grupo | um modelo, todos os alvos | `dm_reports` é tabela separada que nenhum painel lê; request e reply de indicação não são alvos | `20260802001500:64-76`, `(admin)/reports/page.tsx:44-93` `[A]` | H |
| Motivo da denúncia | texto livre | sanitizado e limitado | pode persistir PII que o produto se recusa a guardar | `[A]` | H |
| Ocultação | esconde post, comentário e grupo | esconder cada tipo de alvo | alvos novos não são cobertos | `(admin)/reports/page.tsx:187-210` `[A]` | H |
| Ação sobre pessoa | **não existe** | suspensão com motivo registrado | só há ação sobre conteúdo | — | H |
| Retorno ao denunciante | **não existe** | notificação de análise concluída | denunciante nunca sabe o desfecho | — | H |
| Admissões | painel observa a fila | decidir, e consumir recurso e `pending` | observação sem ação | `(admin)/admissions/page.tsx:24-80` `[A]` | H |
| Roster de operadores | fechado a membros comuns | igual | corrigido: a tabela nasceu com `using (true)` para `authenticated` | `20260806100231_restrict_operator_roster.sql` `[V]` | — |
| Probe de RLS | 7 asserções, gate de operador | não dar falso verde | `[A]` | `api/admin/rls-health/route.ts` | H |

## 10. Conteúdo

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| Filtro de vocabulário | removido (D21); aviso de PII na UI | removido; aviso de PII na UI | — | `20260814070858_drop_vocabulary_filter.sql`, `packages/domain/src/index.ts` `[V]` | C |
| pgTAP do filtro | afirma a aceitação (D21) | mudar junto com a constraint | — | `supabase/tests/community-feed-denials.sql`, `recommendations-scope-denials.sql` `[V]` | C |

## 11. Infraestrutura

D1 está em andamento. **O agendador e a fila de saída já têm caminho local completo, mas
nenhuma peça abaixo está ativa em produção ainda.** A coluna `Estado atual` distingue o
que existe no código do que funciona em produção: “biblioteca/configuração” não é “fluxo
entregue”.

**Dispensa de auditoria visual (D1):** esta onda não toca tela nenhuma; a auditoria visual
de fim de onda não se aplica, conforme o plano D1.

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| E-mail transacional | **não existe** | Resend, domínio verificado com DKIM e SPF | **bloqueio externo:** exige conta e registro de DNS | — | D1 |
| Canal WhatsApp | **não existe** | não-oficial com número descartável, adaptador no `outbox` (§7.8 do BIVAQUE) | **bloqueio externo:** exige chip dedicado e CNPJ | — | D1 |
| Rate limit | throttle global do Portal e limite de CPF por usuário ligados no fluxo de verificação via Upstash; o limite em banco segue como fallback anti-enumeração | Upstash com os quatro limites: CPF por hora, cota de convite, leitura de perfil, throttle global do Portal | cota de convite e leitura de perfil ainda não estão ligadas | `apps/web/lib/portal/guard.ts`, `apps/web/lib/onboarding/verifyAndProvision.ts`, `packages/domain/src/rate-limit.ts`, `apps/web/lib/limits.ts`, `tests/unit/security/rate-limit.test.ts` `[V]` | D1→D2 |
| Circuit breaker do Portal | o fluxo de verificação abre o breaker ao receber 429 do Portal e, enquanto aberto, responde `pending` genérico | no Upstash: em 429, parar e mandar todos para `pending` | ainda não há telemetria de estado do breaker; a lógica de tempo está testada | `apps/web/lib/portal/guard.ts`, `apps/web/lib/onboarding/verifyAndProvision.ts`, `apps/web/lib/portal/client.ts`, `tests/unit/portal/verify-cpf-with-error-code.test.ts` `[V]` | D1→D2 |
| Agendador | **`pg_cron` com o job `bivaque-outbox-worker`; `pg_net` usado pelo dispatch** | pg_cron + `pg_net` para a reconciliação de `pending` | caminho local comprovado; disponibilidade do `pg_net` em produção ainda depende do deploy | `20260814074813_enable_pg_cron.sql`, `20260814174705_outbox_worker.sql`, `supabase/tests/pg-cron-enabled.sql`, `supabase/tests/outbox-worker.sql` `[V]` | D1 |
| Fila de saída | **tabela `outbox` + worker no pg_cron + endpoint interno + adaptadores** | tabela `outbox` com estado + worker no pg_cron; verifica preferência e opt-out antes de enviar | falta só ligar adaptadores reais (Resend/WhatsApp), bloqueados por Resend + chip/CNPJ | `20260814081735_outbox_table.sql`, `20260814174705_outbox_worker.sql`, `apps/web/app/api/internal/outbox/route.ts`, `apps/web/lib/outbox/adapters.ts`, `supabase/tests/outbox-worker.sql`, `tests/unit/infra/outbox-delivery.test.ts` `[V]` | D1 |
| Rastreamento de erro | **Sentry instalado com scrub de PII** | Sentry com filtro de PII antes do envio | o código de envio está pronto; o DSN de produção é configuração externa | `apps/web/sentry.server.config.ts`, `packages/domain/src/pii-scrub.ts`, `tests/unit/security/pii-scrub.test.ts` `[V]` | D1 |
| Métrica de produto | **não existe** | PostHog | sai dado comportamental para terceiro: exige base legal declarada | — | H |
| Cobrança | **não existe** | Asaas, checkout hospedado, webhook liga a flag | **bloqueio externo:** exige CNPJ | — | G |
| Deploy de banco | **workflow `deploy-migrations.yml`: `db push` só após o gate** | GitHub Action no merge, credencial como secret do CI | falta configurar os secrets de produção no repositório e tirar a chave do laptop | `.github/workflows/deploy-migrations.yml`, `tests/scope/deploy-migrations.test.mjs` `[V]` | D1 |
| Staging | **não existe e não vai existir** | — | risco aceito (D42): erro de migração sobre dado real chega direto à produção | — | — |

---

## Guarda-rails estruturais já ativos

Estes rodam em milissegundos em `npx pnpm@11.18.0 test:scope` e falham antes do pgTAP:

- nenhuma policy consulta a relação que ela protege (recursão);
- nenhuma policy referencia relação criada em migration posterior;
- toda função chamada de dentro de policy é `security definer` — hoje 13 de 13.

Ver [`tests/scope/rls-structure.test.mjs`](../tests/scope/rls-structure.test.mjs). Os dois
primeiros padrões vieram de bugs que o projeto-mãe teve em produção; nenhum foi herdado
aqui.

## Linhas obsoletas

Linhas que viraram código morto nesta onda, com prazo escrito para remoção. **Código morto
sem prazo vira feature aos olhos de quem chega depois** (P0 Task 8).

| Linha | Schema afetado | Próxima migration | Prazo |
|---|---|---|---|
| Waitlist (UI em `onboarding/page.tsx`, `onboarding/status/page.tsx`) | `public.waitlist`, RPC `add_to_waitlist(text, text, text)`, `20260802000600_onboarding_consent_waitlist.sql`, pgTAP `supabase/tests/onboarding-consent-waitlist.sql` | `202608XXXX_drop_waitlist` (a abrir) | antes da abertura da onda T — o painel de demanda que a T traz lê de `locality_memberships`, não da waitlist, e a coalescência é o ponto em que a remoção fica segura |

## O que não foi verificado

- pgTAP rodou em 2026-08-15 (sessão noturna): **48 arquivos, 756 testes, tudo verde**; `supabase db lint --local --level error` sem erros. Inclui os três arquivos que a reconciliação diurna não tinha rodado — `arrival-guide.sql`, a curadoria em `full-regression.sql`/`rls-or-column-regression.test.sql` e `recommendations-reply-cycle.sql` — após duas correções de execução: o teste do ciclo de resposta passou a setar o usuário que responde, e uma migration de fix (`20260816001059`) devolveu ao CHECK `recommendation_origin_scope` a resposta 23514 que o teste 10 de `recommendations-scope-denials.sql` exige. As linhas `[A]` continuam descrevendo evidência de código/migration, não um veredito de produção.
- O limite de taxa da API do Portal da Transparência sob rajada não foi medido. Isso decide
  se a entrada da vila é por link aberto ou por lotes. **A P0 torna isso mais relevante, não
  menos:** a partir de 2026-08-17 a admissão é nacional e qualquer cidade do Brasil pode entrar
  sem waitlist, o que multiplica o volume contra o mesmo teto de 180 requisições por minuto
  do Portal. O throttle global no servidor e o circuit breaker no Upstash (D34, D46) são os
  dois mecanismos que sustentam a decisão; sem medição sob rajada, a política de admissão
  por vila é hipótese, não evidência.
- E2E (Playwright) rodou pela primeira vez em 2026-08-16: suíte completa com seed e Chrome
  do sistema; a execução serial (`--workers=1`) passou por inteiro, incluindo os specs de
  admissão de 15/08 (manaus-pilot-denials, manaus-pilot-full-journey, onboarding-denials,
  onboarding-holder-family). **2026-08-18** somou o spec
  `tests/e2e/synthetic-people-interaction.spec.ts` (5 personas do seed, 2 cenários:
  feed/notificação e grupo), verde em série. Na execução paralela local (3 viewports,
  workers default), 11 testes estouram os timeouts default (5s/30s) por carga da máquina —
  os mesmos passam em série, então o registro é de capacidade local, não de código; o CI em
  ubuntu é a fonte da execução paralela completa. O lote não cobre: callback real via
  magic link/Google OAuth (mailpit local não responde — specs injetam a sessão via
  password grant), Portal real (nunca chamado por design) e decisão manual do operador na
  fila de admissões.
- Auditoria visual da P0 fechou em **2026-08-19** (`run 2026-08-19T00-25-29-509Z`,
  `high = 0`): 5 telas autenticadas em 3 viewports + `/login`, `/consent`, `/onboarding`,
  `/onboarding/status`, `/community`, `/events`, `/guide`, `/onboarding/locality` clean.
  Achados medium residuais (não bloqueiam) e **fora das telas que a P0 tocou**: `h1` ausente
  em `/groups/[id]`, `/events/[id]` e `/onboarding/locality`, padrão pré-existente de
  páginas de detalhe. Pendência: estado vazio honesto de feed/eventos/guia em **2ª UF** —
  exige `db:reset` com 2ª UF no seed (passo do dono, registrado em
  `docs/agents/VISUAL_AUDIT-2026-08-17-p0-localidades.md` §"O que a P0 precisa para fechar
  a auditoria").

## Pendências abertas (sessão 2026-08-19)

Levantadas durante a execução do loop visual e do cenário E2E de 5 personas; transferidas
do [`HANDOFF-2026-08-19.md`](agents/HANDOFF-2026-08-19.md) para cá porque o handoff não é
fonte persistente. Nenhuma bloqueia P0 (que fechou em implementação, canon e auditoria
visual), mas todas exigem decisão humana antes de virar trabalho de uma onda.

| Pendência | Origem | Próximo passo |
|---|---|---|
| `/notifications` mostra lista vazia em navegação fresca (corrida de sessão do `@supabase/ssr`: a query dispara antes de o cliente ler o cookie, sai anônima, e a RLS devolve zero linhas). Adicionar `getUser()` antes da query, como em `community/page.tsx`, **piorou** o caso — a causa é mais profunda. | achado do cenário E2E sintético | investigar com calma; o teste E2E valida a notificação via API por causa disso |
| Rotação de `PORTAL_DADOS_API_KEY` e `RESEND_API_KEY` — vazaram em transcript de sessão. Rotacionar **se forem reais** (chaves de placeholder `example.invalid` no `.env.local` de dev não têm o que rotacionar). | higiene de segredos | verificar origem das chaves no `.env.local`; rotacionar no painel externo só se a chave for de produção |
| `--trace on` trava no host: a versão do Chrome do sistema ≠ Chromium 1161 que o Playwright 1.51.1 espera; comandos CDP de trace (snapshot e screenshot) penduram. O download do navegador gerenciado não completou (rede). `--headed` continua funcionando. | ambiente | baixar `chromium` gerenciado uma vez (`npx playwright install chromium`) quando a rede permitir; assistir ao vivo já cobre a maior parte |

