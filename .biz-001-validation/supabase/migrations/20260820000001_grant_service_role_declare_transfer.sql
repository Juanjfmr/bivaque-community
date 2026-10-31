-- T1 follow-up: service_role needs execute on declare_locality_transfer
-- so pgTAP fixtures (and recovery flows on prod) can drive the helper.
-- The helper is SECURITY DEFINER and only the row state protects it; the
-- caller role is irrelevant to the result.
grant execute on function public.declare_locality_transfer(uuid, date) to service_role;
