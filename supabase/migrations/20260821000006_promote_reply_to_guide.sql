-- 028: Operator curates guide entries from recommendation replies (Wave E Task 8).
--
-- Step 2 of the plan: in the operator queue, create a guide entry FROM an
-- existing recommendation reply. The AI extraction (D49) replaces the
-- operator at extraction time; the human approval stays the same in both
-- designs. Building the manual path now does NOT anticipate the AI
-- governance — the AI path stays disconnected (Step 1).
--
-- The function is service_role-only (curation is operational, §7.1).
-- It creates the entry with status='approved' immediately because the
-- operator IS the human approval step here (the recommendation reply was
-- already filtered by recommendation_reply_no_commercial — community
-- knowledge, no commercial terms).

-- The reply is marked as 'promoted' so the queue doesn't show it again.
-- A reply can be promoted at most once (unique constraint on
-- source_reply_id).

create table public.recommendation_reply_promotions (
  reply_id uuid primary key references public.recommendation_replies (id) on delete cascade,
  guide_entry_id uuid not null references public.arrival_guide_entries (id) on delete cascade,
  promoted_by uuid not null references auth.users (id) on delete cascade,
  promoted_at timestamptz not null default now()
);

alter table public.recommendation_reply_promotions enable row level security;
alter table public.recommendation_reply_promotions force row level security;

revoke all on table public.recommendation_reply_promotions from anon, authenticated;
grant all on table public.recommendation_reply_promotions to service_role;

-- promote_reply_to_guide_entry:
--   1. validates the operator (is_current_user_operator — same gate as the
--      existing guide-queue review flow);
--   2. validates the reply exists and has not been promoted yet;
--   3. validates the locality_id matches the reply's request's locality
--      (a reply from locality A cannot become a guide entry for locality B);
--   4. creates the entry with status='approved', source='manual', and
--      the operator recorded in reviewed_by;
--   5. creates the promotion record (the unique constraint on
--      source_reply_id in arrival_guide_entries + the FK in promotions
--      gives us 'promoted at most once' for free).
create function public.promote_reply_to_guide_entry(
  p_reply_id uuid,
  p_locality_id uuid,
  p_category public.arrival_guide_category,
  p_name text,
  p_description text,
  p_website_url text,
  p_phone text,
  p_operator_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry_id uuid;
  v_request_locality uuid;
begin
  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators can promote replies' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.recommendation_reply_promotions
    where reply_id = p_reply_id
  ) then
    raise exception 'reply already promoted to guide' using errcode = 'P0002';
  end if;

  select r.locality_id into v_request_locality
  from public.recommendation_replies rr
  join public.recommendation_requests r on r.id = rr.request_id
  where rr.id = p_reply_id;

  if v_request_locality is null then
    raise exception 'reply not found' using errcode = 'P0002';
  end if;

  if v_request_locality <> p_locality_id then
    raise exception 'reply locality does not match target guide locality' using errcode = '42501';
  end if;

  insert into public.arrival_guide_entries (
    locality_id, category, name, description, website_url, phone,
    status, source, source_reply_id, reviewed_by, reviewed_at
  ) values (
    p_locality_id, p_category, p_name, p_description, p_website_url, p_phone,
    'approved', 'manual', p_reply_id, p_operator_user_id, now()
  )
  returning id into v_entry_id;

  insert into public.recommendation_reply_promotions (
    reply_id, guide_entry_id, promoted_by
  ) values (
    p_reply_id, v_entry_id, p_operator_user_id
  );

  return v_entry_id;
end;
$$;

revoke all on function public.promote_reply_to_guide_entry(
  uuid, uuid, public.arrival_guide_category, text, text, text, text, uuid
) from public;
revoke all on function public.promote_reply_to_guide_entry(
  uuid, uuid, public.arrival_guide_category, text, text, text, text, uuid
) from anon;
revoke all on function public.promote_reply_to_guide_entry(
  uuid, uuid, public.arrival_guide_category, text, text, text, text, uuid
) from authenticated;
grant execute on function public.promote_reply_to_guide_entry(
  uuid, uuid, public.arrival_guide_category, text, text, text, text, uuid
) to service_role;

-- list_promotable_replies: replies in the operator's locality that are NOT
-- yet promoted, with their request's category (the operator picks the
-- guide category).
create function public.list_promotable_replies(
  p_locality_id uuid,
  p_limit int default 50
)
returns table (
  reply_id uuid,
  body text,
  created_at timestamptz,
  request_title text,
  request_category public.recommendation_category,
  author_display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    rr.id,
    rr.body,
    rr.created_at,
    r.title,
    r.category,
    p.display_name
  from public.recommendation_replies rr
  join public.recommendation_requests r on r.id = rr.request_id
  left join public.profiles p
    on p.user_id = rr.author_id and p.locality_id = r.locality_id
  where r.locality_id = p_locality_id
    and not exists (
      select 1 from public.recommendation_reply_promotions rp
      where rp.reply_id = rr.id
    )
  order by rr.created_at desc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.list_promotable_replies(uuid, int) from public;
revoke all on function public.list_promotable_replies(uuid, int) from anon;
revoke all on function public.list_promotable_replies(uuid, int) from authenticated;
grant execute on function public.list_promotable_replies(uuid, int) to service_role;