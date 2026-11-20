begin;
create extension if not exists pgtap with schema extensions;
select plan(14);
\ir fixtures/foundation.inc
\ir fixtures/communities.inc
insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
values ('10000000-0000-4000-8000-000000000005', 'verified', 'active_federal_military', now());
select ok(not has_function_privilege('anon', 'public.create_community_invitation_for_app(uuid,bytea,timestamptz)', 'execute'), 'anon não cria');
select ok(not has_function_privilege('anon', 'public.accept_community_invitation_for_app(bytea)', 'execute'), 'anon não aceita');
set local role authenticated;
select throws_ok($$select public.create_community_invitation_for_app('70000000-0000-4000-8000-000000000001', decode(repeat('aa',32),'hex'), now()+interval '1 day')$$, '42501', null, 'sessão obrigatória');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select throws_ok($$select public.create_community_invitation_for_app('70000000-0000-4000-8000-000000000001', decode(repeat('aa',32),'hex'), now()+interval '1 day')$$, '42501', null, 'membro não verificado não convida');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select throws_ok($$select public.create_community_invitation_for_app('70000000-0000-4000-8000-000000000001', decode(repeat('aa',32),'hex'), now()+interval '1 day')$$, '42501', null, 'não membro não convida');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.create_community_invitation_for_app('70000000-0000-4000-8000-000000000001', decode(repeat('aa',32),'hex'), now()+interval '1 day')$$, 'membro aprovado e verificado convida');
select lives_ok($$select public.create_community_invitation_for_app('70000000-0000-4000-8000-000000000001', decode(repeat('bb',32),'hex'), now()+interval '1 day')$$, 'cria outro convite');
reset role;
update public.community_invitations set expires_at = now()-interval '1 hour' where token_digest = decode(repeat('bb',32),'hex');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select throws_ok($$select public.accept_community_invitation_for_app(decode(repeat('aa',32),'hex'))$$, '42501', null, 'aceite exige verificação');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select throws_ok($$select public.accept_community_invitation_for_app(decode(repeat('ff',32),'hex'))$$, 'P0002', null, 'convite inexistente');
select throws_ok($$select public.accept_community_invitation_for_app(decode(repeat('bb',32),'hex'))$$, 'P0004', null, 'convite vencido');
select lives_ok($$select public.accept_community_invitation_for_app(decode(repeat('aa',32),'hex'))$$, 'aceite verificado');
select throws_ok($$select public.accept_community_invitation_for_app(decode(repeat('aa',32),'hex'))$$, 'P0003', null, 'convite usado');
reset role;
select is((select status::text from public.community_memberships where community_id='70000000-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000005'), 'pending', 'vínculo pendente');
insert into public.community_invitations (community_id, inviter_user_id, token_digest, expires_at)
select '70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', decode(repeat(lpad(to_hex(n),2,'0'),32),'hex'), now()+interval '1 day' from generate_series(1,3) n;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok($$select public.create_community_invitation_for_app('70000000-0000-4000-8000-000000000001', decode(repeat('cc',32),'hex'), now()+interval '1 day')$$, 'P0005', null, 'cota de cinco por hora');
select * from finish();
rollback;

