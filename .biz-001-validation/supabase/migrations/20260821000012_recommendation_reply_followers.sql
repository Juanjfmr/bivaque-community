-- 034: Saved requests notify their followers (Wave F Task 6).
--
-- F5 (migration 033) notifies the request author. F6 adds the second fan-out:
-- everyone in `recommendation_saves` for the same request. The two
-- notifications share the same trigger event (the reply insert); they differ
-- only in the recipient set. This migration defines the followers trigger
-- and a single helper that writes the notification + outbox rows, so the
-- trigger body stays small and the preference check is shared.

create function private.notify_recommendation_reply_followers()
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

      insert into public.outbox (recipient, channel, type, payload)
      values (
        concat('saved-notify:', v_follower.user_id::text),
        'email', 'recommendation_reply',
        jsonb_build_object('request_id', new.request_id, 'reply_id', new.id, 'follower_id', v_follower.user_id)
      );
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.notify_recommendation_reply_followers() from public;
revoke all on function private.notify_recommendation_reply_followers() from anon;
revoke all on function private.notify_recommendation_reply_followers() from authenticated;
grant execute on function private.notify_recommendation_reply_followers() to service_role;

create trigger notify_recommendation_reply_followers_trigger
after insert on public.recommendation_replies
for each row
execute function private.notify_recommendation_reply_followers();