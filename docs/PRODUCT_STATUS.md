# Estado implementado — Bivaque Community

> **O que o produto faz hoje.** Este documento descreve o código que existe, não o produto
> que foi decidido. Para visão, decisões e roadmap, ver [`BIVAQUE.md`](BIVAQUE.md).
>
> Substitui [`docs/journeys/MAP.md`](journeys/MAP.md), que misturava estado e intenção e,
> por isso, marcava como "Corrigida" linha cujo ciclo de usuário não fechava.
>
> Última reconciliação: **2026-08-14**. Atualizar ao fim de cada onda.

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

---

## 1. Entrada e admissão

| Superfície | Estado atual | Estado-alvo | Lacuna | Evidência | Onda |
|---|---|---|---|---|---|
| Login | E-mail com magic link e Google, sem affordances de senha | igual | — | `login/components/bivaque-sign-in.tsx` `[V]` | B |
| Callback | `next` validado como caminho interno antes do redirect | igual | — falta só o E2E, que nunca rodou | `auth/callback/route.ts`, `lib/security/sanitize-next.ts` `[V]` | A (código feito) |
| Falha de callback | JSON 400/401 com mensagem do provedor | tela humana com recomeço | sad path principal termina fora do produto | `auth/callback/route.ts:18-26,45-49` `[A]` | D |
| Gate do shell | middleware checa sessão + cookie de consentimento | derivar do estado real de verificação | `pending`, `rejected` e `temporary_error` entram no shell e veem compositor e "Publicar" | `middleware.ts:79-103`, `(shell)/layout.tsx:9-14` `[A]` | D |
| Verificação de CPF | caminho único: Portal, síncrono, aborta em 10s | dual-path: Portal + upload auditado | sem máscara, sem validação de dígito; string vazia vira `rejected` | `onboarding/page.tsx:348-365`, `api/onboarding/route.ts:57-64`, `lib/portal/classify.ts:115-121` `[A]` | D |
| Upload de documento | **não existe** | caminho de exceção auditado, TTL curto | não há bucket, rota nem decisão manual | — | D |
| `pending` | nenhum produtor: timeout vira `temporary_error` | timeout e instabilidade produzem `pending` | o contrato promete 48h úteis e nada gera o estado | `lib/portal/client.ts:34-40`, `lib/portal/classify.ts:115-146` `[A]` | D |
| Tela de status | lê `?state=` da URL; não chama o endpoint que existe | derivar do servidor e reconciliar | qualquer conta troca o próprio status editando o endereço | `onboarding/status/page.tsx:11-44`; endpoint em `api/onboarding/status/route.ts:34-92` `[A]` | D |
| Recurso de rejeição | **não existe** | retentativa limitada + caso na fila de admissões | rejeição é beco sem saída | `onboarding/status/page.tsx:86-97` `[A]` | D |
| CPF no cliente | guardado em `sessionStorage` | não guardar | contradiz a promessa de `/consent` | `onboarding/page.tsx:93-95` `[A]`; copy em `consent/page.tsx:47-49` | **A** |
| Welcome | rota pública; não autentica nem checa membership | gatear por membership real | qualquer visitante lê "Você foi verificado" | `onboarding/welcome/page.tsx:1-46`, `middleware.ts:5-14` `[A]` | D |
| Waitlist | grava `email` + `PILOT_LOCALITY_ID` (Manaus) | coletar a localidade desejada | é fila "para outras localidades" e grava Manaus; copy promete contato sem canal | `onboarding/page.tsx:283-287`, `lib/locality.ts:1-14` `[A]` | D |
| Consentimento | cookie de gate | aceite versionado, com código de conduta | `profiles.consent_version` e `consented_at` existem e não são usados como trilha | `consent/page.tsx:16-23` `[A]` | D |

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
| Camada de comunidade | **banco completo, zero tela.** Tabelas, RLS, `feed_community`, `feed_group` e 8 RPCs | vila como subcomunidade, com entrada, feed, moderação | o app nunca chama `feed_community`; nenhuma rota `commun*` existe | `20260805211933`, `20260805214709`, `20260805215020`, `20260805215419`; grep 0 em `apps/web` `[V]` | E |
| Fila de aprovação | **não existe** | lista em lote, com afiliação visível e delegação | sem ela a vila não chega inteira | — | E |
| Feed municipal | `feed_posts(PILOT_LOCALITY_ID)` é a home hoje | **deixa de ser sala** (D48): vira alcance de post. A home passa a ser o feed da vila | é o inverso do que existe — hoje o município é a home e a vila não existe na UI | `(shell)/community/page.tsx:55-58` `[V]` | E |
| Seletor de audiência | **não existe** | escolher vila ou Manaus antes de publicar. É o mecanismo que substitui o feed municipal e satisfaz a regra 2 da §12 | sem ele o membro não sabe para quem publica, e o nível Manaus não tem como existir | — | E |
| Guia de chegada | **não existe** | referência curada e buscável de Manaus: colégio, hospital, transportadora, despachante | é o que o feed municipal não consegue ser — permanente em vez de rolante | — | E |
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
| Pedir indicação | insere e responde "Pedido publicado!" | listagem, detalhe e resposta visível | **`recommendation_replies` existe no banco e o app nunca lê nem escreve** | `20260802001100_recommendations.sql:55`; grep 0 em `apps/web` `[V]` | F |
| Controle do autor | RLS permite editar e excluir; não há tela | autor encontra, edita e exclui | quem publicou algo pessoal não consegue interromper a exposição | `20260802001100:157-170` `[A]` | F |
| Escopo do pedido | formulário sempre envia `group_id: null`; copy diz "localidade ou grupo" | escopo escolhido, com Saúde começando em grupo | pedido de saúde vai para Manaus inteira amarrado ao autor | `recommendations/page.tsx:315-322` `[A]` | F |
| `group_id` | sem foreign key; insert não checa membership | FK e checagem na mesma migration que expuser o escopo | UUID arbitrário aceito; ninguém do grupo consegue ler | `20260802001100:22-35,128-155` `[A]` | F |
| Salvas | recupera saves; não há botão de salvar nem destino | salvar de verdade, com destino | a UI não consegue criar o que a aba lê | `recommendations/page.tsx:344-413` `[A]` | F |

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

Nenhuma linha desta seção existe hoje. Todas entram na onda D1, que não entrega tela e
destrava quase todo o resto.

| Superfície | Estado atual | Estado-alvo | Lacuna | Onda |
|---|---|---|---|---|
| E-mail transacional | **não existe** | Resend, domínio verificado com DKIM e SPF | **bloqueio externo:** exige conta e registro de DNS | D1 |
| Canal WhatsApp | **não existe** | não-oficial com número descartável, adaptador no `outbox` (§7.8 do BIVAQUE) | **bloqueio externo:** exige chip dedicado | D1 |
| Rate limit | **não existe** | Upstash com os quatro limites: CPF por hora, cota de convite, leitura de perfil, throttle global do Portal | quatro decisões dependem dele | D1 |
| Circuit breaker do Portal | **não existe** | no Upstash: em 429, parar e mandar todos para `pending` | sem ele, um retry em laço suspende o token por 8h no meio do lançamento | D1 |
| Agendador | **não existe** | pg_cron; confirmar `pg_net` para a reconciliação de `pending` | reconciliação, expiração de TTL e lembrete dependem dele | D1 |
| Fila de saída | **não existe** | tabela `outbox` com estado + worker no pg_cron; verifica preferência e opt-out antes de enviar | é onde canal, retentativa e rastro vivem | D1 |
| Rastreamento de erro | só log da Vercel | Sentry com filtro de PII antes do envio | erro intermitente hoje é invisível | D1 |
| Métrica de produto | **não existe** | PostHog | sai dado comportamental para terceiro: exige base legal declarada | H |
| Cobrança | **não existe** | Asaas, checkout hospedado, webhook liga a flag | **bloqueio externo:** exige CNPJ | G |
| Deploy de banco | manual, não documentado | GitHub Action no merge, credencial como secret do CI | hoje a credencial de produção vive no laptop — Task 8 do plano de observabilidade | D1 |
| Staging | **não existe e não vai existir** | — | risco aceito (D42): erro de migração sobre dado real chega direto à produção | — |

---

## Guarda-rails estruturais já ativos

Estes rodam em milissegundos em `npx pnpm@11.18.0 test:scope` e falham antes do pgTAP:

- nenhuma policy consulta a relação que ela protege (recursão);
- nenhuma policy referencia relação criada em migration posterior;
- toda função chamada de dentro de policy é `security definer` — hoje 13 de 13.

Ver [`tests/scope/rls-structure.test.mjs`](../tests/scope/rls-structure.test.mjs). Os dois
primeiros padrões vieram de bugs que o projeto-mãe teve em produção; nenhum foi herdado
aqui.

## O que não foi verificado

- A suíte pgTAP não rodou nesta sessão — o Docker estava parado. As linhas `[A]` que citam
  migration descrevem o texto do SQL, não o comportamento do banco.
- O limite de taxa da API do Portal da Transparência sob rajada não foi medido. Isso decide
  se a entrada da vila é por link aberto ou por lotes.
