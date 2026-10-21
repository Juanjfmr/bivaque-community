-- Restrição adicional sobre coordenadas e evidências de acesso público.
-- Migration segura para revisão: zero coordenadas são aprovadas automaticamente.
begin;
alter table public.military_sites
  add column if not exists public_access_evidence_url text,
  add column if not exists public_access_verified_at timestamptz,
  add column if not exists public_access_verified_by text;
alter table public.military_sites
  add constraint military_sites_verified_with_evidence check(
    geolocation_status <> 'VERIFIED_PUBLIC_ACCESS'
    or (latitude is not null and longitude is not null
        and public_access_evidence_url like 'https://%'
        and public_access_verified_at is not null
        and length(btrim(public_access_verified_by)) > 0)
  );
create table if not exists public.military_site_geocode_suggestions (
 id uuid primary key default gen_random_uuid(),
 site_id text not null references public.military_sites(id) on delete cascade,
 candidate_latitude numeric(9,6) not null check(candidate_latitude between -90 and 90),
 candidate_longitude numeric(9,6) not null check(candidate_longitude between -180 and 180),
 provider_name text not null,
 provider_record_url text not null check(provider_record_url like 'https://%'),
 precision text not null,
 review_status text not null default 'PENDING'
  check(review_status in ('PENDING','REJECTED','ACCEPTED_FOR_MANUAL_SITE_VERIFICATION')),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists military_geo_suggestions_site_idx
 on public.military_site_geocode_suggestions(site_id, review_status);
alter table public.military_site_geocode_suggestions enable row level security;
alter table public.military_site_geocode_suggestions force row level security;
revoke all on public.military_site_geocode_suggestions from anon, authenticated;
grant all on public.military_site_geocode_suggestions to service_role;
commit;
