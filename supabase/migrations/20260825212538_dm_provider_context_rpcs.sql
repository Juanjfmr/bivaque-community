-- Onda G — Task 6 (parte 2): RPCs e policies depois do valor novo do enum.
-- O alter type mora sozinho no arquivo anterior porque, dentro da transacao
-- unica do CLI, referenciar o valor recem-adicionado em funcao language sql
-- dispara 55P04 (unsafe use of new value) — a mesma armadilha documentada no
-- plano para report_target_type na Task 1.


-- ── defeito 3: o contexto declarado é conferido ─────────────────────────────
-- Um ramo por contexto; cada um prova AQUELA relação entre os dois
-- participantes. Chamado antes de qualquer criação. Precisa existir ANTES de
-- open_conversation no arquivo: plpgsql não valida a referência na criação,
-- e a falha apareceria só no primeiro uso.

create function private.dm_context_valid(
  p_a uuid,
  p_b uuid,
  p_type public.dm_context_type,
  p_context_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_type
    when 'shared_group' then exists (
      select 1
        from public.group_memberships gm
       where gm.group_id = p_context_id
         and gm.user_id in (p_a, p_b)
         and gm.status = 'approved'
       having count(distinct gm.user_id) = 2
    )
    when 'shared_event' then exists (
      select 1
        from public.event_rsvps e
       where e.event_id = p_context_id
         and e.user_id in (p_a, p_b)
       having count(distinct e.user_id) = 2
    )
    when 'recommendation_thread' then (
      exists (
        select 1 from public.recommendation_requests r
         where r.id = p_context_id and r.author_id in (p_a, p_b)
      )
      and exists (
        select 1 from public.recommendation_replies rep
         where rep.request_id = p_context_id and rep.author_id in (p_a, p_b)
      )
    )
    when 'accepted_family' then exists (
      select 1 from private.family_account_links l
       where l.holder_user_id in (p_a, p_b)
         and l.family_user_id in (p_a, p_b)
         and l.holder_user_id <> l.family_user_id
    )
    when 'provider' then (
      -- Só o membro inicia: quem chama nunca é o dono da ficha. Contato civil
      -- → militar identificável sem convite é a porta que a rede fecha aqui.
      p_context_id is not null
      and exists (
        select 1 from public.provider_profiles pp
         where pp.id = p_context_id
           and pp.owner_user_id in (p_a, p_b)
           and pp.owner_user_id <> (select auth.uid())
      )
      and private.can_see_provider(p_context_id)
    )
    else false
  end;
$$;

revoke all on function private.dm_context_valid(uuid, uuid, public.dm_context_type, uuid)
  from public, anon;
grant execute on function private.dm_context_valid(uuid, uuid, public.dm_context_type, uuid)
  to authenticated;

create function public.open_conversation(
  p_other_user_id uuid,
  p_context_type public.dm_context_type,
  p_context_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if v_me is null or v_me = p_other_user_id then
    raise exception 'invalid conversation' using errcode = '22023';
  end if;

  if not private.dm_context_valid(v_me, p_other_user_id, p_context_type, p_context_id) then
    raise exception 'no valid context between these users' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.dm_blocks
    where (blocker_user_id = v_me and blocked_user_id = p_other_user_id)
       or (blocker_user_id = p_other_user_id and blocked_user_id = v_me)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  -- A ordenação é aqui, e só aqui. O cliente nunca escolhe quem é A.
  v_a := least(v_me, p_other_user_id);
  v_b := greatest(v_me, p_other_user_id);

  -- O `do update` não muda nada: é o idioma para conseguir RETURNING quando a
  -- linha já existe. Reabrir conversa é devolver a mesma, não criar outra.
  insert into public.dm_conversations (participant_a, participant_b, context_type, context_id)
  values (v_a, v_b, p_context_type, p_context_id)
  on conflict (participant_a, participant_b) do update set participant_a = excluded.participant_a
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.open_conversation(uuid, public.dm_context_type, uuid)
  from public, anon;
grant execute on function public.open_conversation(uuid, public.dm_context_type, uuid)
  to authenticated;

-- E o caminho antigo fecha: sem policy de insert, a tabela só aceita o RPC.
drop policy dm_conversations_insert_context_gated on public.dm_conversations;
revoke insert on table public.dm_conversations from authenticated;

-- ── defeito 2: bloqueio nos dois sentidos ───────────────────────────────────

create or replace function private.is_dm_blocked_either_way(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.dm_conversations c
    join public.dm_blocks b
      on (b.blocker_user_id = c.participant_a and b.blocked_user_id = c.participant_b)
      or (b.blocker_user_id = c.participant_b and b.blocked_user_id = c.participant_a)
    where c.id = p_conversation_id
  );
$$;

grant execute on function private.is_dm_blocked_either_way(uuid) to authenticated;

drop policy dm_messages_insert_sender on public.dm_messages;
create policy dm_messages_insert_sender
on public.dm_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and private.is_dm_participant(conversation_id)
  and not private.is_dm_blocked_either_way(conversation_id)
);

-- ── o nome do outro participante, e só isso ─────────────────────────────────
-- D43/D37: o prestador não tem locality_memberships, então nenhuma linha de
-- profiles é visível para ele pela policy normal — a fronteira funcionando.
-- Este RPC estreito devolve UMA coluna de UM participante de conversa em que
-- quem chama participa. Não é diretório de pessoas.

create function public.conversation_counterpart_name(p_conversation_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select pr.display_name
  from public.dm_conversations c
  join public.profiles pr
    on pr.user_id = case
      when c.participant_a = (select auth.uid()) then c.participant_b
      else c.participant_a
    end
  where c.id = p_conversation_id
    and ((select auth.uid()) in (c.participant_a, c.participant_b));
$$;

revoke all on function public.conversation_counterpart_name(uuid) from public, anon;
grant execute on function public.conversation_counterpart_name(uuid) to authenticated;
