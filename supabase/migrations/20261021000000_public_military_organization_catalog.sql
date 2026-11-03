-- Staging: catalogo publico de OMs, separado de instalacoes fisicas.
-- Sem vinculo com perfil/lotacao, sem permissao de leitura de usuario nesta etapa.
begin;
create table if not exists public.military_sites (
 id text primary key check(length(id)=24),
 public_address text not null,
 city text not null,
 state_code text not null check(state_code ~ '^[A-Z]{2}$'),
 zip_code text,
 source_url text not null,
 geolocation_status text not null default 'UNVERIFIED_TEXT'
  check(geolocation_status in ('UNVERIFIED_TEXT','VERIFIED_PUBLIC_ACCESS')),
 latitude numeric(9,6),
 longitude numeric(9,6),
 constraint military_sites_geo_pair check((latitude is null) = (longitude is null)),
 constraint military_sites_verified_only check(geolocation_status='VERIFIED_PUBLIC_ACCESS' or (latitude is null and longitude is null)),
 constraint military_sites_lat_ok check(latitude is null or latitude between -90 and 90),
 constraint military_sites_lon_ok check(longitude is null or longitude between -180 and 180)
);
create table if not exists public.military_organizations (
 id text primary key check(length(id)=24),
 force text not null check(force in ('FAB','EB','MB')),
 acronym text,
 name text not null,
 city text,
 state_code text,
 country_code text not null,
 source_category text,
 site_id text references public.military_sites(id) on delete set null,
 source_url text not null,
 collected_at date,
 status text not null default 'UNVERIFIED'
   check(status in ('UNVERIFIED','PENDING','VERIFIED_ACTIVE','HISTORICAL')),
 review_reasons text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists military_orgs_filter_idx on public.military_organizations(force,state_code,city);
create index if not exists military_orgs_site_idx on public.military_organizations(site_id);
alter table public.military_sites enable row level security;
alter table public.military_sites force row level security;
alter table public.military_organizations enable row level security;
alter table public.military_organizations force row level security;
revoke all on public.military_sites from anon, authenticated;
revoke all on public.military_organizations from anon, authenticated;
grant all on public.military_sites to service_role;
grant all on public.military_organizations to service_role;
commit;
