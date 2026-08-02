create type public.locality_admission_mode as enum (
  'invite_only',
  'waitlist_only'
);

create type public.profile_visibility as enum (
  'locality_members',
  'hidden'
);

create table public.localities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  city_name text not null check (char_length(city_name) between 2 and 80),
  state_code text not null check (state_code ~ '^[A-Z]{2}$'),
  country_code text not null default 'BR' check (country_code ~ '^[A-Z]{2}$'),
  admission_mode public.locality_admission_mode not null default 'waitlist_only',
  created_at timestamptz not null default now()
);

create table public.locality_memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  locality_id uuid not null references public.localities (id) on delete restrict,
  joined_at timestamptz not null default now(),
  unique (user_id, locality_id)
);

create index locality_memberships_locality_id_idx
  on public.locality_memberships (locality_id);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  locality_id uuid not null,
  display_name text not null check (char_length(display_name) between 2 and 80),
  visibility public.profile_visibility not null default 'locality_members',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, locality_id)
    references public.locality_memberships (user_id, locality_id)
    on delete cascade
);

create index profiles_locality_visibility_idx
  on public.profiles (locality_id, visibility);

insert into public.localities (
  id,
  slug,
  city_name,
  state_code,
  country_code,
  admission_mode
)
values (
  '00000000-0000-4000-8000-000000000001',
  'manaus-am',
  'Manaus',
  'AM',
  'BR',
  'invite_only'
);
