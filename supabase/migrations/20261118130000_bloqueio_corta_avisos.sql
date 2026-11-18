create function private.drop_blocked_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.actor_user_id is not null and new.actor_user_id <> new.recipient_user_id
    and exists (
      select 1 from public.dm_blocks b
      where (b.blocker_user_id = new.recipient_user_id and b.blocked_user_id = new.actor_user_id)
         or (b.blocker_user_id = new.actor_user_id and b.blocked_user_id = new.recipient_user_id)
    ) then
    return null;
  end if;
  return new;
end;
$$;

revoke all on function private.drop_blocked_notification() from public, anon, authenticated;

create trigger drop_blocked_notification
before insert on public.notifications
for each row execute function private.drop_blocked_notification();
create or replace function private.notify_recommendation_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
  v_prefs_enabled boolean;
  v_email text;
begin
  select r.author_id, u.email into v_author, v_email
  from public.recommendation_requests r
  join auth.users u on u.id = r.author_id
  where r.id = new.request_id;

  -- Actor must not self-notify: replying to your own request produces no
  -- notification (the §F5 negative case).
  if v_author is null or v_author = new.author_id then
    return new;
  end if;

  -- Honours notification_preferences.comments (the "reply to my thing"
  -- channel). Default true if no row exists.
  select coalesce(np.comments, true) into v_prefs_enabled
  from public.notification_preferences np
  where np.user_id = v_author;

  if v_prefs_enabled is false then
    return new;
  end if;

  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    v_author, new.author_id, 'recommendation_reply', 'replied', 'recommendation_request', new.request_id
  );

  -- Outbox: enqueue an email to the author so the reply reaches them even if
  -- they are not in the app right now. The email is from auth.users via the
  -- service context (this function is security definer with search_path='').
  if v_email is not null and v_email <> '' and not exists (
    select 1 from public.dm_blocks b
    where (b.blocker_user_id = v_author and b.blocked_user_id = new.author_id)
       or (b.blocker_user_id = new.author_id and b.blocked_user_id = v_author)
  ) then
    insert into public.outbox (recipient, channel, type, payload)
    values (
      v_email, 'email', 'recommendation_reply',
      jsonb_build_object('request_id', new.request_id, 'reply_id', new.id)
    );
  end if;

  return new;
end;
$$;

create or replace function private.notify_recommendation_reply_followers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_author uuid;
  v_follower record;
begin
  select r.author_id into v_request_author
  from public.recommendation_requests r
  where r.id = new.request_id;

  -- Iterate every follower who saved this request. The request author and
  -- the reply author are excluded (the author is notified by the F5 trigger;
  -- the replier is the actor). For each follower, respect their preference.
  for v_follower in
    select s.user_id
    from public.recommendation_saves s
    where s.request_id = new.request_id
      and s.user_id <> new.author_id
      and s.user_id <> coalesce(v_request_author, '00000000-0000-0000-0000-000000000000'::uuid)
  loop
    if coalesce(
      (select np.comments from public.notification_preferences np where np.user_id = v_follower.user_id),
      true
    ) then
      insert into public.notifications (
        recipient_user_id, actor_user_id, type, action, target_type, target_id
      ) values (
        v_follower.user_id, new.author_id, 'recommendation_reply', 'replied_to_saved', 'recommendation_request', new.request_id
      );

      if not exists (
        select 1 from public.dm_blocks b
        where (b.blocker_user_id = v_follower.user_id and b.blocked_user_id = new.author_id)
           or (b.blocker_user_id = new.author_id and b.blocked_user_id = v_follower.user_id)
      ) then
      insert into public.outbox (recipient, channel, type, payload)
      values (
        concat('saved-notify:', v_follower.user_id::text),
        'email', 'recommendation_reply',
        jsonb_build_object('request_id', new.request_id, 'reply_id', new.id, 'follower_id', v_follower.user_id)
      );
      end if;
    end if;
  end loop;

  return new;
end;
$$;

create or replace function private.dispatch_listing_alerts(p_limit integer default 200)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    with candidates as (
      select a.id as alert_id,
             a.owner_user_id,
             a.name as alert_name,
             l.id as listing_id,
             l.title as listing_title
        from public.listing_alerts a
        join public.listings l
          on l.kind = a.kind
         and l.status = 'active'
         and l.published_at is not null
         and l.published_at > a.created_at
        join public.property_details pd
          on pd.listing_id = l.id
       where a.is_active
         and (a.locality_id is null or l.locality_id = a.locality_id)
         and (a.neighborhood is null or lower(l.neighborhood) = lower(a.neighborhood))
         and (a.deal is null or pd.deal = a.deal)
         and (
           a.max_value_cents is null
           or coalesce(pd.rent_cents, pd.sale_price_cents) <= a.max_value_cents
         )
         and (a.min_bedrooms is null or pd.bedrooms >= a.min_bedrooms)
         and private.can_user_read_listing(a.owner_user_id, l.id)
         and not exists (
           select 1
             from public.dm_blocks b
            where (b.blocker_user_id = a.owner_user_id and b.blocked_user_id = l.owner_user_id)
               or (b.blocker_user_id = l.owner_user_id and b.blocked_user_id = a.owner_user_id)
         )
         and not exists (
           select 1
             from public.listing_alert_deliveries d
            where d.alert_id = a.id
              and d.listing_id = l.id
         )
       order by l.published_at
       limit greatest(p_limit, 0)
    ),
    inserted as (
      insert into public.listing_alert_deliveries (alert_id, listing_id)
      select c.alert_id, c.listing_id
        from candidates c
      on conflict (alert_id, listing_id) do nothing
      returning alert_id, listing_id
    )
    select i.alert_id,
           i.listing_id,
           a.owner_user_id,
           a.name as alert_name,
           l.title as listing_title
      from inserted i
      join public.listing_alerts a on a.id = i.alert_id
      join public.listings l on l.id = i.listing_id
  loop
    -- Aviso in-app.
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (v_row.owner_user_id, null, 'listing_alert', 'created', 'listing', v_row.listing_id);

    -- Aviso por e-mail pelo outbox existente. O despachante é quem checa
    -- opt-out e preferência — o produtor não duplica essa decisão.
    insert into public.outbox (recipient, channel, type, payload)
    select u.email,
           'email',
           'listing_alert',
           jsonb_build_object(
             'user_id', v_row.owner_user_id,
             'alert_id', v_row.alert_id,
             'listing_id', v_row.listing_id,
             'alert_name', v_row.alert_name,
             'listing_title', v_row.listing_title
           )
      from auth.users u
     where u.id = v_row.owner_user_id
       and u.email is not null;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
