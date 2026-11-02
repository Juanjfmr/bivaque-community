# Camada 0 — Contratos globais (a régua do Red Team)

Extraídos de `supabase/migrations/*.sql` em 2026-08-10. Cada contrato cita
`migration:linha`. Quando a UI disser uma coisa e o contrato disser outra,
a divergência vira finding formal.

> Convenção: "client-side" = código executável por `authenticated` via
> Data API/RPC. "server-side" = somente `service_role`.

---

## C1 — Entrada e estados

Autenticação: magic link (primário) + Google OAuth. Não existe auth por
senha. Após autenticar: consentimento (gate por cookie) → onboarding →
verificação de CPF via Portal da Transparência.

Estados de verificação (`private.verification_outcomes.status`):
`pending` · `verified` · `rejected` · `temporary_error`.
Invariantes: `verified` exige `eligibility_class` + `checked_at` não-nulos;
qualquer outro status exige `eligibility_class` nulo.
(`20260802000200_private_trust_family_foundation.sql:25-36`)

`locality_memberships` **não tem INSERT client-side** — a linha só é criada
server-side quando o resultado é `verified`. Não existe caminho de cliente
para se tornar membro. (`20260802000300_foundation_rls.sql:14-34,48-58`)

## C2 — O que significa "verificado"

`private.is_verified_locality_member` = existe
`verification_outcomes.status = 'verified'` **e** membership na mesma
locality. Verificação não é um flag no perfil: é um resultado no schema
`private` + uma linha de membership. (`20260802000700_authorization_helpers.sql:11-33`)

## C3 — Quem vê quem (perfis)

`profiles.visibility` tem exatamente dois valores: `locality_members` e
`hidden`. Colunas persistidas: `user_id`, `locality_id`, `display_name`,
`visibility`, `consent_version`, `consented_at`, timestamps.
(`20260802000100_locality_profile_foundation.sql:31-44`;
`20260802000600_onboarding_consent_waitlist.sql:4-7`)

- Policy base `profiles_select_visible_in_locality`: self sempre; demais só
  se `visibility = 'locality_members'` **e** o viewer é membro da locality.
  (`20260802000300_foundation_rls.sql:60-89`)
- Policy aditiva `profiles_select_community_comember`: co-membro aprovado de
  comunidade vê o perfil **inclusive `hidden`** — a cláusula `USING` só
  checa coexistência em `community_memberships` aprovadas e **não filtra por
  visibility**. (`20260805214709_community_scope.sql:531-551`)

> **Tensão T1 (já aberta):** "hidden" promete invisibilidade aos membros; a
> policy de comunidade expõe o perfil hidden a co-membros aprovados. Copy,
> policy e modelo mental divergem. → Finding F14.

## C4 — Fronteira do schema `private`

`USAGE` do schema `private` é concedido a `authenticated` e `service_role`,
mas **privilégio de tabela só existe para `service_role`**. `authenticated`
executa apenas helpers booleanos/RPCs pontuais. Nada do schema `private` é
exposto via Data API. (`20260802000300_foundation_rls.sql:29-46`)

Helpers executáveis por `authenticated` (lista fechada neste recorte):
`is_locality_member`, `is_verified_locality_member`, `has_accepted_family`,
`is_verified_holder`, `is_community_member`, `is_community_moderator`,
`is_group_member`, `is_group_moderator`, `is_group_owner`,
`is_event_locality_member`, `can_see_locality_recommendation`,
`can_dm_between`, `is_dm_participant`, `is_dm_blocked_by_other`,
`can_access_post_scope`, `can_access_post`, `can_access_event`,
`is_operator`.

Service-role-only: `create/revoke/accept_family_invitation`,
`upsert_verification_outcome`, `read_verification_status`,
`list_verification_queue`, `list_pending_family_invitations` (+ wrappers
`public.*` correspondentes, todos service_role-only).

## C5 — Localidade × Comunidade × Grupo

- **Localidade**: `localities` só legível por membro. Piloto: Manaus.
- **Comunidade** (subdivisão opcional — vilas, turmas): `communities` não
  tem visibility; metadata é descoberta por qualquer membro da localidade.
  `community_memberships`: roles `member/moderator/owner`, status
  `pending/approved`. Criação de comunidade é **service_role-only**.
  Sair/ser removido de comunidade **casca** memberships de grupos internos.
  (`20260805211933_communities_foundation.sql:8-129`;
  `20260805215419_community_rpcs.sql:7-229`;
  `20260805214709_community_scope.sql:77-184`)
- **Grupo**: `groups.visibility` = `public | private`. **Ambos são
  descobríveis** por qualquer membro da locality (metadata legível); o que
  muda é o acesso a conteúdo e a lista de membros. `group_memberships`:
  roles `member/moderator/owner`, status `pending/approved`; entrada em
  grupo público é `approved` imediata, em privado é `pending`. Criar grupo
  exige ser membro **verificado**. (`20260802001000_groups_moderation.sql:11-505`)

## C6 — Escopo de conteúdo

`posts`: `locality_id` NOT NULL + `group_id` nullable + `community_id`
nullable; constraint `posts_single_scope` impõe
`num_nonnulls(group_id, community_id) <= 1` (escopo único);
`posts_community_same_locality` amarra comunidade à localidade.
(`20260805214709_community_scope.sql:25-51`)

Acesso por escopo: `private.can_access_post_scope(locality_id, community_id,
group_id)` (security definer) = membro da localidade **e** (sem comunidade
ou membro dela) **e** (sem grupo ou membro dele ou grupo público no escopo).
SELECT e INSERT de posts usam esse helper; `comments` e `post_reactions`
herdam via `can_access_post(post_id)`. `post_saves` é own-row (não expõe
escopo). (`20260805214709_community_scope.sql:204-280`;
`20260805170545_fix_post_scope_leak.sql:116-160`;
`20260805153451_post_saves.sql:33-64`)

`events`: mesmo padrão XOR de escopo; `can_access_event(event_id)` checa
locality + comunidade/grupo. RSVP usa o mesmo gate + trigger
`event_rsvps_block_self` (organizador não RSVP no próprio evento).
(`20260802001200_events_rsvp.sql:10-178`;
`20260805191237_event_rsvp_scope.sql:30-83`)

## C7 — Feeds

`feed_posts`, `feed_community`, `feed_group`: todas `security definer`,
`grant execute to authenticated`, **checam membership internamente**
(lição do vazamento S2). O feed da cidade **exclui** conteúdo de comunidade.
(`20260805215020_community_feeds.sql:9-245`;
`20260805214709_community_scope.sql:445-529`)

## C8 — DM

Contextos permitidos (`dm_context_type`): `shared_group` · `shared_event` ·
`recommendation_thread` · `accepted_family`. `can_dm_between(a,b)` aceita
qualquer um dos quatro. Conversas: `participant_a < participant_b`,
unicidade por par. Bloqueio: armazenamento **direcional**
(`blocker_user_id → blocked_user_id`), efeito **bilateral no envio** via
`is_dm_blocked_by_other`. (`20260802001500_contextual_dm_abuse_controls.sql:10-322`)

> **Tensão T2:** a UI só expõe criação de conversa por `shared_group`; o
> banco permite 4 contextos. Capacidade existe, superfície não. → Finding F11.

## C9 — Notificações

Tabela `notifications`: `recipient_user_id`, `actor_user_id`, `type`,
`action`, `target_type`, `target_id`, `read_at`, `created_at`. **Não existe
coluna `category`** — a "categoria" da UI é heurística frontend sobre
`type`. Inserção é **exclusivamente por triggers**: comment, group admission,
invitation accepted, event RSVP, event change. **Não existe trigger de DM**
(nem de convite de evento). (`20260802001400_personal_notifications.sql:11-232`)

## C10 — Denúncias

`reports`: append-only (sem policy de DELETE), com `status`,
`operator_note`, `resolved_by`, `resolved_at`. Anti-abuso: trigger
`reports_block_self` + índice único parcial (uma denúncia aberta por
reporter×alvo). (`20260802001600_reports.sql:25-150`)

## C11 — Waitlist

`waitlist`: apenas `email`, `locality_id`, `created_at`. **Sem status, sem
posição.** Escrita/leitura só `service_role`. É candidatura a outras
localidades (expansão), não fila para Manaus.
(`20260802000600_onboarding_consent_waitlist.sql:10-58`)

## C12 — Convite familiar

Status: `pending · accepted · revoked · expired`. Regras: só verified holder
cria; máx. 5 pendentes/ativas; expira em 7 dias; aceitação por token digest
cria `family_account_links` (vínculo permanente, holder ≠ family). Leitura
client-side do vínculo: somente via `private.has_accepted_family` (boolean).
Tudo mais é service_role. (`20260802000200_private_trust_family_foundation.sql:18-81`;
`20260802000400_trust_invitation_helpers.sql:5-196`)

## C13 — Dados persistidos sobre a pessoa

Persiste: `display_name`, `visibility`, consentimento (versão+data),
vínculo familiar (private), resultado de verificação (private, com
`eligibility_class`). **Nunca persiste** (por desenho): CPF cru, payload do
Portal, organização militar, posto/patente, endereço, documentos, badge
público de verificação. CPF é redigido em logs (`lib/logger.ts`).

---

## Promessas de "futuro" no SQL — estado

| Promessa | Estado |
|---|---|
| Posts group-scoped ("in future", `20260802000900:3,157`) | Cumprida (`20260805170545` + `20260805214709`) |
| Events aguardando group-membership RLS (`20260802001200:111-114`) | Cumprida (`20260805191237`) |
| `can_access_event` com branch de comunidade (`20260805191237:24-26`) | Cumprida (`20260805214709`) |
| **Notificações de DM** ("future", `20260802001400:1-4`) | **Em aberto** — nenhum trigger de DM existe |
| **Fan-out de convite de evento** (`20260806171204:9-11`) | **Em aberto** — explicitamente fora de escopo |
| Report workflow ("future", `20260802001500:6`) | Cumprida (painel `(admin)/reports`) |

## Tensões já identificadas na régua

- **T1** — hidden × co-membros de comunidade (C3) → F14.
- **T2** — DM: 4 contextos no banco, 1 na UI (C8) → F11.
- **T3** — notificações: sem categoria persistida, sem trigger de DM, sem
  fan-out de convite de evento (C9) → F12.
