# Mapa de Jornadas e Lacunas Funcionais — Bivaque Community

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
| 1 | Admissão / Onboarding (CPF, consent, convite família, waitlist) | Parcial | P0 |
| 2 | Perfil (nome, avatar, visibilidade, preferências) | Parcial | P1 |
| 3 | Convite familiar (envio + aceitação + revogação) | Parcial | P1 |
| 4 | Feed e publicação (postar, reagir, comentar, denunciar, ocultar) | Parcial | P0 |
| 5 | Grupos (entrar, criar, moderar, detalhe) | Parcial | P1 |
| 6 | Eventos (criar, RSVP, detalhe, pós-evento) | Parcial | P1 |
| 7 | Recomendações (explorar, pedir, salvar) | Parcial | P2 |
| 8 | Notificações (inbox + preferências) | Parcial | P1 |
| 9 | Mensagens (DM + bloqueio + contexto) | Parcial | P1 |
| 10 | Operação administrativa (painel do operador) | Ausente | P1 |
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

**Implicação:** o piloto está publicamente navegável e tecnicamente
correto, mas **nenhuma das 11 áreas está fechada** — todas têm pelo
menos um elo fraco na cadeia entrada→ação→feedback→acompanhamento→
resolução.

---

## 4. Matriz por área (41 linhas, 11 áreas)

Legenda de evidência:

- `[V]` — verificado nesta sessão (li o arquivo e o trecho).
- `[C]` — citado de análise anterior do mesmo repo; recomenda-se
  reconfirmar a linha exata.
- `[I]` — inferência razoável mas não verificada linha-a-linha.

| # | Área | Subdivisão | Estado | Pri. | Lacunas | Evidência | Conf. |
|---|---|---|---|---|---|---|---|
| 1 | Admissão / Onboarding | 1a — verify CPF + done verificado | Parcial | P0 | Após `done`, redireciona para `/community` sem tela de boas-vindas, sem primeira ação sugerida, sem explicação de como o feed funciona | `apps/web/app/(preauth)/onboarding/page.tsx:138-141`; ausência de rota de boas-vindas | [V] |
| 1 | Admissão / Onboarding | 1b — waitlist (rejected → waitlist) | Parcial | P0 | Cadastro grava, mas o usuário fica em `done` sem retorno e sem canal. **[C5]** A lacuna **não** é "posição na fila": a tabela `waitlist` só tem `email` e, por §5.1, waitlist é candidatura a outras localidades — não fila para Manaus. Falta confirmação honesta de expansão, não um número de senha | `onboarding/page.tsx:144-149,354-378`; `20260802000600_onboarding_consent_waitlist.sql:10-12`; ausência de rota de status | [V] |
| 1 | Admissão / Onboarding | 1c — pending (verificação) | Parcial | P0 | Estado `done` mostra "pendente" e para; sem canal de re-tentativa, sem prazo, sem canal de suporte. **[C2]** O estado real vive em `private.verification_outcomes.status` — alcançável **apenas server-side** | `onboarding/page.tsx:150-152`; `20260802000200_private_trust_family_foundation.sql:25-36` | [V] |
| 1 | Admissão / Onboarding | 1d — convite família (aceitação pelo convidado) | Completa | — | O ciclo do convidado fecha. O ciclo do titular (ver 3a) não fecha | `onboarding/page.tsx:166-206`; `verifyAndProvision.ts:102-146`; `supabase/tests/trust-family-invitations.sql` | [V][C] |
| 1 | Admissão / Onboarding | 1e — sessão expirada durante o fluxo | Parcial | P1 | Três handlers (`verify-cpf`, `accept-family-invite`, `join-waitlist`) fazem `router.push("/login")` sem aviso ao usuário, sem preservar o estado do formulário | `onboarding/page.tsx:117,175,217` | [V] |
| 1 | Admissão / Onboarding | 1f — error/loading/not-found em `(preauth)` | Ausente | P1 | Rotas `(preauth)/login`, `(preauth)/consent`, `(preauth)/onboarding` não têm `error.tsx`, `loading.tsx`, `not-found.tsx`. O shell tem; o preauth não | `apps/web/app/(preauth)/**` (verificado por glob — ausência) | [V] |
| 2 | Perfil | 2a — edição de nome | Completa | — | — | `apps/web/app/(shell)/profile/page.tsx:146-187` | [V] |
| 2 | Perfil | 2b — edição de visibilidade | Completa | — | — | `profile/page.tsx:170-187,336-393` | [V] |
| 2 | Perfil | 2c-1 — bucket de avatar | Completa | — | Infraestrutura existe | `supabase/migrations/20260802000500_storage_buckets.sql`; `tests/unit/storage/allowed-image-upload.test.ts` | [C] |
| 2 | Perfil | 2c-2 — upload de avatar | Ausente | P1 | Nenhum `input[type=file]` em `profile/page.tsx`; nenhum endpoint em `apps/web/app/api/`; nome nasce como "Novo membro" no provisionamento | `profile/page.tsx` (sem `input file`); `verifyAndProvision.ts:66-73,133-140` | [V][C] |
| 2 | Perfil | 2c-3 — integração de avatar no feed | Ausente | P2 | Avatar de membro não aparece no feed (`feed-post.tsx:465-467` lê só `display_name.charAt(0)`; `feed-composer.tsx:32-36` idem); avatar não é persistido em lugar nenhum | `feed-post.tsx:465-467`; `feed-composer.tsx:32-36` | [V] |
| 2 | Perfil | 2d — preferências de notificação | Placeholder | P1 | Card no perfil com texto "Em breve"; sem tabela `notification_preferences` em migrations; sem toggles | `profile/page.tsx:395-400`; ausência de migration | [V][C] |
| 2 | Perfil | 2e — configuração inicial no onboarding | Ausente | P1 | Não há passo de "definir nome, foto e visibilidade" no fluxo de admissão; perfil nasce com defaults hardcoded | `onboarding/page.tsx` (sem step de perfil); `verifyAndProvision.ts:66-73,133-140` | [V][C] |
| 2 | Perfil | 2f — logout | Parcial | P2 | `await supabase.auth.signOut()` + `window.location.href = "/login"` faz hard reload em vez de navegação client-side; quebra estado de PWA, scroll, foco | `profile/page.tsx:411-414` | [V] |
| 3 | Convite familiar | 3a — envio (titular) | Ausente | P1 | **[C3]** As RPCs são `private.create_family_invitation` / `private.revoke_family_invitation`. O schema `private` não é exposto via Data API e `authenticated` não tem privilégio de execução — **nenhum componente cliente pode chamá-las**. Falta um wrapper `public.` security-definer **ou** route handler service-side, além da UI | `20260802000400_trust_invitation_helpers.sql:23,79`; `AGENTS.md` (fronteira de privacidade); `profile/page.tsx:402-407` (cartão "Em breve") | [V] |
| 3 | Convite familiar | 3b — revogação (titular) | Ausente | P1 | Mesmo problema de 3a (`private.revoke_family_invitation`) | `20260802000400_trust_invitation_helpers.sql:79`; idem 3a | [V] |
| 4 | Feed | 4a — postar/curtir/comentar | Parcial | P1 | Reação e comentário funcionam; **clicar numa notificação de comentário não navega para o post** (ver 8a) | `apps/web/app/(shell)/notifications/page.tsx:329-355` (sem `onClick`); `apps/web/app/components/bivaque/feed-post.tsx:387-415,417-444` | [V] |
| 4 | Feed | 4b — denunciar | Parcial | P0 | **[C1]** A camada de dados está **pronta**: `reports` tem `status` (open/resolved), `operator_note`, `resolved_by`, `resolved_at`, índice parcial de abertos e grants `service_role`. Falta **exclusivamente a superfície do operador** — nenhuma rota consome a fila; o denunciante não recebe retorno | `20260802001600_reports.sql:25-50,105-114`; `report-button.tsx:22-52`; ausência de rota admin | [V] |
| 4 | Feed | 4c — ocultar conteúdo | Parcial | P1 | **[C1]** "Ocultar publicação" na UI só esconde localmente (Set em React). Mas a **moderação global já existe no banco**: `is_deleted` em posts/comments/groups, `feed_posts` filtra `is_deleted = false`, e trigger impede `authenticated` de togglar a coluna. Falta a superfície que aciona isso via `service_role` | `20260802001600_reports.sql:54-56,201,213-245`; `feed-post.tsx:185-207`; `community/page.tsx:27,93-95` | [V] |
| 4 | Feed | 4d — `?post=` deep link | Parcial | P2 | `feed-post.tsx:485` constrói URL com `?post=<id>`, mas `/community?post=<id>` não tem handler para abrir o card destacado | `feed-post.tsx:485`; ausência de uso da query em `community/page.tsx` | [V] |
| 4 | Feed | 4e — escopo de grupo no post surface | **Corrigida** | ~~P0~~ | **[S1]** Policies de `posts`/`comments`/`post_reactions`/`post_saves` ignoravam `posts.group_id`; conteúdo de grupo privado era legível e gravável por qualquer membro da localidade. A migration `017` já tinha corrigido a classe idêntica em `events` — o post surface ficou de fora. `pending` não qualifica mais como membership | `20260805170545_fix_post_scope_leak.sql`; `supabase/tests/post-scope-leak.sql`; comparar com `20260802001700_scope_group_events.sql` | [V] |
| 4 | Feed | 4f — autorização de `feed_posts()` | **Corrigida** | ~~P0~~ | **[S2]** RPC `security definer` concedida a `authenticated`, com a localidade vindo por parâmetro e nenhuma checagem de membership — enumerava o feed inteiro contornando a RLS. O teste de negação existente só cobria `select from public.posts`, nunca a RPC | `20260805170545_fix_post_scope_leak.sql`; `supabase/tests/post-scope-leak.sql` | [V] |
| 5 | Grupos | 5a — listar/entrar/sair | Parcial | P1 | Funciona; **sem página de detalhe do grupo** | `apps/web/app/(shell)/groups/page.tsx:231-267`; `docs/agents/VISUAL_GUIDE.md:111` ("Detalhe (futura)") | [V][C] |
| 5 | Grupos | 5b — criar | Parcial | P1 | Form e RPC funcionam; sem foto/capa/descrição rica; sem categorias; sem regras de entrada além de `public`/`private` | `groups/page.tsx:203-229,556-615` | [V] |
| 5 | Grupos | 5c — moderar (aprovar, promover, rebaixar) | Parcial | P2 | RPCs existem; **sem transferência de ownership**; **sem convite para grupo**; **sem log de moderação** | `groups/page.tsx:269-322` | [V] |
| 5 | Grupos | 5d — feed/membros do grupo | Ausente | P2 | Não há página `/groups/:id` com feed interno; existe só o card-resumo | Ausência em `apps/web/app/(shell)/groups/page.tsx` | [V] |
| 6 | Eventos | 6a — criar/listar | Parcial | P1 | Form e listagem funcionam; **convite para evento é placeholder** ("em breve") | `apps/web/app/(shell)/events/page.tsx:537-543,549-601` | [V] |
| 6 | Eventos | 6b — RSVP | Parcial | P1 | interested/going funcionam; sem "não vou" explícito; sem atualização pelo organizador quando o evento muda | `events/page.tsx:275-295` | [V] |
| 6 | Eventos | 6c — detalhe do evento | Ausente | P1 | Sem rota `/events/:id` com descrição completa, comentários, lista de confirmados | Ausência de rota | [V] |
| 6 | Eventos | 6d — pós-evento | Ausente | P2 | Sem registro de presença real, retrospectiva, agradecimento; sem fechamento pelo organizador | Ausência de UI e migration dedicada | [I] |
| 7 | Recomendações | 7a — explorar | Parcial | P2 | Lista grupos e eventos próximos; sem personalização; sem explicação; sem aprendizado de feedback. Sub-priorizado (não aparece na primeira sessão do piloto) | `apps/web/app/(shell)/recommendations/page.tsx:217-232` | [V] |
| 7 | Recomendações | 7b — pedir indicação | Parcial | P2 | Form e gravação funcionam; sem visualização dos pedidos da comunidade; sem ciclo de resposta | `recommendations/page.tsx:278-341`; ausência de rota `/recommendations/:id` | [V] |
| 7 | Recomendações | 7c — salvar | Parcial | P2 | Salvar e remover funcionam; sem notificação quando alguém responde | `recommendations/page.tsx:393-413` | [V] |
| 8 | Notificações | 8a — inbox (listar, marcar lida) | Parcial | P1 | Lista e tabs funcionam; **clicar não navega para o objeto**; sem agrupamento por origem; sem ação em massa | `apps/web/app/(shell)/notifications/page.tsx:329-355` (sem `onClick`); tabs em `:256-286` | [V] |
| 8 | Notificações | 8b — preferências | Placeholder | P1 | Card no perfil; sem toggles; sem migration | `profile/page.tsx:395-400`; ausência de migration `notification_preferences` | [V][C] |
| 9 | Mensagens | 9a — DM | Parcial | P1 | Lista, conversa, bloquear, iniciar conversa funcionam; sem indicador de online/status; sem busca dentro da conversa; linha `isMobile = true` hardcoded em `:444` (variável nunca é `false`) | `apps/web/app/(shell)/messages/page.tsx:66-687` (linha 444 confirmada) | [V] |
| 9 | Mensagens | 9b — notificação de DM abre conversa | Ausente | P2 | Tipo `direct_message` reconhecido em `classifyNotification`, mas card não tem handler de clique | `notifications/page.tsx:49-62,329-355` | [V] |
| 10 | Operação administrativa | 10a — painel do operador | Ausente | P1 | **[C4]** Sem painel — mas o bloqueio **anterior** é que não existe conceito de operador no schema: varredura em todas as migrations achou apenas `group_membership_role` (escopo de grupo). Hoje "operador" = quem detém a service_role key. Qualquer `(admin)/` exige antes um modelo de autorização. **Operação viável em modo degradado** para piloto fechado com ≤50 membros | Varredura `supabase/migrations/*.sql`; `20260802001000_groups_moderation.sql:16`; `apps/web/lib/supabase/server.ts` (único consumidor de service_role); ausência de `apps/web/app/(admin)/` | [V] |
| 10 | Operação administrativa | 10b — auditoria de logs de segurança | Parcial | P2 | **[C1]** `reports` já é trilha de auditoria parcial: registra `resolved_by` / `resolved_at` / `operator_note` e **não tem policy de DELETE para nenhum papel** (append-only por design). Falta apenas histórico de múltiplas ações por denúncia e log de ações fora do fluxo de denúncia | `20260802001600_reports.sql:32-35,148-149` | [V] |
| 11 | Recuperação de conta | 11a — re-verificação de elegibilidade | Ausente | P1 | Supabase Auth fornece reset de senha; **sem re-verificação de elegibilidade** após troca de credencial; sem plano de revogação de conta. **Risco teórico** explorável apenas se houver um e-mail vazado | Plano não trata; ausência em migrations | [C][I] |

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

- **Onda 0 — Modelo de autorização de operador (pré-requisito).**
  **[C4]** Decidir e implementar quem é operador: tabela `operators`,
  custom claim de JWT, ou allowlist por variável de ambiente. Uma
  migration + helper `private.is_operator()` + teste pgTAP positivo e
  negativo. **Bloqueia as Ondas 1, 3 e parte da 4.** É decisão de
  segurança — não delegar a agente.

- **Onda 1 — Superfície de moderação (P0, área 4).**
  **[C1]** O banco já entrega tudo. Criar route handlers com
  `service_role` + `(admin)/reports`: fila de abertos, ação de ocultar
  (`is_deleted`), resolver com `operator_note`. **Não criar migration
  de soft delete — já existe.** **Não criar `report_actions`.**
  Resolve 4b e 4c. **Depende** da Onda 0.

- **Onda 2 — Fechar o ciclo de admissão (P0, área 1).**
  **[C2]** Rota server-side lendo `private.verification_outcomes` →
  `/onboarding/status` com `pending` e `rejected`. **[C5]** Sem
  posição de fila. Tela de boas-vindas após verify OK com primeira
  ação sugerida. Toast + preservação de formulário na sessão expirada.
  Resolve 1a, 1b, 1c e parcialmente 1e. **Independente** — não precisa
  da Onda 0.

- **Onda 3 — Contrato de acesso aos convites familiares (P1, área 3).**
  **[C3]** Expor `private.create_family_invitation` /
  `private.revoke_family_invitation` por wrapper `public.`
  security-definer **ou** route handler service-side — decisão de
  arquitetura, não de UI. Testes de permissão positivo e negativo são
  obrigatórios: a fronteira `private` é o núcleo do modelo de
  privacidade. Só então a UI em `profile/page.tsx:402-407`.
  Resolve 3a, 3b.

- **Onda 4 — Resto do padrão 2 (P1, áreas 2, 6).**
  Migration `notification_preferences` + UI em
  `profile/page.tsx:395-400`; upload de avatar; convite de evento
  (`events/page.tsx:537-543`). Resolve 2c-2, 2d, 6a.
  **Independente** das outras.

- **Onda 5 — Navegação e detalhe (P1, áreas 4, 5, 6, 8, 9).**
  Handler de clique em notificações; deep link `?post=`;
  `/groups/:id`, `/events/:id`; tratamento do `isMobile` em
  `messages/page.tsx:444`. Resolve 4a, 4d, 5a, 5d, 6c, 8a, 9a, 9b.
  **Independente** — 100% paralelizável.

- **Onda 6 — Robustez do preauth (P1, subdivisão 1f).**
  Adicionar `error.tsx`/`loading.tsx`/`not-found.tsx` em
  `(preauth)/login`, `(preauth)/consent`, `(preauth)/onboarding`.
  Pequena e isolada — boa primeira tarefa para calibrar um agente
  executor neste repositório.

- **Onda 7 — Refinamentos (P2).**
  Pós-evento; logout via router; transferência de ownership de grupo;
  personalização de recomendações; histórico multi-ação de denúncia
  **se** a Onda 1 mostrar necessidade. Resolve 2c-3, 2f, 5c, 6d, 7a,
  7b, 7c, 10b.

> **Grafo de dependência:** Onda 0 → {1, 3, parte de 4}. Ondas 2, 5 e 6
> são independentes de tudo e podem correr em paralelo.
>
> **O que mudou em relação à v1:** a v1 colocava o painel admin como
> Onda 3 e a denúncia como Onda 2 dependente dele. Com **[C4]**, o
> pré-requisito real subiu para a Onda 0 (autorização, não painel);
> com **[C1]**, a onda de moderação encolheu de "criar moderação" para
> "criar superfície"; com **[C2]**, a onda de admissão deixou de
> precisar de migration e virou independente.

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
