-- RUN-017 (1/4): o alcance do encontro não muda depois do insert.
--
-- O grant de UPDATE em public.events é da tabela inteira e a policy
-- events_update_organizer só confere organizer_id. Assim, o organizador
-- conseguia mover o próprio evento para outra localidade, grupo ou comunidade
-- por PostgREST, ampliando quem lê o encontro. O app nunca envia esses campos
-- na edição (event-form.ts separa criação de edição), então o banco era a
-- única barreira que faltava.
--
-- Trigger, e não grant por coluna: a edição legítima continua sendo um UPDATE
-- de várias colunas e o grant por coluna exigiria repetir a lista em cada
-- caminho de escrita. O precedente é block_group_community_change
-- (20260805214709).

create function private.block_event_scope_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'event scope cannot change after creation' using errcode = '42501';
end;
$$;

create trigger block_event_scope_change_trigger
before update of locality_id, group_id, community_id on public.events
for each row
when (
  new.locality_id is distinct from old.locality_id
  or new.group_id is distinct from old.group_id
  or new.community_id is distinct from old.community_id
)
execute function private.block_event_scope_change();
