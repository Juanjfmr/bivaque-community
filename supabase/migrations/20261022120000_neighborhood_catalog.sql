-- DATA-001 / ADR-20261022-fundacao-dados-bairros-ocultar-chamados, seção 1.
--
-- Catálogo de bairros por cidade. O ponto central é dado geográfico PÚBLICO do
-- bairro (mapa e distância), nunca endereço de pessoa: a tabela não tem CEP,
-- rua, número nem coordenada de imóvel.
--
-- Leitura: membro autenticado. Escrita: só a operação (`service_role`) — o
-- cliente não tem INSERT/UPDATE/DELETE, e a policy de leitura não é um caminho
-- de escrita.
--
-- `name_key` é a chave de comparação sem acento (`lower(unaccent(name))`,
-- espaços colapsados). Ela é mantida por trigger, não gerada: `unaccent` é
-- STABLE (depende do dicionário da extensão), então não pode entrar em coluna
-- gerada nem em índice de expressão imutável.
--
-- A extensão já nasceu em 20260926004501_memoria_de_indicacoes.sql; o
-- `if not exists` registra a dependência e mantém a migration aplicável sozinha.

create extension if not exists unaccent with schema extensions;

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  locality_id uuid not null references public.localities (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  name_key text not null,
  zone text check (zone is null or char_length(zone) between 1 and 60),
  center_lat numeric(9, 6) not null check (center_lat between -90 and 90),
  center_lng numeric(9, 6) not null check (center_lng between -180 and 180),
  constraint neighborhoods_locality_name_key_unique unique (locality_id, name_key)
);

comment on table public.neighborhoods is
  'Catálogo de bairros por cidade (ADR-20261022, seção 1). Ponto central público do bairro; nunca endereço ou CEP de pessoa.';
comment on column public.neighborhoods.name_key is
  'Chave sem acento e em minúsculas, única por cidade. Mantida pelo trigger neighborhoods_set_name_key.';

-- Chave de comparação. O btrim + colapso de espaços é o mesmo do campo de
-- bairro do perfil, para que "  Ponta   Negra " case com a grafia do catálogo.
create function private.neighborhood_name_key(p_name text)
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(
    pg_catalog.regexp_replace(
      pg_catalog.lower(extensions.unaccent(pg_catalog.btrim(coalesce(p_name, '')))),
      '\s+', ' ', 'g'
    ),
    ''
  );
$$;

revoke all on function private.neighborhood_name_key(text) from public;
grant execute on function private.neighborhood_name_key(text)
  to authenticated, service_role;

create function private.set_neighborhood_name_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- A grafia guardada é a da carga (e a que o perfil copia): sem espaço
  -- sobrando e com espaço interno colapsado. A caixa e o acento são mantidos.
  new.name := pg_catalog.regexp_replace(
    pg_catalog.btrim(new.name), '\s+', ' ', 'g'
  );
  new.name_key := private.neighborhood_name_key(new.name);
  return new;
end;
$$;

create trigger neighborhoods_set_name_key
before insert or update of name on public.neighborhoods
for each row execute function private.set_neighborhood_name_key();

alter table public.neighborhoods enable row level security;
alter table public.neighborhoods force row level security;

revoke all on table public.neighborhoods from anon, authenticated;
grant select on table public.neighborhoods to authenticated;
grant all on table public.neighborhoods to service_role;

-- Catálogo é da cidade, não do bairro de quem lê: a busca troca de cidade (o
-- mesmo alcance de consulta de outra cidade), então a leitura não é filtrada
-- por membership. O que a policy exige é sessão de membro.
create policy neighborhoods_select_authenticated
on public.neighborhoods
for select
to authenticated
using ((select auth.uid()) is not null);

-- Busca por nome. Até 6 bairros da cidade; os que COMEÇAM pelo texto vêm
-- antes dos que apenas o contêm, e cada grupo é ordenado por `name_key`
-- (ordem alfabética sem acento, que é a ordem que a pessoa espera em
-- português). Texto vazio devolve os 6 primeiros da cidade.
--
-- SECURITY INVOKER é deliberado: a função lê só o catálogo, e quem chama já
-- tem SELECT nele. Não há razão para um definer aqui — ele transformaria uma
-- busca em bypass de RLS se a tabela um dia ganhar escopo.
create function public.search_neighborhoods(
  p_locality_id uuid,
  p_query text default ''
)
returns table (
  id uuid,
  name text,
  zone text,
  center_lat numeric,
  center_lng numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with term as (
    select coalesce(private.neighborhood_name_key(p_query), '') as value
  )
  select n.id, n.name, n.zone, n.center_lat, n.center_lng
  from public.neighborhoods n
  cross join term t
  where n.locality_id = p_locality_id
    and (t.value = '' or n.name_key like '%' || t.value || '%')
  order by
    case
      when t.value = '' then 0
      when n.name_key like t.value || '%' then 0
      else 1
    end,
    n.name_key
  limit 6;
$$;

comment on function public.search_neighborhoods(uuid, text) is
  'Busca de bairros da cidade por nome, sem acento. Até 6, prefixo primeiro, ordem alfabética por name_key.';

revoke all on function public.search_neighborhoods(uuid, text) from public;
revoke all on function public.search_neighborhoods(uuid, text) from anon;
grant execute on function public.search_neighborhoods(uuid, text) to authenticated;
