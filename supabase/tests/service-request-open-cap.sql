-- ADR-20260923-teto-de-pedidos-por-par: cinco pedidos em aberto entre a mesma
-- pessoa e o mesmo prestador.
--
-- Ate o ADR-20260922-conversa-por-pedido, o volume era limitado por efeito
-- colateral do indice unico por par. O indice virou parcial e nada mais
-- segurava: p_idempotency_key e escolhida por quem chama. Este teste trava:
--   1. cinco pedidos cabem, o sexto e recusado com 54000;
--   2. fechar e cancelar liberam vaga (closed e cancelled nao contam);
--   3. o teto e do PAR -- outro prestador e outra pessoa nao sao atingidos;
--   4. o reenvio idempotente no teto devolve o pedido que ja existe, e nao
--      vira recusa pela vaga que ele mesmo ocupa.

begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

set local role postgres;
insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000028', 'provider-cap@example.invalid'),
  ('10000000-0000-4000-8000-000000000029', 'provider-cap-outro@example.invalid');

insert into public.provider_accounts (auth_user_id, invited_by, community_id, locality_id)
values
  (
    '10000000-0000-4000-8000-000000000028',
    '10000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000029',
    '10000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  );

insert into public.provider_profiles (id, owner_user_id, display_name, category)
values
  (
    '30000000-0000-4000-8000-000000000028',
    '10000000-0000-4000-8000-000000000028',
    'Prestador Do Teto',
    'assistencia_tecnica'
  ),
  (
    '30000000-0000-4000-8000-000000000029',
    '10000000-0000-4000-8000-000000000029',
    'Prestador Vizinho',
    'assistencia_tecnica'
  );

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values
  (
    '30000000-0000-4000-8000-000000000028',
    'community',
    '70000000-0000-4000-8000-000000000001',
    'free'
  ),
  (
    '30000000-0000-4000-8000-000000000029',
    'community',
    '70000000-0000-4000-8000-000000000001',
    'free'
  );

-- ── 1. cinco cabem, o sexto nao ─────────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000028', 'Pedido ' || n::text, null, 'k-cap-' || n::text
    )
    from generate_series(1, 5) as n
  $$,
  'cinco pedidos em aberto cabem no mesmo prestador'
);

select is(
  (select count(*)::int from public.service_requests
    where requester_user_id = '10000000-0000-4000-8000-000000000001'
      and provider_user_id = '10000000-0000-4000-8000-000000000028'
      and status in ('open', 'in_conversation')),
  5,
  'os cinco estao em aberto'
);

select throws_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000028', 'Pedido seis', null, 'k-cap-6'
    )
  $$,
  '54000',
  'maximum 5 open service requests per requester and provider',
  'o sexto pedido em aberto e recusado'
);

-- ── 2. fechar e cancelar liberam vaga ───────────────────────────────────────

set local role postgres;
-- service_requests_closed_consistency: closed exige closed_at.
update public.service_requests
   set status = 'closed', closed_at = now()
 where idempotency_key = 'k-cap-1';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000028', 'Pedido depois de fechar', null, 'k-cap-7'
    )
  $$,
  'fechar um pedido libera a vaga'
);

set local role postgres;
update public.service_requests set status = 'cancelled' where idempotency_key = 'k-cap-2';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000028', 'Pedido depois de cancelar', null, 'k-cap-8'
    )
  $$,
  'cancelar um pedido tambem libera a vaga'
);

-- ── 3. o teto e do par ──────────────────────────────────────────────────────
-- Neste ponto a mesma pessoa esta de novo no teto com o prestador 028.

select lives_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000029', 'Pedido a outro prestador', null, 'k-cap-9'
    )
  $$,
  'estar no teto com um prestador nao impede pedir a outro'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000028', 'Pedido de outra pessoa', null, 'k-cap-10'
    )
  $$,
  'a fila de uma pessoa nao consome a vaga de outra no mesmo prestador'
);

-- ── 4. o reenvio idempotente no teto devolve o mesmo pedido ─────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select public.create_service_request(
     '30000000-0000-4000-8000-000000000028', 'Pedido tres', null, 'k-cap-3'
   )),
  (select id from public.service_requests where idempotency_key = 'k-cap-3'),
  'no teto, reenviar o mesmo pedido devolve o pedido que ja existe'
);

select * from finish();
rollback;
