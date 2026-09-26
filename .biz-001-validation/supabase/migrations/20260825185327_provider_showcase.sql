create type public.provider_category as enum (
  'alimentacao',
  'casa_e_reformas',
  'assistencia_tecnica',
  'mudanca_e_transporte',
  'imoveis',
  'documentacao_e_financas',
  'saude_e_bem_estar',
  'beleza',
  'educacao_e_aulas',
  'automotivo',
  'eventos_e_festas',
  'pets'
);

create type public.provider_reach_scope as enum ('community', 'locality');
create type public.provider_reach_source as enum ('free', 'paid');

create table public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique
    references public.provider_accounts (auth_user_id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  category public.provider_category not null,
  bio text check (bio is null or char_length(bio) between 1 and 800),
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+?[0-9]{10,15}$'),
  contact_is_public boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger provider_profiles_set_updated_at
before update on public.provider_profiles
for each row execute function private.set_updated_at();

create table public.provider_reach (
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  scope_type public.provider_reach_scope not null,
  scope_id uuid not null,
  source public.provider_reach_source not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (provider_id, scope_type, scope_id)
);

create index provider_reach_scope_idx
  on public.provider_reach (scope_type, scope_id) where active;

create table public.provider_catalog_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text check (description is null or char_length(description) between 1 and 600),
  price_cents integer check (price_cents is null or price_cents between 0 and 100000000),
  photo_path text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index provider_catalog_items_provider_idx
  on public.provider_catalog_items (provider_id, position, created_at);

create table public.provider_portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  photo_path text not null,
  caption text check (caption is null or char_length(caption) between 1 and 200),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index provider_portfolio_photos_provider_idx
  on public.provider_portfolio_photos (provider_id, position, created_at);

create function private.can_see_provider(p_provider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.provider_profiles p
     where p.id = p_provider_id
       and p.owner_user_id = (select auth.uid())
  )
  or exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
      join public.provider_reach r on r.provider_id = p.id
     where p.id = p_provider_id
       and p.is_deleted = false
       and pa.revoked_at is null
       and r.active
       and (
         (
           r.scope_type = 'community'
           and exists (
             select 1
               from public.community_memberships cm
              where cm.community_id = r.scope_id
                and cm.user_id = (select auth.uid())
                and cm.status = 'approved'
           )
         )
         or (
           r.scope_type = 'locality'
           and exists (
             select 1
               from public.locality_memberships lm
              where lm.locality_id = r.scope_id
                and lm.user_id = (select auth.uid())
           )
         )
       )
  );
$$;

revoke all on function private.can_see_provider(uuid) from public, anon;
grant execute on function private.can_see_provider(uuid) to authenticated, service_role;

alter table public.provider_profiles enable row level security;
alter table public.provider_profiles force row level security;
alter table public.provider_reach enable row level security;
alter table public.provider_reach force row level security;
alter table public.provider_catalog_items enable row level security;
alter table public.provider_catalog_items force row level security;
alter table public.provider_portfolio_photos enable row level security;
alter table public.provider_portfolio_photos force row level security;

revoke all on table public.provider_profiles from anon, authenticated;
revoke all on table public.provider_reach from anon, authenticated;
revoke all on table public.provider_catalog_items from anon, authenticated;
revoke all on table public.provider_portfolio_photos from anon, authenticated;

grant select, insert, update, delete on table public.provider_profiles to authenticated;
grant select, insert, update, delete on table public.provider_reach to authenticated;
grant select, insert, update, delete on table public.provider_catalog_items to authenticated;
grant select, insert, update, delete on table public.provider_portfolio_photos to authenticated;
grant all on table public.provider_profiles to service_role;
grant all on table public.provider_reach to service_role;
grant all on table public.provider_catalog_items to service_role;
grant all on table public.provider_portfolio_photos to service_role;

create policy provider_profiles_select_scoped
on public.provider_profiles
for select
to authenticated
using (not is_deleted and private.can_see_provider(id));

create policy provider_profiles_insert_owner
on public.provider_profiles
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and private.is_provider_account((select auth.uid()))
);

create policy provider_profiles_update_owner
on public.provider_profiles
for update
to authenticated
using (
  owner_user_id = (select auth.uid())
  and private.is_provider_account((select auth.uid()))
)
with check (
  owner_user_id = (select auth.uid())
  and private.is_provider_account((select auth.uid()))
);

create policy provider_profiles_delete_owner
on public.provider_profiles
for delete
to authenticated
using (
  owner_user_id = (select auth.uid())
  and private.is_provider_account((select auth.uid()))
);

create policy provider_reach_select_scoped
on public.provider_reach
for select
to authenticated
using (private.can_see_provider(provider_id));

create policy provider_reach_insert_owner_free_community
on public.provider_reach
for insert
to authenticated
with check (
  source = 'free'
  and scope_type = 'community'
  and exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
     where p.id = provider_id
       and p.owner_user_id = (select auth.uid())
       and pa.revoked_at is null
       and pa.community_id = scope_id
  )
);

create policy provider_reach_update_owner_free_community
on public.provider_reach
for update
to authenticated
using (
  source = 'free'
  and scope_type = 'community'
  and exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
     where p.id = provider_id
       and p.owner_user_id = (select auth.uid())
       and pa.revoked_at is null
       and pa.community_id = scope_id
  )
)
with check (
  source = 'free'
  and scope_type = 'community'
  and exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
     where p.id = provider_id
       and p.owner_user_id = (select auth.uid())
       and pa.revoked_at is null
       and pa.community_id = scope_id
  )
);

create policy provider_reach_delete_owner_free_community
on public.provider_reach
for delete
to authenticated
using (
  source = 'free'
  and scope_type = 'community'
  and exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
     where p.id = provider_id
       and p.owner_user_id = (select auth.uid())
       and pa.revoked_at is null
       and pa.community_id = scope_id
  )
);

create policy provider_catalog_items_select_scoped
on public.provider_catalog_items
for select
to authenticated
using (private.can_see_provider(provider_id));

create policy provider_catalog_items_insert_owner
on public.provider_catalog_items
for insert
to authenticated
with check (
  exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
     where p.id = provider_id
       and p.owner_user_id = (select auth.uid())
       and pa.revoked_at is null
  )
);

create policy provider_catalog_items_update_owner
on public.provider_catalog_items
for update
to authenticated
using (
  exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
     where p.id = provider_id
       and p.owner_user_id = (select auth.uid())
       and pa.revoked_at is null
  )
)
with check (
  exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
     where p.id = provider_id
       and p.owner_user_id = (select auth.uid())
       and pa.revoked_at is null
  )
);

create policy provider_catalog_items_delete_owner
on public.provider_catalog_items
for delete
to authenticated
using (
  exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
     where p.id = provider_id
       and p.owner_user_id = (select auth.uid())
       and pa.revoked_at is null
  )
);

create policy provider_portfolio_photos_select_scoped
on public.provider_portfolio_photos
for select
to authenticated
using (private.can_see_provider(provider_id));

create policy provider_portfolio_photos_insert_owner
on public.provider_portfolio_photos
for insert
to authenticated
with check (
  exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
     where p.id = provider_id
       and p.owner_user_id = (select auth.uid())
       and pa.revoked_at is null
  )
);

create policy provider_portfolio_photos_update_owner
on public.provider_portfolio_photos
for update
to authenticated
using (
  exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
     where p.id = provider_id
       and p.owner_user_id = (select auth.uid())
       and pa.revoked_at is null
  )
)
with check (
  exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
     where p.id = provider_id
       and p.owner_user_id = (select auth.uid())
       and pa.revoked_at is null
  )
);

create policy provider_portfolio_photos_delete_owner
on public.provider_portfolio_photos
for delete
to authenticated
using (
  exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
     where p.id = provider_id
       and p.owner_user_id = (select auth.uid())
       and pa.revoked_at is null
  )
);

alter type public.report_target_type add value if not exists 'provider_profile';

create or replace function public.resolve_report(
  p_report_id uuid,
  p_operator_user_id uuid,
  p_action text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.reports;
begin
  if p_action not in ('hide', 'dismiss') then
    raise exception 'action must be hide or dismiss' using errcode = '22023';
  end if;

  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators resolve reports' using errcode = '42501';
  end if;

  select * into v_report
    from public.reports
   where id = p_report_id and status = 'open'
     for update;

  if not found then
    raise exception 'report not found or already resolved' using errcode = 'P0002';
  end if;

  if p_action = 'hide' then
    case v_report.target_type
      when 'post' then
        update public.posts set is_deleted = true where id = v_report.target_id;
      when 'comment' then
        update public.comments set is_deleted = true where id = v_report.target_id;
      when 'group' then
        update public.groups set is_deleted = true where id = v_report.target_id;
      when 'message' then
        update public.dm_messages set is_deleted = true where id = v_report.target_id;
      when 'recommendation_request' then
        update public.recommendation_requests set is_deleted = true where id = v_report.target_id;
      when 'recommendation_reply' then
        update public.recommendation_replies set is_deleted = true where id = v_report.target_id;
      when 'provider_profile' then
        update public.provider_profiles set is_deleted = true where id = v_report.target_id;
      else
        raise exception 'unknown target type: %', v_report.target_type using errcode = '22023';
    end case;
  end if;

  update public.reports
     set status = 'resolved',
         operator_note = coalesce(p_note, p_action),
         resolved_by = p_operator_user_id,
         resolved_at = now()
   where id = p_report_id;

  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    v_report.reporter_user_id, p_operator_user_id, 'report_resolved',
    'resolved', 'report', p_report_id
  );
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'provider-photos',
  'provider-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy provider_photos_insert_owner
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'provider-photos'
  and owner = (select auth.uid())
  and exists (
    select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
     where p.id::text = (storage.foldername(storage.objects.name))[1]
       and p.owner_user_id = (select auth.uid())
       and pa.revoked_at is null
  )
);

create policy provider_photos_select_scoped
on storage.objects
for select
to authenticated
using (
  bucket_id = 'provider-photos'
  and exists (
    select 1
      from public.provider_profiles p
     where p.id::text = (storage.foldername(storage.objects.name))[1]
       and private.can_see_provider(p.id)
  )
);

-- ADR conta-de-prestador, decisão 2: a ficha sobrevive à saída de quem
-- indicou, e revogar é ato do DONO da comunidade que atestou. Não apaga
-- conta nem ficha: desliga o alcance e marca data/motivo. Reversível,
-- auditável — o mesmo desenho de suspensão que a onda H usa para pessoa.
create function public.revoke_provider_account(
  p_provider_user_id uuid,
  p_owner_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'a revogação exige motivo' using errcode = '22023';
  end if;

  if not exists (
    select 1
      from public.provider_accounts pa
      join public.communities c on c.id = pa.community_id
     where pa.auth_user_id = p_provider_user_id
       and pa.revoked_at is null
       and c.owner_user_id = p_owner_user_id
       and c.is_deleted = false
  ) then
    raise exception 'only the community owner revokes' using errcode = '42501';
  end if;

  update public.provider_accounts
     set revoked_at = now(), revoked_by = p_owner_user_id
   where auth_user_id = p_provider_user_id;

  update public.provider_reach r
     set active = false
    from public.provider_profiles p
   where p.id = r.provider_id
     and p.owner_user_id = p_provider_user_id;
end;
$$;

revoke all on function public.revoke_provider_account(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.revoke_provider_account(uuid, uuid, text) to service_role;

-- Console do dono: lista as fichas atestadas pela comunidade (ativas e
-- revogadas, com o estado visível). Mesmo contrato de caller explícito de
-- list_community_pending_arrivals — service_role media, o dono vem do
-- contexto autenticado do servidor, e a própria função reconfere posse.
create function public.list_community_providers(
  p_community_id uuid,
  p_user_id uuid,
  p_limit integer default 200
)
returns table (
  provider_user_id uuid,
  display_name text,
  category public.provider_category,
  revoked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select pa.auth_user_id, pr.display_name, pr.category, pa.revoked_at
    from public.provider_accounts pa
    join public.provider_profiles pr on pr.owner_user_id = pa.auth_user_id
   where pa.community_id = p_community_id
     and exists (
       select 1 from public.communities c
        where c.id = pa.community_id
          and c.owner_user_id = p_user_id
          and c.is_deleted = false
     )
     and not pr.is_deleted
   order by pa.revoked_at nulls first, pr.display_name
   limit least(greatest(p_limit, 1), 500);
$$;

revoke all on function public.list_community_providers(uuid, uuid, integer) from public, anon;
grant execute on function public.list_community_providers(uuid, uuid, integer) to service_role;
