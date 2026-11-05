-- RUN-004 (revisão do PR #128) — o teto por IP desce e o global vira disjuntor.
--
-- A revisão de 05/11 mediu que o limitador do SEC-008 deixava 30 envios/h por IP
-- e um teto global fixo de 50/h. O teto global era baixo o bastante para uma
-- pessoa determinada esgotá-lo e travar a entrada de todo mundo. A correção não
-- muda o desenho (o limite continua no banco, por hash, e falha fechado):
--
--   * envio por IP: 8 por hora (a faixa pedida é 5 a 10);
--   * envio por e-mail: 6 por hora (continua sendo o teto que protege o
--     endereço de adivinhação distribuída);
--   * global: 500 por hora. Com 6 por e-mail e 8 por IP, uma pessoa não chega
--     perto disso; o global só funciona como disjuntor de abuso em massa.
--
-- O custo e o motivo ficam no ADR-20261101. A rota registra um aviso fixo
-- quando o limitador recusa (sem e-mail, sem IP); é o alerta do disjuntor.
--
-- As funções são as mesmas do SEC-008; mudam só os valores padrão. `create or
-- replace` preserva dono e grants.

begin;

create or replace function private.entry_otp_send_gate(
  p_email_hash text,
  p_ip_hash text default null,
  p_cooldown_seconds integer default 60,
  p_email_hourly integer default 6,
  p_ip_hourly integer default 8,
  p_global_hourly integer default 500
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_global_key constant text := repeat('0', 64);
  v_email private.entry_otp_limits%rowtype;
  v_ip private.entry_otp_limits%rowtype;
  v_global private.entry_otp_limits%rowtype;
  v_email_window timestamptz;
  v_email_hits integer;
  v_ip_window timestamptz;
  v_ip_hits integer;
  v_global_window timestamptz;
  v_global_hits integer;
begin
  if p_email_hash is null or p_email_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'entry otp gate requires a sha256 hex key';
  end if;
  if p_ip_hash is not null and p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'entry otp gate requires a sha256 hex key';
  end if;

  delete from private.entry_otp_limits where updated_at < now() - interval '1 day';

  insert into private.entry_otp_limits (scope, key_hash)
  values ('send_email', p_email_hash)
  on conflict (scope, key_hash) do nothing;
  select * into v_email
  from private.entry_otp_limits
  where scope = 'send_email' and key_hash = p_email_hash
  for update;

  if v_email.last_at is not null
     and v_email.last_at > now() - make_interval(secs => p_cooldown_seconds) then
    return greatest(
      1,
      ceil(extract(epoch from (v_email.last_at + make_interval(secs => p_cooldown_seconds) - now())))::integer
    );
  end if;

  v_email_window := v_email.window_start;
  v_email_hits := v_email.hits;
  if v_email_window <= now() - interval '1 hour' then
    v_email_window := now();
    v_email_hits := 0;
  end if;
  if v_email_hits >= p_email_hourly then
    return greatest(1, ceil(extract(epoch from (v_email_window + interval '1 hour' - now())))::integer);
  end if;

  if p_ip_hash is not null then
    insert into private.entry_otp_limits (scope, key_hash)
    values ('send_ip', p_ip_hash)
    on conflict (scope, key_hash) do nothing;
    select * into v_ip
    from private.entry_otp_limits
    where scope = 'send_ip' and key_hash = p_ip_hash
    for update;

    v_ip_window := v_ip.window_start;
    v_ip_hits := v_ip.hits;
    if v_ip_window <= now() - interval '1 hour' then
      v_ip_window := now();
      v_ip_hits := 0;
    end if;
    if v_ip_hits >= p_ip_hourly then
      return greatest(1, ceil(extract(epoch from (v_ip_window + interval '1 hour' - now())))::integer);
    end if;
  end if;

  insert into private.entry_otp_limits (scope, key_hash)
  values ('send_global', c_global_key)
  on conflict (scope, key_hash) do nothing;
  select * into v_global
  from private.entry_otp_limits
  where scope = 'send_global' and key_hash = c_global_key
  for update;

  v_global_window := v_global.window_start;
  v_global_hits := v_global.hits;
  if v_global_window <= now() - interval '1 hour' then
    v_global_window := now();
    v_global_hits := 0;
  end if;
  if v_global_hits >= p_global_hourly then
    return greatest(1, ceil(extract(epoch from (v_global_window + interval '1 hour' - now())))::integer);
  end if;

  update private.entry_otp_limits
     set window_start = v_global_window,
         hits = v_global_hits + 1,
         last_at = now(),
         updated_at = now()
   where scope = 'send_global' and key_hash = c_global_key;

  if p_ip_hash is not null then
    update private.entry_otp_limits
       set window_start = v_ip_window,
           hits = v_ip_hits + 1,
           last_at = now(),
           updated_at = now()
     where scope = 'send_ip' and key_hash = p_ip_hash;
  end if;

  update private.entry_otp_limits
     set window_start = v_email_window,
         hits = v_email_hits + 1,
         last_at = now(),
         updated_at = now()
   where scope = 'send_email' and key_hash = p_email_hash;

  return 0;
end;
$$;

comment on function private.entry_otp_send_gate(text, text, integer, integer, integer, integer) is
  'Limitador do envio do código de entrada: 0 libera (e conta nos três tetos: 6/h por e-mail, 8/h por IP, 500/h global como disjuntor); >0 são os segundos até poder tentar de novo. Não reabre as tentativas do código (isso é entry_otp_send_confirmed). Chave por hash; service_role apenas.';

create or replace function public.entry_otp_send_gate(
  p_email_hash text,
  p_ip_hash text default null,
  p_cooldown_seconds integer default 60,
  p_email_hourly integer default 6,
  p_ip_hourly integer default 8,
  p_global_hourly integer default 500
)
returns integer
language sql
security definer
set search_path = ''
as $$
  select private.entry_otp_send_gate(
    p_email_hash, p_ip_hash, p_cooldown_seconds, p_email_hourly, p_ip_hourly, p_global_hourly
  );
$$;

comment on function public.entry_otp_send_gate(text, text, integer, integer, integer, integer) is
  'Ponte da Data API para o limitador do envio do código de entrada. service_role apenas.';

commit;
