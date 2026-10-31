-- 041: rejeicao definitiva de admissoes pending (H-Task 6)
--
-- O operador tem tres acoes no painel de admissoes:
--
--   1. Reprocessar pending — chama /api/internal/verification-reconcile, que
--      roda verification_reconcile_step no user. E o caminho certo para o
--      pending que existe por causa da queda do Portal.
--   2. Decidir documento — decide_verification_document (Task 6 / fix 040),
--      que aprova ou rejeita o PDF enviado.
--   3. Rejeitar definitivamente com motivo — encerra o caso sem documento,
--      marca verification_outcomes rejected, e a pessoa ve o estado em
--      /onboarding/status (que a D2 ja construiu).
--
-- Esta migration cria o terceiro caminho. Sem ela, o operador so observa
-- pending que nunca sera resolvido — o reconcile tem teto de tentativas e
-- rejeita automaticamente apos o teto, mas se o operador quiser forcar
-- precisa de um botao.

create or replace function public.reject_pending_user(
  p_user_id uuid,
  p_operator_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status private.verification_status;
begin
  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators can reject admissions' using errcode = '42501';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'a rejection requires a reason' using errcode = '22023';
  end if;

  select status into v_status
    from private.verification_outcomes
    where user_id = p_user_id;

  if not found then
    raise exception 'no verification outcome for user' using errcode = '02000';
  end if;

  if v_status = 'verified' then
    raise exception 'user already verified; nothing to reject' using errcode = '22023';
  end if;

  if v_status = 'rejected' then
    raise exception 'user already rejected; nothing to reject' using errcode = '22023';
  end if;

  perform private.upsert_verification_outcome(
    p_user_id,
    'rejected'::private.verification_status
  );

  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    p_user_id, p_operator_user_id, 'admission_rejected', 'rejected', 'user', p_user_id
  );
end;
$$;

revoke all on function public.reject_pending_user(uuid, uuid, text) from public;
revoke all on function public.reject_pending_user(uuid, uuid, text) from anon;
revoke all on function public.reject_pending_user(uuid, uuid, text) from authenticated;
grant execute on function public.reject_pending_user(uuid, uuid, text) to service_role;
