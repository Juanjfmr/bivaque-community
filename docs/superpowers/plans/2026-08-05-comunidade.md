# Comunidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar a entidade Comunidade — camada opcional entre localidade e grupo (Vilas, Turmas) com feed próprio, grupos e eventos internos que nunca aparecem para a cidade.

**Architecture:** Quatro migrations. A 1 cria as entidades isoladas (nenhuma coluna de escopo ainda, portanto nenhum vazamento possível). A 2 é a crítica e **atômica**: adiciona `community_id` em `groups`/`posts`/`events` junto com **todas** as policies que a leem, mais os três triggers de invariante — é a migration que carrega a garantia do Padrão 6. A 3 traz as funções de feed set-based. A 4 traz as RPCs. Escopo é exclusivo (`group_id` XOR `community_id`) e herdado transitivamente: pertencer a um grupo dentro de uma comunidade exige membership aprovada nela.

**Tech Stack:** PostgreSQL 15 (Supabase), RLS forçada em toda tabela, helpers `security definer` com `set search_path = ''`, pgTAP para teste, pnpm workspace, Supabase CLI 2.107.0 via Docker.

**Spec:** [`docs/superpowers/specs/2026-08-05-comunidade-design.md`](../specs/2026-08-05-comunidade-design.md)

---

## Contexto obrigatório antes de começar

Leia antes da Task 1:

- `AGENTS.md` — comandos, guard-rails, fronteira de privacidade do schema `private`
- `supabase/migrations/20260802001000_groups_moderation.sql` — o modelo que estamos espelhando
- `supabase/migrations/20260805170545_fix_post_scope_leak.sql` — o helper que vamos estender
- `supabase/tests/post-scope-leak.sql` — o estilo de teste de negação esperado

### Ciclo de trabalho

`supabase test db` roda **toda** a suíte (≈4s). Uma migration nova só entra depois de `db:reset`. Então o ciclo de cada task é:

```bash
npx pnpm@11.18.0 exec supabase start
npx pnpm@11.18.0 db:reset
npx pnpm@11.18.0 test:db
```

`db:reset` leva ~30s e **apaga os dados locais** — é local-only, nunca `--linked`.

Para iterar num arquivo só, mais rápido que a suíte inteira:

```bash
docker exec -i supabase_db_bivaque-community psql -U postgres -d postgres -f - < supabase/tests/community-scope.sql
```

### Regras que não podem ser violadas

- **Nunca editar migration já aplicada.** Criar nova com `npx pnpm@11.18.0 exec supabase migration new <nome>`.
- **Toda função nova:** `security definer` + `set search_path = ''` + `revoke all` de `public`/`anon`/`authenticated` antes do `grant` explícito.
- **Toda tabela nova:** `enable row level security` **e** `force row level security`.
- **Nunca alterar** `profiles_select_*` — a policy de comunidade é **adicional** (§8.2 do spec).
- **Nunca gerar tipos do schema `private`:** `supabase gen types --schema public` apenas.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/<ts>_communities_foundation.sql` | Enums, `communities`, `community_memberships`, RLS, grants, `is_community_member`, `is_community_moderator` |
| `supabase/migrations/<ts>_community_scope.sql` | **Atômica.** `community_id` em groups/posts/events, constraints I1/I2, triggers I3/D7/D8, `can_access_post_scope` v2, policies reescritas, `feed_posts` restringida, policy aditiva em `profiles` |
| `supabase/migrations/<ts>_community_feeds.sql` | `feed_community`, `feed_group`, `feed_posts` convertida para set-based |
| `supabase/migrations/<ts>_community_rpcs.sql` | `create_community`, membership, moderação, `create_group` com `p_community_id` |
| `supabase/tests/fixtures/communities.inc` | **Duas** comunidades, grupos internos, posts. Sem duas, o caso 15 passa por acidente |
| `supabase/tests/community-scope.sql` | Casos 1–20 da matriz |
| `supabase/tests/community-rpcs.sql` | RPCs: caminhos positivos e negativos |
| `supabase/tests/community-feeds.sql` | Casos 8, 9, 10, 14 |
| `supabase/tests/event-rsvp-scope.sql` | Escopo de RSVP (ver correção do caso 21 abaixo) |

### Correção ao caso 21 do spec

O spec §9 registra o caso 21 como *"evento de comunidade notifica a cidade →
negado"*, assumindo que existe fan-out de evento para a localidade. **Não
existe.** As funções de notificação são `notify_comment`,
`notify_group_admission`, `notify_event_rsvp` (avisa só o organizador) e
`notify_event_change` (avisa só quem deu RSVP).

O vazamento real está em `event_rsvps`, cujas policies checam apenas
`private.is_event_locality_member` e ignoram `group_id` — o mesmo bug que a
migration 017 corrigiu em `events` e deixou passar aqui. Ele existe **hoje**,
independentemente de comunidade. A Task 5 corrige isso.

---

## Task 1: Entidades base

**Files:**
- Create: `supabase/migrations/<ts>_communities_foundation.sql`
- Create: `supabase/tests/fixtures/communities.inc`
- Create: `supabase/tests/community-scope.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```bash
npx pnpm@11.18.0 exec supabase migration new communities_foundation
```

- [ ] **Step 2: Escrever a fixture**

Criar `supabase/tests/fixtures/communities.inc`. Duas comunidades na mesma localidade de Manaus (`00000000-0000-4000-8000-000000000001`).

Atores vindos de `foundation.inc`: `001` member-one, `002` member-two, `003` other-locality, `004` hidden-member (perfil `hidden`), `005` non-member.

```sql
insert into public.communities (
  id, locality_id, name, description, created_by, owner_user_id
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Vila Ajuricaba',
    'Moradores da vila',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'Vila Vizinha',
    'Outra vila da mesma cidade',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  );

insert into public.community_memberships (community_id, user_id, role, status)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'member', 'approved'),
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'member', 'pending'),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'member', 'approved');
```

Mapa dos atores, para consultar ao escrever asserts:

| Ator | Vila A (Ajuricaba) | Vila B (Vizinha) |
|---|---|---|
| `001` member-one | owner, approved | — |
| `002` member-two | **pending** | approved |
| `004` hidden-member | approved (perfil `hidden`) | — |
| `005` non-member | — | — |
| `003` other-locality | outra localidade | — |

- [ ] **Step 3: Escrever o teste que falha**

Criar `supabase/tests/community-scope.sql` com apenas os casos desta task. Os demais entram nas tasks seguintes.

```sql
begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from public.communities where id = '70000000-0000-4000-8000-000000000001' $$,
  'membro da localidade descobre a comunidade (metadado publico)'
);

select isnt_empty(
  $$ select 1 from public.community_memberships
     where community_id = '70000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000001' $$,
  'membro aprovado ve a lista completa de membros'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from public.community_memberships
     where community_id = '70000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000004' $$,
  'membro pending nao ve a lista de membros'
);

select isnt_empty(
  $$ select 1 from public.community_memberships
     where community_id = '70000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000002' $$,
  'membro pending ve a propria linha'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.communities',
  'nao-membro da localidade nao descobre comunidade alguma'
);

select is_empty(
  'select 1 from public.community_memberships',
  'nao-membro nao ve membership alguma'
);

select * from finish();
rollback;
```

- [ ] **Step 4: Rodar e confirmar que falha**

```bash
npx pnpm@11.18.0 db:reset && npx pnpm@11.18.0 test:db
```

Esperado: FAIL com `relation "public.communities" does not exist`.

- [ ] **Step 5: Escrever a migration**

```sql
-- 019: Community entity — the optional belonging circle between locality and group.
-- Membership is by circumstance (you live in the vila, you were in that turma),
-- never by interest — interest is what groups are for.
-- No visibility column: a public community would be a contradiction. Every
-- community behaves as private — metadata discoverable, content gated.
-- All functions use set search_path = '' to prevent search-path injection.

create type public.community_membership_role as enum (
  'member',
  'moderator',
  'owner'
);

create type public.community_membership_status as enum (
  'pending',
  'approved'
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  locality_id uuid not null references public.localities (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 80),
  description text check (description is null or char_length(description) between 1 and 500),
  created_by uuid not null references auth.users (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, locality_id)
);

create index communities_locality_idx
  on public.communities (locality_id) where is_deleted = false;

create table public.community_memberships (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.community_membership_role not null default 'member',
  status public.community_membership_status not null default 'pending',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index community_memberships_user_idx
  on public.community_memberships (user_id) where status = 'approved';

alter table public.communities enable row level security;
alter table public.communities force row level security;
alter table public.community_memberships enable row level security;
alter table public.community_memberships force row level security;

revoke all on table public.communities from anon, authenticated;
revoke all on table public.community_memberships from anon, authenticated;

grant select on table public.communities to authenticated;
grant select on table public.community_memberships to authenticated;

grant select, insert, update on table public.communities to service_role;
grant select, insert, update, delete on table public.community_memberships to service_role;

create function private.is_community_member(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_memberships
    where community_id = p_community_id
      and user_id = (select auth.uid())
      and status = 'approved'
  );
$$;

revoke all on function private.is_community_member(uuid) from public;
revoke all on function private.is_community_member(uuid) from anon;
revoke all on function private.is_community_member(uuid) from authenticated;
grant execute on function private.is_community_member(uuid) to authenticated;

create function private.is_community_moderator(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_memberships
    where community_id = p_community_id
      and user_id = (select auth.uid())
      and status = 'approved'
      and role in ('moderator', 'owner')
  );
$$;

revoke all on function private.is_community_moderator(uuid) from public;
revoke all on function private.is_community_moderator(uuid) from anon;
revoke all on function private.is_community_moderator(uuid) from authenticated;
grant execute on function private.is_community_moderator(uuid) to authenticated;

-- SELECT on communities: metadata is discoverable by any locality member so
-- they can find the vila and request entry. Content gating lives elsewhere.
create policy communities_select_locality_member
on public.communities
for select
to authenticated
using (
  private.is_locality_member(locality_id)
  and is_deleted = false
);

-- No INSERT / UPDATE / DELETE policy for authenticated. Provisioning is
-- service_role only (spec §7.1) and removal is is_deleted, never DELETE.

-- SELECT on memberships: approved members see the whole roster (spec D9),
-- and everyone sees their own row so a pending request is visible to its author.
create policy community_memberships_select_comember
on public.community_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_community_member(community_id)
);

-- No INSERT / UPDATE / DELETE policy for authenticated: all mutation goes
-- through the RPCs added in the community_rpcs migration.
```

- [ ] **Step 6: Rodar e confirmar que passa**

```bash
npx pnpm@11.18.0 db:reset && npx pnpm@11.18.0 test:db && npx pnpm@11.18.0 db:lint
```

Esperado: `All tests successful.` e `No schema errors found`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat(community): add community entity, memberships and RLS"
```

---

## Task 2: Escopo — a migration atômica

Esta task é maior que as outras de propósito. A coluna de escopo e **todas** as policies que a leem entram no mesmo arquivo e no mesmo commit. Foi exatamente por separar as duas coisas que `posts.group_id` ficou nove migrations vazando.

**Files:**
- Create: `supabase/migrations/<ts>_community_scope.sql`
- Modify: `supabase/tests/fixtures/communities.inc`
- Modify: `supabase/tests/community-scope.sql`

- [ ] **Step 1: Criar o arquivo**

```bash
npx pnpm@11.18.0 exec supabase migration new community_scope
```

- [ ] **Step 2: Estender a fixture com grupos e posts internos**

Anexar ao final de `supabase/tests/fixtures/communities.inc`:

```sql
insert into public.groups (
  id, name, description, visibility, locality_id, community_id, created_by, owner_user_id
)
values
  (
    '80000000-0000-4000-8000-000000000001',
    'Vendas da vila',
    'Repasses entre moradores',
    'public',
    '00000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '80000000-0000-4000-8000-000000000002',
    'Sindicos',
    'Coordenacao interna',
    'private',
    '00000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  );

insert into public.groups (
  id, name, description, visibility, locality_id, community_id, created_by, owner_user_id
)
values (
  '80000000-0000-4000-8000-000000000003',
  'Jardinagem',
  'Grupo criado por um morador comum',
  'public',
  '00000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000004'
);

insert into public.group_memberships (group_id, user_id, role, status)
values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', 'owner', 'approved');

insert into public.posts (
  id, locality_id, user_id, community_id, post_type, content, created_at
)
values (
  '90000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'text',
  'Caiu a agua na quadra 3',
  '2026-08-04 09:00:00+00'
);

insert into public.posts (
  id, locality_id, user_id, group_id, post_type, content, created_at
)
values
  (
    '90000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000001',
    'text',
    'Passo a geladeira em marco',
    '2026-08-04 10:00:00+00'
  ),
  (
    '90000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000002',
    'text',
    'Reuniao de coordenacao quinta',
    '2026-08-04 11:00:00+00'
  );
```

Atenção ao `CHECK` de conteúdo proibido (`post_no_forbidden_terms`): evite as palavras `venda`, `compra`, `comercial`, `OM`, `CPF`, `CEP`, `patente`, `video`, `marketplace`. Os textos acima já respeitam isso — `Vendas` no **nome do grupo** é permitido porque o CHECK só cobre `content` de posts e comentários.

- [ ] **Step 3: Escrever os testes que falham**

Substituir `select plan(6);` por `select plan(23);` e inserir os casos abaixo antes de `select * from finish();`.

```sql
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from public.posts where id = '90000000-0000-4000-8000-000000000001' $$,
  'caso 13: membro da vila le post do nivel da vila'
);

select isnt_empty(
  $$ select 1 from public.posts where id = '90000000-0000-4000-8000-000000000003' $$,
  'caso 5b: membro do grupo privado interno le seu post'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from public.posts where id = '90000000-0000-4000-8000-000000000002' $$,
  'caso 5: membro da vila le post de grupo publico interno'
);

select is_empty(
  $$ select 1 from public.posts where id = '90000000-0000-4000-8000-000000000003' $$,
  'caso 4: membro da vila nao le grupo privado interno onde nao esta'
);

select throws_ok(
  $$
    insert into public.group_memberships (group_id, user_id, role, status)
    values (
      '80000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000004',
      'member',
      'approved'
    )
  $$,
  null,
  null,
  'caso 7b: membro da vila nao entra sozinho em grupo privado interno'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from public.posts where id = '90000000-0000-4000-8000-000000000001' $$,
  'caso 3: membro pending nao le conteudo da vila'
);

select is_empty(
  $$ select 1 from public.posts where id = '90000000-0000-4000-8000-000000000002' $$,
  'casos 2 e 15: membro da localidade fora da vila A nao le grupo publico interno dela'
);

select throws_ok(
  $$
    insert into public.group_memberships (group_id, user_id, role, status)
    values (
      '80000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'member',
      'approved'
    )
  $$,
  null,
  null,
  'caso 7: entrar em grupo da vila sem membership aprovada na vila e negado'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from public.posts where community_id is not null $$,
  'caso 1: nao-membro nao le post do nivel da vila'
);

set local role postgres;

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, community_id, group_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001',
      '80000000-0000-4000-8000-000000000001',
      'text',
      'Escopo duplo'
    )
  $$,
  '23514',
  null,
  'caso 11: post com group_id e community_id e rejeitado pelo CHECK'
);

select throws_ok(
  $$
    insert into public.groups (name, visibility, locality_id, community_id, created_by, owner_user_id)
    values (
      'Grupo cruzado',
      'public',
      '00000000-0000-4000-8000-000000000002',
      '70000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '23503',
  null,
  'caso 12: grupo de comunidade em outra localidade e rejeitado pela FK composta'
);

select throws_ok(
  $$
    update public.groups
    set community_id = '70000000-0000-4000-8000-000000000002'
    where id = '80000000-0000-4000-8000-000000000001'
  $$,
  null,
  null,
  'caso 17: mover grupo entre comunidades e bloqueado mesmo como postgres'
);

select lives_ok(
  $$
    delete from public.community_memberships
    where community_id = '70000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'remocao de membro da comunidade executa'
);

select is_empty(
  $$
    select 1 from public.group_memberships
    where user_id = '10000000-0000-4000-8000-000000000004'
      and group_id in ('80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002')
  $$,
  'caso 6: cascata remove das memberships dos grupos internos'
);

select results_eq(
  $$
    select owner_user_id from public.groups
    where id = '80000000-0000-4000-8000-000000000003'
  $$,
  $$ values ('10000000-0000-4000-8000-000000000001'::uuid) $$,
  'caso 16: grupo do removido transfere para o dono da comunidade, nao fica orfao'
);

select isnt_empty(
  $$
    select 1 from public.group_memberships
    where group_id = '80000000-0000-4000-8000-000000000003'
      and user_id = '10000000-0000-4000-8000-000000000001'
      and role = 'owner'
      and status = 'approved'
  $$,
  'caso 16b: o novo dono ganha membership de owner no grupo transferido'
);
```

E os dois casos de perfil oculto, que dependem da policy aditiva em `profiles`.
O ator `004` tem `visibility = 'hidden'` na `foundation.inc` e é membro
aprovado da vila A; o ator `002` é membro da localidade mas **não** da vila A.

```sql
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$
    select 1 from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'caso 19: co-membro aprovado ve o perfil oculto de outro membro da vila'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'caso 20: membro da cidade fora da vila continua sem ver o perfil oculto'
);
```

> Os casos 19 e 20 precisam rodar **antes** do bloco de cascata, porque a
> remoção de `004` da comunidade desfaz a co-membership que o caso 19 testa.
> Posicione-os logo após os asserts de leitura de post e antes do
> `set local role postgres;`.

- [ ] **Step 4: Rodar e confirmar que falha**

```bash
npx pnpm@11.18.0 db:reset && npx pnpm@11.18.0 test:db
```

Esperado: FAIL com `column "community_id" of relation "groups" does not exist`.

- [ ] **Step 5: Escrever a migration**

```sql
-- 020: Community scope on the content surface. ATOMIC BY DESIGN.
-- The scope column and every policy that reads it land in the same migration.
-- posts.group_id shipped in 009 with a policy comment promising group scoping
-- "in future"; that future arrived nine migrations later as a P0 leak (018).
-- Not repeating it.
--
-- Access rule — "public" is relative to the container:
--   group without community + public  -> locality members
--   group without community + private -> group members
--   group in community C   + public   -> members of C
--   group in community C   + private  -> group members
--
-- Scope is exclusive (group_id XOR community_id) and inherited transitively:
-- membership in a group inside a community requires approved community
-- membership, so is_group_member already implies community membership.

alter table public.groups
  add column community_id uuid references public.communities (id) on delete restrict;

alter table public.groups
  add constraint groups_community_same_locality
  foreign key (community_id, locality_id)
  references public.communities (id, locality_id);

alter table public.posts
  add column community_id uuid references public.communities (id) on delete restrict;

alter table public.posts
  add constraint posts_community_same_locality
  foreign key (community_id, locality_id)
  references public.communities (id, locality_id);

alter table public.posts
  add constraint posts_single_scope
  check (num_nonnulls(group_id, community_id) <= 1);

alter table public.events
  add column community_id uuid references public.communities (id) on delete restrict;

alter table public.events
  add constraint events_community_same_locality
  foreign key (community_id, locality_id)
  references public.communities (id, locality_id);

alter table public.events
  add constraint events_single_scope
  check (num_nonnulls(group_id, community_id) <= 1);

create index groups_community_idx on public.groups (community_id);
create index posts_community_idx on public.posts (community_id, created_at desc);
create index events_community_idx on public.events (community_id);

-- ── D8: groups.community_id is immutable for every role ──────────────────────
-- Unlike block_authenticated_soft_delete in 016, service_role gets no escape
-- hatch: moving a group without reconciling memberships produces exactly the
-- leak this rule prevents. An escape hatch that produces the bug is not a hatch.

create function private.block_group_community_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'groups.community_id is immutable';
end;
$$;

create trigger block_group_community_change_trigger
before update of community_id on public.groups
for each row
when (new.community_id is distinct from old.community_id)
execute function private.block_group_community_change();

-- ── I3: group membership inside a community requires community membership ────

create function private.enforce_group_community_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_community_id uuid;
begin
  select community_id into v_community_id
  from public.groups
  where id = new.group_id;

  if v_community_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.community_memberships
    where community_id = v_community_id
      and user_id = new.user_id
      and status = 'approved'
  ) then
    raise exception 'group belongs to a community the user is not an approved member of';
  end if;

  return new;
end;
$$;

create trigger enforce_group_community_membership_trigger
before insert or update on public.group_memberships
for each row
execute function private.enforce_group_community_membership();

-- ── D7: leaving a community cascades out of its groups ───────────────────────
-- Groups the leaver owned transfer to the community owner, who is NOT NULL and
-- therefore always exists. Removal never fails: a rule that blocks removal
-- would turn group ownership into a shield against expulsion.

create function private.cascade_community_membership_loss()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_user_id uuid;
begin
  select owner_user_id into v_owner_user_id
  from public.communities
  where id = old.community_id;

  if old.user_id = v_owner_user_id then
    raise exception 'transfer community ownership before removing the owner';
  end if;

  update public.groups g
  set owner_user_id = v_owner_user_id
  where g.community_id = old.community_id
    and g.owner_user_id = old.user_id;

  insert into public.group_memberships (group_id, user_id, role, status)
  select g.id, v_owner_user_id, 'owner', 'approved'
  from public.groups g
  where g.community_id = old.community_id
    and g.owner_user_id = v_owner_user_id
  on conflict (group_id, user_id)
  do update set role = 'owner', status = 'approved';

  delete from public.group_memberships gm
  using public.groups g
  where gm.group_id = g.id
    and g.community_id = old.community_id
    and gm.user_id = old.user_id;

  return old;
end;
$$;

create trigger cascade_community_membership_loss_trigger
after delete on public.community_memberships
for each row
execute function private.cascade_community_membership_loss();

create function private.cascade_community_membership_downgrade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.group_memberships gm
  using public.groups g
  where gm.group_id = g.id
    and g.community_id = new.community_id
    and gm.user_id = new.user_id;

  return new;
end;
$$;

create trigger cascade_community_membership_downgrade_trigger
after update of status on public.community_memberships
for each row
when (old.status = 'approved' and new.status <> 'approved')
execute function private.cascade_community_membership_downgrade();

-- ── Scope helper v2 ──────────────────────────────────────────────────────────
-- ORDER MATTERS. RLS policies create a hard dependency on the functions they
-- call, so DROP FUNCTION fails with "other objects depend on it" while any
-- policy still references it. Every dependent policy comes down first, then
-- the helpers, then everything is recreated. Do not reorder these blocks.

drop policy posts_select_locality_member on public.posts;
drop policy posts_insert_locality_member on public.posts;
drop policy comments_select_via_post on public.comments;
drop policy comments_insert_member on public.comments;
drop policy post_reactions_select_locality_member on public.post_reactions;
drop policy post_reactions_insert_locality_member on public.post_reactions;
drop policy post_saves_insert_own on public.post_saves;
drop function if exists public.feed_posts(uuid, text);

drop function private.can_access_post(uuid);
drop function private.can_access_post_scope(uuid, uuid);

create function private.can_access_post_scope(
  p_locality_id uuid,
  p_community_id uuid,
  p_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_locality_member(p_locality_id)
    and (
      p_community_id is null
      or private.is_community_member(p_community_id)
    )
    and (
      p_group_id is null
      or private.is_group_member(p_group_id)
      or exists (
        select 1
        from public.groups g
        where g.id = p_group_id
          and g.visibility = 'public'
          and (
            g.community_id is null
            or private.is_community_member(g.community_id)
          )
      )
    );
$$;

revoke all on function private.can_access_post_scope(uuid, uuid, uuid) from public;
revoke all on function private.can_access_post_scope(uuid, uuid, uuid) from anon;
revoke all on function private.can_access_post_scope(uuid, uuid, uuid) from authenticated;
grant execute on function private.can_access_post_scope(uuid, uuid, uuid) to authenticated;

create function private.can_access_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and private.can_access_post_scope(p.locality_id, p.community_id, p.group_id)
  );
$$;

revoke all on function private.can_access_post(uuid) from public;
revoke all on function private.can_access_post(uuid) from anon;
revoke all on function private.can_access_post(uuid) from authenticated;
grant execute on function private.can_access_post(uuid) to authenticated;

-- ── posts ────────────────────────────────────────────────────────────────────

create policy posts_select_locality_member
on public.posts
for select
to authenticated
using (
  private.can_access_post_scope(locality_id, community_id, group_id)
);

create policy posts_insert_locality_member
on public.posts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_post_scope(locality_id, community_id, group_id)
);

-- ── comments / post_reactions / post_saves ───────────────────────────────────
-- Recreated byte-identical to 018. They only had to come down so the helper
-- could be dropped; can_access_post keeps its signature, so community scope
-- reaches them for free through the rewritten helper.

create policy comments_select_via_post
on public.comments
for select
to authenticated
using (
  private.can_access_post(post_id)
);

create policy comments_insert_member
on public.comments
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_post(post_id)
);

create policy post_reactions_select_locality_member
on public.post_reactions
for select
to authenticated
using (
  private.can_access_post(post_id)
);

create policy post_reactions_insert_locality_member
on public.post_reactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_post(post_id)
);

create policy post_saves_insert_own
on public.post_saves
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_post(post_id)
);

-- ── groups: a group inside a community is not discoverable city-wide ─────────

drop policy if exists groups_select_locality_member on public.groups;

create policy groups_select_locality_member
on public.groups
for select
to authenticated
using (
  private.is_locality_member(locality_id)
  and (
    community_id is null
    or private.is_community_member(community_id)
  )
);

-- ── events: same container rule, extending 017 ───────────────────────────────
-- ORDER MATTERS AGAIN. Migration 019 introduced private.can_access_event, and
-- both event_rsvps policies depend on it — so it cannot be dropped while they
-- exist. Same trap as the post helpers above.

drop policy event_rsvps_select_locality_member on public.event_rsvps;
drop policy event_rsvps_insert_self on public.event_rsvps;
drop function private.can_access_event(uuid);

create function private.can_access_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and private.is_locality_member(e.locality_id)
      and (
        e.community_id is null
        or private.is_community_member(e.community_id)
      )
      and (
        e.group_id is null
        or private.is_group_member(e.group_id)
        or exists (
          select 1
          from public.groups g
          where g.id = e.group_id
            and g.visibility = 'public'
            and (
              g.community_id is null
              or private.is_community_member(g.community_id)
            )
        )
      )
  );
$$;

revoke all on function private.can_access_event(uuid) from public;
revoke all on function private.can_access_event(uuid) from anon;
revoke all on function private.can_access_event(uuid) from authenticated;
grant execute on function private.can_access_event(uuid) to authenticated;

create policy event_rsvps_select_locality_member
on public.event_rsvps
for select
to authenticated
using (
  private.can_access_event(event_id)
);

create policy event_rsvps_insert_self
on public.event_rsvps
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_event(event_id)
);

drop policy events_select_locality_member on public.events;

create policy events_select_locality_member
on public.events
for select
to authenticated
using (
  (
    community_id is not null
    and private.is_community_member(community_id)
  )
  or (
    community_id is null
    and group_id is null
    and private.is_event_locality_member(id)
  )
  or (
    community_id is null
    and group_id is not null
    and (
      private.is_group_member(group_id)
      or exists (
        select 1
        from public.groups g
        where g.id = group_id
          and g.visibility = 'public'
          and (
            g.community_id is null
            or private.is_community_member(g.community_id)
          )
          and private.is_event_locality_member(id)
      )
    )
  )
);

-- ── feed_posts: the city feed must not surface community content ─────────────
-- Converted to set-based in the community_feeds migration; here it only gains
-- the exclusion, so the leak is closed in the same migration as the column.

drop function if exists public.feed_posts(uuid, text);

create function public.feed_posts(
  p_locality_id uuid,
  p_order text default 'recent'
)
returns table (
  id uuid,
  locality_id uuid,
  user_id uuid,
  group_id uuid,
  post_type public.post_type,
  content text,
  photo_path text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz,
  comment_count bigint,
  reaction_count bigint,
  my_reaction boolean,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.locality_id,
    p.user_id,
    p.group_id,
    p.post_type,
    p.content,
    p.photo_path,
    p.link_url,
    p.poll_options,
    p.created_at,
    coalesce(c_counts.cnt, 0) as comment_count,
    coalesce(r_counts.cnt, 0) as reaction_count,
    coalesce(my_r.has_reacted, false) as my_reaction,
    pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt
    from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt
    from public.post_reactions r
    where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted
    from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid())
    limit 1
  ) my_r on true
  left join public.profiles pr
    on pr.user_id = p.user_id and pr.locality_id = p.locality_id
  where p.locality_id = p_locality_id
    and p.is_deleted = false
    and p.community_id is null
    and private.can_access_post_scope(p.locality_id, p.community_id, p.group_id)
    and (
      p.group_id is null
      or exists (
        select 1 from public.groups g
        where g.id = p.group_id and g.community_id is null
      )
    )
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_posts(uuid, text) from public;
revoke all on function public.feed_posts(uuid, text) from anon;
revoke all on function public.feed_posts(uuid, text) from authenticated;
grant execute on function public.feed_posts(uuid, text) to authenticated;

-- ── profiles: ADDITIVE policy only (spec §8.2) ───────────────────────────────
-- Permissive policies are OR'd, so this only widens for community co-members.
-- The existing profiles_select_* policies are untouched and their suites stay
-- valid. Any solution that needs to EDIT profiles_select_* is wrong.

create policy profiles_select_community_comember
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.community_memberships mine
    join public.community_memberships theirs
      on theirs.community_id = mine.community_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'approved'
      and theirs.user_id = profiles.user_id
      and theirs.status = 'approved'
  )
);
```

- [ ] **Step 6: Rodar e confirmar que passa**

```bash
npx pnpm@11.18.0 db:reset && npx pnpm@11.18.0 test:db && npx pnpm@11.18.0 db:lint
```

Esperado: `All tests successful.` — inclusive as suítes antigas `post-scope-leak.sql`, `groups-public-private.sql`, `events-private-venue-denials.sql`, `locality-profile-access.sql` e as duas matrizes de authz, que **não podem** regredir.

Se `locality-profile-access.sql` ou `authz-denied-matrix.sql` falharem, a policy aditiva de `profiles` está larga demais — revise a cláusula `theirs.status = 'approved'`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat(community): scope posts, groups and events to communities"
```

---

## Task 3: Feeds set-based

**Files:**
- Create: `supabase/migrations/<ts>_community_feeds.sql`
- Create: `supabase/tests/community-feeds.sql`

- [ ] **Step 1: Criar o arquivo**

```bash
npx pnpm@11.18.0 exec supabase migration new community_feeds
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `supabase/tests/community-feeds.sql`:

```sql
begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.feed_posts('00000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000001' $$,
  'caso 8: feed da cidade nao devolve post do nivel da vila'
);

select is_empty(
  $$ select id from public.feed_posts('00000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000002' $$,
  'caso 8b: feed da cidade nao devolve post de grupo interno'
);

select isnt_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000001' $$,
  'feed da comunidade devolve post do nivel da vila'
);

select isnt_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000002' $$,
  'D6: feed da comunidade agrega post de grupo publico interno'
);

select is_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000003' $$,
  'feed agregado exclui grupo privado onde o leitor nao esta'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001') $$,
  'caso 9: feed_community vazio para nao-membro'
);

select is_empty(
  $$ select id from public.feed_group('80000000-0000-4000-8000-000000000001') $$,
  'caso 10: feed_group vazio para nao-membro da vila'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001') $$,
  'caso 14: autenticado sem vinculo nao obtem nada de feed_community'
);

select * from finish();
rollback;
```

- [ ] **Step 3: Rodar e confirmar que falha**

```bash
npx pnpm@11.18.0 db:reset && npx pnpm@11.18.0 test:db
```

Esperado: FAIL com `function public.feed_community(uuid) does not exist`.

- [ ] **Step 4: Escrever a migration**

```sql
-- 021: Set-based feed functions.
-- The scope helper is the right shape inside RLS, where there is no
-- alternative, but wrong inside a feed RPC: it is a function call with
-- subqueries per row. These resolve the caller's memberships once and join.
-- feed_posts is converted to the same shape.

drop function if exists public.feed_posts(uuid, text);

create function public.feed_posts(
  p_locality_id uuid,
  p_order text default 'recent'
)
returns table (
  id uuid,
  locality_id uuid,
  user_id uuid,
  group_id uuid,
  post_type public.post_type,
  content text,
  photo_path text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz,
  comment_count bigint,
  reaction_count bigint,
  my_reaction boolean,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with am_member as (
    select 1
    from public.locality_memberships
    where user_id = (select auth.uid())
      and locality_id = p_locality_id
  ),
  visible_groups as (
    select g.id
    from public.groups g
    where g.locality_id = p_locality_id
      and g.community_id is null
      and (
        g.visibility = 'public'
        or exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = (select auth.uid())
            and gm.status = 'approved'
        )
      )
  )
  select
    p.id, p.locality_id, p.user_id, p.group_id, p.post_type, p.content,
    p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false), pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join public.profiles pr
    on pr.user_id = p.user_id and pr.locality_id = p.locality_id
  where exists (select 1 from am_member)
    and p.locality_id = p_locality_id
    and p.is_deleted = false
    and p.community_id is null
    and (p.group_id is null or p.group_id in (select id from visible_groups))
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_posts(uuid, text) from public;
revoke all on function public.feed_posts(uuid, text) from anon;
revoke all on function public.feed_posts(uuid, text) from authenticated;
grant execute on function public.feed_posts(uuid, text) to authenticated;

create function public.feed_community(
  p_community_id uuid,
  p_order text default 'recent'
)
returns table (
  id uuid,
  locality_id uuid,
  user_id uuid,
  community_id uuid,
  group_id uuid,
  post_type public.post_type,
  content text,
  photo_path text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz,
  comment_count bigint,
  reaction_count bigint,
  my_reaction boolean,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with am_member as (
    select 1
    from public.community_memberships
    where community_id = p_community_id
      and user_id = (select auth.uid())
      and status = 'approved'
  ),
  visible_groups as (
    select g.id
    from public.groups g
    where g.community_id = p_community_id
      and (
        g.visibility = 'public'
        or exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = (select auth.uid())
            and gm.status = 'approved'
        )
      )
  )
  select
    p.id, p.locality_id, p.user_id, p.community_id, p.group_id, p.post_type,
    p.content, p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false), pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join public.profiles pr
    on pr.user_id = p.user_id and pr.locality_id = p.locality_id
  where exists (select 1 from am_member)
    and p.is_deleted = false
    and (
      p.community_id = p_community_id
      or p.group_id in (select id from visible_groups)
    )
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_community(uuid, text) from public;
revoke all on function public.feed_community(uuid, text) from anon;
revoke all on function public.feed_community(uuid, text) from authenticated;
grant execute on function public.feed_community(uuid, text) to authenticated;

create function public.feed_group(
  p_group_id uuid,
  p_order text default 'recent'
)
returns table (
  id uuid,
  locality_id uuid,
  user_id uuid,
  group_id uuid,
  post_type public.post_type,
  content text,
  photo_path text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz,
  comment_count bigint,
  reaction_count bigint,
  my_reaction boolean,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with can_see as (
    select 1
    from public.groups g
    where g.id = p_group_id
      and private.is_locality_member(g.locality_id)
      and (g.community_id is null or private.is_community_member(g.community_id))
      and (
        g.visibility = 'public'
        or exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = (select auth.uid())
            and gm.status = 'approved'
        )
      )
  )
  select
    p.id, p.locality_id, p.user_id, p.group_id, p.post_type, p.content,
    p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false), pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join public.profiles pr
    on pr.user_id = p.user_id and pr.locality_id = p.locality_id
  where exists (select 1 from can_see)
    and p.group_id = p_group_id
    and p.is_deleted = false
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_group(uuid, text) from public;
revoke all on function public.feed_group(uuid, text) from anon;
revoke all on function public.feed_group(uuid, text) from authenticated;
grant execute on function public.feed_group(uuid, text) to authenticated;
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
npx pnpm@11.18.0 db:reset && npx pnpm@11.18.0 test:db && npx pnpm@11.18.0 db:lint
```

Esperado: `All tests successful.`

- [ ] **Step 6: Regenerar os tipos**

```bash
npx pnpm@11.18.0 generate:types
```

`feed_community` e `feed_group` são funções `public`, então entram em `supabase/database.generated.ts`. Confira que **nenhum** símbolo do schema `private` apareceu no diff.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations supabase/tests supabase/database.generated.ts
git commit -m "feat(community): add set-based community and group feeds"
```

---

## Task 4: RPCs de criação e membership

**Files:**
- Create: `supabase/migrations/<ts>_community_rpcs.sql`
- Create: `supabase/tests/community-rpcs.sql`

- [ ] **Step 1: Criar o arquivo**

```bash
npx pnpm@11.18.0 exec supabase migration new community_rpcs
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `supabase/tests/community-rpcs.sql`:

```sql
begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.create_community(
       'Vila Pirata',
       'Tentativa de captura',
       '00000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000005'
     ) $$,
  '42501',
  null,
  'D3: authenticated nao cria comunidade'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.request_community_membership('70000000-0000-4000-8000-000000000001') $$,
  null,
  null,
  'nao-membro da localidade nao pede entrada'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.approve_community_member(
       '70000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000002'
     ) $$,
  null,
  null,
  'membro pending nao aprova a si mesmo'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.approve_community_member(
       '70000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000002'
     ) $$,
  'dono aprova membro pending'
);

select results_eq(
  $$ select status::text from public.community_memberships
     where community_id = '70000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000002' $$,
  $$ values ('approved'::text) $$,
  'aprovacao muda o status'
);

select lives_ok(
  $$ select public.create_group_in_community(
       'Obras da vila',
       'Acompanhamento de obras',
       'public',
       '70000000-0000-4000-8000-000000000001'
     ) $$,
  'membro aprovado cria grupo interno'
);

select throws_ok(
  $$ select public.remove_community_member(
       '70000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001'
     ) $$,
  null,
  null,
  'caso 18: remover o dono da comunidade e bloqueado'
);

select * from finish();
rollback;
```

- [ ] **Step 3: Rodar e confirmar que falha**

```bash
npx pnpm@11.18.0 db:reset && npx pnpm@11.18.0 test:db
```

Esperado: FAIL com `function public.create_community(...) does not exist`.

- [ ] **Step 4: Escrever a migration**

```sql
-- 022: Community RPCs.
-- create_community is service_role only: provisioning is a runbook step until
-- the admin panel exists. Authorization lives in the GRANT and the RPC, never
-- in the data — swapping delegated creation for a quorum path later must be a
-- new RPC with a different grant, not a migration on membership or scope.

create function public.create_community(
  p_name text,
  p_description text,
  p_locality_id uuid,
  p_owner_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_community_id uuid;
begin
  if not exists (
    select 1 from public.locality_memberships
    where user_id = p_owner_user_id and locality_id = p_locality_id
  ) then
    raise exception 'owner must be a member of the locality';
  end if;

  insert into public.communities (
    locality_id, name, description, created_by, owner_user_id
  )
  values (
    p_locality_id, p_name, p_description, p_owner_user_id, p_owner_user_id
  )
  returning id into v_community_id;

  insert into public.community_memberships (community_id, user_id, role, status)
  values (v_community_id, p_owner_user_id, 'owner', 'approved');

  return v_community_id;
end;
$$;

revoke all on function public.create_community(text, text, uuid, uuid) from public;
revoke all on function public.create_community(text, text, uuid, uuid) from anon;
revoke all on function public.create_community(text, text, uuid, uuid) from authenticated;
grant execute on function public.create_community(text, text, uuid, uuid) to service_role;

create function public.request_community_membership(p_community_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locality_id uuid;
begin
  select locality_id into v_locality_id
  from public.communities
  where id = p_community_id and is_deleted = false;

  if v_locality_id is null then
    raise exception 'community not found';
  end if;

  if not private.is_locality_member(v_locality_id) then
    raise exception 'not a member of this locality';
  end if;

  insert into public.community_memberships (community_id, user_id, role, status)
  values (p_community_id, (select auth.uid()), 'member', 'pending')
  on conflict (community_id, user_id) do nothing;
end;
$$;

revoke all on function public.request_community_membership(uuid) from public;
revoke all on function public.request_community_membership(uuid) from anon;
grant execute on function public.request_community_membership(uuid) to authenticated;

create function public.approve_community_member(
  p_community_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_community_moderator(p_community_id) then
    raise exception 'only moderators can approve members';
  end if;

  update public.community_memberships
  set status = 'approved'
  where community_id = p_community_id
    and user_id = p_user_id
    and status = 'pending';
end;
$$;

revoke all on function public.approve_community_member(uuid, uuid) from public;
revoke all on function public.approve_community_member(uuid, uuid) from anon;
grant execute on function public.approve_community_member(uuid, uuid) to authenticated;

create function public.remove_community_member(
  p_community_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_community_moderator(p_community_id) then
    raise exception 'only moderators can remove members';
  end if;

  delete from public.community_memberships
  where community_id = p_community_id
    and user_id = p_user_id;
end;
$$;

revoke all on function public.remove_community_member(uuid, uuid) from public;
revoke all on function public.remove_community_member(uuid, uuid) from anon;
grant execute on function public.remove_community_member(uuid, uuid) to authenticated;

create function public.add_community_moderator(
  p_community_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_community_moderator(p_community_id) then
    raise exception 'only moderators can add moderators';
  end if;

  update public.community_memberships
  set role = 'moderator'
  where community_id = p_community_id
    and user_id = p_user_id
    and status = 'approved'
    and role = 'member';
end;
$$;

revoke all on function public.add_community_moderator(uuid, uuid) from public;
revoke all on function public.add_community_moderator(uuid, uuid) from anon;
grant execute on function public.add_community_moderator(uuid, uuid) to authenticated;

create function public.remove_community_moderator(
  p_community_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.communities
    where id = p_community_id and owner_user_id = (select auth.uid())
  ) then
    raise exception 'only the owner can remove moderators';
  end if;

  update public.community_memberships
  set role = 'member'
  where community_id = p_community_id
    and user_id = p_user_id
    and role = 'moderator';
end;
$$;

revoke all on function public.remove_community_moderator(uuid, uuid) from public;
revoke all on function public.remove_community_moderator(uuid, uuid) from anon;
grant execute on function public.remove_community_moderator(uuid, uuid) to authenticated;

create function public.transfer_community_ownership(
  p_community_id uuid,
  p_new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.communities
    where id = p_community_id and owner_user_id = (select auth.uid())
  ) then
    raise exception 'only the owner can transfer ownership';
  end if;

  if not exists (
    select 1 from public.community_memberships
    where community_id = p_community_id
      and user_id = p_new_owner_user_id
      and status = 'approved'
  ) then
    raise exception 'new owner must be an approved member';
  end if;

  update public.communities
  set owner_user_id = p_new_owner_user_id
  where id = p_community_id;

  update public.community_memberships
  set role = 'moderator'
  where community_id = p_community_id
    and user_id = (select auth.uid());

  update public.community_memberships
  set role = 'owner'
  where community_id = p_community_id
    and user_id = p_new_owner_user_id;
end;
$$;

revoke all on function public.transfer_community_ownership(uuid, uuid) from public;
revoke all on function public.transfer_community_ownership(uuid, uuid) from anon;
grant execute on function public.transfer_community_ownership(uuid, uuid) to authenticated;

-- Separate function rather than adding a parameter to create_group: the
-- existing signature is referenced by the app and by groups-public-private.sql.
create function public.create_group_in_community(
  p_name text,
  p_description text,
  p_visibility public.group_visibility,
  p_community_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_locality_id uuid;
begin
  if not private.is_community_member(p_community_id) then
    raise exception 'only approved community members can create groups here';
  end if;

  select locality_id into v_locality_id
  from public.communities
  where id = p_community_id and is_deleted = false;

  insert into public.groups (
    name, description, visibility, locality_id, community_id, created_by, owner_user_id
  )
  values (
    p_name, p_description, p_visibility, v_locality_id, p_community_id,
    (select auth.uid()), (select auth.uid())
  )
  returning id into v_group_id;

  insert into public.group_memberships (group_id, user_id, role, status)
  values (v_group_id, (select auth.uid()), 'owner', 'approved');

  return v_group_id;
end;
$$;

revoke all on function public.create_group_in_community(text, text, public.group_visibility, uuid) from public;
revoke all on function public.create_group_in_community(text, text, public.group_visibility, uuid) from anon;
grant execute on function public.create_group_in_community(text, text, public.group_visibility, uuid) to authenticated;
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
npx pnpm@11.18.0 db:reset && npx pnpm@11.18.0 test:db && npx pnpm@11.18.0 db:lint
```

Esperado: `All tests successful.`

- [ ] **Step 6: Regenerar tipos e commitar**

```bash
npx pnpm@11.18.0 generate:types
git add supabase/migrations supabase/tests supabase/database.generated.ts
git commit -m "feat(community): add creation, membership and moderation RPCs"
```

---

## Task 5: Escopo de RSVP — ✅ EXECUTADA (2026-08-05, `b2853c2`)

> **Executada fora de ordem, extraída do plano**, porque fechava um vazamento
> que já existia em produção. Entregue apenas a **dimensão de grupo** —
> `20260805191237_event_rsvp_scope.sql` mais `supabase/tests/event-rsvp-scope.sql`
> (7 asserts). Suíte em 602 testes, `db:lint` limpo.
>
> **Uma descoberta mudou o diagnóstico:** só o `INSERT` vazava. A policy de
> `SELECT` aninha `select 1 from public.events`, e essa subquery respeita a RLS
> de `events` que a 017 apertou — ou seja, já estava protegida por acidente.
> O `INSERT` usava `is_event_locality_member`, `security definer`, que ignora
> RLS. O prejuízo aparecia pela notificação: `notify_event_change` avisa todos
> os RSVPs, então o intruso recebia título, local e horário do evento privado.
>
> **O que sobra e migrou para a Task 2:** estender `private.can_access_event`
> com o ramo de comunidade. Já está escrito no Step 5 da Task 2, incluindo a
> ordem de `drop` obrigatória — as duas policies de `event_rsvps` dependem da
> função e precisam cair antes dela.
>
> O texto abaixo fica como registro do que foi feito.

O fan-out de notificação **não** precisa de correção: `notify_event_change` notifica apenas quem deu RSVP, e `notify_event_rsvp` notifica só o organizador. Não existe fan-out de evento para a localidade. O alcance fica limitado por transitividade assim que o RSVP for escopado — que é o que falta.

`event_rsvps` tem **hoje** o mesmo bug que a migration 017 corrigiu em `events`: as três policies chamam apenas `private.is_event_locality_member`, ignorando `group_id`. Qualquer membro de Manaus consegue ver quem confirmou presença num evento de grupo privado, e consegue confirmar presença nele. É o Padrão 6 pela terceira vez, e vaza antes mesmo de existir comunidade.

**Files:**
- Create: `supabase/migrations/<ts>_event_rsvp_scope.sql`
- Create: `supabase/tests/event-rsvp-scope.sql`
- Modify: `supabase/tests/fixtures/communities.inc`

- [ ] **Step 1: Estender a fixture com eventos**

Anexar ao final de `supabase/tests/fixtures/communities.inc`.

O `CHECK` de `events.venue` proíbe termos de endereço e de instalação militar — entre eles `quadra`, `bloco N`, `quartel`, `base aérea`. Use um local neutro. `description` não tem esse CHECK.

```sql
insert into public.events (
  id, organizer_id, locality_id, community_id, title, description, starts_at, venue
)
values (
  'a0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'Reuniao de moradores',
  'Pauta da semana',
  '2026-09-01 19:00:00+00',
  'Salao de festas'
);

insert into public.events (
  id, organizer_id, locality_id, group_id, title, description, starts_at, venue
)
values (
  'a0000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000002',
  'Encontro dos coordenadores',
  'Alinhamento mensal',
  '2026-09-02 19:00:00+00',
  'Sala de reunioes'
);

insert into public.event_rsvps (event_id, user_id, status)
values (
  'a0000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'going'
);
```

Confirme o nome da coluna de status de RSVP antes de rodar:

```bash
grep -n -A10 "create table public.event_rsvps" supabase/migrations/20260802001200_events_rsvp.sql
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `supabase/tests/event-rsvp-scope.sql`:

```sql
begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.event_rsvps
    where event_id = 'a0000000-0000-4000-8000-000000000002'
  $$,
  'membro da vila fora do grupo privado nao ve quem confirmou presenca'
);

select throws_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      'a0000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000004',
      'going'
    )
  $$,
  42501,
  null,
  'membro da vila fora do grupo privado nao confirma presenca no evento dele'
);

select lives_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      'a0000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000004',
      'going'
    )
  $$,
  'membro aprovado da vila confirma presenca no evento da vila'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      'a0000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'going'
    )
  $$,
  42501,
  null,
  'membro da cidade fora da vila nao confirma presenca em evento dela'
);

select is_empty(
  $$
    select 1 from public.event_rsvps
    where event_id = 'a0000000-0000-4000-8000-000000000001'
  $$,
  'membro da cidade fora da vila nao ve os confirmados do evento dela'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$
    select 1 from public.event_rsvps
    where event_id = 'a0000000-0000-4000-8000-000000000002'
  $$,
  'membro do grupo privado ve os confirmados do evento dele'
);

select * from finish();
rollback;
```

- [ ] **Step 3: Rodar e confirmar que falha**

```bash
npx pnpm@11.18.0 db:reset && npx pnpm@11.18.0 test:db
```

Esperado: FAIL nos dois primeiros asserts — hoje `is_event_locality_member` deixa passar qualquer membro da localidade.

- [ ] **Step 4: Escrever a migration**

```bash
npx pnpm@11.18.0 exec supabase migration new event_rsvp_scope
```

```sql
-- 023: event_rsvps must respect the same scope as the event itself.
-- Migration 017 fixed events.select for group scope but left event_rsvps
-- gating on private.is_event_locality_member alone, so any locality member
-- could read the attendee list of a private group's event and add themselves
-- to it. Same bug class as 018, third occurrence.
--
-- can_access_event mirrors the events select policy exactly, including the
-- community container rule added in the community_scope migration.

create function private.can_access_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and private.is_locality_member(e.locality_id)
      and (
        e.community_id is null
        or private.is_community_member(e.community_id)
      )
      and (
        e.group_id is null
        or private.is_group_member(e.group_id)
        or exists (
          select 1
          from public.groups g
          where g.id = e.group_id
            and g.visibility = 'public'
            and (
              g.community_id is null
              or private.is_community_member(g.community_id)
            )
        )
      )
  );
$$;

revoke all on function private.can_access_event(uuid) from public;
revoke all on function private.can_access_event(uuid) from anon;
revoke all on function private.can_access_event(uuid) from authenticated;
grant execute on function private.can_access_event(uuid) to authenticated;

drop policy event_rsvps_select_locality_member on public.event_rsvps;

create policy event_rsvps_select_locality_member
on public.event_rsvps
for select
to authenticated
using (
  private.can_access_event(event_id)
);

drop policy event_rsvps_insert_self on public.event_rsvps;

create policy event_rsvps_insert_self
on public.event_rsvps
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_event(event_id)
);
```

`event_rsvps_update_self` e `event_rsvps_delete_self` já são restritas à própria linha e não precisam do portão de escopo: quem já tem RSVP passou por ele na inserção.

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
npx pnpm@11.18.0 db:reset && npx pnpm@11.18.0 test:db && npx pnpm@11.18.0 db:lint
```

Esperado: `All tests successful.` — incluindo `events-rsvp.sql`, `events-private-venue-denials.sql`, `notifications-approved-events.sql` e `notification-denials.sql` sem regressão.

Se `events-rsvp.sql` falhar, provavelmente ele assume que qualquer membro da localidade pode confirmar presença em evento de grupo. Verifique se o evento daquele teste tem `group_id` — se tiver, o teste documentava o bug, e aí corrigir o teste é o certo. Registre isso na mensagem de commit.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "fix(events): scope event_rsvps to group and community membership"
```

## Task 6: Gate final

- [ ] **Step 1: Rodar a suíte completa na ordem do CI**

```bash
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 test
npx pnpm@11.18.0 build
npx pnpm@11.18.0 db:reset
npx pnpm@11.18.0 test:db
npx pnpm@11.18.0 db:lint
```

Se `lint` falhar por artefatos do Playwright, apague `playwright-report/` e `test-results/` antes — eles não são gitignored e o Biome os varre.

- [ ] **Step 2: Confirmar que nenhum símbolo `private` vazou para os tipos**

```bash
grep -c "verification_outcomes\|family_invitations\|family_account_links" supabase/database.generated.ts
```

Esperado: `0`.

- [ ] **Step 3: Auditar a superfície de funções**

```bash
docker exec -i supabase_db_bivaque-community psql -U postgres -d postgres -t -A -F' | ' -c "
select p.proname, has_function_privilege('authenticated', p.oid, 'execute')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by 2 desc, 1;"
```

`create_community` **tem** que aparecer como `f`. Se aparecer como `t`, o grant está errado e qualquer membro pode capturar o nome de uma vila.

- [ ] **Step 4: Atualizar o MAP**

Marcar na matriz de `docs/journeys/MAP.md` que a linha **5d — feed/membros do grupo** (hoje `Ausente/P2`) foi resolvida por `feed_group`, e registrar a comunidade como área funcional nova.

- [ ] **Step 5: Commit final**

```bash
git add docs/journeys/MAP.md
git commit -m "docs(journeys): mark 5d resolved by feed_group, register community area"
```

---

## Fora deste plano

Confirmado no spec §12 e não implementar:

- Mural de avisos (permissão de post por papel dentro de um grupo)
- `community` como `report_target_type`
- Convite direto para comunidade — entrada é por pedido (D4)
- Comunidade aninhada em comunidade
- UI. Este plano é inteiramente de banco de dados. A camada de aplicação — seletor de comunidade, cinco chips de filtro (§5.3), aviso de divulgação na entrada (§8.1) — é plano à parte, e depende deste.

## Riscos conhecidos durante a execução

**A Task 2 vai quebrar suítes existentes se a policy de `groups` ficar larga demais.** `groups-public-private.sql` e `groups-private-and-moderation-denials.sql` assumem que grupo público é visível a qualquer membro da localidade. Isso continua verdade **apenas** para grupo sem comunidade. Se elas falharem, verifique o ramo `community_id is null` antes de mexer no teste.

**A Task 5 pode exigir corrigir um teste existente, não só código.** `events-rsvp.sql` pode assumir que qualquer membro da localidade confirma presença em evento de grupo. Se assumir, ele documentava o bug — nesse caso corrigir o teste é o certo, e isso precisa estar dito na mensagem de commit, nunca silenciosamente.

**A Task 5 corrige um vazamento que já existe em produção**, anterior a este trabalho. Se a prioridade for fechar o vazamento antes de entregar comunidade, a Task 5 pode ser extraída e executada primeiro — ela só depende do ramo `community_id` da Task 2 para a parte de comunidade, e a parte de grupo é independente.
