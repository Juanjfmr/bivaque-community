-- SEC-014 / A2 (LOW) da auditoria independente de 16/11 sobre 2bb231d8: conta
-- suspensa ou com exclusão pedida não declara transferência de cidade.
--
-- declare_locality_transfer é SECURITY DEFINER e resolve o dono por auth.uid():
-- a sessão de uma conta suspensa (access token vale até 1h, e o Data API não
-- consulta auth.sessions) declarava a transferência e ganhava vínculo `current`
-- na cidade de destino. Não expõe dado de terceiro — é integridade de moderação:
-- as leituras e escritas da cidade nova já vetam suspenso e exclusão pedida nas
-- policies próprias. A RPC de afiliação já vetava os dois casos (A3/A4 de
-- 17/09, migration 20260918011938); esta é a paridade que faltava.
--
-- Dois vetos, um predicado: private.account_unavailable cobre suspensão E
-- exclusão pedida, e respeita a suspensão que já venceu (20261107053256) — quem
-- cumpriu o prazo volta a poder declarar, que é o comportamento que
-- is_account_suspended sozinho não daria.
--
-- Código `42501` e frase segura, pelo mesmo caminho da porta de afiliação: a
-- rota /api/app/voce/cidade já mapeia 42501 para `sessao-expirada` com a copy
-- fixa de lib/locality/move-city.ts, e o texto do Postgres nunca sai daqui (nem
-- de lá). Nada de `23514`, que a rota traduz como "escolha outra cidade" — a
-- causa aqui não é a cidade.
--
-- O resto do corpo é o da função vigente, sem uma linha a mais: a regra de quem
-- pode se transferir para qual cidade não muda além destes dois vetos.

create or replace function public.declare_locality_transfer(
  p_destination_locality_id uuid,
  p_term_date date
)
returns table (
  current_locality_id uuid,
  leaving_locality_id uuid,
  leaving_at date
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid := auth.uid();
  v_current_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  -- SEC-014/A2: conta suspensa ou com exclusão pedida não declara transferência.
  if private.account_unavailable(v_user_id) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.localities where id = p_destination_locality_id
  ) then
    raise exception 'destination not in catalog' using errcode = '23514';
  end if;

  select locality_id into v_current_id
    from public.locality_memberships
    where user_id = v_user_id and kind = 'current'
    limit 1;

  if v_current_id is null then
    raise exception 'no current locality to leave' using errcode = '23514';
  end if;

  if v_current_id = p_destination_locality_id then
    raise exception 'destination equals current' using errcode = '23514';
  end if;

  update public.locality_memberships
    set kind = 'leaving', leaving_at = p_term_date, access = 'active'
    where user_id = v_user_id and kind = 'current';

  insert into public.locality_memberships (user_id, locality_id, kind, access)
    values (v_user_id, p_destination_locality_id, 'current', 'active');

  return query
    select
      p_destination_locality_id,
      v_current_id,
      p_term_date;
end;
$func$;