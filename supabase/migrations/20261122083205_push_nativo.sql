-- Registro nativo e reserva de entrega (ADR-20261118).
alter table public.push_subscriptions
  drop constraint push_subscriptions_destination_check,
  add constraint push_subscriptions_destination_check check (char_length(destination) between 1 and 4096),
  drop column label;

drop function public.register_push_subscription(text, text, text, text, text);

create function public.register_push_subscription(
  p_kind text, p_destination text, p_key_p256dh text, p_key_auth text
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_kind is null or p_kind not in ('web', 'android', 'ios')
     or p_destination is null
     or char_length(p_destination) not between 1 and 4096
     or (p_kind = 'web' and (
       char_length(p_destination) > 1024 or p_destination not like 'https://%'
       or p_key_p256dh is null or char_length(p_key_p256dh) not between 1 and 255
       or p_key_auth is null or char_length(p_key_auth) not between 1 and 255
     ))
     or (p_kind in ('android', 'ios') and (
       p_destination !~ '^[\x21-\x7E]+$' or p_key_p256dh is not null or p_key_auth is not null
     )) then
    raise exception 'invalid push subscription' using errcode = '22023';
  end if;

  -- Serializa registros do mesmo titular para preservar o limite concorrente.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 0));

  insert into public.push_subscriptions as s (user_id, kind, destination, key_p256dh, key_auth)
  values (auth.uid(), p_kind, p_destination, p_key_p256dh, p_key_auth)
  on conflict (kind, destination) do update
    set user_id = auth.uid(), key_p256dh = excluded.key_p256dh,
        key_auth = excluded.key_auth, created_at = now(), last_success_at = null
    where excluded.kind <> 'web' or s.user_id = auth.uid()
       or (s.key_p256dh = excluded.key_p256dh and s.key_auth = excluded.key_auth);
  if not found then
    raise exception 'push subscription already exists' using errcode = '23505';
  end if;

  delete from public.push_subscriptions
  where id in (
    select s.id from public.push_subscriptions s
    where s.user_id = auth.uid()
    order by s.created_at desc, s.id desc offset 10
  );
end;
$$;
revoke all on function public.register_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;

create function private.remove_native_push_on_preference() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.channel = 'push' and (tg_op = 'DELETE' or not new.enabled) then
    delete from public.push_subscriptions
    where user_id = old.user_id and kind in ('android', 'ios');
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.remove_native_push_on_preference() from public;
create trigger remove_native_push_on_preference
after update of enabled or delete on public.notification_channel_preferences
for each row execute function private.remove_native_push_on_preference();

create or replace function private.enqueue_push_for_notification() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.actor_user_id is not null and exists (
    select 1 from public.dm_blocks b
    where (b.blocker_user_id = new.recipient_user_id and b.blocked_user_id = new.actor_user_id)
       or (b.blocker_user_id = new.actor_user_id and b.blocked_user_id = new.recipient_user_id)
  ) then
    return new;
  end if;
  if private.push_channel_enabled(new.type::text, new.recipient_user_id) then
    insert into public.outbox (recipient, channel, type, payload)
    values (new.recipient_user_id::text, 'push', new.type::text,
      jsonb_build_object('user_id', new.recipient_user_id, 'actor_user_id', new.actor_user_id,
        'action', new.action, 'target_type', new.target_type, 'target_id', new.target_id));
  end if;
  return new;
end;
$$;

create function public.reserve_push_deliveries(p_user_id uuid, p_type text, p_actor_user_id uuid)
returns table(id uuid, kind text, destination text, key_p256dh text, key_auth text)
language sql security definer set search_path = ''
as $$
  with reserved as (
    select s.id, s.kind, s.destination, s.key_p256dh, s.key_auth
    from public.push_subscriptions s
    where s.user_id = p_user_id and private.push_channel_enabled(p_type, p_user_id)
      and (p_actor_user_id is null or not exists (
        select 1 from public.dm_blocks b
        where (b.blocker_user_id = p_user_id and b.blocked_user_id = p_actor_user_id)
           or (b.blocker_user_id = p_actor_user_id and b.blocked_user_id = p_user_id)
      ))
    for update of s skip locked
  )
  select r.id, r.kind, r.destination, r.key_p256dh, r.key_auth from reserved r;
$$;
revoke all on function public.reserve_push_deliveries(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.reserve_push_deliveries(uuid, text, uuid) to service_role;
