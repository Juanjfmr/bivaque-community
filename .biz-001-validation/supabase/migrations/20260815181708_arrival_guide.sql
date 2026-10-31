-- Onda E — guia de chegada: referência curada e permanente de Manaus.
-- Diferente do feed, o guia não é linha do tempo; é o acervo buscável de
-- colégio, hospital, transportadora e despachante que um recém-chegado
-- procura. A curadoria é operação (service_role), a leitura é dos membros
-- da localidade.

create type public.arrival_guide_category as enum (
  'school',
  'hospital',
  'transporter',
  'courier'
);

create table public.arrival_guide_entries (
  id uuid primary key default gen_random_uuid(),
  locality_id uuid not null references public.localities (id) on delete restrict,
  category public.arrival_guide_category not null,
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '' check (char_length(description) <= 500),
  website_url text check (website_url is null or website_url ~ '^https?://'),
  phone text check (phone is null or phone ~ '^\+?[0-9() -]{8,30}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index arrival_guide_entries_locality_category_idx
  on public.arrival_guide_entries (locality_id, category);

alter table public.arrival_guide_entries enable row level security;
alter table public.arrival_guide_entries force row level security;

revoke all on table public.arrival_guide_entries from anon, authenticated;
grant select on table public.arrival_guide_entries to authenticated;
grant all on table public.arrival_guide_entries to service_role;

create policy arrival_guide_select_locality_member
on public.arrival_guide_entries
for select
to authenticated
using (
  private.is_locality_member(locality_id)
);
