begin;

create table private.sessao_nativa_limits (
  scope text not null check (scope in ('token', 'renovar')),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null default now(),
  hits integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash)
);

alter table private.sessao_nativa_limits enable row level security;
alter table private.sessao_nativa_limits force row level security;
revoke all on private.sessao_nativa_limits from public, anon, authenticated, service_role;

create function private.sessao_nativa_attempt(
  p_scope text, p_key_hash text, p_max integer, p_window_seconds integer
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_hits integer;
begin
  if p_scope is null or p_scope not in ('token', 'renovar')
    or p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$'
    or p_max is null or p_max < 1 or p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'invalid session limiter parameters' using errcode = '22023';
  end if;

  delete from private.sessao_nativa_limits where updated_at < now() - interval '1 day';

  insert into private.sessao_nativa_limits as limites (scope, key_hash)
  values (p_scope, p_key_hash)
  on conflict (scope, key_hash) do update
    set hits = case when limites.window_start <= now() - make_interval(secs => p_window_seconds)
                    then 1 else limites.hits + 1 end,
        window_start = case when limites.window_start <= now() - make_interval(secs => p_window_seconds)
                            then now() else limites.window_start end,
        updated_at = now()
  returning hits into v_hits;

  return v_hits <= p_max;
end;
$$;

create function public.sessao_nativa_attempt(
  p_scope text, p_key_hash text, p_max integer, p_window_seconds integer
) returns boolean
language sql security invoker set search_path = ''
as $$
  select private.sessao_nativa_attempt(p_scope, p_key_hash, p_max, p_window_seconds);
$$;

revoke all on function private.sessao_nativa_attempt(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.sessao_nativa_attempt(text, text, integer, integer) from public, anon, authenticated;
grant execute on function private.sessao_nativa_attempt(text, text, integer, integer) to service_role;
grant execute on function public.sessao_nativa_attempt(text, text, integer, integer) to service_role;

commit;
