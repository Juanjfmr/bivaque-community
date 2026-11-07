-- RUN-025 (b) — grupos da cidade automáticos (ADR-20261107 item 4).
-- Ao concluir a entrada, o membro entra nos grupos abertos, vivos e marcados
-- como padrão da sua cidade. A marca é escrita só pelo operador: nem o dono
-- nem o moderador alcançam a coluna pela Data API. Grupo fechado (private)
-- nunca entra no automático, e os grupos sugeridos da etapa de interesses
-- continuam como sugestão — o membro entra neles por escolha, e pode sair de
-- qualquer um depois pelo caminho que já existe.

begin;

-- ── A marca de grupo padrão ─────────────────────────────────────────────────

alter table public.groups
  add column is_default boolean not null default false;

comment on column public.groups.is_default is
  'Grupo oficial da cidade marcado como padrão pelo operador: entra no automático da entrada (ADR-20261107 item 4). Escrita só via set_group_default, sob private.is_operator(); a coluna está fora do grant de update de authenticated.';

-- O update direto do dono/moderador continua nas colunas que as telas e os
-- testes de política já exercitam; `is_default` fica fora da lista, então a
-- escrita dela exige a RPC definer. O trigger de `is_deleted` e a policy
-- `groups_update_owner` continuam valendo para as colunas granteadas.
revoke update on table public.groups from authenticated;

grant update (community_id, created_by, description, is_deleted, locality_id, name, owner_user_id, pinned_post_id, rules, visibility)
  on table public.groups to authenticated;

-- O mesmo vale na criação: quem cria grupo pela Data API não pode nascer com a
-- marca de padrão (o grupo criado pelo membro nasce comum pelo `create_group`,
-- que não conhece a coluna). A policy `groups_insert_verified_member` só
-- confere as colunas que continuam granteadas.
revoke insert on table public.groups from authenticated;

grant insert (name, description, visibility, locality_id, created_by, owner_user_id)
  on table public.groups to authenticated;

-- ── RPC: operador marca ou desmarca o grupo padrão ─────────────────────────

create function public.set_group_default(p_group_id uuid, p_is_default boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_operator() then
    raise exception 'only an operator can mark the default group';
  end if;

  -- Grupo legado de comunidade (community_id preenchido) não é grupo da
  -- cidade: nunca entra no automático, e o operador não pode marcá-lo como
  -- padrão. Desmarcar continua livre para limpar marca antiga.
  if p_is_default and exists (
    select 1 from public.groups
    where id = p_group_id and community_id is not null
  ) then
    raise exception 'legacy community group cannot be marked as default';
  end if;

  update public.groups
  set is_default = p_is_default
  where id = p_group_id;

  if not found then
    raise exception 'group not found';
  end if;
end;
$$;

revoke all on function public.set_group_default(uuid, boolean) from public;
revoke all on function public.set_group_default(uuid, boolean) from anon;
revoke all on function public.set_group_default(uuid, boolean) from authenticated;

grant execute on function public.set_group_default(uuid, boolean) to authenticated;

comment on function public.set_group_default(uuid, boolean) is
  'Operador marca o grupo oficial da cidade como padrão (entra no automático da entrada) ou desmarca. Só quem está em private.is_operator() escreve (ADR-20261107 item 4).';

-- ── O provisionamento da entrada inclui os grupos padrão ──────────────────
-- O resto da função é a definição vigente (20261105143347), linha por linha;
-- entra só o passo dos grupos, na mesma transação: se o vínculo falha, nenhuma
-- participação é gravada.

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

  -- Grupos automáticos (ADR-20261107 item 4): abertos, vivos, padrão da cidade
  -- e NÃO legados de comunidade. Fechado nunca; participação existente
  -- (inclusive outra função) é preservada. shortcut: quem sai de um grupo padrão e re-provisiona a MESMA
  -- cidade entra de novo — sem registro de saída, o automático não tem como
  -- saber; se isso incomodar de verdade, a saída vira marca própria na
  -- participação e esta cláusula passa a respeitá-la.
  insert into public.group_memberships (group_id, user_id, role, status)
  select
    g.id,
    p_user_id,
    'member'::public.group_membership_role,
    'approved'::public.group_membership_status
  from public.groups as g
  where g.locality_id = p_locality_id
    and g.is_default
    and g.visibility = 'public'::public.group_visibility
    and g.is_deleted = false
    and g.community_id is null
  on conflict (group_id, user_id) do nothing;

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
  'Provisiona a entrada numa transação: vínculo (provision_member_locality), perfil, momento declarado, entrada automática nos grupos padrão abertos da cidade (ADR-20261107 item 4) e marcador do rascunho (entry_progress etapa previa-cidade, com o nome da cidade para exibição). service_role apenas; as rotas de provisionamento e o convite familiar são as chamadoras.';

commit;
