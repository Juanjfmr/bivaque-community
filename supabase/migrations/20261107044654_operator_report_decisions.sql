-- RUN-024: decisão, efeito, aviso privado e registro são uma transação.
alter type public.notification_type add value if not exists 'moderation_decision';
-- A sobrecarga antiga sem caller não autoriza a operação e não deve ser API pública.
drop function if exists public.resolve_report(uuid, text, text);

create or replace function public.resolve_report(
  p_report_id uuid, p_operator_user_id uuid, p_action text, p_note text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_report public.reports;
  v_table text;
  v_author_column text;
  v_author uuid;
begin
  if not coalesce(public.is_current_user_operator(p_operator_user_id), false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('hide','dismiss','remove')
    or char_length(p_note) > 1000 then
    raise exception 'invalid decision' using errcode = '22023';
  end if;
  select * into v_report from public.reports where id = p_report_id and status = 'open' for update;
  if not found then raise exception 'already resolved' using errcode = 'P0002'; end if;
  case v_report.target_type
    when 'post' then v_table := 'public.posts'; v_author_column := 'user_id';
    when 'comment' then v_table := 'public.comments'; v_author_column := 'user_id';
    when 'group' then v_table := 'public.groups'; v_author_column := 'owner_user_id';
    when 'message' then v_table := 'public.dm_messages'; v_author_column := 'sender_id';
    when 'recommendation_request' then v_table := 'public.recommendation_requests'; v_author_column := 'author_id';
    when 'recommendation_reply' then v_table := 'public.recommendation_replies'; v_author_column := 'author_id';
    when 'provider_profile' then v_table := 'public.provider_profiles'; v_author_column := 'owner_user_id';
    else raise exception 'unsupported target' using errcode = '22023';
  end case;
  -- Tabela e coluna vêm apenas da lista fixa acima, nunca de entrada do cliente.
  execute format('select %I from %s where id = $1 for update',v_author_column,v_table)
    into v_author using v_report.target_id;
  if p_action in ('hide','remove') then
    if v_author is null then raise exception 'target missing' using errcode = 'P0002'; end if;
    -- Remoção lógica preserva vínculos, respostas e evidência; o alvo sai da comunidade pela RLS.
    execute format('update %s set is_deleted = true where id = $1',v_table) using v_report.target_id;
  end if;
  update public.reports set status='resolved', resolved_by=p_operator_user_id,
    resolved_at=now(), operator_note=nullif(btrim(p_note),'') where id=p_report_id;
  insert into public.operator_actions(actor_id,action,target_type,target_id,reason)
    values(p_operator_user_id,'report_' || p_action,'report',p_report_id,nullif(btrim(p_note),''));
  insert into public.notifications(recipient_user_id,actor_user_id,type,action,target_type,target_id)
    values(v_report.reporter_user_id,null,'report_resolved','resolved','report',p_report_id);
  if v_author is not null then
    -- Sem id da denúncia, denunciante, justificativa ou ator na linha que o autor pode ler.
    insert into public.notifications(recipient_user_id,actor_user_id,type,action,target_type,target_id)
      values(v_author,null,'moderation_decision',p_action,'user',v_author);
  end if;
end;
$$;
revoke all on function public.resolve_report(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.resolve_report(uuid,uuid,text,text) to service_role;
