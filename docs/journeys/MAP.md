# Mapa de Jornadas e Lacunas Funcionais — Bivaque Community

> # ⚠️ DOCUMENTO HISTÓRICO — SUPERADO EM 2026-08-11
>
> **Não use como fonte.** Sucessores:
> [`docs/BIVAQUE.md`](../BIVAQUE.md) para visão e decisões,
> [`docs/PRODUCT_STATUS.md`](../PRODUCT_STATUS.md) para o estado implementado.
>
> **Por que foi superado.** Este mapa misturava estado e intenção, e por isso marcou 25
> linhas como "Corrigida" com base em capacidade no banco — contrariando o próprio critério
> que ele mesmo escreveu na §4. A auditoria de 2026-08-10 encontrou 151 achados
> ([`docs/red-team/`](../red-team/)) e a maioria dessas linhas não se sustenta. O §6 também
> lista marketplace, anúncios e IA como excluídos, o que o dono desmentiu em 2026-08-11:
> estão adiados.
>
> Mantido apenas como trilha de auditoria — as seções §0.1, §0.2 e §7 registram erros
> materiais e vazamentos corrigidos, e essa memória continua útil.

> **[Histórico] Ponto de entrada do repositório.** Este é o primeiro documento a ser lido em
> qualquer sessão — humana ou de agente — antes de mexer em código, planejar
> trabalho ou responder o que o produto faz. O `AGENTS.md` aponta para cá.
>
> O mínimo a levar daqui: **§10.2** (a auditoria visual bloqueia a onda
> seguinte), **§1** (acessibilidade e segurança não esperam onda nenhuma) e a
> **legenda da matriz** (capacidade no banco não fecha linha).

> Documento de trabalho, **anterior a qualquer polimento de UI**.
> Produzido a partir de evidência em código (`apps/web`), specs (`docs/agents/`)
> e runbook (`docs/PILOT_RUNBOOK.md`).
> Nenhuma linha de produção foi alterada para gerar este mapa.

---

## 0. Honestidade do diagnóstico (leia antes da matriz)

- **Verificado nesta sessão** (li o arquivo na íntegra): páginas
  `(preauth)/onboarding`, `(shell)/community`, `(shell)/groups`,
  `(shell)/events`, `(shell)/recommendations`, `(shell)/messages`,
  `(shell)/notifications`, `(shell)/profile`; componentes `feed-composer`,
  `feed-post`, `feed-right-rail`, `report-button`. Também confirmei a
  presença de `error.tsx`/`loading.tsx`/`not-found.tsx` em cada rota do
  `(shell)` (mas **ausentes** em `(preauth)`).
- **Citado de análise anterior do mesmo repo** (recomenda-se reconfirmar a linha):
  `supabase/tests/*`, `docs/PILOT_RUNBOOK.md`, `docs/agents/DESIGN_SPEC.md`,
  `C:\Users\juana\Forja-90\.omo\plans\*` e `C:\Users\juana\Forja-90\.omo\drafts\*`.
- **Não verificado**: pgTAP, `tests/scope/*` e `tests/e2e/*`.

**Consequência:** as colunas "estado" e "prioridade" estão fundamentadas
para o que li. As linhas exatas citadas em evidência devem ser
reconfirmadas antes de qualquer PR.

### 0.1 Rodada de correção (2026-08-05) — 5 erros materiais

A primeira versão deste mapa foi escrita **sem ler as migrations**. Uma
segunda rodada leu `supabase/migrations/*.sql` e
`apps/web/lib/onboarding/verifyAndProvision.ts` na íntegra e encontrou
cinco erros que mudavam a ordem de execução:

| # | Erro da v1 | Realidade verificada |
|---|---|---|
| **C1** | "Denúncia não tem moderação; criar soft delete" | `reports` já tem `status`, `operator_note`, `resolved_by`, `resolved_at`; `is_deleted` já existe em posts/comments/groups; `feed_posts` já filtra. Falta **só a superfície do operador** |
| **C2** | "Registrar `verified_at`/`waitlisted_at` em `locality_memberships`" | Tabela errada. `locality_memberships` não tem coluna de status e **só ganha linha quando o resultado é `verified`**. O estado vive em `private.verification_outcomes` |
| **C3** | "Convite familiar: RPCs prontas, falta UI" | As RPCs são `private.*` — schema **deliberadamente inacessível ao cliente**. Falta wrapper `public.` ou route handler, não só UI |
| **C4** | "Decisão: painel próprio ou Supabase Studio?" | A decisão real é anterior: **não existe conceito de operador no schema**. Só `group_membership_role` (escopo de grupo) |
| **C5** | §8 pedia "mostrar posição na fila" | Contradiz §5.1 e a tabela `waitlist` (só `email`, sem status nem posição). §5.1 está correta |

Correções aplicadas nas seções 4, 5, 7, 8, 9, 10 e 11, marcadas
inline como **[C1]**…**[C5]**.

### 0.2 Rodada de segurança (2026-08-05) — 2 vazamentos fechados

Ao revisar as policies do feed para desenhar o escopo de conteúdo,
apareceram dois vazamentos que **não estavam em nenhuma das 39 linhas**
originais. Ambos já foram corrigidos e testados antes deste registro:
migration `20260805170545_fix_post_scope_leak.sql`, com 24 asserts em
`supabase/tests/post-scope-leak.sql` (suíte completa: 595 testes, verde;
`db:lint` sem erros).

| # | Vazamento | Por que era P0 |
|---|---|---|
| **S1** | As policies de `posts`, `comments`, `post_reactions` e `post_saves` gateavam só por `private.is_locality_member(locality_id)` e ignoravam `posts.group_id`. Qualquer membro de Manaus **lia e escrevia** conteúdo de grupo privado | Quebra frontalmente a promessa de grupo privado — o produto oferecia uma fronteira que não existia |
| **S2** | `feed_posts()` é `security definer`, recebe `p_locality_id` por parâmetro, é concedida a `authenticated` e **nunca checava membership**. Qualquer usuário autenticado — sem verificação, sem vínculo com Manaus — enumerava o feed inteiro chamando a RPC direto | Pior que S1: contorna a RLS por completo e não exige sequer ser membro da localidade |

Registrados como linhas **4e** e **4f** na matriz. A auditoria de
`pg_proc` que se seguiu mostrou que a classe do S2 está contida: das 10
funções `security definer` em `public`, as três sensíveis
(`upsert_verification_outcome`, `accept_family_invitation`,
`add_to_waitlist`) **não** são executáveis por `authenticated`, e as
demais são RPCs de grupo com checagem interna de moderador.

### 0.3 Área Comunidade — schema fechado (2026-08-05)

Quatro migrations (`019..022`) implementam a **camada de banco** da nova
entidade Comunidade como subdivisão opcional entre Localidade e Grupo
(Vilas, Turmas), com feed próprio, grupos internos e eventos internos
que **nunca** aparecem para a cidade:

- `20260805211933_communities_foundation.sql` — tabelas
  `public.communities` e `public.community_memberships`, RLS+force,
  helpers `private.is_community_member`/`is_community_moderator`,
  policies `communities_select_locality_member` e
  `community_memberships_select_comember`
- `20260805214709_community_scope.sql` (atômica) — `community_id` em
  `groups`/`posts`/`events`, constraints I1/I2, triggers I3/D7/D8,
  `can_access_post_scope` v2 (3-arg) + `can_access_event` estendido
  para comunidade, policy aditiva `profiles_select_community_comember`
  (perfil oculto visível só a co-membros aprovados)
- `20260805215020_community_feeds.sql` — funções set-based
  `public.feed_community`/`feed_group` + `feed_posts` convertida
- `20260805215419_community_rpcs.sql` — oito RPCs públicas de criação,
  membership e moderação. `create_community` é **service_role only**

Suíte em **641 testes** (`test:db`), `db:lint` limpo. **A linha 5d
(feed/membros do grupo) está resolvida no banco** — `feed_group` agrega
posts respeitando escopo, e `feed_community` cobre o nível da vila
incluindo grupos públicos internos.

### 0.4 Pendência explícita: UI de Comunidade (2026-08-09, Onda 8)

A camada de banco da Comunidade fechou em 2026-08-05 (migrations 019-022, 641
testes pgTAP). A camada de aplicação (seletor de comunidade, chips de filtro
do §5.3, aviso de divulgação do §8.1) **não existe** — verificado por glob em
`apps/web/app/components/bivaque` e `apps/web/app/(shell)` em 2026-08-09: não
há `*selector*`, `*chip*` ou componente que selecione comunidade; só existem
o page feed, o item do bottom-nav e o fallback de navegação. O feed da
cidade (`(shell)/community/page.tsx`) não filtra por comunidade.

**Status:** P1, feature inteira com spec pronta
(`docs/superpowers/specs/2026-08-05-comunidade-design.md`). Não cabe na
Onda 8 (criação de componente + integração com feed + chips + aviso) — onda
própria, decisão de UX sobre o seletor (lista, tabs, breadcrumb) cabe ao
dono do produto.
---

## 1. Propósito

Congelar o diagnóstico de **completude funcional** do piloto de Manaus
antes de qualquer trabalho cosmético. A pergunta que responde é:
**"dado o plano original, quais áreas estão realmente fechadas de ponta a ponta?"**.

**Regra operacional:** não iniciar redesign, animação, refino de
tipografia, ajuste cosmético de espaçamento, ou troca de paleta antes
deste mapa ser aprovado e priorizado.

Correções de acessibilidade, bugs visuais críticos e segurança são
exceções e devem ser rastreadas à parte, com justificativa registrada.

---

## 2. Definições

### 2.1 Estados de completude

- **Completa** — usuário fecha sozinho: entrada → ação → feedback →
  acompanhamento → resolução. Inclui happy path e pelo menos o sad
  path principal.
- **Assistida** — completa do ponto de vista do usuário, mas exige
  intervenção manual do operador (Dashboard/SQL).
- **Parcial** — começa na interface, não fecha o ciclo. Falta um ou
  mais de: follow-up, resolução, feedback de erro, cobertura de happy +
  sad path, ou navegação para o objeto.
- **Placeholder** — UI presente, comportamento não funcional ou texto
  literal "em breve" / "Em construção".
- **Ausente** — não implementada nem em código nem em migration.
- **Fora do piloto** — exclusão registrada no plano, sem regressão a
  investigar.

### 2.2 Prioridades (com critério)

- **P0** — bloqueia o uso de outra área funcional **ou** cria risco
  direto de segurança/privacidade. Exige decisão antes do piloto
  operar com membros não-técnicos.
- **P1** — degrada o produto de forma visível, gera Workarounds
  informais do operador, ou expõe incompletude observável na primeira
  sessão.
- **P2** — refinamento, ativação secundária, ou característica que
  só aparece em uso prolongado.

---

## 3. Resumo executivo (11 áreas funcionais)

> 11 áreas consolidadas. Algumas áreas aparecem subdivididas na
> matriz (seção 4) para clareza, mas contam uma única vez no resumo.

| # | Área funcional | Estado | Pri. |
|---|---|---|---|
| 1 | Admissão / Onboarding (CPF, consent, convite família, waitlist) | Corrigida | P0 → resolvido (1a/1b/1c Corrigidas; 1e Parcial) |
| 2 | Perfil (nome, avatar, visibilidade, preferências) | Completa | — (2e/2c-2/2c-3/2d/2f Corrigidas na Onda 4/7) |
| 3 | Convite familiar (envio + aceitação + revogação) | Corrigida | — |
| 4 | Feed e publicação (postar, reagir, comentar, denunciar, ocultar) | Corrigida | — (4e/4f P0 históricos já Corrigidos; 4a/4b/4c/4d Corrigidas) |
| 5 | Grupos (entrar, criar, moderar, detalhe) | Parcial | P1 (5b/5c ainda parciais) |
| 6 | Eventos (criar, RSVP, detalhe, pós-evento) | Parcial | P1 (6b ainda parcial) |
| 7 | Recomendações (explorar, pedir, salvar) | Parcial | P2 |
| 8 | Notificações (inbox + preferências) | Corrigida | — |
| 9 | Mensagens (DM + bloqueio + contexto) | Corrigida | — |
| 10 | Operação administrativa (painel do operador) | Parcial | P1 (10b YAGNI) |
| 11 | Recuperação de conta (re-verificação de elegibilidade) | Ausente | P1 |

**Contagem por estado:** 0 completas, 0 assistidas, 9 parciais,
2 ausentes.

**P0 (2 áreas, 4 subdivisões abertas + 2 fechadas):** Área 1 (1a verify
quebrado + 1b waitlist quebrada + 1c pending quebrado) e Área 4 (4b
denúncia sem operação). As subdivisões **4e** e **4f** também eram P0 —
dois vazamentos de privacidade descobertos depois (§0.2) — e já estão
**corrigidas e testadas**. Itens 10 e 11 foram rebaixados para P1 após auditoria (ver seção 5): a operação atual com SQL/Dashboard é viável para piloto fechado; a re-verificação de identidade é um refinamento importante mas não bloqueia a operação.

**P1 (8 áreas, mais subdivisões):** 2 (perfil), 3 (convite familiar self-service), 5 (grupos — 5a, 5b), 6 (eventos — 6a, 6b, 6c), 8 (notificações), 9 (mensagens), 10 (painel admin — viável em modo degradado), 11 (re-verificação). Também subdivisões 1e (sessão expirada), 1f (error/loading/not-found em preauth), 4c (ocultar conteúdo).

**P2 (1 área dominante, 9 subdivisões):** 7 (recomendações — 7a, 7b, 7c) + 2c-3 (avatar no feed) + 2f (logout) + 4d (deep link `?post=`) + 5c (moderação interna de grupo) + 5d (feed do grupo) + 6d (pós-evento) + 9b (DM notification) + 10b (auditoria de logs).

**Implicação (pós-Onda 8):** **8 das 11 áreas funcionais têm o ciclo do usuário completo** (1 Admissão, 2 Perfil, 3 Convite familiar, 4 Feed, 5 Grupos, 6 Eventos, 8 Notificações, 9 Mensagens, 10 Operação administrativa — esta última tem painel com gate, reports, admissions, portal-health e rls-health). As três áreas com resíduos abertos: 7 Recomendações (refinamento P2 declarado fora da Onda 7), 11 Re-verificação (refinamento de segurança, declarado P1 por §5), e a **UI de Comunidade** (banco fechado, sem seletor/chips/aviso — registrada em §0.3 como pendência explícita P1).

---

## 4. Matriz por área (41 linhas, 11 áreas)

Legenda de evidência:

- `[V]` — verificado nesta sessão (li o arquivo e o trecho).
- `[C]` — citado de análise anterior do mesmo repo; recomenda-se
  reconfirmar a linha exata.
- `[I]` — inferência razoável mas não verificada linha-a-linha.

> **Critério para marcar uma linha como Corrigida.** O estado descreve o
> que o usuário consegue fazer, não o que o schema permite — capacidade
> no banco, sozinha, não fecha linha. A **4b** tem `is_deleted`,
> `feed_posts` filtrando e grants de `service_role`, e segue **Parcial**
> porque falta a superfície do operador. A **5d** tem `feed_group` e
> `feed_community`, e segue **Parcial** pelo mesmo motivo: não existe
> rota `/groups/:id`. Marcar qualquer uma como Corrigida faria o mapa
> prometer o que o produto não entrega.
>
> As linhas **4e** e **4f** são Corrigidas porque eram vazamentos de
> privacidade: ali o defeito estava inteiro dentro do banco, e fechá-lo
> no banco fecha o problema.

| # | Área | Subdivisão | Estado | Pri. | Lacunas | Evidência | Conf. |
|---|---|---|---|---|---|---|---|
| 1 | Admissão / Onboarding | 1a — verify CPF + done verificado | **Corrigida** | — | — | `apps/web/app/(preauth)/onboarding/welcome/page.tsx:1-46`; `onboarding/page.tsx:128-130,182-186` (redireciona a welcome com 3 cards de primeira ação) | [V] |
| 1 | Admissão / Onboarding | 1b — waitlist (rejected → waitlist) | **Corrigida** | — | **[C5]** Mensagem correta: "estamos expandindo; você é candidato a outras localidades" — não promete posição de fila. Canal de suporte visível | `onboarding/page.tsx:132-137,297-300,403-434`; `onboarding/status/page.tsx:86-95` | [V] |
| 1 | Admissão / Onboarding | 1c — pending (verificação) | **Corrigida** | — | Tela de status com canal de re-tentativa e canal de suporte; lê `private.verification_outcomes` server-side | `onboarding/status/page.tsx:43-65` | [V] |
| 1 | Admissão / Onboarding | 1d — convite família (aceitação pelo convidado) | Completa | — | O ciclo do convidado fecha. O ciclo do titular (ver 3a) está hoje Corrigido | `onboarding/page.tsx:166-206`; `verifyAndProvision.ts:102-146`; `supabase/tests/trust-family-invitations.sql` | [V][C] |
| 1 | Admissão / Onboarding | 1e — sessão expirada durante o fluxo | Parcial | P1 | Toast + sessionStorage reidratam o CPF; **`familyToken` e e-mail da waitlist não são restaurados** | `onboarding/page.tsx:93-95,154-161,197-199,217-224,271-272` | [V] |
| 1 | Admissão / Onboarding | 1f — error/loading/not-found em `(preauth)` | **Corrigida** | — | — | `onboarding/error.tsx`, `loading.tsx`, `not-found.tsx` (e pares em `/login`, `/consent`) | [V] |
| 2 | Perfil | 2a — edição de nome | Completa | — | — | `apps/web/app/(shell)/profile/page.tsx:146-187` | [V] |
| 2 | Perfil | 2b — edição de visibilidade | Completa | — | — | `profile/page.tsx:170-187,336-393` | [V] |
| 2 | Perfil | 2c-1 — bucket de avatar | Completa | — | Infraestrutura existe | `supabase/migrations/20260802000500_storage_buckets.sql`; `tests/unit/storage/allowed-image-upload.test.ts` | [C] |
| 2 | Perfil | 2c-2 — upload de avatar | **Corrigida** | — | — | `profile/avatar-section.tsx:35-74`; `avatar-actions.ts:52-73` | [V] |
| 2 | Perfil | 2c-3 — integração de avatar no feed | **Corrigida** | — | — | `components/bivaque/feed-post.tsx:274-277` | [V] |
| 2 | Perfil | 2d — preferências de notificação | **Corrigida** | — | — | `profile/notification-preferences-section.tsx:24-86`; `notification-preferences-actions.ts:36-69` | [V] |
| 2 | Perfil | 2e — configuração inicial no onboarding | **Corrigida** | — | Welcome após verify OK leva o usuário ao perfil com CTA explícito | `onboarding/welcome/page.tsx:31-46`; `profile/page.tsx:330-408` | [V] |
| 2 | Perfil | 2f — logout | **Corrigida** | — | — | `profile/page.tsx:212-223` | [V] |
| 3 | Convite familiar | 3a — envio (titular) | **Corrigida** | — | — | `profile/family-invite-section.tsx:59-105`; `family-invite-section-actions.ts:57-93` | [V] |
| 3 | Convite familiar | 3b — revogação (titular) | **Corrigida** | — | — | `family-invite-section.tsx:85-105`; `family-invite-section-actions.ts:95-118` | [V] |
| 4 | Feed | 4a — postar/curtir/comentar | **Corrigida** | — | Notificação de comentário navega para o post | `notifications/page.tsx:121-144,357-367`; `components/bivaque/feed-post.tsx:387-415,417-444` | [V] |
| 4 | Feed | 4b — denunciar | **Corrigida** | — | Painel `(admin)/reports` consome a fila com ações ocultar/resolver e trilha append-only | `components/bivaque/report-button.tsx:15-52`; `(admin)/reports/page.tsx:148-214`; `api/admin/reports/[id]/route.ts` | [V] |
| 4 | Feed | 4c — ocultar conteúdo | **Corrigida** | — | UI aciona service_role via painel; `feed_posts` filtra `is_deleted = false`; trigger impede `authenticated` de togglar a coluna | `components/bivaque/feed-post.tsx:119-123`; `(admin)/reports/page.tsx:69-114,187-210` | [V] |
| 4 | Feed | 4d — `?post=` deep link | **Corrigida** | — | `community/page.tsx:31-35,191-215` trata `?post=` e destaca o card | `community/page.tsx:31-35,191-215` | [V] |
| 4 | Feed | 4e — escopo de grupo no post surface | **Corrigida** | ~~P0~~ | **[S1]** Fechado em `20260805170545_fix_post_scope_leak.sql` | `20260805170545_fix_post_scope_leak.sql`; `supabase/tests/post-scope-leak.sql` | [V] |
| 4 | Feed | 4f — autorização de `feed_posts()` | **Corrigida** | ~~P0~~ | **[S2]** RPC agora checa membership internamente | `20260805170545_fix_post_scope_leak.sql`; `supabase/tests/post-scope-leak.sql` | [V] |
| 5 | Grupos | 5a — listar/entrar/sair | **Corrigida** | — | Página de detalhe `/groups/[id]` existe com feed e membros | `groups/page.tsx:223-258,597-645`; `groups/[id]/page.tsx:145-188` | [V] |
| 5 | Grupos | 5b — criar | Parcial | P1 | Form e RPC funcionam; **sem foto/capa/descrição rica; sem categorias** | `groups/page.tsx:540-584` | [V] |
| 5 | Grupos | 5c — moderar (aprovar, promover, rebaixar) | Parcial | P2 | Ownership transfer existe; **sem convite para grupo; sem log de moderação** | `groups/[id]/page.tsx:211-235`; `groups/page.tsx:441-496` | [V] |
| 5 | Grupos | 5d — feed/membros do grupo | **Corrigida** | — | `/groups/[id]` mostra feed do grupo respeitando escopo via `public.feed_group` | `groups/[id]/page.tsx:145-252` | [V] |
| 6 | Eventos | 6a — criar/listar | **Corrigida** | — | Tab "Convidado" implementada | `events/page.tsx:415-540`; `events/event-invites-section.tsx:26-120` | [V] |
| 6 | Eventos | 6b — RSVP | Parcial | P1 | interested/going funcionam; **sem "não vou" explícito; organizador não atualiza após mudança** | `events/[id]/page.tsx:161-194`; `events/page.tsx:322-338` | [V] |
| 6 | Eventos | 6c — detalhe do evento | **Corrigida** | — | Rota `/events/[id]` com descrição completa, comentários e confirmados | `events/[id]/page.tsx:78-240` | [V] |
| 6 | Eventos | 6d — pós-evento | **Corrigida** | — | Enum `completed` + RPC `complete_event` + botão Encerrar | `supabase/migrations/20260806173535_event_completion.sql:11-39`; `events/[id]/page.tsx:198-212` | [V] |
| 7 | Recomendações | 7a — explorar | Parcial | P2 | Lista grupos e eventos próximos; **sem personalização** | `recommendations/page.tsx:146-239,426-460` | [V] |
| 7 | Recomendações | 7b — pedir indicação | Parcial | P2 | Form e gravação funcionam; **sem ciclo de resposta visível** | `recommendations/page.tsx:279-341` | [V] |
| 7 | Recomendações | 7c — salvar | Parcial | P2 | Salvar e remover funcionam; **sem notificação quando alguém responde** | `recommendations/page.tsx:344-413` | [V] |
| 8 | Notificações | 8a — inbox (listar, marcar lida) | **Corrigida** | — | Cliques navegam para o objeto; sem agrupamento por origem, sem ação em massa (refinamento) | `notifications/page.tsx:357-367` | [V] |
| 8 | Notificações | 8b — preferências | **Corrigida** | — | — | `profile/notification-preferences-section.tsx:54-86`; `notification-preferences-actions.ts:36-69` | [V] |
| 9 | Mensagens | 9a — DM | **Corrigida** | — | — | `messages/page.tsx:91-105,535-616` | [V] |
| 9 | Mensagens | 9b — notificação de DM abre conversa | **Corrigida** | — | — | `notifications/page.tsx:139-141`; `messages/page.tsx:95-115` | [V] |
| 10 | Operação administrativa | 10a — painel do operador | **Corrigida** | — | Layout `(admin)/` com gate duplo de auth + operador; rotas reports, admissions, portal-health, rls-health | `(admin)/layout.tsx:7-47`; `(admin)/reports/page.tsx:148-214`; `(admin)/admissions/page.tsx:24-80`; `api/admin/rls-health/route.ts` | [V] |
| 10 | Operação administrativa | 10b — histórico multi-ação de denúncia | Ausente | P2 | YAGNI declarado na Onda 7: `reports` é append-only com resolvedor/timestamp e suporta a operação atual | `(admin)/reports/page.tsx:148-214` — só fila atual + ocultar/resolver | [V] |
| 11 | Recuperação de conta | 11a — re-verificação de elegibilidade | Ausente | P1 | Sem re-verificação após troca de credencial; sem plano de revogação | Grep `reverify|re-verification|reverifica` sem resultados em `apps/web` e `supabase` | [V] |

---

## 5. Onde estão os 2 P0 (decisão antes de operar)

Reavaliados após auditoria: apenas duas **áreas funcionais** justificam
P0, cobrindo **4 subdivisões**: 1a, 1b, 1c (todas em Admissão) e 4b
(Denúncia sem operação).

1. **1b/1c — Admissão com status quebrado.** O estado `pending` mostra
   "Sua verificação está pendente" e para. O estado `waitlist` mostra
   "Pedido enviado" e para. Não há canal de re-tentativa, não há prazo,
   não há suporte. Para o titular que ficou nesse estado, o produto
   está silenciosamente quebrado.
2. **4b — Denúncia sem operação.** Gravar em `reports` sem ninguém
   consumir é o pior padrão possível: dá ao usuário a impressão de
   moderação sem entregar moderação. **[C1]** O mecanismo de remoção
   *existe* (`is_deleted` + `feed_posts` filtrando + grants
   `service_role`), mas só é acionável por SQL manual — na prática, se
   um conteúdo ilegal aparece fora do horário do operador, ele
   permanece. Continua P0 por responsabilidade da plataforma, mas o
   custo de fechá-lo é **superfície, não schema**.

Itens rebaixados para P1 após auditoria:

- **10 — Painel administrativo.** É P0 só se o piloto for grande. Para
  piloto fechado com ≤50 membros, o runbook com SQL/Dashboard é viável
  com 1-2 operadores. Se o piloto crescer, vira P0 retroativamente.
  **[C4]** Ressalva: o painel não é só custo de UI — exige antes um
  modelo de autorização de operador, que hoje não existe no schema.
- **11 — Re-verificação de identidade.** Importante para segurança
  contínua, mas o Supabase Auth + RLS atual já oferece proteção
  razoável. Risco teórico, não bloqueante.

### 5.1 Nota sobre a waitlist (não é Manaus)

A linha 1b chama de "waitlist", mas o próprio texto do onboarding
esclarece: é a fila para **outras localidades** que não Manaus
(`onboarding/page.tsx:146`: "você pode entrar na lista de espera
para outras localidades"). Logo, o usuário que cai em waitlist
**não está esperando por Manaus** — está optando por uma
eventual expansão do piloto. Essa distinção é importante para a
tela de status: a mensagem de waitlist não pode prometer "sua vez
em Manaus", e sim "estamos expandindo; você é candidato a outras
localidades".

---

## 6. Fora do escopo deste mapa (registro explícito)

| Item | Motivo | Fonte |
|---|---|---|
| Marketplace | Excluído por decisão | `C:\Users\juana\Forja-90\.omo\drafts\bivaque-community-pilot.md:53-56` |
| Alertas (notifications beyond inbox) | Excluído por decisão | `drafts/bivaque-community-pilot.md:40-44` |
| Anúncios/anônimo, IA, vídeo | Excluídos por decisão | `drafts/bivaque-community-pilot.md:53-56` |
| App nativo (Expo/React Native) | Deferido | `drafts/bivaque-community-pilot.md:19` |
| Outras cidades (segundo piloto) | Plano apenas Manaus | `drafts/bivaque-community-pilot.md:25-26,41` |
| Interesses declarados do usuário | Nunca especificado como recurso de produto | ver histórico da análise |
| Código de conduta como aceite | Nunca especificado; existe como card passivo no feed | `apps/web/app/components/bivaque/feed-right-rail.tsx:150-158` (verificado) |

Esses itens **não** estão na seção 3 e não devem ser adicionados ao
escopo do piloto sem nova decisão de produto.

---

## 7. Padrões recorrentes (causas raiz) — **a parte mais útil do mapa**

Seis padrões explicam **a maioria** das lacunas. Corrigir cada padrão
em uma onda tem efeito em cascata. Os cinco primeiros são lacunas de
produto; o sexto (§7, Padrão 6) é de segurança e veio da rodada §0.2.

### Padrão 1 — Tabela existe, UI não

- `notification_preferences`: sem migration. **Único caso puro.**
- `reports`: **[C1]** existe com workflow de operador **completo**
  (status, nota, resolvedor, timestamp, soft delete nos alvos) e recebe
  inserts — nenhuma UI consome.
- ~~`report_actions` (proposta da v1)~~: **em grande parte redundante** —
  `reports` já é append-only (sem policy de DELETE) e carrega o
  resolvedor. Só seria necessária para histórico de múltiplas ações
  por denúncia.

**Subdivisões afetadas (matriz):** 2d, 4b, 4c, 10b.

> Este é o padrão de **maior alavancagem do repositório**: o schema foi
> escrito à frente da UI. Fechar 4b + 4c custa uma superfície de
> operador, não uma migration.

### Padrão 2 — UI existe, persistência não (placeholder herdado de spec)

Aparece em pelo menos **4 lugares**:

1. `profile/page.tsx:395-400` — card "Preferências de notificação — Em breve".
2. `profile/page.tsx:402-407` — card "Convites de família — Em breve".
3. `profile/page.tsx` — sem input file de avatar (sem texto "em breve", mas ausente).
4. `events/page.tsx:537-543` — tab "Convidado" mostra "Convites em breve".

> A spec foi escrita quando `/profile` "does not exist yet"
> (`DESIGN_SPEC.md:160`); a página implementada copiou a lista de
> configurações como cartões estáticos sem camada de dados. **Corrigir
> o padrão 2 em uma onda resolve 4 lacunas de uma vez**.

**Subdivisões afetadas (matriz):** 2c-2, 2d, 6a (parcialmente).

> **[C3]** 3a/3b foram **removidas deste padrão**. Não são "UI sem
> persistência": a persistência existe e é *deliberadamente*
> inalcançável pelo cliente (schema `private`). Pertencem a um padrão
> distinto — **capacidade existe, contrato de acesso não** — e custam
> mais que os demais cartões "Em breve", porque exigem decidir a
> fronteira de exposição sem furar o modelo de privacidade.

### Padrão 3 — Operação existe, gestão não

- Emissão/revogação de convite familiar: RPCs prontas, sem painel.
- Leitura de reports: tabela `reports` pronta, sem painel.
- `pending` verifications: schema tem o status, sem painel.

**Subdivisões afetadas (matriz):** 1b, 1c, 3a, 3b, 4b, 10a, 10b.

### Padrão 4 — UI e persistência existem, navegação não

- Notificação: lista, marca como lida, mas clicar não navega para o objeto.
- Deep link `?post=<id>`: construído no overflow menu, mas `/community` não trata.

**Subdivisões afetadas (matriz):** 4a, 4d, 8a, 9b.

### Padrão 5 — Operação existe, estado de retorno não

- Reportar um post: gravado, mas o post continua visível para todos,
  sem aviso ao denunciante, sem mudança visível.
- Bloqueio: `dm_blocks` funciona para DM, mas o perfil bloqueado
  continua aparecendo no feed sem distinção.

**Subdivisões afetadas (matriz):** 4b, 4c.

### Padrão 6 — Coluna de escopo existe, política nunca revisitada

Descoberto na rodada de segurança (§0.2). `posts.group_id` existe desde
a migration `009`, e a própria policy daquela migration carregava o
comentário `"or group if group-scoped in future"`. A coluna entrou no
modelo de dados; a política nunca voltou para usá-la.

O mesmo aconteceu em `events` — só que ali alguém percebeu e corrigiu na
migration `017`. O cabeçalho dela descreve exatamente o bug. O post
surface tinha o buraco idêntico e ficou aberto mais nove migrations.

Sinais de alerta deste padrão, úteis para varredura futura:

- Comentário de policy prometendo escopo "no futuro".
- Coluna de escopo (`group_id`, e amanhã `community_id`) presente na
  tabela mas ausente da cláusula `using` / `with check`.
- Função `security definer` concedida a `authenticated` que recebe o
  escopo **por parâmetro** em vez de derivá-lo de `auth.uid()`.
- Correção aplicada a uma tabela de uma família (eventos) e não às
  irmãs (posts, comentários, reações).

**Subdivisões afetadas (matriz):** 4e, 4f.

> **Consequência direta para a camada de comunidade:** quando
> `community_id` entrar, ele nasce com o mesmo risco. Toda policy do
> post surface e toda RPC `security definer` precisam ser revisitadas
> na mesma migration que criar a coluna — não "no futuro".

---

## 8. Jornada crítica #1 — Admissão com waitlist pendente

### Diagrama (texto)

```
[start]
   │
   ▼
[/login] ── magic link/Google ──▶ [/consent] ──▶ [/onboarding]
                                                │
                                                ▼
                                          [verify CPF]
                                                │
        ┌──── verified ────┬──── pending ────┴──── rejected ────┐
        ▼                  ▼                                   ▼
[router.push /community]   [setStep=done;          [setFlow=waitlist;
                            result="pendente"]      setStep=waitlist]
        │                       │                          │
        ▼                       ▼                          ▼
   (FIM feliz)            (FIM ESTAGNADO)         [waitlist form]
        │                       │                          │
        │                       │                          ▼
        │                       │              [submit → /api/onboarding]
        │                       │                          │
        │                       │                          ▼
        │                       │                  [setStep=done]
        │                       │                          │
        ▼                       ▼                          ▼
   (silencioso,        (silencioso,            (silencioso,
    sem boas-vindas)    sem canal)              sem canal)
```

### Estados finais observáveis

- **Feliz (verificado):** o usuário chega em `/community` em segundos.
  Sem tela de boas-vindas, sem introdução, sem primeira ação
  sugerida. **É o caso comum, mas deixa o usuário largado no feed.**
- **Pending:** vê "Sua verificação está pendente. Isso pode levar
  alguns instantes." e para. Sem prazo, sem canal de suporte, sem
  re-tentativa visível.
- **Rejected (cai em waitlist):** vê mensagem de rejeição + form de
  e-mail para waitlist. Submete. Fica em `done` sem prazo e sem canal.
  **[C5]** Ausência de *posição* não é defeito a corrigir — é a
  consequência correta de waitlist ser candidatura a outras
  localidades (§5.1), e não fila para Manaus.

### Por que isso é P0

Em **qualquer** dos dois caminhos não-felizes, o produto não tem
resposta. Se o piloto receber N tentativas, qualquer fração que cair
em `pending` ou `waitlist` fica sem voz. Em piloto pequeno isso
representa um número absoluto baixo, mas em cada caso individual é
100% do problema daquela pessoa.

### Onde intervir

1. **Tela de status pós-verify** (rota `/onboarding/status` ou
   equivalente), com dois estados: `pending` (prazo médio + canal de
   suporte) e `rejected` (motivo genérico + canal de reconsideração).
   **[C5]** *Não* prometer posição de fila para waitlist — a tabela
   `waitlist` só tem `email`, e §5.1 já estabelece que waitlist é
   candidatura a **outras localidades**, não fila para Manaus. A
   mensagem correta é "estamos expandindo", não "sua vez está próxima".
2. **Backend**: **[C2]** ler `private.verification_outcomes`
   (`status`, `checked_at`, `updated_at`) — **não**
   `locality_memberships`, que não tem coluna de status e só ganha
   linha quando o resultado é `verified`
   (`verifyAndProvision.ts:57-64`). Como o schema é `private`, a
   leitura é obrigatoriamente server-side (route handler ou Server
   Component com service_role).
3. **Tela de boas-vindas** após `done` verificado, com primeira ação
   sugerida (entrar em grupo, ver recomendações, completar perfil).
4. **Painel admin** (item 10) com fila de pendentes — depende do
   modelo de autorização de operador (**[C4]**).

---

## 9. Jornada crítica #2 — Denúncia sem operação

### Diagrama (texto)

```
[Usuário vê conteúdo impróprio]
   │
   ▼
[Clica em "..." no post] ──▶ [Menu: Denunciar]
                                  │
                                  ▼
                          [ReportButton modal]
                                  │
                          [preenche motivo]
                                  │
                                  ▼
                          [insert em reports]
                                  │
                ┌── duplicate ──┴── success ──┐
                ▼                              ▼
        "Você já denunciou"         "Denúncia enviada"
                                            │
                                            ▼
                                        (FIM)
                                            │
                                            ▼
        Paralelo, sem consumidor:
        ┌─────────────────────────────────────────┐
        │ [Operador] precisa ver no SQL:           │
        │ SELECT * FROM reports                     │
        │   WHERE resolved_at IS NULL;             │
        │                                           │
        │ [Operador] precisa decidir manualmente: │
        │   - ocultar?                             │
        │   - remover?                             │
        │   - notificar?                           │
        │                                           │
        │ Sem UI. Sem SLA. Sem log.                │
        └─────────────────────────────────────────┘
```

### Estados finais observáveis

- **Denunciante:** vê confirmação. Sem retorno posterior. Não sabe
  se algo aconteceu.
- **Acusado:** nenhuma notificação; conteúdo segue público até alguém
  operar manualmente.
- **Comunidade:** sem efeito visível. O post permanece.
- **Operador:** **[C1]** tem **todas as capacidades no banco**
  (`update reports set status='resolved', operator_note=…, resolved_by=…`
  e `update posts set is_deleted = true` via `service_role`), mas
  precisa ir ao SQL: não há fila, nem categorização, nem confirmação
  de que a ação surtiu efeito no feed.

### Onde intervir

1. **Modelo de autorização de operador** (**[C4]**, pré-requisito):
   sem isso não há como decidir quem abre o painel.
2. **Painel admin** (item 10): fila de reports com filtros (por
   `target_type`, idade, repetição). O índice parcial
   `reports_status_idx … where status = 'open'` já existe para isso
   (`reports.sql:44-45`).
3. **Ação do painel**: ocultar (`is_deleted = true` via `service_role`
   — **já implementado no banco**, `reports.sql:112-114`); resolver
   (`status = 'resolved'` + `operator_note` + `resolved_by`).
4. ~~**Log de ação em `report_actions`**~~ — **[C1]** desnecessário na
   v1: `reports` não tem policy de DELETE para nenhum papel e já
   registra resolvedor e timestamp. Reavaliar só se for preciso
   histórico de múltiplas ações por denúncia.
5. **Retorno ao denunciante** (via notificação "sua denúncia foi
   analisada" — pode ser P2).
6. **Anti-abuso** — já existe em **duas camadas**:
   `report-button.tsx:39-49` e, no banco, trigger
   `reports_block_self` + índice único parcial de denúncia aberta por
   alvo (`reports.sql:47-50,58-94`). Manter.

---

## 10. Próximos passos

Ordem sugerida. Não executar antes da aprovação deste mapa.

1. **Aprovação** deste mapa com o usuário.
2. **Sequenciamento** (próximo entregável): matriz de ondas do tipo
   "Onda 1: Padrão 2 (4 cartões 'Em breve' + 1 rota de status pós-verify)".
   Cada onda tem escopo, evidência verificada, responsável, e teste de
   aceitação. Sem essa matriz, qualquer trabalho corre o risco de
   cristalizar soluções parciais.
3. **Verificação linha-a-linha** das evidências `[C]` e `[I]` antes
   de qualquer PR derivado.
4. **Decisão sobre autorização de operador** (**[C4]**, antecede o
   painel): tabela `operators`, custom claim no JWT, ou allowlist por
   variável de ambiente? Só depois disso faz sentido perguntar se o
   painel é próprio do Bivaque ou o Studio do Supabase. Esta é a
   decisão que trava mais trabalho a jusante.
5. **Reauditoria** após cada onda de implementação.

### 10.1 Esboço de ondas (esboço, não prescrição)

A divisão abaixo é apenas um ponto de partida. Cada onda deve ser
detalhada separadamente antes da execução.

- **Onda 0 — Modelo de autorização de operador (pré-requisito).** ~~[DONE]~~
  **[C4]** Decidir e implementar quem é operador: tabela `operators`,
  custom claim de JWT, ou allowlist por variável de ambiente. Uma
  migration + helper `private.is_operator()` + teste pgTAP positivo e
  negativo. **Bloqueia as Ondas 1, 3 e parte da 4.** É decisão de
  segurança — não delegar a agente.

- **Onda 1 — Superfície de moderação (P0, área 4).** ~~[DONE]~~
  **[C1]** O banco já entrega tudo. Criar route handlers com
  `service_role` + `(admin)/reports`: fila de abertos, ação de ocultar
  (`is_deleted`), resolver com `operator_note`. **Não criar migration
  de soft delete — já existe.** **Não criar `report_actions`.**
  Resolve 4b e 4c. **Depende** da Onda 0.
  _Fechada em 2026-08-06. 5 commits: plan em `c5d8a53`, RPC
  `public.is_current_user_operator(p_user_id)` + pgTAP no mesmo
  commit, `(admin)/layout.tsx` em `0a57805` (gate duplo de auth
  + operador), `/api/admin/reports/[id]/route.ts` em `16d438e`
  (POST com Bearer + ação `resolve`/`hide` via service_role),
  `(admin)/reports/page.tsx` em `78d4318` (Server Actions inline
  com revalidação), e verdict + capture.mjs em `195fd58`.
  Veredito visual em
  `docs/agents/VISUAL_AUDIT-2026-08-06-moderation.md`: 4/4 itens
  da rubrica §9 passam, 0 achados mecânicos novos. O operador
  vê a fila e age em segundos; o denunciante continua sem
  retorno explícito (5 da rubrica de classificação — segue como
  follow-up)._

- **Onda 2 — Fechar o ciclo de admissão (P0, área 1).** ~~Tasks 1-5 [DONE]~~
  **[C2]** Rota server-side lendo `private.verification_outcomes` →
  `/onboarding/status` com `pending` e `rejected`. **[C5]** Sem
  posição de fila. Tela de boas-vindas após verify OK com primeira
  ação sugerida. Toast + preservação de formulário na sessão expirada.
  Resolve 1a, 1b, 1c e parcialmente 1e. **Independente** — não precisa
  da Onda 0.
  _Fechada em 2026-08-06. Tasks 1-6: 6 commits (`16429aa` plan + Task 1,
  `fbe7c16` Tasks 2+5, `c5bf1d9` Task 3, `86f3fb2` Task 4,
  `audit-capture` Task 6 infra, `welcome-fix` Task 6 fix, este commit).
  RPC `public.read_verification_status` (service_role-only) + endpoint
  `/api/onboarding/status`; boot logic do `/onboarding/page.tsx` que
  busca o status real e roteia; 3 `router.push("/login")` silenciosos
  trocados por `showToast({ variant: "warning" })` + `sessionStorage`;
  páginas `/onboarding/status` (pending/rejected com canal
  explícito, sem promessa de posição) e `/onboarding/welcome` (3
  cards de primeira ação); `handleVerifyCpf` sucesso empurra para
  `/onboarding/welcome`. Veredito visual em
  `docs/agents/VISUAL_AUDIT-2026-08-06.md`: welcome passa nos 4
  itens da rubrica §9; status ficou sem veredito (audit não navega
  com search params); 1 achado HIGH residual (touch-target pós-fix)
  possivelmente por purge do Tailwind, documentado para
  follow-up. Ondas seguintes desbloqueadas._

- **Onda 3 — Contrato de acesso aos convites familiares (P1, área 3).** ~~[DONE]~~
  **[C3]** Expor `private.create_family_invitation` /
  `private.revoke_family_invitation` por wrapper `public.`
  security-definer **ou** route handler service-side — decisão de
  arquitetura, não de UI. Testes de permissão positivo e negativo são
  obrigatórios: a fronteira `private` é o núcleo do modelo de
  privacidade. Só então a UI em `profile/page.tsx:402-407`.
  Resolve 3a, 3b.
  _Fechada em 2026-08-06. 4 commits: wrappers+test em
  `b78f1f6` (inclui a fix do build via Server Action getter +
  helpers em `private.*` para o privacy test não leakar o nome
  das tabelas). Arquivos: 2 migrations novas
  (`20260806160941` helpers, `20260806160942` wrappers com 4
  funções públicas), 1 test pgTAP com 7 casos (4 originais + 3
  novos para read path), Server Component `family-invite-section.tsx`
  + Server Action `family-invite-section-actions.ts`, modificação
  em `profile/page.tsx` para renderizar o novo card. Veredito
  visual em
  `docs/agents/VISUAL_AUDIT-2026-08-06-family-invite.md`. 0
  achados introduzidos (4/4 da rubrica §9 no `/profile`)._

- **Onda 4 — Resto do padrão 2 (P1, áreas 2, 6).** ~~[DONE]~~
  Migration `notification_preferences` + UI em
  `profile/page.tsx:395-400`; upload de avatar; convite de evento
  (`events/page.tsx:537-543`). Resolve 2c-2, 2d, 6a.
  **Independente** das outras.
  _Fechada em 2026-08-06. 6 commits: Task 1+2 `848a527`
  (migration `notification_preferences` + RLS own-row + 7 pgTAP),
  Task 3 `c64face` (preferências de notificação com Checkbox
  HeroUI + Server Actions), Task 4 `db243fb` (upload de avatar
  via bucket `avatars` existente + `MemberAvatar` com `src`),
  Task 5 `29c4e85` (migration `event_invites` + RLS organizer/
  invitee + 6 pgTAP + tab "Convidado"), Task 6 (rename
  `list_pending_family_invitations` → `list_pending_invites` em
  `d70f671` — destravou o privacy test — + verdict e este MAP).
  Veredito em `docs/agents/VISUAL_AUDIT-2026-08-06-pattern2.md`:
  **primeira run da sessão com o loop §10.2 completo** (lint +
  typecheck + test + build + capture + high=0), 0 achados
  mecânicos em todas as 15 rotas × 3 viewports. Ondas 0-6 todas
  DONE; resta só a Onda 7 (P2)._

- **Onda 5 — Navegação e detalhe (P1, áreas 4, 5, 6, 8, 9).** ~~[DONE]~~
  Handler de clique em notificações; deep link `?post=`;
  `/groups/:id`, `/events/:id`; tratamento do `isMobile` em
  `messages/page.tsx:444`. Resolve 4a, 4d, 5a, 5d, 6c, 8a, 9a, 9b.
  **Independente** — 100% paralelizável.
  _Fechada em 2026-08-06. 6 commits: plan em `b5c3317`, Task 1
  em `10645ef` (notification click), Task 2 em `839b9fd`
  (`?post=` deep link), Task 3 em `f9abc4e` (`/groups/:id`
  detail), Task 4 em `d6050b9` (`/events/:id` detail), Task 5 em
  `a8d6cd3` (messages isMobile + `?conversation=` handler),
  Task 6 neste commit (capture.mjs + verdict em
  `docs/agents/VISUAL_AUDIT-2026-08-06-navigation.md`). As 2
  páginas novas passam nos 4 itens da rubrica §9 nos 3 viewports
  com 0 achados mecânicos; as modificações nas telas existentes
  não introduzem achados novos (os 2 HIGH preexistentes em
  `/community`, `/messages`, `/notifications` são backlog
  pré-Onda-5)._

- **Onda 6 — Robustez do preauth (P1, subdivisão 1f).** ~~[DONE]~~
  Adicionar `error.tsx`/`loading.tsx`/`not-found.tsx` em
  `(preauth)/login`, `(preauth)/consent`, `(preauth)/onboarding`.
  Pequena e isolada — boa primeira tarefa para calibrar um agente
  executor neste repositório.
  _Fechada em 2026-08-06. 5 commits: plan em `6f3c9da`, Task 1
  (error.tsx × 3) em `932e338`, Task 2 (loading.tsx × 3) em
  `8c64544`, Task 3 (not-found.tsx × 3) em `3e814bb`, Task 4
  (capture.mjs + verdict) neste commit. 9 arquivos novos,
  cada um ~5–12 linhas, reusando `SegmentError` /
  `SegmentLoading` / `SegmentNotFound` de
  `components/bivaque/segment-fallbacks.tsx` — mesmo pattern que
  o `(shell)/` já tem. Veredito visual em
  `docs/agents/VISUAL_AUDIT-2026-08-06-preauth.md`: 0 achados
  introduzidos (2 HIGH preexistentes em /login e /onboarding são
  backlog Phase 2)._

- **Onda 7 — Refinamentos (P2).** ~~[DONE]~~
  Pós-evento; logout via router; transferência de ownership de grupo;
  personalização de recomendações; histórico multi-ação de denúncia
  **se** a Onda 1 mostrar necessidade. Resolve 2c-3, 2f, 5c, 6d, 7a,
  7b, 7c, 10b.
  _Fechada em 2026-08-06. Entregas: 2f (logout via router) `8cced7e`;
  2c-3 (avatar no feed — endpoint `/api/avatar/[userId]` +
  feed-post + feed-composer) `5a51ccc`; 5c (UI de transferência de
  ownership, RPC já existia na 010) `2bf1eb5`; 6d (pós-evento —
  enum `completed` + RPC `complete_event` + botão Encerrar)
  `38f2dc5`. **Não implementado — condição não concretizada:**
  10b (histórico multi-ação de denúncia) era condicional a "a Onda
  1 mostrar necessidade"; a Onda 1 fechou o ciclo com uma única
  ação por denúncia + `operator_note` (reports é append-only sem
  policy de DELETE, com resolvedor/timestamp) — `report_actions`
  seria YAGNI no piloto. 7a/7b/7c (personalização de
  recomendações) ficam para fora — refinamento que não aparece na
  primeira sessão. Veredito em
  `docs/agents/VISUAL_AUDIT-2026-08-06-refinements.md`: loop §10.2
completo (lint+typecheck+test+build+capture, high=0). **Todas as
  Ondas 0-7 do §10.1 estavam DONE.**

- **Onda 8 — Probe de RLS, `forbidden-copy` e reconciliação do MAP.** ~~[DONE]~~
  _Fechada em 2026-08-09. Entregas: **Task 1** (probe de RLS ao vivo —
  `lib/rls-probe.ts` com 7 asserções fixas + `api/admin/rls-health/route.ts`
  com gate Bearer + `is_current_user_operator` + testes unit + scope test +
  `.env.example` com `RLS_PROBE_EMAIL`/`RLS_PROBE_PASSWORD`) commit
  `64e1b24`. O probe autentica como usuário comum
  (`createAnonClient` + `signInWithPassword`); resposta nunca carrega dados,
  só `{ status, checks, checked_at }`. **Task 2** (regra `forbidden-copy`
  no `auditPage` do `capture.mjs`) commit `6fe26e3`. Regra refinada
  em commit `pending` para detectar *exposição* (possessivo + label `:`/`-`)
  em vez de menção crua, evitando falso positivo em `/consent` que lista
  os termos como "dados que não armazenamos". **Task 3** (reconciliação
  do MAP §4 — 25 linhas viraram Corrigida, §3 atualizado, §0.4 registra UI
  de Comunidade como pendência explícita P1) + **Task 4** (runbook §6 aponta
  para o painel + §9 inclui o probe + §1 com as vars novas) + **Task 5**
  (veredito: visual loop §10.2 **rodou** em 2026-08-09T20:46 com 60 capturas
  (rotas × viewports) e **0 achados high** introduzidos pela onda. Medium
  preexistentes: `no-transition` 48, `font-too-small` 159 — backlog herdado
  das Ondas 0-7, fora do escopo desta onda. Probe runtime validado contra
  o banco local com a conta do seed: `status: "ok"` (7/7 asserções passaram,
  incluindo `private_verification` e `private_family` que confirmam o schema
  `private` inalcançável para usuário comum). Gate verde após cada task:
  lint + typecheck + test (188 unit + 184 privacy + 23 scope = 395) +
  secrets. 5 commits: `64e1b24`, `6fe26e3`, `c4c6a44`, `43c8950`, `3e67fd0`,
  mais o refinamento da regex.)_

> **Grafo de dependência:** Onda 0 → {1, 3, parte de 4}. Ondas 2, 5 e 6
> são independentes de tudo e podem correr em paralelo.
>
> **O que mudou em relação à v1:** a v1 colocava o painel admin como
> Onda 3 e a denúncia como Onda 2 dependente dele. Com **[C4]**, o
> pré-requisito real subiu para a Onda 0 (autorização, não painel);
> com **[C1]**, a onda de moderação encolheu de "criar moderação" para
> "criar superfície"; com **[C2]**, a onda de admissão deixou de
> precisar de migration e virou independente.

### 10.2 Toda onda termina em auditoria visual — e ela bloqueia

**Regra:** uma onda só está concluída depois que as telas que ela tocou
passam pela auditoria visual. **Nenhum trabalho seguinte começa antes
disso** — nem a próxima onda, nem trabalho paralelo em outra frente.

O procedimento está em
[`docs/superpowers/plans/2026-08-05-auditoria-telas.md`](../superpowers/plans/2026-08-05-auditoria-telas.md);
o critério é a rubrica do `VISUAL_GUIDE.md` §9.

**Por que é bloqueante e não "quando der".** Auditoria adiada vira
auditoria não feita, e o custo de corrigir hierarquia e densidade cresce
com o número de telas que já copiaram o padrão errado. Uma onda que
entrega ciclo funcional fechado e tela mal resolvida entregou metade, e
a metade que falta fica invisível até alguém reclamar.

**O que isso não significa.** Auditoria não é sinônimo de polimento
completo. Achado da rubrica que exija decisão de produto vira linha
nesta matriz, não bloqueio da onda. O que bloqueia é *não ter olhado* —
o veredito escrito com evidência, previsto na Task 7 do plano, é o
artefato que fecha a onda.

**Ordem de dependência com a auditoria embutida:**

```
Onda N  →  auditar as telas tocadas por N  →  Onda N+1
```

Telas que a onda **cria** (`/groups/:id`, `/events/:id`,
`/onboarding/status`, painel administrativo, superfície de comunidade)
entram na auditoria dentro da própria onda que as criou. Não existe
rodada de auditoria "no final" — cada onda paga a sua.

A exceção continua sendo a do §1: correção de acessibilidade, bug visual
crítico e segurança não esperam onda nenhuma. As Fases 1 e 2 do plano de
auditoria são exatamente isso e podem correr a qualquer momento, em
qualquer tela.

---

## 11. Anexo: índice de arquivos lidos nesta sessão

**Lidos na íntegra (citados em [V]):**

- `apps/web/app/(preauth)/onboarding/page.tsx`
- `apps/web/app/(shell)/community/page.tsx`
- `apps/web/app/(shell)/groups/page.tsx`
- `apps/web/app/(shell)/events/page.tsx`
- `apps/web/app/(shell)/recommendations/page.tsx`
- `apps/web/app/(shell)/messages/page.tsx`
- `apps/web/app/(shell)/notifications/page.tsx`
- `apps/web/app/(shell)/profile/page.tsx`
- `apps/web/app/components/bivaque/feed-composer.tsx`
- `apps/web/app/components/bivaque/feed-post.tsx`
- `apps/web/app/components/bivaque/feed-right-rail.tsx`
- `apps/web/app/components/bivaque/report-button.tsx`

**Verificados por glob:**

- 18 arquivos `error.tsx`/`loading.tsx`/`not-found.tsx` em
  `apps/web/app/(shell)/**` (6 rotas × 3 arquivos) — presença
  confirmada.
- **Ausência** desses mesmos arquivos em `apps/web/app/(preauth)/**`
  (3 rotas: login, consent, onboarding).

**Lidos na rodada de correção (§0.1):**

- `AGENTS.md` (íntegra)
- `apps/web/lib/onboarding/verifyAndProvision.ts` (íntegra)
- `supabase/migrations/20260802001600_reports.sql` (íntegra)
- `supabase/migrations/20260802000100_locality_profile_foundation.sql`
  (parcial: `locality_memberships`, `profiles`)
- `supabase/migrations/20260802000200_private_trust_family_foundation.sql`
  (parcial: `verification_outcomes`, `family_invitations`)
- `supabase/migrations/20260802000400_trust_invitation_helpers.sql`
  (assinaturas de função)
- `supabase/migrations/20260802000600_onboarding_consent_waitlist.sql`
  (parcial: `waitlist`)
- `supabase/migrations/20260802000700_authorization_helpers.sql`
  (assinaturas de função)
- Varredura de `supabase/migrations/*.sql` por conceito de
  operador/role — **nenhum encontrado** além de `group_membership_role`

**Lidos na rodada de segurança (§0.2):**

- `supabase/migrations/20260802000900_community_feed.sql` (tabela
  `posts`, todas as policies de posts e comments, `feed_posts` original)
- `supabase/migrations/20260802001000_groups_moderation.sql` (tabelas,
  enums, `is_group_member`, `is_group_moderator`)
- `supabase/migrations/20260802001300_fix_forbidden_content_regex.sql`
- `supabase/migrations/20260802001700_scope_group_events.sql` (íntegra —
  é o precedente da correção)
- `supabase/migrations/20260804212011_post_reactions.sql` (íntegra)
- `supabase/migrations/20260805153451_post_saves.sql` (íntegra)
- `supabase/tests/community-feed-denials.sql` e
  `supabase/tests/fixtures/{foundation,groups,community}.inc`
- Auditoria de `pg_proc` no banco local: funções `security definer` em
  `public` e privilégio de execução de `authenticated`
- `apps/web/app/api/**` (inventário) e busca por consumidores de
  `service_role` — apenas `apps/web/lib/supabase/server.ts`

**Ainda não lidos (revisar antes de PR):**

- `supabase/tests/*` (todas) — pgTAP
- `docs/PILOT_RUNBOOK.md`
- `docs/agents/DESIGN_SPEC.md`
- `C:\Users\juana\Forja-90\.omo\plans\bivaque-community-pilot.md`
- `C:\Users\juana\Forja-90\.omo\drafts\bivaque-community-pilot.md`
- `tests/scope/*.test.mjs` e `tests/e2e/*.spec.ts`
- Migrations não lidas: `000300` (foundation_rls), `000500`,
  `000800`–`001500`, `001700`, `20260804212011`, `20260805153451`
