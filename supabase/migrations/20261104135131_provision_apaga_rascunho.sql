-- SEC-007 (lote A do F01) — o rascunho da entrada é apagado DENTRO do
-- provisionamento, para todos os caminhos de conclusão.
--
-- ── o defeito que esta migration fecha ──────────────────────────────────────
-- ADR-20261102-progresso-da-entrada: "o rascunho é apagado quando a entrada
-- termina". A rota do app (`/api/app/entry/provision`) apagava a linha DEPOIS do
-- provisionamento, em outra chamada, e só ela: a rota da web (`/api/onboarding`,
-- `provision`) e o convite familiar (`accept-family-invite`) provisionam pela
-- mesma função e deixavam o rascunho — nome, cidade e escolhas — parado no
-- banco. A falha da limpeza era ainda só logada, e a entrada concluída ficava
-- com dado pessoal que não serve mais.
--
-- ── a correção ──────────────────────────────────────────────────────────────
-- `provision_member_entry` é o ponto comum dos três caminhos. A linha do
-- rascunho sai na MESMA transação do vínculo, do perfil e do momento: concluir a
-- entrada e apagar o rascunho são um fato só, e uma falha desfaz os dois. O
-- resto da função é a definição vigente (20261023110100), linha por linha.

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

  -- 4. O rascunho cumpriu o papel (ADR-20261102): sai na mesma transação, para
  --    app, web e convite familiar.
  delete from public.entry_progress where user_id = p_user_id;
end;
$func$;

comment on function public.provision_member_entry(
  uuid, uuid, text, integer, public.entry_moment, date, date, uuid
) is
  'Provisiona a entrada numa transação: vínculo (provision_member_locality), perfil, momento declarado e remoção do rascunho (entry_progress). service_role apenas; as rotas de provisionamento e o convite familiar são as chamadoras.';

commit;
