-- Capa do evento (prancha 70, painel 1: "Capa do evento", JPG/PNG).
--
-- RECON-049 registrou o item como [backend]: a prancha desenha a capa, o
-- produto tem bucket privado e upload de foto (upload-photo-action.ts) mas o
-- evento não tinha onde guardar o caminho. Sem coluna, a capa não existia.
--
-- O caminho mora na pasta de quem organiza (mesma convenção do upload de foto
-- de publicação: `<user_id>/<arquivo>`). A validação é por TRIGGER, e compara
-- com o organizador da PRÓPRIA linha — não com auth.uid() — para valer também
-- quando quem escreve é service_role (fixture de mídia, operação), sem abrir a
-- porta para apontar a capa de um evento para o objeto de outra pessoa.

alter table public.events
  add column cover_path text;

alter table public.events
  add constraint events_cover_path_length
  check (cover_path is null or char_length(cover_path) between 1 and 300);

comment on column public.events.cover_path is
  'Caminho do objeto no bucket privado event-photos. Sempre sob a pasta do organizador.';

create function private.validate_event_cover_path()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cover_path is null or btrim(new.cover_path) = '' then
    new.cover_path := null;
    return new;
  end if;

  if split_part(new.cover_path, '/', 1) <> new.organizer_id::text then
    raise exception 'cover path must live under the organizer folder'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger validate_event_cover_path_trigger
before insert or update of cover_path on public.events
for each row execute function private.validate_event_cover_path();

revoke all on function private.validate_event_cover_path() from public;

-- service_role escreve SÓ a capa nesta tabela. A fixture de mídia
-- (scripts/visual/media-fixture.mjs) e a operação precisam apontar a capa de um
-- evento já publicado, e não existe política de UPDATE para o papel de serviço
-- — sem este grant, o caminho seria usar a sessão de outra pessoa, que é
-- exatamente o que o trigger existe para impedir. Coluna, não linha: nada mais
-- de events fica gravável por esse papel.
grant update (cover_path) on public.events to service_role;
