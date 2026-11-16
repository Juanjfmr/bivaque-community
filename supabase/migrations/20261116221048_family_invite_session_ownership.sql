-- Convite familiar: posse derivada da sessão, tetos atômicos no banco.
--
-- Auditoria independente de 16/11 (A2-1, A2-2, A2-3) sobre a main 3c4dc55f, e a
-- decisão de 16/11 registrada no ADR-20261111-convite-familiar-pela-sessao:
--
--   * A2-1 — `private.create_family_invitation` recebia `p_inviter_user_id` e não
--     comparava `auth.uid()`: quem chama é que decidia em nome de quem o convite
--     nasce. As três funções públicas de escrita (criar, revogar, reenviar)
--     passam a derivar o titular de `auth.uid()` no banco, no molde de
--     `public.declare_locality_transfer` (20260819021416), e as assinaturas
--     públicas que aceitavam o id são removidas: o caminho público não recebe
--     id de titular nenhum.
--   * A2-2/A2-3 — o limite de envio não pode morar na rota: agora que a função é
--     chamável direto pela Data API, o teto de envios por titular e o teto de 5
--     convites ativos são conferidos DENTRO da função, sob
--     `pg_advisory_xact_lock` por titular (molde
--     `private.lock_family_invite_code_attempts`, 20261023120000). Sem isso, duas
--     criações simultâneas leem a mesma contagem e passam as duas.
--
-- O que NÃO muda: o aceite (`family_invite_code_accept`), a entrada (F01) e o
-- outbox. O cliente do navegador continua sem privilégio de tabela no schema
-- `private` e sem acesso a nenhuma função que receba o id do titular.
--
-- `execute` só para `authenticated`: o papel de serviço não tem `auth.uid()` e
-- por isso não é identidade de ninguém (supabase/AGENTS.md). Ele continua com as
-- leituras do titular (`list_pending_invites_with_hint`, `is_verified_holder`),
-- que a rota usa depois de resolver a sessão.

-- ── a trava e o teto de envios ──────────────────────────────────────────────

-- Uma trava por titular, na forma de transação: contar e inserir são dois passos
-- e, sem a trava, dois pedidos simultâneos leem a mesma contagem. A chave é o
-- próprio id (prefixado para não colidir com outra trava do mesmo esquema) e a
-- trava é reentrante, então quem já a segura não bloqueia a si mesmo.
create function private.lock_family_invite_holder(p_holder_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_holder_user_id is null then
    raise exception 'holder is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'family_invite:holder:' || p_holder_user_id::text,
      0
    )
  );
end;
$$;

revoke all on function private.lock_family_invite_holder(uuid) from public;
revoke all on function private.lock_family_invite_holder(uuid) from anon;
revoke all on function private.lock_family_invite_holder(uuid) from authenticated;
grant execute on function private.lock_family_invite_holder(uuid) to service_role;

-- Teto de envios por titular numa janela de uma hora: 10, o mesmo número que a
-- janela do Upstash já usava na rota. A contagem vem das linhas de
-- `private.family_invitations` criadas na janela — cada criação é um e-mail, e
-- revogar não apaga o que já saiu (o mesmo critério que o módulo do servidor
-- usava lendo o outbox). Reenvio não entra nesta conta: ele não cria linha e não
-- tem rota própria (ADR-20261111, emenda de 16/11).
create function private.family_invite_send_gate(p_holder_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sent integer;
begin
  perform private.lock_family_invite_holder(p_holder_user_id);

  select count(*)::integer
  into v_sent
  from private.family_invitations
  where inviter_user_id = p_holder_user_id
    and created_at > now() - interval '1 hour';

  if v_sent >= 10 then
    raise exception 'maximum 10 invitations per holder per hour';
  end if;
end;
$$;

revoke all on function private.family_invite_send_gate(uuid) from public;
revoke all on function private.family_invite_send_gate(uuid) from anon;
revoke all on function private.family_invite_send_gate(uuid) from authenticated;
grant execute on function private.family_invite_send_gate(uuid) to service_role;

-- ── o criador ganha a trava ─────────────────────────────────────────────────

-- Mesmo corpo da 20260820000004, com a trava e o teto de envios na frente de
-- toda leitura: titular verificado, convites ativos e o insert passam a
-- acontecer numa única transação serializada por titular. A assinatura é a
-- mesma (o id continua aqui, porque esta é a camada privada chamada pela porta
-- pública e não tem acesso de `authenticated`).
create or replace function private.create_family_invitation(
  p_inviter_user_id uuid,
  p_token_digest bytea,
  p_invitee_email_digest bytea,
  p_invitee_email_hint text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verified boolean;
  v_active_count integer;
  v_invitation_id uuid;
begin
  perform private.family_invite_send_gate(p_inviter_user_id);

  select status = 'verified'
  into v_verified
  from private.verification_outcomes
  where user_id = p_inviter_user_id;

  if v_verified is not true then
    raise exception 'only verified holders can create invitations';
  end if;

  select count(*)::integer
  into v_active_count
  from private.family_invitations
  where inviter_user_id = p_inviter_user_id
    and status = 'pending'
    and expires_at > now();

  if v_active_count >= 5 then
    raise exception 'maximum 5 active invitations per holder';
  end if;

  insert into private.family_invitations (
    inviter_user_id,
    token_digest,
    invitee_email_digest,
    invitee_email_hint,
    expires_at
  )
  values (
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest,
    p_invitee_email_hint,
    now() + interval '7 days'
  )
  returning id into v_invitation_id;

  return v_invitation_id;
end;
$$;

revoke all on function private.create_family_invitation(uuid, bytea, bytea, text) from public;
revoke all on function private.create_family_invitation(uuid, bytea, bytea, text) from anon;
revoke all on function private.create_family_invitation(uuid, bytea, bytea, text) from authenticated;
grant execute on function private.create_family_invitation(uuid, bytea, bytea, text)
  to service_role;

-- ── a porta pública, sem id de titular ──────────────────────────────────────

-- Criar: o titular é `auth.uid()`. Sem sessão a resposta é 28000, a mesma da
-- transferência de cidade — e não 42501, que diria o contrário (o papel TEM o
-- privilégio; o que falta é identidade).
create function public.create_family_invitation(
  p_token_digest bytea,
  p_invitee_email_digest bytea,
  p_invitee_email_hint text,
  p_code_hash bytea
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  return private.create_family_invitation(
    v_user_id,
    p_token_digest,
    p_invitee_email_digest,
    p_invitee_email_hint,
    p_code_hash
  );
end;
$$;

revoke all on function public.create_family_invitation(bytea, bytea, text, bytea) from public;
revoke all on function public.create_family_invitation(bytea, bytea, text, bytea) from anon;
revoke all on function public.create_family_invitation(bytea, bytea, text, bytea) from authenticated;
grant execute on function public.create_family_invitation(bytea, bytea, text, bytea)
  to authenticated;

-- Revogar: mesma derivação. Convite de outra pessoa e convite inexistente
-- respondem a mesma frase, então o id não vira oráculo.
create function public.revoke_family_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  perform private.revoke_family_invitation(p_invitation_id, v_user_id);
end;
$$;

revoke all on function public.revoke_family_invitation(uuid) from public;
revoke all on function public.revoke_family_invitation(uuid) from anon;
revoke all on function public.revoke_family_invitation(uuid) from authenticated;
grant execute on function public.revoke_family_invitation(uuid) to authenticated;

-- Reenviar: idem. A rota de reenvio saiu com a tela antiga (ADR-20261111,
-- emenda de 16/11); a função fica porque o reenvio é do banco, e um chamador
-- futuro não pode escolher de quem é o convite.
create function public.resend_family_invitation(
  p_invitation_id uuid,
  p_token_digest bytea,
  p_invitee_email_digest bytea,
  p_code_hash bytea
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  return private.resend_family_invitation(
    p_invitation_id,
    v_user_id,
    p_token_digest,
    p_invitee_email_digest,
    p_code_hash
  );
end;
$$;

revoke all on function public.resend_family_invitation(uuid, bytea, bytea, bytea) from public;
revoke all on function public.resend_family_invitation(uuid, bytea, bytea, bytea) from anon;
revoke all on function public.resend_family_invitation(uuid, bytea, bytea, bytea)
  from authenticated;
grant execute on function public.resend_family_invitation(uuid, bytea, bytea, bytea)
  to authenticated;

-- ── as assinaturas que aceitavam o id do titular saem ───────────────────────

-- Enquanto existirem, um chamador privilegiado (ou, no futuro, um grant
-- esquecido) volta a decidir em nome de quem o convite nasce. As camadas
-- privadas ficam (são a implementação e só o papel de serviço as alcança); o que
-- sai é a superfície pública que aceitava id.
drop function if exists public.create_family_invitation(uuid, bytea, bytea, text, bytea);
drop function if exists public.create_family_invitation(uuid, bytea, bytea, text);
drop function if exists public.create_family_invitation(uuid, bytea, bytea);
drop function if exists public.revoke_family_invitation(uuid, uuid);
drop function if exists public.resend_family_invitation(uuid, uuid, bytea, bytea, bytea);
drop function if exists public.resend_family_invitation(uuid, uuid, bytea, bytea);