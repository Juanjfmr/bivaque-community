-- Authorization matrix fixtures: extends foundation.inc with accepted
-- family links and waitlist actors. Must be included AFTER foundation.inc
-- (and trust.inc if needed) inside a transaction.
-- Uses example.invalid identities and fixed UUIDs. Never real data.

-- accepted family link: member-two (002) accepted the foundation invitation
-- from member-one (001), creating an independent family relationship.
-- The membership the family user holds at Manaus is their own, not inherited.
update private.family_invitations
set
  status = 'accepted',
  accepted_by_user_id = '10000000-0000-4000-8000-000000000002',
  accepted_at = '2026-08-03 12:00:00+00'
where id = '20000000-0000-4000-8000-000000000001';

insert into private.family_account_links (
  invitation_id,
  holder_user_id,
  family_user_id
)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);

-- waitlist user: authenticated, pending verification, no locality membership.
-- Represents a user who registered and submitted verification but has not
-- been approved or added to a locality.
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000006', 'waitlist@example.invalid');

insert into private.verification_outcomes (user_id, status)
values ('10000000-0000-4000-8000-000000000006', 'pending');
