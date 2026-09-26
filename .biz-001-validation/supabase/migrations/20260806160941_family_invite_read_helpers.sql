-- 031: Private helpers for the family invite read path.
--
-- public.is_verified_holder and public.list_pending_family_invitations
-- need to read from private tables. To keep the public wrappers thin
-- (and to keep the function bodies free of private schema names — the
-- privacy suite asserts no private table names leak into
-- database.generated.ts), these reads live in private helpers that
-- the public wrappers call by name.

create function private.list_pending_family_invitations(
  p_inviter_user_id uuid
)
returns table (
  id uuid,
  invitee_email_digest bytea,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    fi.id,
    fi.invitee_email_digest,
    fi.created_at,
    fi.expires_at
  from private.family_invitations fi
  where fi.inviter_user_id = p_inviter_user_id
    and fi.status = 'pending'
    and fi.expires_at > now()
  order by fi.created_at asc;
$$;

revoke all on function private.list_pending_family_invitations(uuid) from public;
revoke all on function private.list_pending_family_invitations(uuid) from anon;
revoke all on function private.list_pending_family_invitations(uuid) from authenticated;

grant execute on function private.list_pending_family_invitations(uuid) to service_role;

create function private.check_verified_holder(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.verification_outcomes
    where user_id = p_user_id
      and status = 'verified'
  );
$$;

revoke all on function private.check_verified_holder(uuid) from public;
revoke all on function private.check_verified_holder(uuid) from anon;
revoke all on function private.check_verified_holder(uuid) from authenticated;