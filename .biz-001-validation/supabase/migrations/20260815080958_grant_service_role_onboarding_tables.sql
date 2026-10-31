-- Onboarding provisiona membro e perfil com o client service_role.
-- A fundação revogou as tabelas de anon/authenticated, mas o caminho
-- service_role também precisa de privilégios explícitos de escrita aqui.
grant select, insert, update on table public.locality_memberships to service_role;
grant select, insert, update on table public.profiles to service_role;