-- RECON-039 — a guarda de transição de situação não pode se desligar sozinha.
--
-- `public.transition_listing` abre a guarda `private.listings_guard_status_transition`
-- com um `set_config('bivaque.listing_transition', 'on', true)` local à
-- transação. O recorte é correto durante a escrita, mas o valor permanecia
-- ligado depois dela: um UPDATE direto de `status` na MESMA transação passaria
-- batido e não deixaria evento — a auditoria viraria opcional, que é exatamente
-- o que o RECON-026 existe para impedir.
--
-- Esta migration redefine a função desligando a chave logo após a escrita. Não
-- altera nenhuma autorização nem o conjunto de transições permitidas: só fecha
-- a janela em que a guarda ficava aberta.

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
