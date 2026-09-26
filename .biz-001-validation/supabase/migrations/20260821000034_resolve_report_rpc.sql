-- 034: resolver denuncia vira ato unico (H-Task 3, Step 2)
--
-- Ate aqui resolver uma denuncia acontecia em DOIS lugares que faziam coisas
-- diferentes:
--
--   apps/web/app/(admin)/reports/page.tsx        — Server Action, NAO notifica
--   apps/web/app/api/admin/reports/[id]/route.ts — notifica so no `resolve`
--
-- O caminho que o operador usa de verdade e o formulario do painel, entao na
-- pratica o retorno ao denunciante (D24) nao existia — e existia metade dele
-- numa rota que ninguem chama. Enquanto forem dois codigos, um deles volta a
-- divergir; a divergencia atual custou a funcionalidade inteira.
--
-- Um RPC, transacional, que os dois chamam. Ocultar, registrar e avisar sao o
-- mesmo ato ou nao sao ato nenhum.
--
-- Sobre a notificacao: o runbook §6 exige "sem revelar a acao tomada". A tabela
-- `notifications` so carrega referencia estrutural (destinatario, ator, tipo,
-- acao, alvo), entao nao existe coluna por onde vazar o conteudo denunciado,
-- seu autor, ou o desfecho aplicado. O `target_id` aponta para a DENUNCIA,
-- nunca para o conteudo.

create function public.resolve_report(
  p_report_id uuid,
  p_operator_user_id uuid,
  p_action text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.reports;
begin
  if p_action not in ('hide', 'dismiss') then
    raise exception 'action must be hide or dismiss' using errcode = '22023';
  end if;

  -- Mesmo contrato de is_current_user_operator: quem chama roda como
  -- service_role, auth.uid() e NULL aqui, e o operador vem explicito.
  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators resolve reports' using errcode = '42501';
  end if;

  select * into v_report
    from public.reports
   where id = p_report_id and status = 'open'
     for update;

  if not found then
    raise exception 'report not found or already resolved' using errcode = 'P0002';
  end if;

  if p_action = 'hide' then
    case v_report.target_type
      when 'post' then
        update public.posts set is_deleted = true where id = v_report.target_id;
      when 'comment' then
        update public.comments set is_deleted = true where id = v_report.target_id;
      when 'group' then
        update public.groups set is_deleted = true where id = v_report.target_id;
      when 'message' then
        update public.dm_messages set is_deleted = true where id = v_report.target_id;
      when 'recommendation_request' then
        update public.recommendation_requests set is_deleted = true where id = v_report.target_id;
      when 'recommendation_reply' then
        update public.recommendation_replies set is_deleted = true where id = v_report.target_id;
      else
        -- Levantar aqui e o comportamento certo: um alvo que a moderacao nao
        -- sabe ocultar nao pode ser resolvido como se tivesse sido. Quando a
        -- onda G aterrissar, o ramo `provider_profile` entra nesta lista.
        raise exception 'unknown target type: %', v_report.target_type using errcode = '22023';
    end case;
  end if;

  update public.reports
     set status = 'resolved',
         operator_note = coalesce(p_note, p_action),
         resolved_by = p_operator_user_id,
         resolved_at = now()
   where id = p_report_id;

  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    v_report.reporter_user_id, p_operator_user_id, 'report_resolved',
    'resolved', 'report', p_report_id
  );
end;
$$;

revoke all on function public.resolve_report(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.resolve_report(uuid, uuid, text, text) to service_role;
