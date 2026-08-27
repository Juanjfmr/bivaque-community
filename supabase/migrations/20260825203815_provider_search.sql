-- Onda G — Task 5: busca de prestadores por categoria e nome (D44).
--
-- Nativo do Postgres: pg_trgm para tolerância a digitação no nome, filtro
-- exato para categoria e escopo. Nenhum serviço externo onde dado pessoal
-- passe a viver. D43 vale aqui dentro: isto busca FICHA, nunca pessoa.
--
-- O filtro de alcance mora DENTRO da função (security definer): quem chama
-- nunca escolhe o escopo que enxerga — `can_see_provider` decide, e o parâmetro
-- de comunidade apenas RESTRINGE o que já seria visível.

create extension if not exists pg_trgm with schema extensions;

create index provider_profiles_name_trgm_idx
  on public.provider_profiles using gin (display_name extensions.gin_trgm_ops)
  where is_deleted = false;

create function public.search_providers(
  p_category public.provider_category default null,
  p_community_id uuid default null,
  p_query text default null
)
returns table (
  id uuid,
  display_name text,
  category public.provider_category,
  bio text,
  reach_source public.provider_reach_source
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (p.id)
    p.id, p.display_name, p.category, p.bio, r.source
  from public.provider_profiles p
  join public.provider_reach r on r.provider_id = p.id and r.active
  where p.is_deleted = false
    and private.can_see_provider(p.id)
    and (p_category is null or p.category = p_category)
    and (
      p_community_id is null
      or (r.scope_type = 'community' and r.scope_id = p_community_id)
    )
    and (
      p_query is null
      or extensions.similarity(p.display_name, p_query) > 0.2
      or p.display_name ilike '%' || p_query || '%'
    )
  -- D29 e §7.2: a ordenação NUNCA olha para r.source. Relevância e nada mais;
  -- com consulta vazia a similaridade empata e o desempate é alfabético.
  order by p.id, extensions.similarity(p.display_name, coalesce(p_query, '')) desc,
           p.display_name asc;
$$;

revoke all on function public.search_providers(public.provider_category, uuid, text)
  from public, anon;
grant execute on function public.search_providers(public.provider_category, uuid, text)
  to authenticated;
