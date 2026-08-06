-- 035: Event completion (post-event close by the organizer).
--
-- MAP §4 6d — pós-evento. The organizer closes the event once it
-- happened; completed events keep their RSVP history readable but
-- are no longer actionable. The current enum has 'upcoming' and
-- 'cancelled'; adding 'completed' is additive (safe to ALTER TYPE
-- ADD VALUE). The close is a service_role-only RPC that checks the
-- caller is the organizer, so an authenticated member cannot flip
-- the flag.

alter type public.event_status add value 'completed';

create function public.complete_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.organizer_id = (select auth.uid())
  ) then
    raise exception 'only the event organizer can complete the event';
  end if;

  update public.events
  set status = 'completed', updated_at = now()
  where id = p_event_id;
end;
$$;

revoke all on function public.complete_event(uuid) from public;
revoke all on function public.complete_event(uuid) from anon;
revoke all on function public.complete_event(uuid) from authenticated;

grant execute on function public.complete_event(uuid) to service_role;