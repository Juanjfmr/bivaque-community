-- 037: Set the pilot locality (Manaus) to 'verification_gated'.
--
-- See migration 036 for the rationale. The Bivaque pilot models the
-- federal-military verification flow as the access gate, not an
-- invitation code. The 'invite_only' enum value remains available
-- for future localities with a different policy.
--
-- This UPDATE runs in a separate migration because ALTER TYPE ... ADD
-- VALUE cannot be used in the same transaction it is added; the new
-- value is only consumable after the previous migration commits.

update public.localities
  set admission_mode = 'verification_gated'
  where slug = 'manaus-am';
