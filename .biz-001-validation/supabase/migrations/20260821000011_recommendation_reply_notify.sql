-- 033: close the ask-and-answer loop (Wave F Task 5).
--
-- The schema closed the cycle (20260815220000_recommendation_reply_cycle.sql:
-- edit/delete of your own reply) but the person never "knows" they were
-- answered. Three things land here:
--   1. A reply inserts a notification + outbox row for the request author
--      (respecting notification_preferences.comments). Destination opens the
--      recommendation request detail.
--   2. The author can mark the request 'resolved' (is_resolved + resolved_at
--      + resolved_by) — the §6.3 cycle close that feeds guide curation.

-- ── 1. Add `is_resolved` to recommendation_requests ─────────────────────────

alter table public.recommendation_requests
  add column is_resolved boolean not null default false,
  add column resolved_at timestamptz,
  add column resolved_by uuid references auth.users (id) on delete set null;

-- ── 2. Trigger: reply -> notify the request author ──────────────────────────

create function private.notify_recommendation_reply()
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
  if v_email is not null and v_email <> '' then
    insert into public.outbox (recipient, channel, type, payload)
    values (
      v_email, 'email', 'recommendation_reply',
      jsonb_build_object('request_id', new.request_id, 'reply_id', new.id)
    );
  end if;

  return new;
end;
$$;

revoke all on function private.notify_recommendation_reply() from public;
revoke all on function private.notify_recommendation_reply() from anon;
revoke all on function private.notify_recommendation_reply() from authenticated;
grant execute on function private.notify_recommendation_reply() to service_role;

create trigger notify_recommendation_reply_trigger
after insert on public.recommendation_replies
for each row
execute function private.notify_recommendation_reply();

-- ── 3. RPC: author marks the request resolved ────────────────────────────────

create function public.mark_recommendation_resolved(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.recommendation_requests
  set is_resolved = true,
      resolved_at = now(),
      resolved_by = (select auth.uid())
  where id = p_request_id
    and author_id = (select auth.uid());

  if not found then
    raise exception 'request not found or you are not the author' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.mark_recommendation_resolved(uuid) from public;
revoke all on function public.mark_recommendation_resolved(uuid) from anon;
revoke all on function public.mark_recommendation_resolved(uuid) from authenticated;
grant execute on function public.mark_recommendation_resolved(uuid) to authenticated;