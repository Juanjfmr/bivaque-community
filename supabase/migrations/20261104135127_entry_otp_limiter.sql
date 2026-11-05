-- SEC-007 (lote A do F01) — o limitador do código de entrada mora no banco.
--
-- ── o defeito que esta migration fecha ──────────────────────────────────────
-- A auditoria de 04/11 mediu que a rota de envio do código (`/api/app/entry/otp`)
-- e a de verificação (`/api/app/entry/otp/verify`) não tinham limite nenhum além
-- do que o GoTrue aplica por IP: qualquer pessoa podia inundar a caixa de um
-- endereço alheio (um e-mail por reenvio de 1 s) e tentar o código de 6 dígitos
-- sem teto por endereço. O ADR-20261101 §2 manda: reenvio de 60 s, limite por
-- e-mail e por IP, seis tentativas erradas invalidam o código.
--
-- ── o desenho ───────────────────────────────────────────────────────────────
-- Uma tabela do schema `private` (fora da Data API) guarda contadores por
-- (escopo, chave). A chave é o HASH do e-mail normalizado ou do IP confiável,
-- calculado no servidor: o banco nunca vê o endereço nem o IP em claro, e uma
-- linha vazada não devolve e-mail. Duas funções `security definer` do schema
-- `private` fazem a conta de forma atômica (linha travada com `for update`), e
-- uma ponte `public` fina — a Data API só resolve `public` — as expõe. Todas são
-- executáveis SÓ por `service_role`: authenticated e anon não chamam, senão
-- qualquer pessoa zeraria ou esgotaria o contador de outra.
--
-- A chave por e-mail garante o isolamento: a inundação de um endereço esgota o
-- contador DELE e de mais ninguém. Tentativa recusada não conta no limite do IP,
-- então um endereço inundado não consome a cota que outros endereços do mesmo IP
-- ainda têm.
--
-- A resposta de limite não depende de a conta existir: a conta nem é consultada.

begin;

create table private.entry_otp_limits (
  scope text not null,
  key_hash text not null,
  window_start timestamptz not null default now(),
  hits integer not null default 0,
  last_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash),
  constraint entry_otp_limits_scope check (scope in ('send_email', 'send_ip', 'verify_email')),
  constraint entry_otp_limits_hash check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint entry_otp_limits_hits check (hits >= 0)
);

comment on table private.entry_otp_limits is
  'Contadores do limitador do código de entrada (SEC-007). A chave é hash (sha256 hex) do e-mail normalizado ou do IP confiável; nunca o valor em claro. Linhas com mais de um dia são apagadas pelas próprias funções.';

create index entry_otp_limits_updated_at_idx on private.entry_otp_limits (updated_at);

alter table private.entry_otp_limits enable row level security;
revoke all on table private.entry_otp_limits from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Envio: reenvio de 60 s e teto por hora por e-mail e por IP
-- ---------------------------------------------------------------------------

-- Devolve 0 quando o envio está liberado (e já o conta), ou os segundos até a
-- próxima janela quando está recusado (sempre >= 1). Um envio liberado também
-- zera o contador de tentativas de verificação do e-mail: código novo, seis
-- tentativas novas.
create function private.entry_otp_send_gate(
  p_email_hash text,
  p_ip_hash text default null,
  p_cooldown_seconds integer default 60,
  p_email_hourly integer default 6,
  p_ip_hourly integer default 30
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email private.entry_otp_limits%rowtype;
  v_ip private.entry_otp_limits%rowtype;
  v_email_window timestamptz;
  v_email_hits integer;
  v_ip_window timestamptz;
  v_ip_hits integer;
begin
  if p_email_hash is null or p_email_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'entry otp gate requires a sha256 hex key';
  end if;
  if p_ip_hash is not null and p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'entry otp gate requires a sha256 hex key';
  end if;

  -- Higiene: contador parado há mais de um dia não protege mais nada.
  delete from private.entry_otp_limits where updated_at < now() - interval '1 day';

  -- Ordem fixa de travas (e-mail, depois IP) para não haver impasse entre
  -- chamadas concorrentes.
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

  delete from private.entry_otp_limits
   where scope = 'verify_email' and key_hash = p_email_hash;

  return 0;
end;
$$;

comment on function private.entry_otp_send_gate(text, text, integer, integer, integer) is
  'Limitador do envio do código de entrada: 0 libera (e conta); >0 são os segundos até poder tentar de novo. Chave por hash; service_role apenas.';

-- ---------------------------------------------------------------------------
-- 2. Verificação: seis tentativas por código
-- ---------------------------------------------------------------------------

-- Consome uma tentativa ANTES de o servidor falar com o GoTrue, para que
-- tentativas paralelas não passem do teto. Devolve o número da tentativa
-- (1..p_max) ou 0 quando o teto da janela já foi atingido. A janela é a validade
-- do código (10 minutos); um novo envio liberado a reabre.
create function private.entry_otp_verify_attempt(
  p_email_hash text,
  p_max integer default 6,
  p_window_seconds integer default 600
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row private.entry_otp_limits%rowtype;
  v_window timestamptz;
  v_hits integer;
begin
  if p_email_hash is null or p_email_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'entry otp gate requires a sha256 hex key';
  end if;

  insert into private.entry_otp_limits (scope, key_hash)
  values ('verify_email', p_email_hash)
  on conflict (scope, key_hash) do nothing;
  select * into v_row
  from private.entry_otp_limits
  where scope = 'verify_email' and key_hash = p_email_hash
  for update;

  v_window := v_row.window_start;
  v_hits := v_row.hits;
  if v_window <= now() - make_interval(secs => p_window_seconds) then
    v_window := now();
    v_hits := 0;
  end if;

  if v_hits >= p_max then
    return 0;
  end if;

  update private.entry_otp_limits
     set window_start = v_window,
         hits = v_hits + 1,
         last_at = now(),
         updated_at = now()
   where scope = 'verify_email' and key_hash = p_email_hash;

  return v_hits + 1;
end;
$$;

comment on function private.entry_otp_verify_attempt(text, integer, integer) is
  'Consome uma tentativa de verificação do código de entrada: devolve o número da tentativa, ou 0 quando o teto foi atingido. service_role apenas.';

-- ---------------------------------------------------------------------------
-- 3. Pontes públicas (a Data API só resolve `public`) e grants
-- ---------------------------------------------------------------------------

create function public.entry_otp_send_gate(
  p_email_hash text,
  p_ip_hash text default null,
  p_cooldown_seconds integer default 60,
  p_email_hourly integer default 6,
  p_ip_hourly integer default 30
)
returns integer
language sql
security definer
set search_path = ''
as $$
  select private.entry_otp_send_gate(
    p_email_hash, p_ip_hash, p_cooldown_seconds, p_email_hourly, p_ip_hourly
  );
$$;

create function public.entry_otp_verify_attempt(
  p_email_hash text,
  p_max integer default 6,
  p_window_seconds integer default 600
)
returns integer
language sql
security definer
set search_path = ''
as $$
  select private.entry_otp_verify_attempt(p_email_hash, p_max, p_window_seconds);
$$;

revoke all on function private.entry_otp_send_gate(text, text, integer, integer, integer)
  from public, anon, authenticated;
revoke all on function private.entry_otp_verify_attempt(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.entry_otp_send_gate(text, text, integer, integer, integer)
  from public, anon, authenticated;
revoke all on function public.entry_otp_verify_attempt(text, integer, integer)
  from public, anon, authenticated;

grant execute on function private.entry_otp_send_gate(text, text, integer, integer, integer)
  to service_role;
grant execute on function private.entry_otp_verify_attempt(text, integer, integer)
  to service_role;
grant execute on function public.entry_otp_send_gate(text, text, integer, integer, integer)
  to service_role;
grant execute on function public.entry_otp_verify_attempt(text, integer, integer)
  to service_role;

commit;
