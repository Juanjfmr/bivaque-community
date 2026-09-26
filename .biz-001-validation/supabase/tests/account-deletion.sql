-- Exclusão de conta (ADR-20260914-exclusao-de-conta, RECON-052).
--
-- O que esta suíte prova, contra o schema real:
--   * a janela é a da tabela aprovada (15 dias), não um literal solto;
--   * o pedido é idempotente e NÃO estende o próprio prazo;
--   * efeito imediato: sessão apagada, login banido, perfil oculto para
--     terceiros e conteúdo parando de receber interação — sem perder leitura;
--   * moderação: a denúncia contra terceiro SOBREVIVE anonimizada (métrica 3
--     do ADR);
--   * família: o vínculo é encerrado e o outro lado permanece intacto
--     (métrica 4);
--   * a purga só acontece depois do vencimento, preserva display_name e não
--     deixa o perfil meio apagado;
--   * o caminho não é do cliente: authenticated não executa finalize nem lê a
--     tabela, anon não executa nada.

begin;

create extension if not exists pgtap with schema extensions;
select plan(41);

\ir fixtures/foundation.inc

-- Cenário: o membro 002 pede exclusão. Ele tem perfil, publicação, uma
-- denúncia contra o membro 001 e um vínculo familiar com 001 (holding).

insert into public.posts (id, locality_id, user_id, post_type, content)
values (
  '90000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'text',
  'publicacao do titular que sera excluido'
);

-- A denúncia é do titular 002 contra conteúdo do 001: o caso precisa ser de
-- TERCEIRO para provar que ele sobrevive à exclusão do denunciante.
insert into public.posts (id, locality_id, user_id, post_type, content)
values (
  '90000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'text',
  'publicacao do membro que foi denunciada'
);

insert into public.reports (id, reporter_user_id, target_type, target_id, reason)
values (
  '91000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'post',
  '90000000-0000-4000-8000-000000000002',
  'conteudo suspeito'
);

-- A FK de family_account_links é composta: (invitation_id, holder_user_id,
-- family_user_id) -> family_invitations (id, inviter_user_id,
-- accepted_by_user_id). O convite precisa existir E estar aceito pelo próprio
-- familiar — por isso os três valores são os mesmos nas duas linhas.
insert into private.family_invitations (
  id, inviter_user_id, token_digest, invitee_email_digest,
  expires_at, status, accepted_by_user_id, accepted_at
)
values (
  '20000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('ef', 32), 'hex'),
  decode(repeat('12', 32), 'hex'),
  now() + interval '7 days',
  'accepted',
  '10000000-0000-4000-8000-000000000002',
  now()
);

insert into private.family_account_links (invitation_id, holder_user_id, family_user_id)
values (
  '20000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);

insert into public.notification_preferences (user_id)
values ('10000000-0000-4000-8000-000000000002');

insert into public.waitlist (email, city_name, state_code)
values ('member-two@example.invalid', 'Fixture City', 'EX');

insert into auth.sessions (id, user_id)
values ('92000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');

-- 1) a janela é parâmetro jurídico explícito
select is(
  private.account_deletion_window(),
  interval '15 days',
  'janela da purga e a da tabela aprovada (15 dias, LGPD art. 19)'
);

-- 2) interação funciona ANTES do pedido (a negativa depois tem o que contrastar)
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ insert into public.comments (post_id, user_id, content)
     values ('90000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000001',
             'comentario antes do pedido') $$,
  'membro comenta na publicacao do titular antes do pedido'
);
reset role;

-- 3) o titular pede a exclusão
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select public.request_account_deletion() ->> 'due_at')::timestamptz,
  (select now() + interval '15 days'),
  'pedido devolve vencimento = pedido + 15 dias'
);

-- 4) o estado de espera é legível pelo próprio titular, sem parâmetro
select is(
  public.is_account_deletion_pending(),
  true,
  'titular le o proprio estado de exclusao pendente'
);
reset role;

-- 5) e a linha do pedido guarda o mesmo vencimento (o prazo é do servidor, não
--    do cliente: authenticated não lê esta tabela)
select is(
  (select due_at from public.account_deletion_requests
    where user_id = '10000000-0000-4000-8000-000000000002'),
  (select now() + interval '15 days'),
  'a linha do pedido guarda o vencimento calculado no servidor'
);

-- 5) repetir o pedido não estende o prazo: o vencimento continua ancorado no
--    PRIMEIRO pedido, mesmo com o pedido já em curso
update public.account_deletion_requests
   set requested_at = now() - interval '3 days',
       due_at = now() + interval '12 days'
 where user_id = '10000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select public.request_account_deletion() ->> 'due_at')::timestamptz,
  (select now() + interval '12 days'),
  'pedido repetido nao estende o prazo'
);
reset role;

-- 6) a sessão do titular é revogada na hora
select is(
  (select count(*) from auth.sessions where user_id = '10000000-0000-4000-8000-000000000002'),
  0::bigint,
  'pedido apaga as sessoes do titular (sessao revogada)'
);

-- 7) e o login fica bloqueado
select ok(
  (select banned_until > now() from auth.users
    where id = '10000000-0000-4000-8000-000000000002'),
  'pedido bane a conta (login bloqueado)'
);

-- 8) moderação: o caso sobrevive anonimizado
select is(
  (select reporter_user_id from public.reports
    where id = '91000000-0000-4000-8000-000000000001'),
  null::uuid,
  'denuncia contra terceiro sobrevive com o denunciante anonimizado'
);

-- 9) e o caso continua existindo (não foi apagado junto)
select is(
  (select count(*) from public.reports
    where id = '91000000-0000-4000-8000-000000000001' and status = 'open'),
  1::bigint,
  'o caso de moderacao continua aberto para a operacao'
);

-- 10) família: o vínculo é encerrado
select is(
  (select count(*) from private.family_account_links
    where holder_user_id = '10000000-0000-4000-8000-000000000001'
      and family_user_id = '10000000-0000-4000-8000-000000000002'),
  0::bigint,
  'vinculo familiar encerrado no pedido'
);

-- 11) e o outro lado permanece intacto
select is(
  (select count(*) from auth.users where id = '10000000-0000-4000-8000-000000000001')
  + (select count(*) from public.profiles where user_id = '10000000-0000-4000-8000-000000000001'),
  2::bigint,
  'o outro lado da familia permanece intacto'
);

-- 12) perfil oculto para quem compartilha localidade
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.profiles where user_id = '10000000-0000-4000-8000-000000000002'),
  0::bigint,
  'perfil do titular some para quem compartilha localidade'
);

-- 13) a página de perfil também recusa — pelo overload de DOIS argumentos,
--     que é o que apps/web/lib/profile-rpcs.ts chama pelo cliente de serviço.
--     Guardar o de um argumento deixaria a página renderizando o perfil oculto.
select is(
  public.profile_is_visible_to_viewer(
    p_target_user_id => '10000000-0000-4000-8000-000000000002',
    p_viewer_user_id => '10000000-0000-4000-8000-000000000001'
  ),
  false,
  'profile_is_visible_to_viewer (2 args) recusa o perfil oculto'
);

select is(
  (select count(*) from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'profile_is_visible_to_viewer'
     and pg_get_function_arguments(p.oid) = 'p_target_user_id uuid, p_viewer_user_id uuid'),
  1::bigint,
  'existe exatamente o overload de 2 argumentos (o de 1 segue dropado)'
);

-- 14) o conteúdo continua LEGÍVEL pela localidade
select is(
  (select count(*) from public.posts where id = '90000000-0000-4000-8000-000000000001'),
  1::bigint,
  'publicacao do titular continua legivel (ADR item 4)'
);

-- 15) mas para de receber comentário novo
select throws_ok(
  $$ insert into public.comments (post_id, user_id, content)
     values ('90000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000001',
             'comentario depois do pedido') $$,
  '42501',
  null,
  'comentario novo na publicacao do titular e negado depois do pedido'
);

-- 16) e para de receber reação nova
select throws_ok(
  $$ insert into public.post_reactions (post_id, user_id)
     values ('90000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'reacao nova na publicacao do titular e negada depois do pedido'
);

-- 17) e para de receber "acompanhar" novo
select throws_ok(
  $$ insert into public.post_follows (post_id, user_id)
     values ('90000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'acompanhar a publicacao do titular e negado depois do pedido'
);

-- 17b) e para de aceitar "salvar" novo
select throws_ok(
  $$ insert into public.post_saves (post_id, user_id)
     values ('90000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'salvar a publicacao do titular e negado depois do pedido'
);

reset role;

-- 17c) a PRÓPRIA conta que está saindo também não publica: o PostgREST confia
--      no JWT e não consulta auth.sessions nem banned_until, então o banimento
--      sozinho deixaria a conta escrevendo por até jwt_expiry (3600s).
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ insert into public.posts (locality_id, user_id, post_type, content)
     values ('00000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000002',
             'text',
             'publicacao depois do pedido de exclusao') $$,
  '42501',
  null,
  'conta que esta saindo nao publica mais (veto na policy)'
);

reset role;

-- 18) conversa nova com o titular é recusada
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.open_conversation(
       '10000000-0000-4000-8000-000000000002',
       'shared_group',
       '80000000-0000-4000-8000-000000000001') $$,
  '42501',
  'recipient unavailable',
  'abrir conversa com quem esta saindo e recusado'
);
reset role;

-- 19) o próprio titular ainda lê a própria linha (o app não quebra)
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.profiles where user_id = '10000000-0000-4000-8000-000000000002'),
  1::bigint,
  'titular continua lendo o proprio perfil'
);
reset role;

-- 20) a purga é do servidor: authenticated não executa
select is(
  has_function_privilege(
    'authenticated',
    'public.finalize_account_deletion(uuid,text)',
    'EXECUTE'
  ),
  false,
  'authenticated nao executa finalize_account_deletion'
);

-- 21) e ninguém lê a tabela de pedidos pela Data API
select is(
  has_table_privilege('anon', 'public.account_deletion_requests', 'SELECT')
  or has_table_privilege('authenticated', 'public.account_deletion_requests', 'SELECT'),
  false,
  'tabela de pedidos fechada para anon e authenticated'
);

-- 22) a rota que falha grava o motivo e NÃO purga
select is(
  public.finalize_account_deletion(
    p_user_id => '10000000-0000-4000-8000-000000000002',
    p_error => 'gotrue indisponivel'
  ),
  'failed',
  'falha da rota e registrada sem purgar'
);

select is(
  (select purge_last_error from public.account_deletion_requests
    where user_id = '10000000-0000-4000-8000-000000000002'),
  'gotrue indisponivel',
  'o motivo da falha fica na linha do pedido'
);

-- 23) antes do vencimento a purga recusa e não toca em nada
select is(
  public.finalize_account_deletion('10000000-0000-4000-8000-000000000002'),
  'not_due',
  'purga recusa antes do vencimento'
);

select is(
  (select count(*) from public.notification_preferences
    where user_id = '10000000-0000-4000-8000-000000000002'),
  1::bigint,
  'recusa antes do vencimento nao apaga preferencia'
);

-- 24) pedido de quem nunca pediu não existe
select is(
  public.finalize_account_deletion('10000000-0000-4000-8000-000000000003'),
  'not_found',
  'purga de quem nao pediu devolve not_found'
);

-- 24b) dados de contato: só service_role, por endereço, idempotente
select is(
  has_function_privilege(
    'authenticated',
    'public.purge_account_contact_data(uuid,text)',
    'EXECUTE'
  ),
  false,
  'authenticated nao executa purge_account_contact_data'
);

insert into public.notification_opt_outs (channel, recipient)
values ('email', 'member-two@example.invalid');

insert into public.outbox (recipient, channel, type, payload)
values ('member-two@example.invalid', 'email', 'comment', '{}'::jsonb);

select is(
  public.purge_account_contact_data(
    p_user_id => '10000000-0000-4000-8000-000000000002',
    p_contact_email => 'member-two@example.invalid'
  ),
  3,
  'limpeza de contato apaga opt-out, fila de entrega e lista de espera'
);

select is(
  (select count(*) from public.notification_opt_outs
    where recipient = 'member-two@example.invalid')
  + (select count(*) from public.outbox where recipient = 'member-two@example.invalid')
  + (select count(*) from public.waitlist where email = 'member-two@example.invalid'),
  0::bigint,
  'nenhum residuo por endereco sobra'
);

-- 24c) e o job é o mesmo lote da rota: 20 (MAX_BATCH em route.ts)
select is(
  private.account_deletion_batch_size(),
  20,
  'lote do job casa com MAX_BATCH da rota'
);

-- 24d) o job está agendado, como os outros workers
select is(
  (select count(*) from cron.job where jobname = 'bivaque-account-deletion-purge'),
  1::bigint,
  'job de purga agendado no pg_cron'
);

-- 25) depois do vencimento, purga: dado pessoal sai, display_name fica
--     (a data é fixture do teste; a janela é a do produto)
update public.account_deletion_requests
   set requested_at = now() - interval '16 days',
       due_at = now() - interval '1 day'
 where user_id = '10000000-0000-4000-8000-000000000002';

select is(
  public.finalize_account_deletion('10000000-0000-4000-8000-000000000002'),
  'purged',
  'purga roda depois do vencimento'
);

-- 25b) convites familiares dos DOIS lados saem (o convite aceito pelo titular
--      guarda o digest e o palpite do e-mail dele), e o convite de terceiro fica
select is(
  (select count(*) from private.family_invitations
    where inviter_user_id = '10000000-0000-4000-8000-000000000002'
       or accepted_by_user_id = '10000000-0000-4000-8000-000000000002'),
  0::bigint,
  'purga apaga os convites familiares do titular'
);

select is(
  (select count(*) from private.family_invitations
    where id = '20000000-0000-4000-8000-000000000001'),
  1::bigint,
  'convite de terceiro nao e arrastado'
);

select is(
  (
    select p.display_name || '|' || coalesce(p.bio, 'sem-bio')
    from public.profiles p
    where p.user_id = '10000000-0000-4000-8000-000000000002'
  ),
  'Member Two|sem-bio',
  'purga preserva display_name e limpa o resto do perfil'
);

select is(
  (select count(*) from public.notification_preferences
    where user_id = '10000000-0000-4000-8000-000000000002')
  + (select count(*) from public.locality_memberships
      where user_id = '10000000-0000-4000-8000-000000000002')
  + (select count(*) from public.waitlist
      where email = 'member-two@example.invalid'),
  0::bigint,
  'purga apaga preferencia, participacao e lista de espera'
);

-- 26) a purga é idempotente
select is(
  public.finalize_account_deletion('10000000-0000-4000-8000-000000000002'),
  'already_purged',
  'purga repetida nao repete efeito'
);

select * from finish();
rollback;
