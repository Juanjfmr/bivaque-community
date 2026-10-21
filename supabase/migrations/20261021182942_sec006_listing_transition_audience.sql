-- Revisao da confirmacao de 2026-10-21 (alta) - publicar/reativar reconfere o
-- publico do anuncio.
--
-- `public.transition_listing` e SECURITY DEFINER e so conferia o dono. Um
-- anuncio pausado ou em rascunho num `locality_id`/`community_id` do qual o
-- dono nao participa voltava a ficar visivel por `publish`/`reactivate`, mesmo
-- com as policies de INSERT/UPDATE ja recusando o anuncio nesse publico. A
-- leitura tambem exige o vinculo (`private.can_read_listing`), entao a escrita
-- publicava um anuncio que ninguem do publico conseguia ver depois.
--
-- A exigencia vale somente nas acoes que tornam o anuncio visivel (`publish` e
-- `reactivate`, ambas com destino `active`). Pausar, reservar, vender e encerrar
-- seguem sem ela: o dono precisa sempre conseguir tirar o anuncio do ar. O
-- vinculo usa as mesmas funcoes das policies: `private.is_locality_member`
-- (current ou leaving) e `private.is_community_member` (participacao aprovada).
-- A recusa usa o mesmo padrao de erro de autorizacao da funcao (42501).
--
-- Corpo copiado da versao efetiva (20260912055212_listing_transition_guard_reset)
-- sem mais alteracoes: assinatura, search_path, guarda de transicao, auditoria e
-- grants permanecem iguais.

create or replace function public.transition_listing(p_listing_id uuid, p_action text)
returns public.listing_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_listing public.listings;
  v_target public.listing_status;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select *
    into v_listing
    from public.listings
   where id = p_listing_id
     for update;

  if not found then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;

  if v_listing.owner_user_id <> v_uid then
    raise exception 'only the listing owner can change its status' using errcode = '42501';
  end if;

  v_target := case p_action
    when 'publish' then 'active'::public.listing_status
    when 'pause' then 'paused'::public.listing_status
    when 'reactivate' then 'active'::public.listing_status
    when 'reserve' then 'reserved'::public.listing_status
    when 'sell' then 'sold'::public.listing_status
    when 'close' then 'closed'::public.listing_status
    else null
  end;

  if v_target is null then
    raise exception 'unknown listing action: %', p_action using errcode = '22023';
  end if;

  if v_target = 'sold' and v_listing.kind <> 'item' then
    raise exception 'only an item can be marked sold' using errcode = '22023';
  end if;

  -- idempotente: já está no destino, nada muda e nada novo é auditado.
  if v_listing.status = v_target then
    return v_listing.status;
  end if;

  if not (
    (v_listing.status = 'draft' and v_target = 'active')
    or (v_listing.status = 'active' and v_target in ('paused', 'reserved', 'sold', 'closed'))
    or (v_listing.status = 'paused' and v_target in ('active', 'closed'))
    or (v_listing.status = 'reserved' and v_target in ('active', 'sold', 'closed'))
    or (v_listing.status = 'sold' and v_target in ('active', 'closed'))
  ) then
    raise exception 'cannot move listing from % to %', v_listing.status, v_target
      using errcode = '22023';
  end if;

  -- Tornar o anuncio visivel exige que o dono alcance o publico escolhido.
  if v_target = 'active' then
    if v_listing.locality_id is not null
       and not private.is_locality_member(v_listing.locality_id) then
      raise exception 'listing audience requires locality membership' using errcode = '42501';
    end if;

    if v_listing.community_id is not null
       and not private.is_community_member(v_listing.community_id) then
      raise exception 'listing audience requires community membership' using errcode = '42501';
    end if;
  end if;

  perform set_config('bivaque.listing_transition', 'on', true);

  update public.listings
     set status = v_target,
         published_at = case
           when v_target = 'active' and published_at is null then now()
           else published_at
         end
   where id = p_listing_id;

  perform set_config('bivaque.listing_transition', '', true);

  insert into public.listing_status_events (listing_id, actor_id, from_status, to_status)
  values (p_listing_id, v_uid, v_listing.status, v_target);

  return v_target;
end;
$$;

revoke all on function public.transition_listing(uuid, text) from public, anon;
grant execute on function public.transition_listing(uuid, text) to authenticated;
