-- RUN-024: prazo vencido libera mensagens antes da limpeza periódica.
create or replace function private.account_unavailable(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.account_deletion_requested(p_user_id)
      or exists (
        select 1
        from public.profile_suspensions
        where user_id = p_user_id
          and (expires_at is null or expires_at > now())
      );
$$;

revoke all on function private.account_unavailable(uuid) from public, anon;
grant execute on function private.account_unavailable(uuid) to authenticated;
