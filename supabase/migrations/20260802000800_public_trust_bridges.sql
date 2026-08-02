-- 008: public RPC bridges for the private trust write path
-- The private schema is intentionally not exposed through the Data API.
-- The Next server (service_role) calls these public security-definer
-- wrappers, which delegate to the private helpers. No CPF, Portal payload,
-- OM, rank, or address ever crosses these boundaries.

-- upsert a verification outcome (wraps private.upsert_verification_outcome)
create function public.upsert_verification_outcome(
  p_user_id uuid,
  p_status text,
  p_eligibility_class text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.upsert_verification_outcome(
    p_user_id,
    p_status::private.verification_status,
    case when p_eligibility_class is null then null
         else p_eligibility_class::private.eligibility_class
    end
  );
end;
$$;

revoke all on function public.upsert_verification_outcome(uuid, text, text) from public;
revoke all on function public.upsert_verification_outcome(uuid, text, text) from anon;
revoke all on function public.upsert_verification_outcome(uuid, text, text) from authenticated;

grant execute on function public.upsert_verification_outcome(uuid, text, text) to service_role;

-- accept a family invitation (wraps private.accept_family_invitation)
create function public.accept_family_invitation(
  p_token_digest bytea,
  p_accepted_by_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.accept_family_invitation(
    p_token_digest,
    p_accepted_by_user_id
  );
end;
$$;

revoke all on function public.accept_family_invitation(bytea, uuid) from public;
revoke all on function public.accept_family_invitation(bytea, uuid) from anon;
revoke all on function public.accept_family_invitation(bytea, uuid) from authenticated;

grant execute on function public.accept_family_invitation(bytea, uuid) to service_role;
