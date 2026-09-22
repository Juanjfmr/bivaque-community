-- Saída da comunidade e cancelamento do próprio pedido
-- (ADR-20260914-saida-de-comunidade).
--
-- O que esta suíte prova:
--   positivo — membro aprovado sai; solicitante cancela o próprio pedido;
--   negativo — o dono não sai sem transferir a administração; anon não executa;
--   integridade — a cascata D7 transfere o grupo do saído ao dono, derruba os
--   group_memberships dele e não toca em vínculo aprovado de outra comunidade.
--
-- Não existe caminho para remover a linha de terceiro: o RPC não recebe alvo,
-- a identidade é (select auth.uid()) resolvida no servidor.

begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- 1) membro aprovado (004, hidden-member) sai da comunidade 1
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.leave_community('70000000-0000-4000-8000-000000000001') $$,
  'membro aprovado sai da comunidade'
);

-- 2) a linha de membership some
reset role;

select is(
  (
    select count(*)
    from public.community_memberships
    where community_id = '70000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000004'
  ),
  0::bigint,
  'saida remove a linha de membership'
);

-- 3) o grupo que o saído possuía passa ao dono da comunidade (cascata D7)
select is(
  (
    select owner_user_id
    from public.groups
    where id = '80000000-0000-4000-8000-000000000003'
  ),
  '10000000-0000-4000-8000-000000000001'::uuid,
  'grupo do saido passa ao dono da comunidade'
);

-- 4) os group_memberships do saído caem junto
select is(
  (
    select count(*)
    from public.group_memberships
    where user_id = '10000000-0000-4000-8000-000000000004'
  ),
  0::bigint,
  'acessos a grupos caem junto com a saida'
);

-- 5) o dono não sai sem transferir a administração (trigger D7)
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.leave_community('70000000-0000-4000-8000-000000000001') $$,
  'P0001',
  'transfer community ownership before removing the owner',
  'dono nao sai sem transferir a administracao'
);

-- 6) solicitante cancela o próprio pedido pendente (002 na comunidade 1)
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.cancel_community_request('70000000-0000-4000-8000-000000000001') $$,
  'solicitante cancela o proprio pedido pendente'
);

-- 7) o pedido pendente some
reset role;

select is(
  (
    select count(*)
    from public.community_memberships
    where community_id = '70000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'cancelamento remove o pedido pendente'
);

-- 8) cancelar sem pedido pendente é no-op (002 não tem pendência na comunidade 2)
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.cancel_community_request('70000000-0000-4000-8000-000000000002') $$,
  'cancelar sem pedido pendente e no-op'
);

-- 9) e o vínculo aprovado da comunidade 2 permanece
reset role;

select is(
  (
    select count(*)
    from public.community_memberships
    where community_id = '70000000-0000-4000-8000-000000000002'
      and user_id = '10000000-0000-4000-8000-000000000002'
      and status = 'approved'
  ),
  1::bigint,
  'vinculo aprovado nao e afetado pelo cancelamento'
);

-- 10) anon não executa nenhuma das duas portas
reset role;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);

select throws_ok(
  $$ select public.leave_community('70000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'anon nao executa leave_community'
);

select * from finish();
rollback;
