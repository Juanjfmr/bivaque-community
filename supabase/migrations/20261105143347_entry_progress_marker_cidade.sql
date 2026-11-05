-- RUN-004 (revisão do PR #128) — o marcador da retomada guarda o nome da
-- cidade para exibição.
--
-- A primeira versão do marcador gravava `estado = '{}'`. Na retomada depois do
-- provisionamento a prévia da cidade não tinha de onde tirar o nome (o canônico
-- é o vínculo/IBGE, não o texto do rascunho) e mostrava "sua cidade". O nome é
-- só de exibição, como no resto do rascunho (ADR-20261102); o canônico continua
-- em `locality_memberships`/`localities`.
--
-- O resto da função é a definição de 20261105132844, linha por linha.

begin;

create or replace function public.provision_member_entry(
  p_user_id uuid,
  p_locality_id uuid,
  p_display_name text,
  p_consent_version integer,
  p_moment public.entry_moment default null,
  p_arrival_date date default null,
  p_departure_date date default null,
  p_destination_locality_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
begin
  perform public.provision_member_locality(p_user_id, p_locality_id);

  insert into public.profiles (
    user_id, display_name, visibility, consent_version, consented_at
  )
  values (
    p_user_id,
    p_display_name,
    'locality_members'::public.profile_visibility,
    p_consent_version,
    now()
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        visibility = excluded.visibility,
        consent_version = excluded.consent_version,
        consented_at = excluded.consented_at;

  if p_moment is not null then
    insert into public.member_entry_moments (
      user_id, moment, arrival_date, departure_date, destination_locality_id
    )
    values (
      p_user_id,
      p_moment,
      p_arrival_date,
      p_departure_date,
      p_destination_locality_id
    )
    on conflict (user_id) do update
      set moment = excluded.moment,
          arrival_date = excluded.arrival_date,
          departure_date = excluded.departure_date,
          destination_locality_id = excluded.destination_locality_id;
  end if;

  -- Marcador da etapa seguinte, com o nome da cidade só para a prévia exibir.
  -- A versão do fluxo é a vigente nesta migration (2).
  insert into public.entry_progress (user_id, versao, etapa, estado)
  select p_user_id, 2, 'previa-cidade', jsonb_build_object('cidade', l.city_name)
  from public.localities as l
  where l.id = p_locality_id
  on conflict (user_id) do update
    set versao = 2,
        etapa = 'previa-cidade',
        estado = excluded.estado,
        updated_at = now();
end;
$func$;

comment on function public.provision_member_entry(
  uuid, uuid, text, integer, public.entry_moment, date, date, uuid
) is
  'Provisiona a entrada numa transação: vínculo (provision_member_locality), perfil, momento declarado e marcador do rascunho (entry_progress etapa previa-cidade, com o nome da cidade para exibição). service_role apenas; as rotas de provisionamento e o convite familiar são as chamadoras.';

commit;
