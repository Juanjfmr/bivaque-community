-- Reenviar convite familiar (prancha 76).
--
-- O token em claro existe uma única vez, no payload do outbox, no instante da
-- emissão: a tabela guarda só o digest. Reenviar, então, é REEMITIR — girar o
-- digest (o link antigo deixa de valer), devolver 7 dias de prazo e enfileirar
-- uma mensagem nova.
--
-- Para endereçar o outbox é preciso o e-mail cru, que o banco NÃO guarda por
-- desenho. Quem reenvia informa o endereço de novo e a função só aceita se o
-- digest bater com o do convite: reenviar não pode virar oráculo do endereço
-- convidado.
create function private.resend_family_invitation(
  p_invitation_id uuid,
  p_inviter_user_id uuid,
  p_token_digest bytea,
  p_invitee_email_digest bytea
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update private.family_invitations
     set token_digest = p_token_digest,
         expires_at = now() + interval '7 days'
   where id = p_invitation_id
     and inviter_user_id = p_inviter_user_id
     and status = 'pending'
     and invitee_email_digest = p_invitee_email_digest;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'invitation not found or not resendable';
  end if;

  return p_invitation_id;
end;
$$;

revoke all on function private.resend_family_invitation(uuid, uuid, bytea, bytea) from public;
revoke all on function private.resend_family_invitation(uuid, uuid, bytea, bytea) from anon;
revoke all on function private.resend_family_invitation(uuid, uuid, bytea, bytea)
  from authenticated;
grant execute on function private.resend_family_invitation(uuid, uuid, bytea, bytea)
  to service_role;

-- Wrapper público para o service_role, como o create e o revoke.
create function public.resend_family_invitation(
  p_invitation_id uuid,
  p_inviter_user_id uuid,
  p_token_digest bytea,
  p_invitee_email_digest bytea
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.resend_family_invitation(
    p_invitation_id,
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest
  );
end;
$$;

revoke all on function public.resend_family_invitation(uuid, uuid, bytea, bytea) from public;
revoke all on function public.resend_family_invitation(uuid, uuid, bytea, bytea) from anon;
revoke all on function public.resend_family_invitation(uuid, uuid, bytea, bytea)
  from authenticated;
grant execute on function public.resend_family_invitation(uuid, uuid, bytea, bytea)
  to service_role;
