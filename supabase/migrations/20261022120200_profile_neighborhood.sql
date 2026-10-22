-- DATA-001 / ADR-20261022-fundacao-dados-bairros-ocultar-chamados, seção 1.
--
-- Bairro do perfil + "Mostrar meu bairro", e a regra de CEP em todo campo de
-- bairro. A privacidade vale no BANCO: `profiles.neighborhood` sai do grant de
-- SELECT do cliente (padrão da SEC-002,
-- 20261019205306_provider_contact_phone_privacy.sql) e só é devolvido pela
-- função `public.get_profile_neighborhood(uuid)`, que decide dono × chave ×
-- visibilidade do perfil.
--
-- Por que coluna revogada e não policy: RLS filtra LINHA, não coluna. Com
-- SELECT de tabela, qualquer policy que libere a linha do perfil entrega o
-- bairro junto — e a chave desligada não teria como esconder nada de quem já vê
-- o perfil. Por isso o caminho é grant por coluna + função por alvo.
--
-- Consequência deliberada: `select *` / `to_jsonb(p)` em `profiles` passam a
-- falhar para `authenticated` (42501), como já acontece em `provider_profiles`.
-- Toda leitura do app usa lista explícita de colunas; o onboarding grava sem
-- `returning`. `service_role` mantém o grant de tabela que já tinha.

begin;

-- ---------------------------------------------------------------------------
-- 1. CEP nunca é bairro (ADR seção 1.4)
-- ---------------------------------------------------------------------------

-- Verdadeiro para qualquer sequência de 5+ dígitos, com ponto, hífen ou espaço
-- no meio ("69057-000", "CEP 69057000"). É a mesma semântica de `hoodCep` do
-- protótipo: os separadores permitidos não atravessam vírgula, então
-- "Quadra 12, bloco 345" NÃO é CEP e "Parque 10" também não.
--
-- IMMUTABLE de propósito: a expressão é usada em CHECK.
create function private.is_cep_like(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- Um dígito, quatro repetições de "separador opcional + dígito": cinco
  -- dígitos no mínimo, contando o primeiro.
  select coalesce(p_text, '') ~ '[0-9]([0-9.[:space:]-]*[0-9]){4}';
$$;

comment on function private.is_cep_like(text) is
  'Verdadeiro quando o texto carrega uma sequência de 5+ dígitos (CEP). Usado nos CHECKs de campo de bairro.';

-- O CHECK roda com o privilégio de quem escreve. `authenticated` insere perfil
-- e anúncio por função/rota, então precisa de EXECUTE; `anon` não escreve nada
-- e não recebe.
revoke all on function private.is_cep_like(text) from public;
grant execute on function private.is_cep_like(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Perfil: bairro opcional e a chave de exibição (ligada por padrão)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column neighborhood text,
  add column show_neighborhood boolean not null default true;

alter table public.profiles
  add constraint profiles_neighborhood_length
  check (neighborhood is null or char_length(neighborhood) between 1 and 80);

alter table public.profiles
  add constraint profiles_neighborhood_no_cep
  check (neighborhood is null or not private.is_cep_like(neighborhood));

comment on column public.profiles.neighborhood is
  'Bairro opcional do perfil. Grafia canônica do catálogo quando o texto bate. Fora do SELECT de authenticated; leitura por public.get_profile_neighborhood().';
comment on column public.profiles.show_neighborhood is
  'Chave "Mostrar meu bairro". Desligada, ninguém além do dono recebe o bairro. O dado continua guardado: religar mostra de novo.';

-- Grafia do catálogo. Sem catálogo para o texto, ele vale como está (ADR 1.2).
-- A cidade é a do vínculo `current` da pessoa — `profiles` não tem locality_id
-- desde 20260817031237.
create function private.canonicalize_profile_neighborhood()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text := nullif(
    pg_catalog.regexp_replace(
      pg_catalog.btrim(coalesce(new.neighborhood, '')), '\s+', ' ', 'g'
    ),
    ''
  );
  v_canonical text;
begin
  new.neighborhood := v_text;

  if v_text is null then
    return new;
  end if;

  select n.name
    into v_canonical
    from public.neighborhoods n
    join public.locality_memberships m
      on m.locality_id = n.locality_id
   where m.user_id = new.user_id
     and m.kind = 'current'
     and n.name_key = private.neighborhood_name_key(v_text)
   limit 1;

  if v_canonical is not null then
    new.neighborhood := v_canonical;
  end if;

  return new;
end;
$$;

-- `update of neighborhood` (e não `update`): salvar só a chave não precisa
-- reescrever a grafia, e não deve tocar no texto.
create trigger profiles_canonicalize_neighborhood
before insert or update of neighborhood on public.profiles
for each row execute function private.canonicalize_profile_neighborhood();

-- ---------------------------------------------------------------------------
-- 3. Privacidade por coluna, no padrão da SEC-002
-- ---------------------------------------------------------------------------

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

-- INSERT e UPDATE continuam de tabela (policies `profiles_insert_self` e
-- `profiles_update_self` restringem à própria linha). O dono grava
-- `neighborhood` e `show_neighborhood` direto; `service_role` mantém o grant
-- próprio de 20260815080958.

-- Leitura por alvo. SECURITY DEFINER é necessário porque a coluna está
-- revogada: um invoker não conseguiria lê-la nem para o dono. Os vetos abaixo
-- são explícitos, e a função devolve NULL — indistinguível de "não tem bairro"
-- e de "não pode ver" — para quem não passa.
--
-- Visibilidade = a regra ATUAL de `profiles` (20260915101543): dono; ou
-- compartilha cidade (`private.shares_locality_with`); ou compartilha
-- comunidade aprovada (`profiles_select_community_comember`). Alvo com
-- exclusão pendente não é exposto, como nas policies.
create function public.get_profile_neighborhood(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.neighborhood
  from public.profiles p
  where p.user_id = p_user_id
    and (select auth.uid()) is not null
    and (
      p.user_id = (select auth.uid())
      or (
        p.show_neighborhood
        and not private.account_deletion_requested(p_user_id)
        and (
          private.shares_locality_with(p_user_id)
          or exists (
            select 1
            from public.community_memberships mine
            join public.community_memberships theirs
              on theirs.community_id = mine.community_id
            where mine.user_id = (select auth.uid())
              and mine.status = 'approved'
              and theirs.user_id = p_user_id
              and theirs.status = 'approved'
          )
        )
      )
    );
$$;

comment on function public.get_profile_neighborhood(uuid) is
  'Bairro de um perfil: dono sempre; terceiro só com show_neighborhood e visibilidade atual do perfil. NULL quando não pode ver.';

revoke all on function public.get_profile_neighborhood(uuid) from public;
revoke all on function public.get_profile_neighborhood(uuid) from anon;
grant execute on function public.get_profile_neighborhood(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. A mesma regra de CEP nos outros campos de bairro
-- ---------------------------------------------------------------------------

-- Anúncio e alerta já guardam bairro em texto (ADR 1.5). Não há dado antigo
-- que viole: a carga de desenvolvimento e as fixtures não têm CEP no campo.
alter table public.listings
  add constraint listings_neighborhood_no_cep
  check (neighborhood is null or not private.is_cep_like(neighborhood));

alter table public.listing_alerts
  add constraint listing_alerts_neighborhood_no_cep
  check (neighborhood is null or not private.is_cep_like(neighborhood));

-- `service_requests` não tem coluna `neighborhood`: o campo de localização do
-- pedido é `region` (texto, 1..120, lido no painel do prestador ao lado da
-- cidade). É ele que recebe a regra — criar uma segunda coluna de bairro ao
-- lado seria duplicar o mesmo dado. A mesma regra vale para quando a jornada
-- passar a preencher `region`.
alter table public.service_requests
  add constraint service_requests_region_no_cep
  check (region is null or not private.is_cep_like(region));

-- ---------------------------------------------------------------------------
-- 5. Exclusão de conta conhece o dado novo (ADR seção 4)
-- ---------------------------------------------------------------------------

-- Cópia da definição vigente (20260915101543) com uma linha a mais:
-- `neighborhood = null`. A purga já zerava bio e consentimento; o bairro é
-- dado pessoal e some junto. Os testes de exclusão de conta exercitam a
-- função inteira, então uma cópia divergente não passa despercebida.
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
         neighborhood = null,
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
