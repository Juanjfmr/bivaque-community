# Estado implementado — Bivaque Community

> **O que o produto faz hoje.** Este documento descreve o código que existe, não o produto
> que foi decidido. Para visão, decisões e roadmap, ver [`BIVAQUE.md`](BIVAQUE.md).
>
> Substitui [`docs/journeys/MAP.md`](journeys/MAP.md), que misturava estado e intenção e,
> por isso, marcava como "Corrigida" linha cujo ciclo de usuário não fechava.
>
> Última reconciliação: **2026-08-15**. Atualizar ao fim de cada onda.

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
| Gate do shell | middleware checa consentimento, sessão e membership; `/onboarding` e `/onboarding/status` ficam fora do shell | derivar do estado real de verificação | falta o E2E dos estados `pending`/`rejected` | `middleware.ts:9-104` `[V]` | A (código feito) |
| Verificação de CPF | Portal, síncrono, aborta em 10s; CPF com máscara e validação de dígito no cliente e no servidor | dual-path: Portal + upload auditado | falta a decisão manual do operador e o E2E do dual-path | `onboarding/page.tsx:16-20,332-382`, `api/onboarding/route.ts:70-80`, `lib/portal/classify.ts` `[V]` | D |
| Upload de documento | upload privado (PDF/JPEG/PNG, 10MB) com TTL de 7 dias; metadata na fila de documentos do operador | caminho de exceção auditado, TTL curto, decisão manual | falta a decisão do operador e o E2E do envio | `onboarding/document-upload.tsx`, `onboarding/document-actions.ts`, `20260815132000_verification_documents.sql`, `supabase/tests/verification-documents.sql` `[V]` | D |
| `pending` | timeout, HTTP não-2xx e 429 do Portal produzem `pending` | timeout e instabilidade produzem `pending` | falta o E2E do produtor | `lib/portal/client.ts:14-19,108-121`, `tests/unit/portal/verify-cpf.test.ts` `[V]` | A (código feito) |
| Tela de status | consulta `read_verification_status` no servidor e reconcilia com membership | derivar do servidor e reconciliar | falta o E2E do fluxo | `onboarding/status/page.tsx:28-67` `[V]` | A (código feito) |
| Recurso de rejeição | retentativa limitada a 3/hora em janela rolante no servidor; upload de documento e waitlist ligados na tela de status; decisão do operador ainda não existe | retentativa limitada + caso na fila de admissões auditada | falta a decisão manual do operador e o E2E dos caminhos de negação | `onboarding/status/page.tsx`, `verifyAndProvision.ts`, `20260815133000_verification_attempt_limit.sql`, `supabase/tests/verification-attempt-limit.sql` `[V]` | D |
| CPF no cliente | não é guardado; resíduo antigo é removido no boot | não guardar | — | `onboarding/page.tsx:104-108`, `lib/onboarding/storage.ts` `[V]` | **A** |
| Welcome | gateado por membership real no middleware | gatear por membership real | falta o E2E do gate | `middleware.ts:100-104` `[V]` | A (código feito) |
| Waitlist | **obsoleta (P0 Task 8).** A UI de entrada — "Entrar na lista de espera de outras localidades" em `onboarding/page.tsx` e o link na tela de rejected em `onboarding/status/page.tsx` — foi removida; rejeição é de elegibilidade, não de geografia. O branch `join-waitlist` em `api/onboarding/route.ts` e a função `addToWaitlist` em `verifyAndProvision.ts` ficaram sem chamador de UI. | coletar a localidade desejada | o caminho de UI não existe mais; a remoção do schema (`public.waitlist`, RPC `add_to_waitlist`, `20260802000600_onboarding_consent_waitlist.sql`, pgTAP `onboarding-consent-waitlist.sql`) é trabalho seguinte com prazo — ver "Linhas obsoletas" abaixo | `onboarding/page.tsx`, `onboarding/status/page.tsx` (sem waitlist) `[V]` | obsoleta (P0 Task 8) |
| Consentimento | cookie só faz gate de navegação; aceite versionado é gravado em `consent_acceptances` e o `/api/onboarding` exige o registro no servidor | aceite versionado, com código de conduta | a tela ainda não exibe o código de conduta; falta o E2E do aceite persistido | `consent/actions.ts`, `consent/page.tsx`, `20260815131000_consent_acceptances.sql`, `api/onboarding/route.ts:60-68`, `supabase/tests/consent-acceptances.sql` `[V]` | D |

## 2. Convites

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| Convite de membro | **não existe** | link com atribuição e escopo de comunidade; verificação obrigatória | não há motor de crescimento | — | E |
| Convite familiar — envio | gera token, grava digest, descarta o token | link copiável pelo titular | o familiar não recebe caminho utilizável | `profile/family-invite-section-actions.ts:57-92` `[A]` | D |
| Convite familiar — aceite | seleciona por token, status e expiração; vincula ao usuário autenticado | conferir o `invitee_email_digest` | link encaminhado provisiona quem abrir, e esta é a via que concede acesso sem CPF | `20260802000400_trust_invitation_helpers.sql:104-145` `[A]` | D |
| Convite familiar — sad paths | expirado, usado, revogado e inexistente viram a mesma exceção 500 | quatro ramos distintos | qualquer interrupção vira beco sem saída | `api/onboarding/route.ts:67-79,99-103` `[A]` | D |
| Lista de convites | mostra só data de envio e expiração | identificar o destinatário sem expor e-mail | dois convites do mesmo dia são indistinguíveis; revoga-se o errado | `profile/family-invite-section.tsx:85-104` `[A]` | D |

## 3. Perfil e identidade

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| Visibilidade | estado único `locality_members`; escolha removida da UI | estado único | — | `20260814052814_remove_hidden_visibility.sql` `[V]` | B |
| Endpoint de avatar | lê o perfil do alvo com o cliente autenticado e deixa a RLS de `profiles` decidir; erro vira 500 e ausência vira 404; `service_role` só assina o arquivo | igual | — falta só o E2E, que nunca rodou | `api/avatar/[userId]/route.ts` `[V]` | A (código feito) |
| Avatar no cabeçalho | cabeçalho renderiza só a inicial; a foto aparece na seção e no feed | uma fonte só | três representações do mesmo usuário | `profile/page.tsx:245-272`, `profile/avatar-section.tsx:14-20` `[A]` | E |
| Selo "Membro verificado" | exibido publicamente | removido | proibido pelo contrato, e redundante numa rede onde todos são verificados | `[A]` | **A** |
| Perfil de outro membro | **não existe**; `/profile` sempre lê a sessão | existe, com histórico | a copy de privacidade pressupõe uma tela que não há | `profile/page.tsx:117-133` `[A]` | E |
| Afiliação declarada | **não existe** | força, situação, OM e turma, opcionais | depende do ADR R3 da OM; a regra `forbidden-copy` da auditoria visual (onda C, Task 6) fica adiada até o ADR ser aprovado | — | E |
| Aba "Publicações" | chama `feed_posts` da localidade e corta 20 | filtrar pelo titular | mostra post de terceiro como histórico do usuário | `profile/page.tsx:38-45,274-308` `[A]` | E |
| Aba "Eventos" | lê os dez próximos eventos, sem filtro | eventos do titular | nenhuma relação com quem está olhando | `profile/page.tsx:47-52` `[A]` | E |
| Política de nomes | valida só comprimento 2-80 | normalizar Unicode, barrar controle e bidi | nome enganoso é possível | `20260802000100:31-40` `[A]` | E |

## 4. Comunidade, grupos e feed

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| Camada de comunidade | rotas `/communities` e `/communities/[id]` ligam descoberta, pedido de entrada, fila básica de aprovação e `feed_community` | vila como subcomunidade, com entrada, feed, moderação | a home ainda é o feed municipal; falta seletor de audiência, guia de chegada e aprovação em lote com afiliação | `communities/page.tsx`, `communities/[id]/page.tsx`, `communities/actions.ts`, `20260805211933`, `20260805214709`, `20260805215020`, `20260805215419` `[V]` | E |
| Fila de aprovação | fila básica de pedidos na página da comunidade, com aprovar/recusar por moderador | lista em lote, com afiliação visível e delegação | falta seleção em lote, afiliação visível e delegação de moderação | `communities/[id]/page.tsx`, `community_rpcs.sql` `[V]` | E |
| Feed municipal | a home prioriza `feed_community` da primeira comunidade aprovada; sem comunidade, mantém `feed_posts(PILOT_LOCALITY_ID)` | **deixa de ser sala** (D48): vira alcance de post. A home passa a ser o feed da vila | falta separar a referência municipal (guia de chegada, eventos e vitrine) do feed; post sem comunidade ainda cai em Manaus | `(shell)/community/page.tsx` `[V]` | E |
| Estado vazio honesto | **Implementado (P0 Task 9).** Feed, eventos e guia ramificam o `EmptyState` em `lib/locality-density.ts`: abaixo do §3.4 (30 ativos/semana, proxy `locality_memberships.count`), a copy é "Você é dos primeiros aqui."; no resto, é a copy padrão. Ação (Publicar / Criar evento) sempre presente; guia não tem ação direta — sugestões entram pela curadoria do operador, em F | copy em todas as três superfícies geográficas; sem condicional sobre Manaus (decisão 7 do ADR) | a métrica é proxy até `profiles.last_active_at` chegar; spec E2E em árvore, execução pendente de Task 10 | `apps/web/lib/locality-density.ts`, `tests/unit/localities/locality-density.test.ts`, `community/page.tsx`, `events/page.tsx`, `guide/page.tsx`, `tests/e2e/empty-locality.spec.ts` `[V]` | P0 |
| Seletor de audiência | seletor no modal de publicação lista as comunidades aprovadas e Manaus; post ganha `community_id` | escolher vila ou Manaus antes de publicar. É o mecanismo que substitui o feed municipal e satisfaz a regra 2 da §12 | falta ligar o feed municipal ao alcance Manaus e validar visualmente | `feed-post.tsx` `[V]` | E |
| Guia de chegada | rota `/guide` exibe só itens aprovados e filtra por categoria; fila do operador em `/guide-queue` aprova ou rejeita sugestões; parser e adaptador DeepSeek existem, mas a chamada externa fica desligada por governança | referência curada e buscável de Manaus: colégio, hospital, transportadora, despachante. Curadoria nasce das respostas de indicação, com **IA sugere → operador aprova** (D49) | falta fechar a governança LGPD e ligar o gatilho real às respostas da onda F | `guide/page.tsx`, `(admin)/guide-queue/page.tsx`, `lib/guide/ai-curation.ts`, `lib/guide/deepseek.ts`, `20260815181708_arrival_guide.sql`, `20260815210000_arrival_guide_curation.sql`, `supabase/seed.sql` `[V]` | E |
| Composer — foto e enquete | botões Foto/Link/Enquete abrem o compositor com o tipo | upload real de foto | "Foto" pede caminho de texto, não upload de arquivo; enquete e link fecham o ciclo | `feed-composer.tsx:58-86`, `feed-post.tsx:653-661` `[V]` | F |
| Detalhe de grupo | leitura inteira pelo cliente autenticado, com `error` lido em cada consulta e `notFound()` na negação; lista de membros por consulta separada; `service_role` saiu da renderização | igual | E2E reexecutado pendente de seed. **As Server Actions no topo do arquivo continuam com `service_role`** — linha própria abaixo | `groups/[id]/page.tsx` `[V]` | A (código feito) |
| ~~Vazamento da lista de membros~~ | **o achado estava exagerado.** A consulta original usava embed `profiles!inner`, e **não existe FK de `group_memberships` para `profiles`** — as duas referenciam `auth.users` em separado, então o PostgREST nunca resolveu o embed. O código descartava o `error` e renderizava vazio | — | o que vazava era o **metadado** do grupo (nome, visibilidade), não os dez nomes. A lista estava quebrada para todo mundo, inclusive para quem tinha direito. Descoberto pelo E2E ao exigir leitura do `error` | `20260802001000_groups_moderation.sql` (sem FK); `groups/[id]/page.tsx` `[V]` | A (corrigido) |
| Gestão de grupo | entrar, sair, aprovar, transferir posse | fechar cancelamento, rejeição, remoção, exclusão | ciclo do administrador incompleto | `groups/page.tsx:441-496` `[A]` | F |
| **Server Actions de grupo e evento** | seis ações — entrar, sair e transferir posse, em grupo e em evento — fazem `createServiceClient()` e depois `supabase.auth.getUser()` **no mesmo cliente `service_role`** | ler o usuário do cliente autenticado, e só então agir | **não verificado, e há dois desfechos possíveis.** O cliente `service_role` é criado sem cookie e com `persistSession: false`, então `getUser()` provavelmente devolve nulo e as seis ações lançam "unauthenticated" sempre — entrar em grupo estaria quebrado hoje. Se em vez disso ele resolver algum usuário, é escalada de privilégio: `transfer_group_ownership` chamada com `service_role` a partir de formulário. **Medir antes de corrigir** — o teste é escrever um caso que exercite uma das ações com sessão válida e observar o que acontece | `groups/[id]/page.tsx:32,57,78`; `events/[id]/page.tsx:30,49,66` `[V]` estrutura, `[A]` comportamento | F |
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
  se a entrada da vila é por link aberto ou por lotes.
- E2E (Playwright) rodou pela primeira vez em 2026-08-16: suíte completa com seed e Chrome
  do sistema; a execução serial (`--workers=1`) passou por inteiro, incluindo os specs de
  admissão de 15/08 (manaus-pilot-denials, manaus-pilot-full-journey, onboarding-denials,
  onboarding-holder-family). Na execução paralela local (3 viewports, workers default), 11
  testes estouram os timeouts default (5s/30s) por carga da máquina — os mesmos passam em
  série, então o registro é de capacidade local, não de código; o CI em ubuntu é a fonte da
  execução paralela completa. O lote não cobre: callback real via magic link/Google OAuth
  (mailpit local não responde — specs injetam a sessão via password grant), Portal real
  (nunca chamado por design) e decisão manual do operador na fila de admissões.
