-- SEC-008 (lote A2 do F01) — fecha as ressalvas da revisão e da auditoria do SEC-007.
--
-- ── o que a revisão independente e a auditoria de 04/11 mediram ─────────────
-- * I-2 / M1: a verificação do código só tinha limite por e-mail. Um único cliente
--   podia girar por muitos endereços sem teto próprio. Entra o escopo `verify_ip`
--   (30 por 10 minutos por IP confiável), consumido ANTES do escopo por e-mail.
-- * M2: o teto de envio por IP (30/h) era igual ao orçamento global de e-mail do
--   GoTrue (`email_sent`); um IP esgotava o e-mail de todo mundo. Entra o escopo
--   `send_global`, abaixo do orçamento do GoTrue, que corta o envio antes de o
--   GoTrue ficar sem e-mail.
-- * M2 (segunda parte): o envio liberado zerava as tentativas do código ANTES de o
--   GoTrue confirmar o envio. Se o GoTrue recusasse (reenvio de 60 s dele), o código
--   antigo seguia vivo e já ganhava seis tentativas novas. O reset sai do portão e
--   passa a ser uma chamada própria (`entry_otp_send_confirmed`), feita pela rota
--   só depois que o GoTrue confirma.
-- * L2: `private.entry_otp_limits` tinha RLS ligada mas não forçada.
--
-- As funções mudam de assinatura. Em vez de sobrecarga (que deixaria a versão
-- antiga executável por service_role), as quatro são removidas e recriadas.
-- Nenhum grant novo para `anon` ou `authenticated`.

begin;

-- ---------------------------------------------------------------------------
-- 1. Tabela: RLS forçada e escopos novos
-- ---------------------------------------------------------------------------

alter table private.entry_otp_limits force row level security;

alter table private.entry_otp_limits drop constraint entry_otp_limits_scope;
alter table private.entry_otp_limits
  add constraint entry_otp_limits_scope
  check (scope in ('send_email', 'send_ip', 'send_global', 'verify_email', 'verify_ip'));

comment on table private.entry_otp_limits is
  'Contadores do limitador do código de entrada (SEC-007, SEC-008). A chave é HMAC-SHA256 (hex) do e-mail normalizado ou do IP confiável (IPv6 reduzido ao /64), com segredo só do servidor; o escopo send_global usa uma chave fixa. Nunca o valor em claro. RLS forçada e sem grant para os papéis da Data API. Linhas com mais de um dia são apagadas pelas próprias funções.';

-- ---------------------------------------------------------------------------
-- 2. Remove as versões do SEC-007 (assinaturas antigas)
-- ---------------------------------------------------------------------------

drop function public.entry_otp_send_gate(text, text, integer, integer, integer);
drop function public.entry_otp_verify_attempt(text, integer, integer);
drop function private.entry_otp_send_gate(text, text, integer, integer, integer);
drop function private.entry_otp_verify_attempt(text, integer, integer);

-- ---------------------------------------------------------------------------
-- 3. Envio: reenvio de 60 s, teto por e-mail, por IP e global
-- ---------------------------------------------------------------------------

-- Devolve 0 quando o envio está liberado (e já o conta), ou os segundos até a
-- próxima janela quando está recusado (sempre >= 1). Pedido recusado não gasta
-- nenhuma cota: só conta quando os três tetos (e-mail, IP, global) deixam passar.
-- NÃO zera as tentativas do código: isso é `entry_otp_send_confirmed`, depois que o
-- GoTrue confirma o envio.
create function private.entry_otp_send_gate(
  p_email_hash text,
  p_ip_hash text default null,
  p_cooldown_seconds integer default 60,
  p_email_hourly integer default 6,
  p_ip_hourly integer default 30,
  p_global_hourly integer default 50
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

  -- Higiene: contador parado há mais de um dia não protege mais nada.
  delete from private.entry_otp_limits where updated_at < now() - interval '1 day';

  -- Ordem fixa de travas (e-mail, IP, global) para não haver impasse entre
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

  -- Os três tetos deixaram passar: agora sim conta nos três.
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
  'Limitador do envio do código de entrada: 0 libera (e conta nos três tetos: e-mail, IP e global); >0 são os segundos até poder tentar de novo. Não reabre as tentativas do código (isso é entry_otp_send_confirmed). Chave por hash; service_role apenas.';

-- Chamada pela rota só depois de o GoTrue confirmar o envio: código novo, seis
-- tentativas novas. Se o GoTrue recusar o envio, o código antigo segue vivo com as
-- tentativas que já gastou.
create function private.entry_otp_send_confirmed(p_email_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_email_hash is null or p_email_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'entry otp gate requires a sha256 hex key';
  end if;

  delete from private.entry_otp_limits
   where scope = 'verify_email' and key_hash = p_email_hash;
end;
$$;

comment on function private.entry_otp_send_confirmed(text) is
  'Reabre as tentativas de verificação do e-mail depois que o GoTrue confirmou o envio de um código novo. service_role apenas.';

-- ---------------------------------------------------------------------------
-- 4. Verificação: teto por IP e seis tentativas por código
-- ---------------------------------------------------------------------------

-- Consome uma tentativa ANTES de o servidor falar com o GoTrue, para que
-- tentativas paralelas não passem do teto. Primeiro o escopo do IP (quando há IP
-- confiável), depois o do e-mail; recusa não gasta cota nenhuma.
--   > 0  número da tentativa do e-mail (1..p_max)
--   = 0  o teto do código do e-mail já foi atingido
--   < 0  o teto do IP foi atingido; o valor absoluto são os segundos até a janela
--        reabrir (a janela é a validade do código, 10 minutos)
create function private.entry_otp_verify_attempt(
  p_email_hash text,
  p_max integer default 6,
  p_window_seconds integer default 600,
  p_ip_hash text default null,
  p_ip_max integer default 30
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip private.entry_otp_limits%rowtype;
  v_ip_window timestamptz;
  v_ip_hits integer;
  v_row private.entry_otp_limits%rowtype;
  v_window timestamptz;
  v_hits integer;
begin
  if p_email_hash is null or p_email_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'entry otp gate requires a sha256 hex key';
  end if;
  if p_ip_hash is not null and p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'entry otp gate requires a sha256 hex key';
  end if;

  if p_ip_hash is not null then
    insert into private.entry_otp_limits (scope, key_hash)
    values ('verify_ip', p_ip_hash)
    on conflict (scope, key_hash) do nothing;
    select * into v_ip
    from private.entry_otp_limits
    where scope = 'verify_ip' and key_hash = p_ip_hash
    for update;

    v_ip_window := v_ip.window_start;
    v_ip_hits := v_ip.hits;
    if v_ip_window <= now() - make_interval(secs => p_window_seconds) then
      v_ip_window := now();
      v_ip_hits := 0;
    end if;
    if v_ip_hits >= p_ip_max then
      return -greatest(
        1,
        ceil(extract(epoch from (v_ip_window + make_interval(secs => p_window_seconds) - now())))::integer
      );
    end if;
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

  if p_ip_hash is not null then
    update private.entry_otp_limits
       set window_start = v_ip_window,
           hits = v_ip_hits + 1,
           last_at = now(),
           updated_at = now()
     where scope = 'verify_ip' and key_hash = p_ip_hash;
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

comment on function private.entry_otp_verify_attempt(text, integer, integer, text, integer) is
  'Consome uma tentativa de verificação do código de entrada: IP primeiro (negativo = segundos até reabrir), depois e-mail (0 = teto do código atingido; positivo = número da tentativa). Recusa não gasta cota. service_role apenas.';

-- ---------------------------------------------------------------------------
-- 5. Estado da conta: o tipo de link que invalida o código depende dele
-- ---------------------------------------------------------------------------

-- O GoTrue guarda o código de uma conta não confirmada como token de CONFIRMAÇÃO e
-- o de uma conta confirmada como token de magic link. `generateLink` de tipo
-- `magiclink` só troca o segundo (medido contra o GoTrue local com confirmação
-- ligada: o código de uma conta nova seguia valendo). O servidor precisa do estado
-- para escolher o tipo certo, e não deve criar conta nenhuma: `none` significa que
-- não há código para invalidar.
create function private.entry_otp_account_state(p_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when u.id is null then 'none'
    when u.email_confirmed_at is null then 'unconfirmed'
    else 'confirmed'
  end
  from (select 1) as x
  left join auth.users as u
    on u.email = lower(p_email) and u.deleted_at is null;
$$;

comment on function private.entry_otp_account_state(text) is
  'Estado da conta de um e-mail para o limitador do código: none, unconfirmed ou confirmed. Só serve para escolher o tipo de link que invalida o código; service_role apenas.';

-- ---------------------------------------------------------------------------
-- 6. Pontes públicas (a Data API só resolve `public`) e grants
-- ---------------------------------------------------------------------------

create function public.entry_otp_send_gate(
  p_email_hash text,
  p_ip_hash text default null,
  p_cooldown_seconds integer default 60,
  p_email_hourly integer default 6,
  p_ip_hourly integer default 30,
  p_global_hourly integer default 50
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

create function public.entry_otp_send_confirmed(p_email_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.entry_otp_send_confirmed(p_email_hash);
$$;

create function public.entry_otp_verify_attempt(
  p_email_hash text,
  p_max integer default 6,
  p_window_seconds integer default 600,
  p_ip_hash text default null,
  p_ip_max integer default 30
)
returns integer
language sql
security definer
set search_path = ''
as $$
  select private.entry_otp_verify_attempt(
    p_email_hash, p_max, p_window_seconds, p_ip_hash, p_ip_max
  );
$$;

create function public.entry_otp_account_state(p_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select private.entry_otp_account_state(p_email);
$$;

revoke all on function private.entry_otp_send_gate(text, text, integer, integer, integer, integer)
  from public, anon, authenticated;
revoke all on function private.entry_otp_send_confirmed(text)
  from public, anon, authenticated;
revoke all on function private.entry_otp_verify_attempt(text, integer, integer, text, integer)
  from public, anon, authenticated;
revoke all on function private.entry_otp_account_state(text)
  from public, anon, authenticated;
revoke all on function public.entry_otp_send_gate(text, text, integer, integer, integer, integer)
  from public, anon, authenticated;
revoke all on function public.entry_otp_send_confirmed(text)
  from public, anon, authenticated;
revoke all on function public.entry_otp_verify_attempt(text, integer, integer, text, integer)
  from public, anon, authenticated;
revoke all on function public.entry_otp_account_state(text)
  from public, anon, authenticated;

grant execute on function private.entry_otp_send_gate(text, text, integer, integer, integer, integer)
  to service_role;
grant execute on function private.entry_otp_send_confirmed(text) to service_role;
grant execute on function private.entry_otp_verify_attempt(text, integer, integer, text, integer)
  to service_role;
grant execute on function private.entry_otp_account_state(text) to service_role;
grant execute on function public.entry_otp_send_gate(text, text, integer, integer, integer, integer)
  to service_role;
grant execute on function public.entry_otp_send_confirmed(text) to service_role;
grant execute on function public.entry_otp_verify_attempt(text, integer, integer, text, integer)
  to service_role;
grant execute on function public.entry_otp_account_state(text) to service_role;

commit;
