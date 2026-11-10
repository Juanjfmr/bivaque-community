-- LOC-IMPL (RUN-029, sub-lote a) — localização privada do perfil.
--
-- ADR-20261022-localizacao-padrao-de-mercado, seção 4: o CEP do perfil é
-- opcional e serve SÓ para calcular distância até o centro dos bairros. A
-- coordenada derivada dele é gravada no servidor, nunca é devolvida ao cliente
-- e nunca é legível por outro membro. A leitura de terceiros continua limitada
-- ao bairro (public.get_profile_neighborhood), com a chave "Mostrar meu bairro".
--
-- Três decisões que esta migration materializa:
--
-- 1. `profiles.cep/latitude/longitude` são dado de CÁLCULO, não de exibição.
--    O grant de SELECT de `authenticated` repete a lista da migration anterior
--    sem elas; INSERT e UPDATE passam a ser por coluna e também as excluem. O
--    único caminho de escrita da coordenada é `public.set_member_location`,
--    security definer e só de `service_role`, chamado pela rota do servidor
--    com o id da SESSÃO.
-- 2. O cache de CEP é global e sem dono (`public.cep_geocodes`): nenhum membro
--    lê nem escreve. Sem privilégio para anon/authenticated, só service_role.
-- 3. A purga da conta apaga as três colunas junto com o resto do perfil.

begin;

-- ---------------------------------------------------------------------------
-- 1. Perfil: CEP opcional e a coordenada derivada
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column cep text,
  add column latitude numeric(9, 6),
  add column longitude numeric(9, 6);

-- O CEP é guardado normalizado (8 dígitos, sem hífen). A máscara é da tela.
alter table public.profiles
  add constraint profiles_cep_digits
  check (cep is null or cep ~ '^[0-9]{8}$');

alter table public.profiles
  add constraint profiles_location_range
  check (
    (latitude is null or latitude between -90 and 90)
    and (longitude is null or longitude between -180 and 180)
  );

-- Tudo ou nada: coordenada sem CEP não existe, e CEP sem coordenada também
-- não (o servidor só grava depois de geocodificar).
alter table public.profiles
  add constraint profiles_location_all_or_nothing
  check ((cep is null) = (latitude is null) and (cep is null) = (longitude is null));

comment on column public.profiles.cep is
  'CEP opcional do perfil (8 dígitos), só para cálculo privado de distância. Nunca exibido a outro membro e nunca devolvido em resposta de API.';
comment on column public.profiles.latitude is
  'Latitude derivada do CEP no servidor, só para cálculo privado de distância. Dado de cálculo: não sai para o cliente nem para outro membro.';
comment on column public.profiles.longitude is
  'Longitude derivada do CEP no servidor, só para cálculo privado de distância. Dado de cálculo: não sai para o cliente nem para outro membro.';

-- ---------------------------------------------------------------------------
-- 2. Privilégio por coluna (repetindo a lista vigente, sem neighborhood)
-- ---------------------------------------------------------------------------

-- `neighborhood` continua fora do SELECT (lido só por get_profile_neighborhood)
-- e as três colunas novas nunca entram. `select *`, `to_jsonb(p)` e o update
-- direto da coordenada passam a falhar com 42501 para `authenticated`.
revoke select on table public.profiles from public, anon, authenticated;

grant select (
  user_id,
  display_name,
  visibility,
  consent_version,
  consented_at,
  bio,
  show_neighborhood,
  created_at,
  updated_at
) on public.profiles to authenticated;

-- INSERT e UPDATE deixam de ser de TABELA. As policies `profiles_insert_self` e
-- `profiles_update_self` continuam restringindo a linha; o grant por coluna é
-- que impede gravar CEP ou coordenada por fora de `set_member_location`.
-- `updated_at` fica de fora: o trigger profiles_set_updated_at (20260802000200)
-- o reescreve no servidor. `service_role` mantém o grant de tabela de
-- 20260815080958.
revoke insert on table public.profiles from public, anon, authenticated;

grant insert (
  user_id,
  display_name,
  visibility,
  consent_version,
  consented_at,
  bio,
  show_neighborhood
) on public.profiles to authenticated;

revoke update on table public.profiles from public, anon, authenticated;

grant update (
  display_name,
  visibility,
  consent_version,
  consented_at,
  bio,
  show_neighborhood,
  -- `neighborhood` continua gravável pelo dono e por ninguém mais: a policy
  -- filtra a linha; o SELECT acima é que esconde a coluna de terceiros.
  neighborhood
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Cache de geocodificação por CEP (global, sem dono)
-- ---------------------------------------------------------------------------

create table public.cep_geocodes (
  cep text primary key check (cep ~ '^[0-9]{8}$'),
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  source text not null check (source in ('brasilapi', 'google')),
  fetched_at timestamptz not null default now()
);

comment on table public.cep_geocodes is
  'Cache de geocodificação por CEP: global, sem user_id e sem dono. Escrito e lido só pelo servidor (service_role); nenhum membro lê nem escreve.';
comment on column public.cep_geocodes.source is
  'De qual geocodificador veio a coordenada: BrasilAPI (primeiro) ou Google (reserva).';

alter table public.cep_geocodes enable row level security;
alter table public.cep_geocodes force row level security;

revoke all on table public.cep_geocodes from public, anon, authenticated;
grant all on table public.cep_geocodes to service_role;

-- `force row level security` vale também para o dono da tabela; a policy é o
-- que deixa o service_role ler e escrever.
create policy cep_geocodes_service_role_all
on public.cep_geocodes
for all
to service_role
using (true)
with check (true);

-- ---------------------------------------------------------------------------
-- 4. Distância em metros (haversine, sem PostGIS)
-- ---------------------------------------------------------------------------

-- Distância em metros entre dois pontos. IMMUTABLE e privada: só as funções
-- security definer abaixo a chamam, e nenhum papel recebe EXECUTE.
create function private.distancia_em_metros(
  p_lat_a numeric,
  p_lng_a numeric,
  p_lat_b numeric,
  p_lng_b numeric
)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371008.8 * pg_catalog.asin(
    least(
      1::double precision,
      pg_catalog.sqrt(
        pg_catalog.power(
          pg_catalog.sin(pg_catalog.radians((p_lat_b - p_lat_a)::double precision) / 2),
          2
        )
        + pg_catalog.cos(pg_catalog.radians(p_lat_a::double precision))
          * pg_catalog.cos(pg_catalog.radians(p_lat_b::double precision))
          * pg_catalog.power(
            pg_catalog.sin(pg_catalog.radians((p_lng_b - p_lng_a)::double precision) / 2),
            2
          )
      )
    )
  );
$$;

comment on function private.distancia_em_metros(numeric, numeric, numeric, numeric) is
  'Distância em metros entre dois pontos (haversine). Privada: só as funções de localização do perfil.';

revoke all on function private.distancia_em_metros(numeric, numeric, numeric, numeric)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Leitura do dono: CEP e "definida", nunca latitude/longitude
-- ---------------------------------------------------------------------------

create function public.get_my_profile_location()
returns table (cep text, definida boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.cep, (p.cep is not null)
  from public.profiles p
  where p.user_id = (select auth.uid());
$$;

comment on function public.get_my_profile_location() is
  'CEP do próprio perfil e se a localização está definida. Devolve só do auth.uid(); nunca latitude/longitude.';

revoke all on function public.get_my_profile_location() from public, anon;
grant execute on function public.get_my_profile_location() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Distância do chamador até o centro de um bairro
-- ---------------------------------------------------------------------------

-- A origem é sempre a do próprio chamador (auth.uid()); não existe parâmetro de
-- usuário. O destino é o centro PÚBLICO de `neighborhoods`. Sem origem ou sem
-- bairro, devolve NULL.
create function public.distance_to_neighborhood(p_neighborhood_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.round(
           private.distancia_em_metros(p.latitude, p.longitude, n.center_lat, n.center_lng)
         )::integer
  from public.profiles p
  join public.neighborhoods n on n.id = p_neighborhood_id
  where p.user_id = (select auth.uid())
    and p.latitude is not null
    and p.longitude is not null;
$$;

comment on function public.distance_to_neighborhood(uuid) is
  'Distância em metros, inteiros, da origem privada do chamador até o centro público do bairro. Sem parâmetro de usuário.';

revoke all on function public.distance_to_neighborhood(uuid) from public, anon;
grant execute on function public.distance_to_neighborhood(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Escrita da localização: só o servidor, com o id da sessão
-- ---------------------------------------------------------------------------

-- Único caminho de escrita de cep/latitude/longitude. Recusa coordenada solta,
-- fora de faixa ou CEP inválido com 22023; recusa perfil ausente com P0002.
-- p_cep null limpa as três colunas (e exige coordenadas nulas também).
create function public.set_member_location(
  p_user_id uuid,
  p_cep text,
  p_latitude numeric,
  p_longitude numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cep text;
begin
  if p_user_id is null then
    raise exception 'user id is required' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles p where p.user_id = p_user_id
  ) then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if p_cep is null then
    if p_latitude is not null or p_longitude is not null then
      raise exception 'coordinate without cep' using errcode = '22023';
    end if;

    update public.profiles
       set cep = null,
           latitude = null,
           longitude = null,
           updated_at = now()
     where user_id = p_user_id;
    return;
  end if;

  -- Normaliza para 8 dígitos ("69057-000" e "69057 000" viram "69057000").
  v_cep := pg_catalog.regexp_replace(p_cep, '[^0-9]', '', 'g');

  if v_cep !~ '^[0-9]{8}$' then
    raise exception 'invalid cep' using errcode = '22023';
  end if;

  if p_latitude is null or p_longitude is null then
    raise exception 'coordinate is required with cep' using errcode = '22023';
  end if;

  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'coordinate out of range' using errcode = '22023';
  end if;

  update public.profiles
     set cep = v_cep,
         latitude = p_latitude,
         longitude = p_longitude,
         updated_at = now()
   where user_id = p_user_id;
end;
$$;

comment on function public.set_member_location(uuid, text, numeric, numeric) is
  'Grava CEP e coordenada do perfil. Só service_role, com o id vindo da sessão do servidor. Único caminho de escrita da coordenada.';

revoke all on function public.set_member_location(uuid, text, numeric, numeric)
  from public, anon, authenticated;
grant execute on function public.set_member_location(uuid, text, numeric, numeric)
  to service_role;

-- ---------------------------------------------------------------------------
-- 8. Exclusão de conta apaga a localização (ADR seção 4)
-- ---------------------------------------------------------------------------

-- Cópia FIEL do corpo vigente — a última definição está em
-- 20261104215006_entry_commitments.sql:39-199, não em 20261022120200 (que foi
-- substituída depois). A única mudança são as três colunas novas na atualização
-- do perfil. Os testes de exclusão de conta exercitam a função inteira, então
-- uma cópia divergente não passa despercebida.
create or replace function public.finalize_account_deletion(
  p_user_id uuid,
  p_error text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_due_at timestamptz;
  v_finalized_at timestamptz;
begin
  select due_at, finalized_at into v_due_at, v_finalized_at
  from public.account_deletion_requests
  where user_id = p_user_id
  for update;

  if not found then
    return 'not_found';
  end if;

  -- Uma purga já concluída não volta a ser "falhou": a resposta perdida de uma
  -- chamada bem-sucedida não pode reescrever o estado de uma linha finalizada.
  if v_finalized_at is not null then
    return 'already_purged';
  end if;

  if p_error is not null then
    update public.account_deletion_requests
       set purge_last_error = left(p_error, 500)
     where user_id = p_user_id;
    return 'failed';
  end if;

  -- O prazo é o da tabela aprovada; o chamador não escolhe.
  if v_due_at > now() then
    return 'not_due';
  end if;

  -- Mídias pessoais: as referências saem aqui, os objetos do bucket saem na
  -- rota (única que fala com o Storage). Documentos de verificação nunca
  -- ficaram no schema público.
  delete from private.verification_documents where user_id = p_user_id;

  -- Perfil: o mínimo necessário para atribuir o conteúdo público permanece —
  -- display_name — porque o item 4 do ADR manda o conteúdo continuar atribuído
  -- a ele. Todo o resto do perfil é dado pessoal.
  update public.profiles
     set bio = null,
         -- DATA-001 (20261022120200): o bairro do perfil é dado pessoal e sai na purga.
         neighborhood = null,
         -- LOC-IMPL (RUN-029): CEP e coordenada de cálculo privado também saem.
         cep = null,
         latitude = null,
         longitude = null,
         consent_version = 0,
         consented_at = null,
         updated_at = now()
   where user_id = p_user_id;

  delete from public.profile_affiliations where user_id = p_user_id;
  delete from public.profile_suspensions where user_id = p_user_id;
  delete from public.consent_acceptances where user_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.notification_channel_preferences where user_id = p_user_id;
  delete from public.notifications where recipient_user_id = p_user_id;
  delete from public.dm_read_states where user_id = p_user_id;
  delete from public.dm_blocks
   where blocker_user_id = p_user_id or blocked_user_id = p_user_id;
  delete from public.post_saves where user_id = p_user_id;
  delete from public.post_reactions where user_id = p_user_id;
  delete from public.post_follows where user_id = p_user_id;
  delete from public.listing_saves where user_id = p_user_id;
  delete from public.listing_alerts where owner_user_id = p_user_id;
  delete from public.recommendation_saves where user_id = p_user_id;
  delete from public.user_group_interests where user_id = p_user_id;
  delete from public.event_rsvps where user_id = p_user_id;

  -- Entidades novas do ADR-20261022 que a purga precisa conhecer. A conta nao e
  -- apagada de verdade: o GoTrue faz soft delete em auth.users, entao o ON
  -- DELETE CASCADE da FK nunca dispara aqui. Sem estas duas linhas, ocultacoes
  -- e chamados ficariam para sempre depois da exclusao.
  delete from public.hidden_questions where user_id = p_user_id;

  -- PORT-005: o momento declarado (cidade, datas e destino) é dado pessoal e
  -- some junto. O protótipo descarta o rascunho ao concluir a entrada; a linha
  -- do banco é o que a Início e as boas-vindas leem, e por isso é apagada aqui.
  delete from public.member_entry_moments where user_id = p_user_id;

  -- O rascunho da entrada (progresso do onboarding) também é dado pessoal e
  -- some junto; quem concluiu a entrada já não tem linha, porque a rota apaga
  -- o rascunho ao provisionar.
  delete from public.entry_progress where user_id = p_user_id;

  -- O combinado da entrada também é dado do titular e some junto.
  delete from public.entry_commitments where user_id = p_user_id;

  -- A resposta do chamado tambem foi para a fila de envio, endereçada ao e-mail
  -- da epoca. Se a pessoa trocou o endereco antes de excluir a conta,
  -- purge_account_contact_data (que limpa POR ENDERECO) nao acha essa linha, e
  -- ela sobreviveria com assunto e texto da resposta. O vinculo e o ticket_id no
  -- payload, nao o destinatario; por isso a remocao vem antes do chamado.
  delete from public.outbox o
   where o.type = 'support_answered'
     and exists (
       select 1
       from public.support_tickets t
       where t.user_id = p_user_id
         and t.id::text = o.payload ->> 'ticket_id'
     );

  delete from public.support_tickets where user_id = p_user_id;

  -- A pessoa pode ter respondido chamados de terceiros antes de sair. A resposta
  -- fica (e dela que o destinatario depende), mas a autoria sai: o ON DELETE SET
  -- NULL da FK nao dispara, porque a exclusao real e soft delete.
  update public.support_tickets
     set answered_by = null
   where answered_by = p_user_id;

  -- Participação sai; posse NÃO é dissolvida (ver rodapé). O trigger
  -- cascade_community_membership_loss recusa remover a linha do dono, e este
  -- caminho não passa por cima dele: a mesma regra vale para a purga.
  delete from public.community_memberships cm
   where cm.user_id = p_user_id
     and not exists (
       select 1 from public.communities c
       where c.id = cm.community_id and c.owner_user_id = p_user_id
     );

  delete from public.group_memberships gm
   where gm.user_id = p_user_id
     and not exists (
       select 1 from public.groups g
       where g.id = gm.group_id and g.owner_user_id = p_user_id
     );

  delete from public.locality_memberships where user_id = p_user_id;

  -- Privilégio de operação morre com a conta; a auditoria da concessão fica.
  update public.operators
     set revoked_at = coalesce(revoked_at, now())
   where auth_user_id = p_user_id
     and revoked_at is null;

  update public.arrival_guide_entries set reviewed_by = null where reviewed_by = p_user_id;
  update public.reports set resolved_by = null where resolved_by = p_user_id;

  -- Convites familiares dos DOIS lados: como convidante (já revogados no
  -- pedido) e como convidado aceito. A linha guarda o digest e o palpite do
  -- e-mail de quem foi convidado — dado do titular, não do produto. Os vínculos
  -- (family_account_links) já saíram no pedido, então a FK de RESTRICT não
  -- segura nada aqui.
  delete from private.family_invitations
   where inviter_user_id = p_user_id or accepted_by_user_id = p_user_id;

  update public.account_deletion_requests
     set finalized_at = now(),
         purge_last_error = null
   where user_id = p_user_id;

  return 'purged';
end;
$$;

commit;