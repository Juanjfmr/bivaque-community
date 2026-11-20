create function public.create_community_invitation_for_app(
  p_community_id uuid, p_token_digest bytea, p_expires_at timestamptz
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('community-invite:' || v_user_id::text, 0));
  if (select count(*) from public.community_invitations
      where inviter_user_id = v_user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'invitation quota exceeded' using errcode = 'P0005';
  end if;

  return public.create_community_invitation(p_community_id, v_user_id, p_token_digest, p_expires_at);
end;
$$;

create function public.accept_community_invitation_for_app(p_token_digest bytea)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  return public.accept_community_invitation(p_token_digest, v_user_id);
end;
$$;

revoke all on function public.create_community_invitation_for_app(uuid, bytea, timestamptz) from public, anon;
revoke all on function public.accept_community_invitation_for_app(bytea) from public, anon;
grant execute on function public.create_community_invitation_for_app(uuid, bytea, timestamptz) to authenticated;
grant execute on function public.accept_community_invitation_for_app(bytea) to authenticated;
