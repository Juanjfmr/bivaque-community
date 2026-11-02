# Inventário de rotas, endpoints e permissões — `apps/web`

> Entregável do gate da etapa **W00** da
> [especificação funcional](../superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md)
> (§7: "inventário de endpoints/permissões"; §10: "confrontar `apps/web/app/**/page.tsx`,
> handlers, links dos menus, CTAs, notificações e links de e-mail").
>
> **Revisão confrontada:** `6d998a7` (branch `work/apos-entrada-visual`, 08/09/2026).
> **Método:** leitura estática. Não é auditoria de runtime. Arquivo existente indica ponto de
> reaproveitamento, não fluxo concluído. Onde a leitura estática não decide, está escrito.
>
> **Contagem:** 46 `page.tsx` · 16 `route.ts` · 22 arquivos com `"use server"`.

Legenda de gate: **P** = prefixo em `PUBLIC_PATHS` · **A** = sessão exigida pelo proxy ·
**M** = `my_account_kind()==='member'` · **L** = membership corrente resolvida em
`(shell)/layout.tsx` · **OP** = operador · **MOD** = moderador da comunidade · **PRV** = prestador.

---

## 1. Rotas de página

### Raiz

| URL | arquivo | gate | leitura | escrita |
|---|---|---|---|---|
| `/` | `app/page.tsx:33` | público (landing); autenticado é redirigido em `proxy.ts:94-103` para `/inicio` (com aceite) ou `/onboarding` | — | — |
| `/auth/callback-error` | `app/auth/callback-error/page.tsx:3` | **P por acidente** — `startsWith("/auth/callback")` (`proxy.ts:16`) casa também com este caminho | — | — |

### `(preauth)`

| URL | arquivo | gate | escrita principal |
|---|---|---|---|
| `/login` | `(preauth)/login/page.tsx:5` | P | `signInWithPassword` / Google (`components/bivaque-sign-in.tsx:140,151,173`) |
| `/signup` | `(preauth)/signup/page.tsx:3` | P | `signUp` + aceite versionado |
| `/recuperar-senha` | `(preauth)/recuperar-senha/page.tsx:20` | P | `resetPasswordForEmail` (`:32`) |
| `/nova-senha` | `(preauth)/nova-senha/page.tsx:21` | P | `updateUser({password})` (`:55`) |
| `/consent` | `(preauth)/consent/page.tsx:7` | P | RPC `record_consent_acceptance` (`consent/actions.ts:38`) |
| `/privacidade` · `/codigo-de-conduta` | `(preauth)/{privacidade,codigo-de-conduta}/page.tsx:12` | P | — (lê documento do disco) |
| `/onboarding` | `(preauth)/onboarding/page.tsx:26` | A (passagem em `proxy.ts:124`) | `POST /api/onboarding` — `verify-cpf` (`:135`), `join-waitlist` (`:210`) |
| `/onboarding/locality` | `(preauth)/onboarding/locality/page.tsx:20` | A | `POST /api/onboarding` action `provision` (`:133`) |
| `/onboarding/status` | `(preauth)/onboarding/status/page.tsx:17` | A | — (só redireciona) |
| `/onboarding/welcome` | `(preauth)/onboarding/welcome/page.tsx:6` | **A + M** — não está na passagem do proxy | — |
| `/prestador-convite/[token]` | `(preauth)/prestador-convite/[token]/page.tsx:7` | P por prefixo + sessão dentro da action | RPC `accept_provider_invitation` (`actions.ts:38`) |

### `(shell)` — todas exigem **A + M + L**

| URL | arquivo | leitura principal | escrita principal |
|---|---|---|---|
| `/inicio` | `(shell)/inicio/page.tsx:6` | **nenhuma (scaffold)** | **nenhuma** |
| `/explorar` | `(shell)/explorar/page.tsx:7` | **nenhuma (scaffold)** | **nenhuma** |
| `/communities` | `communities/page.tsx:11` | `locality_memberships`, `communities`, `community_memberships` | `requestCommunityMembershipAction` |
| `/communities/[id]` | `communities/[id]/page.tsx:20` | `communities`, `community_memberships`, RPC `feed_community`, `profiles` | actions de comunidade e convite |
| `/communities/[id]/invite` | `.../invite/page.tsx:14` | `getCommunityInviteDataAction` | `sendCommunityInviteAction`, `revokeCommunityInviteAction` |
| `/communities/[id]/indicar-prestador` | `.../indicar-prestador/page.tsx:9` | `communities` | RPC `create_provider_invitation` |
| `/community` | `community/page.tsx:20` (client) | `community_memberships`, `communities`, RPC `feed_community` | publicação via componentes de feed |
| `/events` | `events/page.tsx:53` (client) | `events`, `event_rsvps`, RPCs `next_occurrence`, `check_recurrence_holiday` | `events.insert/update`, `event_rsvps.upsert` |
| `/events/[id]` | `events/[id]/page.tsx:185` | `events`, `event_rsvps`, `profiles` | `setRsvpAction`, `cancelRsvpAction`, `completeEventAction` |
| `/groups` | `groups/page.tsx:98` (client) | `groups`, `group_memberships` | RPCs `create_group`, `join_group`, `approve_group_member`, moderação |
| `/groups/[id]` | `groups/[id]/page.tsx:237` | `groups`, `group_memberships`, RPC `feed_group` | join/leave/transfer/reject/remove/delete |
| `/guide` | `guide/page.tsx:25` (client) | `arrival_guide_entries` | **nenhuma** — somente leitura, não há caminho de sugestão (W05) |
| `/invite/[token]` | `invite/[token]/page.tsx:25` | RPC `is_verified_holder` | aceite do convite |
| `/localidade` | `localidade/page.tsx:28` (client) | `LocalityContext` | **nenhuma** — o seletor não persiste (`:12-14`) |
| `/messages` | `messages/page.tsx:68` (client) | `dm_conversations`, `dm_messages`, `dm_blocks`, `profiles` | bloquear/desbloquear, enviar |
| `/notifications` | `notifications/page.tsx:163` (client) | `notifications` | marcar lida (`:214,243`) |
| `/prestadores/[id]` | `prestadores/[id]/page.tsx:46` | `provider_profiles`, catálogo, portfólio, storage | abre DM |
| `/profile` | `profile/page.tsx:76` (client) | `profiles`, `locality_memberships` | `profiles.update` + avatar, interesses, preferências, convite familiar |
| `/profile/[userId]` | `profile/[userId]/page.tsx:84` | `callProfileRpc`, `profiles` | — |
| `/profile/interests` | `profile/interests/page.tsx:7` | `getUserInterestsDataAction` | `record/clearUserGroupInterestsAction` |
| `/recommendations` | `recommendations/page.tsx:116` (client) | `groups`, `events`, `recommendation_*` | `recommendation_requests.insert`, RPC `join_group` |

### `(provider)` — **A + PRV** (`proxy.ts:158-166` prende o prestador em `/prestador*`; `(provider)/layout.tsx:44` reconfere)

`/prestador` (`page.tsx:16`) · `/prestador/ficha` (`:23`) · `/prestador/catalogo` (`:39`) —
leem `provider_accounts`, `provider_profiles`, `provider_catalog_items`,
`provider_portfolio_photos`, storage `provider-photos`; escrevem por 10 actions em
`(provider)/prestador/actions.ts`.

### `(admin)` — **A + M + OP** (`(admin)/layout.tsx:40` chama `is_current_user_operator`)

`/admissions` (`page.tsx:94`) · `/arrivals` (`:20`) · `/guide-queue` (`:225`) · `/reports` (`:123`).

> **Dependência não óbvia:** o proxy exige `kind==='member'`, e `my_account_kind()`
> (`20260822014934_provider_accounts.sql:108-117`) só devolve `'member'` para quem tem linha em
> `locality_memberships`. Um operador sem membership é mandado para `/onboarding` antes de
> alcançar o layout.

### `(owner)` — **A + M + MOD** (`(owner)/communities/[id]/admin/layout.tsx:59`)

`/communities/[id]/admin` · `/admin/pending` · `/admin/moderators` · `/admin/providers`.

---

## 2. Route handlers

**Todo `/api/*` escapa do proxy** (`PUBLIC_PATHS` contém `"/api"`, `proxy.ts:20`); cada handler se
defende sozinho.

| endpoint | autenticação | negado |
|---|---|---|
| `/api/health`, `/api/manifest`, `/api/sw` | **nenhuma** | n/a |
| `/api/localities`, `/api/localities/[uf]` | **nenhuma** | `500`, `404 unknown_uf` |
| `/api/consent` | Bearer + `getUser(token)` | `401`, `500` |
| `/api/onboarding` | Bearer + `getUser` + `has_accepted_consent` (`:66`) | `401`, `403 consent is required`, `400/404/410/409`, `500` |
| `/api/onboarding/status` | Bearer + `getUser` | `401`, `500` |
| `/api/avatar/[userId]` | sessão por cookie (`:43`) | `401`, `404`, `500` |
| `/api/admin/{admissions,portal-health,rls-health}` | Bearer + `is_current_user_operator` | `401`, `403 forbidden`, `500` |
| `/api/admin/reports/[id]` | Bearer + operador | `401`, `403`, `400`, `404`, `500` |
| `/api/internal/outbox` | **segredo de worker** (`x-outbox-secret`), sem identidade de usuário | `503 not_configured`, `401`, `400`, `500` |
| `/api/internal/verification-reconcile` | **segredo de worker** (`RECONCILE_WORKER_SECRET`) | `503`, `401`, `400` |
| `/api/internal/account-deletion` | **segredo de worker** (`x-account-deletion-secret` / `ACCOUNT_DELETION_WORKER_SECRET`), sem identidade de usuário; pré-checagem do vencimento antes de qualquer passo destrutivo | `503 not_configured`, `401`, `400`; por conta: `not_found`, `not_due`, `already_purged`, `media_failed`, `auth_failed`, `finalize_failed` |
| `/auth/callback` | nenhuma; troca `code` por sessão | redireciona para `/auth/callback-error` |

---

## 3. Server Actions

**Padrão da casa, seguido pela quase totalidade:** resolver o caller com `auth.getUser()` a partir
dos cookies do servidor e passá-lo explicitamente como `p_caller_user_id` /
`p_operator_user_id` / `p_inviter_user_id` para um RPC que **reconfere**. `service_role` é
privilégio, nunca identidade.

**Nenhuma action deriva identidade de `FormData`.** `userId`/`communityId`/`targetUserId` vindos do
formulário são **alvo**, não identidade — e o RPC revalida.

### Achados

1. **`reprocessUserAction` — corrigido em `7dddcaf`.** Verificava apenas que existia *alguém*
   autenticado e chamava `verification_reconcile_step` com `service_role`. Esse RPC recebe
   `p_user_id` como **alvo**, não tem parâmetro de caller, e tem grant só para `service_role`
   (`20260820000003_verification_reconcile.sql:83,138-141`) — não conseguia reconferir. O
   comentário afirmava que o gate do `(admin)/layout` garantia o operador; **uma Server Action é
   um endpoint POST próprio e não passa por layout**. Qualquer conta autenticada disparava
   reconciliação de verificação de qualquer UUID. Correção: `requireOperatorId` confirma com
   `is_current_user_operator` antes de qualquer chamada privilegiada, nas três actions do arquivo;
   decisão isolada em `apps/web/lib/security/admissions-authz.ts` com teste positivo e negativo.
2. **`respondInviteAction`** (`events/event-invites-actions.ts:88-94`) usa `service_role` com filtro
   `.eq("invitee_user_id", userId)`. Correto hoje, mas a autorização vive no filtro da query, não
   em política — uma edição que solte esse `.eq` vira escrita irrestrita.

---

## 4. Gating de rota — `proxy.ts`

1. **`BIVAQUE_AUTH_BYPASS==="true"`** → `next()` antes de qualquer verificação (`:35-43`). Escape total.
2. **`PUBLIC_PATHS` por prefixo** (`:6-26`, teste em `:46`), com três efeitos colaterais:
   todo `/api/*` escapa; `/auth/callback-error` fica público de carona; `/landing` está na lista
   **sem rota correspondente**.
3. Cliente por cookie e `getUser()` em try/catch (`:82-88`) — erro de auth vira anônimo.
4. **Raiz** (`:94-103`): cookie de aceite decide `/inicio` ou `/onboarding`. O cookie é atalho; a
   autoridade é `has_accepted_consent` no servidor.
5. Sem sessão em rota protegida → `/login?redirect=<pathname>` (`:114-118`).
6. Passagem do onboarding (`:123-129`) cobre `/onboarding` exato, `/onboarding/status*` e
   `/onboarding/locality*` — **não** `/onboarding/welcome`.
7. **`my_account_kind()`** (`:137`); erro falha fechado em `/onboarding`.
8. `provider` → preso em `/prestador*`. `null` → roteia por `my_verification_status()`
   (`:186-201`). `member` → segue.

`(admin)` e `(owner)` **não têm gate de papel no proxy** — a autorização vive nos layouts e,
obrigatoriamente, em cada Server Action (ver achado 1).

---

## 5. Links, CTAs e controles sem efeito

- **Sino de notificações do cabeçalho é um controle morto** — `app-shell.tsx:136`,
  `<button aria-label="Notificações">` sem handler. Abaixo de `md` a sidebar não aparece, então é
  a única afordância de notificação visível. Card `SHELL-BELL-DEAD`.
- **"Configurações" aponta para `/profile`** — não existe rota de configurações; hoje é aba em
  `/profile` (`profile/page.tsx:248`). Card `SHELL-SETTINGS-LABEL`.
- **Nenhum `href="#"`** em `apps/web/app/**`.
- Todos os demais `href` de menu, CTA e navegação apontam para rota existente.

---

## 6. Notificações e e-mail

**Deep-links quebrados ou ausentes** (`notifications/page.tsx`) — card `NOTIF-DEEPLINKS`:

| tipo | destino | problema |
|---|---|---|
| `invitation_accepted` | `/profile?user={actor}` (`:143`) | `/profile` não lê `?user=`; o perfil de terceiro é `/profile/[userId]`. O link cai no próprio perfil |
| `report_resolved` | — (`default: return`, `:157`) | tem rótulo e aba, mas não navega |
| `admission_rejected` | — | ausente das três funções; exibe "nova notificação" e não navega |

Os demais (`comment`, `group_admission`, `event_*`, `direct_message`, `recommendation_reply`)
navegam para destino existente. `comment` aponta para `/community` — o feed legado, não o container
`/inicio` da navegação nova; as duas telas coexistem nesta revisão.

**E-mail** (`lib/outbox/adapters.ts`) — card `OUTBOX-INVITE-RECIPIENTS`:

- `community_invite` usa o literal **`"owner-link@local"`** como destinatário
  (`community-invite-actions.ts:140`).
- `event_invite` usa **`"event-invite:{eventId}"`** (`event-invites-actions.ts:213`), repassado cru
  para `to:` da Resend (`adapters.ts:120`).
- `community_invite`, `family_invite` e `event_invite` **não carregam deep-link** no corpo, embora
  `/invite/[token]` e `/events/[id]` existam. Só `provider_invite` monta link (`adapters.ts:71-86`).
- Sem `RESEND_API_KEY` o canal fica indisponível e as linhas reciclam (`adapters.ts:2-12,105`) —
  deliberado, não silencioso.

---

## 7. Placeholders — dívida do gate G1

| arquivo | ocorrência | situação |
|---|---|---|
| `(shell)/inicio/page.tsx:11` | "Conteúdo em construção (prancha 01)" | Scaffold de W00. Fecha em **W03**. Card `RECON-W00-PLACEHOLDERS` |
| `(shell)/explorar/page.tsx:12` | "Conteúdo em construção (prancha 61)" | Scaffold de W00. Fecha em **W02**. Mesmo card |
| `(shell)/guide/page.tsx:199` | "O guia desta cidade está em construção…" | **Não é placeholder** — é estado vazio de tela que lê dados reais. A dívida ali é a ausência de caminho de sugestão (W05) |

Nenhuma ocorrência de `href="#"`, `TODO`, `FIXME` ou `coming soon` em `apps/web/app/**`.
`tests/unit/ui/empty-promises.test.ts` já reprova a promessa vazia em qualquer arquivo do diretório
— foi ele que barrou o stub de `/salvos`.

---

## 8. Não determinado por leitura estática

- Se operadores e moderadores sempre possuem `locality_memberships` (pré-requisito imposto pelo
  proxy para alcançar `(admin)`/`(owner)`).
- O veredito das políticas RLS que autorizam as escritas feitas pelo cliente autenticado em
  `/events`, `/groups`, `/messages`, `/recommendations` e nas actions de prestador. Este inventário
  registra qual tabela é tocada por qual cliente, não se a política permite.
- Se `NEXT_PUBLIC_SITE_URL` está configurado no ambiente-alvo — decide se o único e-mail com link
  (`provider_invite`) aponta para `127.0.0.1`.
