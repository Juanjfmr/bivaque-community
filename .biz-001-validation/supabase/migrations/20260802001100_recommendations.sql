-- 011: Recommendations as a community utility (not a marketplace).
-- Request/reply posts inside a locality or a group, categories, and saves.
-- Origin scope is preserved; group-only requests never leak to local directory.
-- No provider profiles, payments, ads, ranking sponsorship, AI suggestions, or
-- commercial claims. Enforced by schema CHECKs and RLS policies.

-- ── recommendation categories (community utility, non-commercial) ──────────

create type public.recommendation_category as enum (
  'servicos_locais',
  'saude_bem_estar',
  'educacao',
  'esporte_lazer',
  'alimentacao',
  'transporte',
  'moradia',
  'outros'
);

-- ── recommendation requests ───────────────────────────────────────────────

create table public.recommendation_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  locality_id uuid references public.localities (id) on delete cascade,
  group_id uuid,
  title text not null check (char_length(title) between 3 and 200),
  body text not null check (char_length(body) between 10 and 2000),
  category public.recommendation_category not null default 'outros',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recommendation_origin_scope check (
    (locality_id is not null and group_id is null)
    or (locality_id is null and group_id is not null)
  ),
  constraint recommendation_no_commercial_title check (
    title !~* '\y(pag[ao]|pagamento|compr[aeo]|venda|an[uú]ncio|patroc[ií]n|pre[cç]o|promo[cç][aã]o|desconto|oferta|contrat|plano|assinatura|mensalidade)\y'
  ),
  constraint recommendation_no_commercial_body check (
    body !~* '\y(pag[ao]|pagamento|compr[aeo]|venda|an[uú]ncio|patroc[ií]n|pre[cç]o|promo[cç][aã]o|desconto|oferta|contrat|plano|assinatura|mensalidade|whatsapp|telefone|celular|ligue|contato comercial)\y'
  )
);

create index recommendation_requests_locality_idx
  on public.recommendation_requests (locality_id, created_at desc);

create index recommendation_requests_group_idx
  on public.recommendation_requests (group_id, created_at desc);

create index recommendation_requests_author_idx
  on public.recommendation_requests (author_id, created_at desc);

-- ── recommendation replies ─────────────────────────────────────────────────

create table public.recommendation_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.recommendation_requests (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 5 and 2000),
  created_at timestamptz not null default now(),
  constraint recommendation_reply_no_commercial check (
    body !~* '\y(pag[ao]|pagamento|compr[aeo]|venda|an[uú]ncio|patroc[ií]n|pre[cç]o|promo[cç][aã]o|desconto|oferta|contrat|plano|assinatura|mensalidade|whatsapp|telefone|celular|ligue|contato comercial)\y'
  )
);

create index recommendation_replies_request_idx
  on public.recommendation_replies (request_id, created_at);

create index recommendation_replies_author_idx
  on public.recommendation_replies (author_id, created_at);

-- ── recommendation saves (bookmarks) ───────────────────────────────────────

create table public.recommendation_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null references public.recommendation_requests (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

create index recommendation_saves_user_idx
  on public.recommendation_saves (user_id, saved_at desc);

-- ── RLS enable + force ─────────────────────────────────────────────────────

alter table public.recommendation_requests enable row level security;
alter table public.recommendation_requests force row level security;
alter table public.recommendation_replies enable row level security;
alter table public.recommendation_replies force row level security;
alter table public.recommendation_saves enable row level security;
alter table public.recommendation_saves force row level security;

-- ── revoke defaults, grant minimal ─────────────────────────────────────────

revoke all on table public.recommendation_requests from anon, authenticated;
revoke all on table public.recommendation_replies from anon, authenticated;
revoke all on table public.recommendation_saves from anon, authenticated;

grant select, insert, update, delete on table public.recommendation_requests to authenticated;
grant select, insert on table public.recommendation_replies to authenticated;
grant select, insert, delete on table public.recommendation_saves to authenticated;

-- ── helper: can a user see a locality-scoped recommendation? ───────────────

create function private.can_see_locality_recommendation(target_locality_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.locality_memberships
    where user_id = (select auth.uid())
      and locality_id = target_locality_id
  );
$$;

revoke all on function private.can_see_locality_recommendation(uuid) from public;
revoke all on function private.can_see_locality_recommendation(uuid) from anon;
revoke all on function private.can_see_locality_recommendation(uuid) from authenticated;

grant execute on function private.can_see_locality_recommendation(uuid) to authenticated;

-- ── recommendation_requests policies ───────────────────────────────────────

-- Locality member can select locality-scoped requests from their own locality.
-- Group-scoped requests are visible only via group membership (defensive: if
-- group_id is non-null and no groups table exists yet, the row is invisible
-- to everyone except the author by the DENY default below).
create policy recommendation_requests_select_locality
on public.recommendation_requests
for select
to authenticated
using (
  author_id = (select auth.uid())
  or (
    locality_id is not null
    and private.can_see_locality_recommendation(locality_id)
  )
);

-- Verified locality member can insert a request in their locality.
create policy recommendation_requests_insert_locality
on public.recommendation_requests
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and (
    (locality_id is not null and private.is_locality_member(locality_id))
    or (group_id is not null)
  )
);

-- Author can update their own request (title, body, category).
create policy recommendation_requests_update_own
on public.recommendation_requests
for update
to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

-- Author can delete their own request.
create policy recommendation_requests_delete_own
on public.recommendation_requests
for delete
to authenticated
using (author_id = (select auth.uid()));

-- ── recommendation_replies policies ────────────────────────────────────────

-- Replies are visible if the viewer can see the parent request (same scope).
create policy recommendation_replies_select
on public.recommendation_replies
for select
to authenticated
using (
  author_id = (select auth.uid())
  or exists (
    select 1
    from public.recommendation_requests req
    where req.id = recommendation_replies.request_id
      and (
        req.locality_id is not null
        and private.can_see_locality_recommendation(req.locality_id)
      )
  )
);

-- Any authenticated user who can see the parent request can reply.
create policy recommendation_replies_insert
on public.recommendation_replies
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.recommendation_requests req
    where req.id = recommendation_replies.request_id
      and (
        req.locality_id is not null
        and private.can_see_locality_recommendation(req.locality_id)
      )
  )
);

-- ── recommendation_saves policies ──────────────────────────────────────────

-- Users can see only their own saves.
create policy recommendation_saves_select_own
on public.recommendation_saves
for select
to authenticated
using (user_id = (select auth.uid()));

-- Users can save any request they can see.
create policy recommendation_saves_insert_own
on public.recommendation_saves
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.recommendation_requests req
    where req.id = recommendation_saves.request_id
      and (
        req.locality_id is not null
        and private.can_see_locality_recommendation(req.locality_id)
      )
  )
);

-- Users can delete only their own saves.
create policy recommendation_saves_delete_own
on public.recommendation_saves
for delete
to authenticated
using (user_id = (select auth.uid()));
