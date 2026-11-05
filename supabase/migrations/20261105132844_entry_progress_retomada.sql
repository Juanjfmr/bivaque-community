-- RUN-004 (revisão do PR #128) — o rascunho sobrevive ao provisionamento como
-- marcador da etapa pendente, e a entrada termina sem linha.
--
-- ── o defeito que esta migration fecha ──────────────────────────────────────
-- A emenda do SEC-007 apagava o rascunho DENTRO do provisionamento. Com isso o
-- GET /api/app/entry/progress não tinha mais como saber em que ponto do fim da
-- entrada a pessoa estava: quem recarregava logo depois de provisionar era
-- mandado direto ao Início, pulando interesses, o combinado e os avisos
-- (achado (7) da revisão de 05/11).
--
-- ── a correção ──────────────────────────────────────────────────────────────
-- O provisionamento troca a linha do rascunho por um marcador mínimo:
-- `etapa = 'previa-cidade'`, `estado = '{}'`. Ele não é escrito pela tela — o
-- PUT responde 409 a quem já tem vínculo —, então não há recriação de rascunho
-- depois do provisionamento. O marcador some quando a entrada termina (a rota
-- dos avisos apaga) ou pela purga da conta; a leitura também descarta rascunho
-- parado há mais de 30 dias.
--
-- O resto da função é a definição vigente (20261104135131), linha por linha.

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
  -- 1. O vínculo. Reuso literal: `provision_member_locality` confere o catálogo,
  --    transforma a corrente em saída e cria a nova corrente.
  perform public.provision_member_locality(p_user_id, p_locality_id);

  -- 2. O perfil, como a rota fazia pelo cliente privilegiado.
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

  -- 3. O momento declarado. Sem momento (convite familiar), nada é escrito.
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

  -- 4. O rascunho vira marcador da etapa seguinte (a prévia da cidade), na mesma
  --    transação do vínculo, do perfil e do momento. A versão do fluxo é a
  --    vigente no momento desta migration (2); uma versão nova recomeça a
  --    entrada pela regra do ADR-20261102, sem migrar o estado.
  insert into public.entry_progress (user_id, versao, etapa, estado)
  values (p_user_id, 2, 'previa-cidade', '{}'::jsonb)
  on conflict (user_id) do update
    set versao = 2,
        etapa = 'previa-cidade',
        estado = '{}'::jsonb,
        updated_at = now();
end;
$func$;

comment on function public.provision_member_entry(
  uuid, uuid, text, integer, public.entry_moment, date, date, uuid
) is
  'Provisiona a entrada numa transação: vínculo (provision_member_locality), perfil, momento declarado e marcador do rascunho (entry_progress etapa previa-cidade). service_role apenas; as rotas de provisionamento e o convite familiar são as chamadoras.';

commit;
