-- RUN-017 (2/4): mensagem direta não entra por conta indisponível.
--
-- A policy dm_messages_insert_sender (20260825212538) exige remetente
-- autenticado, participação e ausência de bloqueio — mas não veta exclusão
-- pedida nem conta suspensa. A RPC send_conversation_message veta a exclusão do
-- remetente e do destinatário, porém é SECURITY DEFINER: quem chama a policy
-- diretamente (ou a RPC, que não conhece suspensão) passa.
--
-- Trigger, e não só policy: a RPC security definer ignora RLS, e o insert da
-- RPC continua sendo o caminho do app. Um BEFORE INSERT cobre os dois caminhos
-- e também service_role.
--
-- A leitura de profile_suspensions fica neste predicado private, fora do Data
-- API, pelo mesmo motivo de account_deletion_requested: não virar oráculo de
-- "quem está suspenso".

create function private.account_unavailable(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.account_deletion_requested(p_user_id)
      or exists (
        select 1
        from public.profile_suspensions
        where user_id = p_user_id
      );
$$;

revoke all on function private.account_unavailable(uuid) from public;
grant execute on function private.account_unavailable(uuid) to authenticated;

create function private.dm_conversation_unavailable(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.dm_conversations c
    where c.id = p_conversation_id
      and (
        private.account_unavailable(c.participant_a)
        or private.account_unavailable(c.participant_b)
      )
  );
$$;

revoke all on function private.dm_conversation_unavailable(uuid) from public;
grant execute on function private.dm_conversation_unavailable(uuid) to authenticated;

create function private.block_dm_unavailable_participants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.dm_conversation_unavailable(new.conversation_id) then
    raise exception 'conversation participant unavailable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger block_dm_unavailable_participants_trigger
before insert on public.dm_messages
for each row
execute function private.block_dm_unavailable_participants();
