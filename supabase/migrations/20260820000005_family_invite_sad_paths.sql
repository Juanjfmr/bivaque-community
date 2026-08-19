-- D2 Task 5 — distinct codes for the four sad paths of the family invite
-- acceptance, and the 500 that echoed the database no more.
--
-- private.accept_family_invitation used to raise a single exception that
-- packed four reasons into one string ("not found, already accepted,
-- revoked, or expired"). The route could not tell them apart, so it echoed
-- the database message verbatim on 500 — which made "invitation email does
-- not match the authenticated user" the cleanest way to enumerate a token
-- (the only verification-free admission path). The migration below gives each
-- case its own errcode and a stable, internal-only message; the route maps the
-- errcode to the human HTTP code and a human sentence, and the generic 500
-- never echoes anything from the database.
--
-- The function lives in 20260802000400 and was replaced once in
-- 20260815130000. create or replace here keeps that convention: a new
-- migration is the only place this rewrite touches.

create or replace function private.accept_family_invitation(
  p_token_digest bytea,
  p_accepted_by_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation private.family_invitations;
  v_invitee_email_digest bytea;
  v_link_id uuid;
begin
  select *
    into v_invitation
    from private.family_invitations
    where token_digest = p_token_digest;

  if not found then
    raise exception 'family_invitation_not_found' using errcode = 'P0001';
  end if;

  if v_invitation.status = 'accepted' then
    raise exception 'family_invitation_already_used' using errcode = 'P0003';
  end if;

  if v_invitation.status = 'revoked' then
    raise exception 'family_invitation_revoked' using errcode = 'P0004';
  end if;

  if v_invitation.expires_at <= now() then
    raise exception 'family_invitation_expired' using errcode = 'P0002';
  end if;

  -- v_invitation.status must be 'pending' here.

  select extensions.digest(lower(trim(email)), 'sha256')
    into v_invitee_email_digest
    from auth.users
    where id = p_accepted_by_user_id;

  if v_invitee_email_digest is null then
    raise exception 'accepting user not found' using errcode = 'P0001';
  end if;

  -- E-mail divergente: responde EXATAMENTE como "não existe". Quem
  -- encaminhou o link não pode distinguir "token errado" de "token certo,
  -- pessoa errada" — caso contrário, o único caminho sem CPF vira
  -- enumeração. Por isso reusa o P0001, não um código próprio.
  if v_invitee_email_digest <> v_invitation.invitee_email_digest then
    raise exception 'family_invitation_not_found' using errcode = 'P0001';
  end if;

  update private.family_invitations
    set status = 'accepted',
        accepted_by_user_id = p_accepted_by_user_id,
        accepted_at = now()
    where id = v_invitation.id;

  insert into private.family_account_links (
    invitation_id,
    holder_user_id,
    family_user_id
  )
  values (
    v_invitation.id,
    v_invitation.inviter_user_id,
    p_accepted_by_user_id
  )
  returning id into v_link_id;

  return v_link_id;
end;
$$;

revoke all on function private.accept_family_invitation(bytea, uuid) from public;
grant execute on function private.accept_family_invitation(bytea, uuid) to service_role;
