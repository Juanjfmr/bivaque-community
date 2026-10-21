-- PROPOSTA R3: nao aplicar antes de ADR e revisao independente.
-- Cadastro institucional publico; nunca representa a lotacao de um usuario.
begin;

create table public.military_sites (
  id uuid primary key default gen_random_uuid(),
  locality_id uuid references public.localities(id) on delete restrict,
  city_raw text not null,
  state_raw char(2) not null,
  published_address text,
  public_access_latitude numeric(9,6),
  public_access_longitude numeric(9,6),
  location_source_url text,
  location_checked_at date,
  status text not null default 'candidate' check(status in ('candidate','verified','retired')),
  created_at timestamptz not null default now(),
  constraint military_sites_pair check(
    (public_access_latitude is null) = (public_access_longitude is null)
  ),
  constraint military_sites_geo_bounds check(
    (public_access_latitude is null or public_access_latitude between -90 and 90)
    and (public_access_longitude is null or public_access_longitude between -180 and 180)
  ),
  constraint military_sites_verified_check check(
    status <> 'verified' or
    (public_access_latitude is not null and public_access_longitude is not null
     and location_source_url is not null and location_checked_at is not null
     and locality_id is not null)
  )
);

create table public.military_organizations (
  id uuid primary key,
  source_key text not null,
  force text not null check(force in ('FAB','EB','MB')),
  acronym text,
  official_name text not null,
  unit_kind text not null,
  city_raw text,
  state_raw char(2),
  locality_id uuid references public.localities(id) on delete restrict,
  site_id uuid references public.military_sites(id) on delete set null,
  country_classification text,
  source_url text not null,
  source_observed_at date,
  institutional_checked_at date,
  status text not null default 'unverified'
    check(status in ('unverified','name_confirmed','published','retired')),
  created_at timestamptz not null default now(),
  unique(force,source_key),
  constraint military_organizations_published_check check(
    status <> 'published' or
    (institutional_checked_at is not null and locality_id is not null
     and country_classification = 'BR')
  )
);

create index military_organizations_search_idx
  on public.military_organizations(force,state_raw,city_raw,official_name);
create index military_organizations_site_idx
  on public.military_organizations(site_id) where site_id is not null;

-- Escopo: nenhuma politica anon; somente registros institucionais aprovados
-- podem ser consultados por membro autenticado. Zero linhas entram aprovadas.
alter table public.military_sites enable row level security;
alter table public.military_sites force row level security;
alter table public.military_organizations enable row level security;
alter table public.military_organizations force row level security;
revoke all on public.military_sites, public.military_organizations from public, anon, authenticated;
grant all on public.military_sites, public.military_organizations to service_role;
grant select on public.military_sites, public.military_organizations to authenticated;

create policy "Authenticated members can read approved organizations"
on public.military_organizations for select to authenticated
using (status='published' and (select auth.uid()) is not null);

create policy "Authenticated members can read verified public site points"
on public.military_sites for select to authenticated
using (status='verified' and (select auth.uid()) is not null);

commit;
