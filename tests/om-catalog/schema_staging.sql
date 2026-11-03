-- Isolated Postgres 17 check for the OM catalog staging DDL.
-- Run ONLY in a disposable CI database, never against production.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
\ir ../../supabase/migrations/20261021000000_public_military_organization_catalog.sql
\ir ../../supabase/migrations/20261021010000_military_site_geocode_evidence.sql

do $$
declare tbl text; cnt integer;
begin
  foreach tbl in array array['military_sites','military_organizations','military_site_geocode_suggestions'] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=tbl
      and c.relrowsecurity and c.relforcerowsecurity
    ) then raise exception 'RLS not enforced on %',tbl; end if;
    if has_table_privilege('anon', format('public.%I',tbl), 'SELECT')
       or has_table_privilege('authenticated',format('public.%I',tbl),'SELECT')
       or has_table_privilege('authenticated',format('public.%I',tbl),'INSERT')
       or has_table_privilege('authenticated',format('public.%I',tbl),'UPDATE')
    then raise exception 'Public grants found on %',tbl; end if;
    if not has_table_privilege('service_role',format('public.%I',tbl),'SELECT') then
      raise exception 'service_role access missing on %',tbl;
    end if;
  end loop;
end $$;

insert into public.military_sites(id,public_address,city,state_code,zip_code,source_url)
values('111111111111111111111111','Avenida Exemplo 100','Manaus','AM','69000000','https://example.org/site');
insert into public.military_organizations(id,force,acronym,name,city,state_code,country_code,source_url,site_id)
values('222222222222222222222222','FAB','TEST','Unidade de teste','Manaus','AM','BR','https://example.org/org','111111111111111111111111');

do $$
begin
  -- Reject pretending that a geocode is a verified public entrance.
  begin
    update public.military_sites set geolocation_status='VERIFIED_PUBLIC_ACCESS',
        latitude=-3.12,longitude=-60.02
     where id='111111111111111111111111';
    raise exception 'FAILED: unproven location accepted';
  exception when check_violation then null;
  end;
  -- Reject unverified location with coordinates.
  begin
    update public.military_sites set latitude=-3.12,longitude=-60.02
     where id='111111111111111111111111';
    raise exception 'FAILED: unverified coordinates accepted';
  exception when check_violation then null;
  end;
  -- Reject evidence without verifier identity.
  begin
    update public.military_sites set
      geolocation_status='VERIFIED_PUBLIC_ACCESS',
      latitude=-3.12,longitude=-60.02,
      public_access_evidence_url='https://example.org/site',
      public_access_verified_at=now(),
      public_access_verified_by=''
    where id='111111111111111111111111';
    raise exception 'FAILED: missing reviewer accepted';
  exception when check_violation then null;
  end;
  -- Accept a complete evidence record (test values in isolated DB only).
  update public.military_sites set
      geolocation_status='VERIFIED_PUBLIC_ACCESS',
      latitude=-3.12,longitude=-60.02,
      public_access_evidence_url='https://example.org/site',
      public_access_verified_at=now(),
      public_access_verified_by='ci-test'
    where id='111111111111111111111111';
  if not exists(select 1 from public.military_sites where geolocation_status='VERIFIED_PUBLIC_ACCESS') then
    raise exception 'FAILED: valid sample rejected';
  end if;
end $$;
-- SQL output means assertions passed; nothing is written to production.
select 'OM_STAGING_SCHEMA_PASS' as result;
