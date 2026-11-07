-- RUN-024: estado segue fora de profiles; somente a própria pessoa lê sua suspensão.
alter type public.notification_type add value if not exists 'account_suspension';
alter table public.profile_suspensions add column expires_at timestamptz;
alter table public.operator_actions add column expires_at timestamptz;
create index profile_suspensions_expiry_idx on public.profile_suspensions(expires_at)
  where expires_at is not null;

create or replace function public.is_account_suspended(p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_user_id = (select auth.uid()) and exists (
    select 1 from public.profile_suspensions
      where user_id=p_user_id and (expires_at is null or expires_at > now())
  );
$$;
revoke all on function public.is_account_suspended(uuid) from public, anon;
grant execute on function public.is_account_suspended(uuid) to authenticated;


create function private.expire_account_suspension(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $
begin
  perform pg_advisory_xact_lock(hashtextextended('account_suspension:' || p_user_id::text,0));
  delete from public.profile_suspensions where user_id=p_user_id and expires_at<=now();
  if not found then return; end if;
  insert into public.operator_actions(actor_id,action,target_type,target_id)
    values(null,'suspension_expired','user',p_user_id);
  insert into public.notifications(recipient_user_id,actor_user_id,type,action,target_type,target_id)
    values(p_user_id,null,'account_suspension','ended','user',p_user_id);
end;
$;
revoke all on function private.expire_account_suspension(uuid) from public,anon,authenticated;

create function public.operator_suspend_account(
  p_user_id uuid, p_operator_user_id uuid, p_reason text, p_days integer
)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_until timestamptz;
begin
  if not coalesce(public.is_current_user_operator(p_operator_user_id),false) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if coalesce(btrim(p_reason),'')='' or char_length(p_reason)>1000
    or p_days is null or p_days not between 1 and 365 or p_user_id=p_operator_user_id then
    raise exception 'invalid suspension' using errcode='22023';
  end if;
  if not exists(select 1 from auth.users where id=p_user_id) then
    raise exception 'account not found' using errcode='P0002';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('account_suspension:' || p_user_id::text,0));
  perform private.expire_account_suspension(p_user_id);
  if exists(select 1 from public.profile_suspensions where user_id=p_user_id
    and (expires_at is null or expires_at>now())) then
    raise exception 'already suspended' using errcode='P0001';
  end if;
  v_until := now() + make_interval(days => p_days);
  insert into public.profile_suspensions(user_id,expires_at)
    values(p_user_id,v_until)
    on conflict(user_id) do update set expires_at=excluded.expires_at,updated_at=now();
  insert into public.operator_actions(actor_id,action,target_type,target_id,reason,expires_at)
    values(p_operator_user_id,'suspension_applied','user',p_user_id,p_reason,v_until);
  insert into public.notifications(recipient_user_id,actor_user_id,type,action,target_type,target_id)
    values(p_user_id,null,'account_suspension','applied','user',p_user_id);
end;
$$;
revoke all on function public.operator_suspend_account(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.operator_suspend_account(uuid,uuid,text,integer) to service_role;

create function public.operator_end_suspension(p_user_id uuid,p_operator_user_id uuid,p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not coalesce(public.is_current_user_operator(p_operator_user_id),false) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if coalesce(btrim(p_reason),'')='' or char_length(p_reason)>1000 then
    raise exception 'reason required' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('account_suspension:' || p_user_id::text,0));
  delete from public.profile_suspensions where user_id=p_user_id;
  if not found then raise exception 'suspension not found' using errcode='P0002'; end if;
  insert into public.operator_actions(actor_id,action,target_type,target_id,reason)
    values(p_operator_user_id,'suspension_ended','user',p_user_id,p_reason);
  insert into public.notifications(recipient_user_id,actor_user_id,type,action,target_type,target_id)
    values(p_user_id,null,'account_suspension','ended','user',p_user_id);
end;
$$;
revoke all on function public.operator_end_suspension(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.operator_end_suspension(uuid,uuid,text) to service_role;

select cron.schedule('bivaque-suspension-expiry','*/5 * * * *',
  'select private.expire_account_suspension(user_id) from public.profile_suspensions where expires_at <= now()');
