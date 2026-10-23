-- PORT-005 (correção da revisão independente, achado P1) — a entrada grava
-- vínculo, perfil e momento numa transação só.
--
-- ── o defeito que esta migration fecha ──────────────────────────────────────
-- `provisionMember` fazia três escritas em sequência pela Data API: o vínculo
-- (`provision_member_locality`), o perfil (upsert em `profiles`) e o momento
-- (upsert em `member_entry_moments`). Cada uma é a sua própria transação. Se o
-- momento falhasse — CHECK, FK do destino, rede —, o vínculo e o perfil já
-- estavam gravados, e a rota respondia 500. Ao recarregar, a tela de cidade via
-- `localityMember: true` e desviava para `/community`: a pessoa entrava na
-- comunidade com a entrada pela metade, sem momento, e sem caminho de volta
-- para concluí-lo.
--
-- ── a correção ──────────────────────────────────────────────────────────────
-- Uma função SECURITY DEFINER que escreve os três na MESMA transação: o corpo de
-- uma função PL/pgSQL é atômico — qualquer exceção desfaz as três escritas, e o
-- cliente recebe o erro com o banco no estado anterior. O caminho de retomada
-- (voltar para a tela de cidade) não é necessário porque não existe mais estado
-- parcial para retomar.
--
-- ── o que se reusa, e o que não se duplica ──────────────────────────────────
-- O vínculo continua sendo `provision_member_locality` (20260819021416), chamada
-- daqui com `perform`: a regra de "corrente vira saída, a nova vira corrente" e
-- a conferência de catálogo moram num lugar só. Esta migration não repete
-- nenhuma dessas regras, nem o CHECK de coerência do momento (20261023110000) —
-- as duas continuam valendo dentro da transação e são o que faz a falha
-- abortar.
--
-- ── quem chama ──────────────────────────────────────────────────────────────
-- Só `service_role`: a rota `/api/onboarding` (`provision`) é a única chamadora,
-- depois de conferir a verificação `verified` no servidor. `anon` e
-- `authenticated` não executam — um membro não reescreve o próprio vínculo,
-- perfil ou momento por aqui.
--
-- O momento é opcional porque o convite familiar provisiona sem passar pela
-- tela de cidade: quem entra por convite não declara chegada, saída nem destino,
-- e nesse caso a linha de `member_entry_moments` não é criada (as boas-vindas
-- caem no bloco de quem mora na cidade).

begin;

create function public.provision_member_entry(
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
  --    O CHECK de coerência e a FK do destino valem aqui dentro: se qualquer um
  --    recusar, a transação inteira volta atrás — inclusive o vínculo e o perfil.
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
end;
$func$;

comment on function public.provision_member_entry(
  uuid, uuid, text, integer, public.entry_moment, date, date, uuid
) is
  'Provisiona a entrada numa transação: vínculo (provision_member_locality), perfil e momento declarado. service_role apenas; a rota de provisionamento é a chamadora.';

revoke all on function public.provision_member_entry(
  uuid, uuid, text, integer, public.entry_moment, date, date, uuid
) from public;
revoke all on function public.provision_member_entry(
  uuid, uuid, text, integer, public.entry_moment, date, date, uuid
) from anon;
revoke all on function public.provision_member_entry(
  uuid, uuid, text, integer, public.entry_moment, date, date, uuid
) from authenticated;
grant execute on function public.provision_member_entry(
  uuid, uuid, text, integer, public.entry_moment, date, date, uuid
) to service_role;

commit;
