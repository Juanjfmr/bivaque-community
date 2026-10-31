-- Onda T Task 5: o sinal de quem está chegando.
--
-- The ADR claims this as a benefit that costs almost nothing after Tasks 1-3:
-- the product already knows who is arriving where and when, because a
-- declared transfer creates the destination's kind='current' row immediately
-- and keeps the origin as kind='leaving' with a term date. Task 5 only
-- surfaces that fact to the two people who decide with it — the vila owner
-- reviewing a pending request, and the founder watching where the operation
-- should go next.
--
-- The boundary this migration does NOT cross: no force, situação, OM or
-- turma field exists in this schema (AGENTS.md:205, ADR-20260811-om-declarada
-- is still `proposed`), so there is nothing of that shape to leak. Both
-- functions below select only what the plan explicitly asks for: name,
-- request/arrival dates, and the origin city's name.

-- ── list_community_pending_arrivals ─────────────────────────────────────────
-- The vila owner's queue, with the declared-transfer signal joined in. A
-- pending requester who also holds a kind='leaving' row is someone mid-
-- transfer; arriving_from_locality_name/arriving_at are null for an
-- organic local request. service_role-only, same shape as
-- is_current_user_community_moderator: the shell authenticates the caller
-- from the session and passes the id explicitly, because service_role has
-- no auth.uid() to read.
create function public.list_community_pending_arrivals(
  p_community_id uuid,
  p_user_id uuid,
  p_limit int default 500
)
returns table (
  user_id uuid,
  display_name text,
  requested_at timestamptz,
  arriving_from_locality_name text,
  arriving_at date
)
language plpgsql
stable
security definer
set search_path = ''
as $func$
begin
  if not public.is_current_user_community_moderator(p_community_id, p_user_id) then
    raise exception 'not a moderator of this community' using errcode = '42501';
  end if;

  return query
    select
      cm.user_id,
      p.display_name,
      cm.joined_at,
      origin.city_name,
      origin_row.leaving_at
    from public.community_memberships cm
    left join public.profiles p on p.user_id = cm.user_id
    left join public.locality_memberships origin_row
      on origin_row.user_id = cm.user_id
     and origin_row.kind = 'leaving'
    left join public.localities origin
      on origin.id = origin_row.locality_id
    where cm.community_id = p_community_id
      and cm.status = 'pending'
    order by cm.joined_at asc
    limit p_limit;
end;
$func$;

revoke all on function public.list_community_pending_arrivals(uuid, uuid, int) from public;
revoke all on function public.list_community_pending_arrivals(uuid, uuid, int) from anon;
revoke all on function public.list_community_pending_arrivals(uuid, uuid, int) from authenticated;
grant execute on function public.list_community_pending_arrivals(uuid, uuid, int) to service_role;

-- ── list_locality_arrivals_volume ───────────────────────────────────────────
-- The founder console's demand signal (D2 Task 9, "founder console" =
-- (admin)/). Replaces the geographic-waitlist demand panel that died with
-- P0 Task 8 Step 3: volume of declared, not-yet-degraded transfers per
-- destination locality, which is exactly "where should the operation go
-- next" for a locality-by-locality rollout. Operator-only.
create function public.list_locality_arrivals_volume(
  p_user_id uuid
)
returns table (
  locality_id uuid,
  city_name text,
  arrivals_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $func$
begin
  if not public.is_current_user_operator(p_user_id) then
    raise exception 'not an operator' using errcode = '42501';
  end if;

  return query
    select
      destination.locality_id,
      l.city_name,
      count(*)::bigint
    from public.locality_memberships destination
    join public.localities l on l.id = destination.locality_id
    where destination.kind = 'current'
      and exists (
        select 1
        from public.locality_memberships origin
        where origin.user_id = destination.user_id
          and origin.kind = 'leaving'
      )
    group by destination.locality_id, l.city_name
    order by count(*) desc;
end;
$func$;

revoke all on function public.list_locality_arrivals_volume(uuid) from public;
revoke all on function public.list_locality_arrivals_volume(uuid) from anon;
revoke all on function public.list_locality_arrivals_volume(uuid) from authenticated;
grant execute on function public.list_locality_arrivals_volume(uuid) to service_role;
