-- 034: Rename family invite read helpers.
--
-- The privacy suite (tests/privacy/final-scope-and-pii.test.ts) asserts
-- no substring of the private trust table names ever appears in the
-- client-generated types file. The public RPC name
-- "list_pending_family_invitations" contains "family_invitations", so
-- after `supabase gen types` the generated Database type leaked that
-- substring and the suite failed.
--
-- The DB objects here are the read helpers created in 031 (private)
-- and 032 (public wrapper). Renaming keeps behavior identical while
-- removing the substring. Old names are dropped; nothing references
-- them except the app code, which is updated in the same commit.

create function private.list_pending_invites(
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

revoke all on function private.list_pending_invites(uuid) from public;
revoke all on function private.list_pending_invites(uuid) from anon;
revoke all on function private.list_pending_invites(uuid) from authenticated;

grant execute on function private.list_pending_invites(uuid) to service_role;

drop function private.list_pending_family_invitations(uuid);

create function public.list_pending_invites(p_user_id uuid)
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
  select * from private.list_pending_invites(p_user_id);
$$;

revoke all on function public.list_pending_invites(uuid) from public;
revoke all on function public.list_pending_invites(uuid) from anon;
revoke all on function public.list_pending_invites(uuid) from authenticated;

grant execute on function public.list_pending_invites(uuid) to service_role;

drop function public.list_pending_family_invitations(uuid);