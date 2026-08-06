# Family invite access contract — Implementation Plan

> **Para quem executa (humano ou agente):** este plano é autocontido e não
> depende de nenhuma ferramenta específica. Execute **uma task por vez**, na
> ordem. Marque os checkboxes (`- [ ]`) conforme avança.
>
> Regra de parada: se um step de verificação não produzir a saída esperada,
> **pare e investigue** antes de seguir.

**Goal:** Fechar o ciclo do titular no convite familiar (MAP §4 3b).
Hoje o `/profile` mostra um cartão placeholder "Em breve" para
"Convites de família". O titular não pode enviar nem revogar
convites — o ciclo dele nunca fecha. O convidado já tem fluxo (Onda 2
3a — o `accept` via `private.accept_family_invitation` no
`/onboarding`).

**Architecture:** Camada mista:
- **DB (migration):** 2 funções wrapper `public.*` que delegam para
  `private.create_family_invitation` e `private.revoke_family_invitation`.
  Mesmo padrão da Onda 1 (`public.is_current_user_operator`) — o caller
  passa `p_inviter_user_id` (já validado via cookie auth no Server
  Action), e a função confere a regra de "apenas verified holders" e
  "máximo 5 ativos". Granted só a `service_role`.
- **App (Server Actions):** 2 actions inline em `/profile/page.tsx`:
  `sendFamilyInviteAction` (gera token+digests client-side via
  Web Crypto, chama a RPC) e `revokeFamilyInviteAction` (deleta).
- **UI (componente):** Substituir o cartão "Em breve" por um form
  "Convidar membro da família" + uma lista de convites pendentes com
  botão "Revogar".

**Subdivisões resolvidas (per MAP §4):**
- **3b** — Envio (titular). O titular pode convidar até 5 membros
  da família (limite de 5 convites ativos simultâneos, prazo de 7
  dias cada).

**Subdivisões explicitamente fora desta onda:**
- **3a** (aceitação pelo convidado) — já DONE em Onda 2.
- Migração `add_to_waitlist` ou similar — não escopo aqui.

**Tech Stack:** Next.js 16 Server Actions, Supabase JS v2
service_role client, `crypto.subtle.digest` (Web Crypto) no
cliente para gerar SHA-256 dos digests, `bytea` no Postgres
(recebido via `\\x` + hex no JS).

**Fontes:**
- [`docs/journeys/MAP.md`](../journeys/MAP.md) §0.1 [C3], §4 linhas
  3a/3b, §10.1 (Onda 3).
- `supabase/migrations/20260802000400_trust_invitation_helpers.sql` —
  funções `private.create_family_invitation`,
  `private.revoke_family_invitation`,
  `private.accept_family_invitation`. **Tudo já está lá** (per
  [C3] em §10.1).
- `apps/web/app/components/bivaque/segment-fallbacks.tsx` — padrão de
  fallbacks (usado em Onda 6, mesmo import).
- `apps/web/app/(preauth)/onboarding/page.tsx` (Onda 2 Task 1) —
  como `accept_family_invitation_andProvision` chama o RPC via
  service_role. Usar o mesmo padrão aqui.

---

## Contexto obrigatório antes de começar

### Ciclo de trabalho

```bash
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 exec supabase db reset --local
npx pnpm@11.18.0 test:db
npx pnpm@11.18.0 build
npx pnpm@11.18.0 exec supabase db lint --local --level error
```

`db:reset` aqui porque há migration nova. `build` para refrescar
`typedRoutes` antes de checar typecheck do lado do app.

### Falsos positivos conhecidos

**1. `database.generated.ts` em UTF-16.** typecheck vermelho no
`database.generated.ts(5,60)` — pré-existente, sem regressão.

**2. O `private.create_family_invitation` exige `p_inviter_user_id`
ser um verified holder.** Se a migration foi aplicada antes de
qualquer usuário ser verificado, o teste pgTAP precisa inserir um
verification_outcome antes de chamar a função — o mesmo padrão da
fundação (002).

**3. `crypto.subtle` exige HTTPS ou localhost.** O `localhost` é
considerado "secure context" pelo browser, então funciona em
dev. Em produção precisa de HTTPS, mas isso já é requirement do
projeto.

### Regras que não podem ser violadas

- **Token digest nunca trafega em claro.** O `p_token_digest` é
  SHA-256(token_raw). O `token_raw` vive no email que o titular
  envia ao convidado (no MVP: linkado na URL). A função privada
  valida via digest match.
- **Email digest idem.** O `p_invitee_email_digest` é SHA-256(email).
  Usado para a regra "apenas um convite aberto por par
  inviter+email" no futuro (a constraint atual é só por
  inviter+target_id+open).
- **Nunca expor `private.*` a `authenticated` direto.** Toda
  invocação client-side passa por `public.*` (security definer) que
  valida `p_inviter_user_id` contra o caller via Server Action.
  Mesmo padrão da Onda 1 — fronteira `private` é o núcleo do
  modelo de privacidade.
- **Sem `@ts-ignore` / `as any`.** Typecheck é gate real.

---

## Estrutura de arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/<ts>_family_invite_wrappers.sql` | **Cria.** 2 funções `public.*` security definer. |
| `supabase/tests/family-invite-wrappers.sql` | **Cria.** 4 testes pgTAP. |
| `apps/web/app/(shell)/profile/page.tsx` | **Modifica.** Substitui card placeholder; adiciona form de envio + lista de pendentes. |

---

## Task 1: Wrappers `public.*`

**Files:**
- Create: `supabase/migrations/<ts>_family_invite_wrappers.sql`

- [ ] **Step 1: Criar migration via CLI**

```bash
npx pnpm@11.18.0 exec supabase migration new family_invite_wrappers
```

- [ ] **Step 2: Conteúdo da migration**

```sql
-- 030: Public wrappers for the family invite write path.
--
-- private.create_family_invitation and private.revoke_family_invitation
-- are security definer in the private schema, granted only to
-- service_role. They expect p_inviter_user_id to be the verified
-- holder doing the action. The (shell)/profile UI calls them through
-- these public wrappers via Server Actions, passing the caller
-- (already validated by cookie auth). Caller responsibility: ensure
-- the user_id you pass is the same as the one in the session.

create function public.create_family_invitation(
  p_inviter_user_id uuid,
  p_token_digest bytea,
  p_invitee_email_digest bytea
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.create_family_invitation(
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest
  );
$$;

revoke all on function public.create_family_invitation(uuid, bytea, bytea) from public;
revoke all on function public.create_family_invitation(uuid, bytea, bytea) from anon;
revoke all on function public.create_family_invitation(uuid, bytea, bytea) from authenticated;

grant execute on function public.create_family_invitation(uuid, bytea, bytea) to service_role;

create function public.revoke_family_invitation(
  p_invitation_id uuid,
  p_inviter_user_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.revoke_family_invitation(
    p_invitation_id,
    p_inviter_user_id
  );
$$;

revoke all on function public.revoke_family_invitation(uuid, uuid) from public;
revoke all on function public.revoke_family_invitation(uuid, uuid) from anon;
revoke all on function public.revoke_family_invitation(uuid, uuid) from authenticated;

grant execute on function public.revoke_family_invitation(uuid, uuid) to service_role;
```

- [ ] **Step 3: db:reset + test:db + db:lint**

```bash
npx pnpm@11.18.0 exec supabase db reset --local
npx pnpm@11.18.0 test:db
npx pnpm@11.18.0 exec supabase db lint --local --level error
```

Esperado: testes existentes (661) + 4 novos = 665 verde, db:lint
clean (erros preexistentes do pgtap extensions schema, sem regressão).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat(db): public wrappers for family invite write path (Onda 3 Task 1)"
```

---

## Task 2: Testes pgTAP

**Files:**
- Create: `supabase/tests/family-invite-wrappers.sql`

- [ ] **Step 1: Conteúdo do teste**

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

\ir fixtures/foundation.inc

-- create a verified holder fixture (already in foundation.inc as 00000001)
-- insert a raw email + token
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-00000000000b', 'invitee-1@example.invalid');

reset role;

-- ── Positive: service_role creates a valid invitation ─────────────────────

select is(
  length(public.create_family_invitation(
    '10000000-0000-4000-8000-000000000001'::uuid,
    decode(repeat('ab', 32), 'hex'),
    decode(repeat('cd', 32), 'hex')
  )),
  36::integer,
  'create_family_invitation returns a uuid (length 36)'
);

-- ── Positive: revoke of pending invitation returns void ──────────────────

select lives_ok(
  $$
    select public.revoke_family_invitation(
      (select id from private.family_invitations
       where inviter_user_id = '10000000-0000-4000-8000-000000000001'
         and status = 'pending' limit 1),
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'revoke_family_invitation succeeds on a pending invitation'
);

-- ── Negative: anonymous cannot create ────────────────────────────────────

set local role anon;
select throws_ok(
  $$
    select public.create_family_invitation(
      '10000000-0000-4000-8000-000000000001'::uuid,
      decode(repeat('ef', 32), 'hex'),
      decode(repeat('01', 32), 'hex')
    )
  $$,
  '42501',
  null,
  'anonymous cannot call create_family_invitation (insufficient_privilege)'
);

-- ── Negative: an unverified user_id is rejected by the private guard ──────

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
-- 00000005 = non-member from foundation.inc, no verification_outcome row
select throws_ok(
  $$
    select public.create_family_invitation(
      '10000000-0000-4000-8000-000000000005'::uuid,
      decode(repeat('34', 32), 'hex'),
      decode(repeat('56', 32), 'hex')
    )
  $$,
  'P0001',
  'only verified holders can create%',
  'unverified inviter is rejected by the underlying private guard'
);

select * from finish();
rollback;
```

- [ ] **Step 2: Re-rodar test:db**

```bash
npx pnpm@11.18.0 test:db
```

Esperado: 4 testes novos verdes (665 total).

- [ ] **Step 3: Commit (junto com Task 1 não — esse teste vai no
próximo commit se for junto, ou aqui)**

```bash
git add supabase/tests/family-invite-wrappers.sql
git commit -m "test(db): pgTAP for family invite public wrappers (Onda 3 Task 2)"
```

---

## Task 3: UI no `/profile` (enviar + revogar)

**Files:**
- Modify: `apps/web/app/(shell)/profile/page.tsx`

- [ ] **Step 1: Ler o estado atual de `profile/page.tsx` para entender
  a estrutura de Server Actions e estado local já existente

- [ ] **Step 2: Substituir o card "Em breve" (linha 402-407 do
  onboarding/page.tsx original; no profile/page.tsx atual a linha
  é diferente — buscar via grep) por 2 Server Components:

  1. `FamilyInviteForm` — input email + botão "Enviar convite".
     O form action é `sendFamilyInviteAction`.
  2. `PendingInvitesList` — server-side query
     `private.family_invitations where inviter_user_id = currentUser
     and status = 'pending' and expires_at > now()`, renderiza
     cada linha com botão "Revogar" que é um form
     `revokeFamilyInviteAction`.

- [ ] **Step 3: Definir as 2 Server Actions (com `"use server"`):**

```ts
async function sendFamilyInviteAction(formData: FormData) {
  "use server"
  // 1. get user from session
  // 2. call public.create_family_invitation(user.id, token_digest, email_digest)
  //    where token_digest and email_digest come from the form
  //    (client-side, via the form's hidden inputs)
  // 3. revalidatePath("/profile")
}

async function revokeFamilyInviteAction(formData: FormData) {
  "use server"
  // 1. get user from session
  // 2. call public.revoke_family_invitation(invitationId, user.id)
  // 3. revalidatePath("/profile")
}
```

- [ ] **Step 4: typecheck + lint + commit**

```bash
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 lint
git add 'apps/web/app/(shell)/profile/page.tsx'
git commit -m "feat(profile): family invite send and revoke UI (Onda 3 Task 3)"
```

---

## Task 4: Audit visual §10.2

- [ ] Adicionar `/profile` em `scripts/visual/capture.mjs` (com
  `auth: true` — a página exige login).
- [ ] Rodar `node scripts/visual/loop.mjs`.
- [ ] Escrever `docs/agents/VISUAL_AUDIT-<data>-family-invite.md`
  com veredito tela-a-tela, focado no card de convite familiar.

---

## Fora deste plano

- Lista de links aceitos (subdivisão 9a — "lista de quem aceitou
  meus convites") — fora do escopo de 3b.
- Notificação ao convidado quando o convite é enviado
  (`notifications` type para `family_invite_sent`) — onda de
  notificações.
- Notificação ao titular quando o convidado aceita — mesma onda.