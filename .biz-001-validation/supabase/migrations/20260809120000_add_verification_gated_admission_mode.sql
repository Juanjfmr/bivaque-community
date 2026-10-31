-- 036: Add 'verification_gated' to public.locality_admission_mode.
--
-- MAP §6 alignment (2026-08-09): the Bivaque access model is
-- verification-gated — anyone who can confirm federal-military,
-- Veteran, or pensioner status through the CPF verification flow
-- is admitted. The historic 'invite_only' value is retained for
-- future localities that may want a true invite model (allowlist
-- of CPFs distributed out-of-band).
--
-- The new value is not consumed in this migration; the row update
-- for Manaus lives in the next migration because ALTER TYPE ... ADD
-- VALUE cannot be used in the same transaction it is added.

alter type public.locality_admission_mode add value 'verification_gated';
