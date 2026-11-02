-- PORT-005 (lote 4 da entrada) — ADR-20261022-entrada-do-prototipo, item 3:
-- cidade e momento numa tela. O momento (Chegando, Moro aqui, Saindo), as datas
-- e o destino passam a ser guardados; a Início (plano de chegada ou de saída) e
-- as boas-vindas leem daqui.
--
-- ── por que uma tabela nova, e não uma coluna em `profiles` ──────────────────
-- São quatro campos de uma declaração só, com uma regra de coerência entre eles
-- (momento decide quais existem). Em `profiles` eles ficariam no grant de
-- INSERT/UPDATE da tabela inteira, e a leitura pública de perfil teria de ser
-- conferida coluna a coluna contra o grant por lista. Uma tabela do dono, com
-- RLS própria e um SELECT só do dono, prova a privacidade num lugar só — e é o
-- que este contrato pede (RLS do próprio dono, pgTAP positivo e negativo).
--
-- ── o que já existia, e por que NÃO foi reusado ─────────────────────────────
-- O banco já modela mudança de cidade: `locality_memberships` com os tipos
-- `kind` ('current'/'leaving'), `leaving_at` e `access`, e a função
-- `declare_locality_transfer(p_destination_locality_id, p_term_date)`
-- (20260819021416_locality_transfer.sql). Não há outro mecanismo de destino ou
-- transferência no schema: `moving`/`destination` só aparecem ali e no
-- `declare_locality_transfer`.
--
-- `declare_locality_transfer` NÃO serve para o "Saindo" da entrada, e a razão é
-- de significado, não de gosto: ela troca o vínculo `current` para a cidade de
-- DESTINO na hora e transforma a cidade de origem em `leaving` com
-- `leaving_at` = prazo. O protótipo (entrada/arrive.js) guarda o contrário:
-- `state.city = state.homeCity = cidade escolhida` e `state.dest` separado, e o
-- perfil mostra "Saindo de <cidade escolhida>". Quem está saindo ainda MORA na
-- cidade escolhida; a mudança é um plano, não um fato consumado. Chamar a
-- transferência na entrada faria o membro pertencer ao destino semanas antes de
-- se mudar — o feed e o guia mudariam de cidade, e o plano de saída perderia o
-- ponto de partida.
--
-- Então o que se reusa é o que de fato casa: `provision_member_locality` (a
-- cidade escolhida vira o vínculo `current`, que é a casa nos três momentos) e o
-- catálogo `public.localities` como único vocabulário de cidade — o destino é
-- uma FK para ele, nunca texto livre. A transferência continua sendo o mecanismo
-- de quando a pessoa muda de cidade de verdade, pelo perfil (lib/locality/
-- move-city.ts), com o prazo na origem. Nada de segunda máquina de mudança.
--
-- ── privacidade ─────────────────────────────────────────────────────────────
-- Momento, datas e destino são dado pessoal: `authenticated` só LÊ a própria
-- linha. Não existe policy de INSERT/UPDATE/DELETE — quem grava é a rota
-- `/api/onboarding` (`provision`), depois de conferir a verificação `verified`
-- no servidor, com o service_role. Um membro não reescreve o próprio momento
-- pela Data API, e não existe caminho de leitura da linha de outra pessoa.
-- O CHECK repete no banco a coerência que a validação da rota já exige: a regra
-- de escopo e a policy que a lê entram juntas, nesta migration.
--
-- A purga da conta passa a conhecer a tabela (o GoTrue faz soft delete em
-- auth.users, então ON DELETE CASCADE nunca dispara).

begin;

-- ---------------------------------------------------------------------------
-- 1. O momento declarado na entrada
-- ---------------------------------------------------------------------------

create type public.entry_moment as enum ('arriving', 'resident', 'leaving');

create table public.member_entry_moments (
  user_id uuid primary key references auth.users (id) on delete cascade,
  moment public.entry_moment not null,
  arrival_date date,
  departure_date date,
  destination_locality_id uuid references public.localities (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Chegando: a data de chegada e só ela. Moro aqui: nenhuma data, nenhum
  -- destino. Saindo: a data de saída e o destino, e nada de chegada. As três
  -- linhas do CHECK são a mesma regra de `validateProvisionInput`.
  constraint member_entry_moments_coherence check (
    (
      moment = 'resident'
      and arrival_date is null
      and departure_date is null
      and destination_locality_id is null
    )
    or (
      moment = 'arriving'
      and arrival_date is not null
      and departure_date is null
      and destination_locality_id is null
    )
    or (
      moment = 'leaving'
      and departure_date is not null
      and arrival_date is null
      and destination_locality_id is not null
    )
  )
);

comment on table public.member_entry_moments is
  'Momento declarado na entrada (ADR-20261022, item 3): chegando, moro aqui ou saindo, com as datas e o destino. Uma linha por pessoa; escrita só pela rota de provisionamento.';
comment on column public.member_entry_moments.moment is
  'Chegando, moro aqui ou saindo. Decide quais dos outros campos existem (ver member_entry_moments_coherence).';
comment on column public.member_entry_moments.arrival_date is
  'Data de chegada. Só no momento arriving.';
comment on column public.member_entry_moments.departure_date is
  'Data de saída. Só no momento leaving. Não é o leaving_at do vínculo: a pessoa ainda mora na cidade atual.';
comment on column public.member_entry_moments.destination_locality_id is
  'Cidade de destino da saída, do catálogo canônico. Não cria vínculo nenhum — a transferência de verdade é declare_locality_transfer.';

create trigger member_entry_moments_set_updated_at
before update on public.member_entry_moments
for each row execute function private.set_updated_at();

alter table public.member_entry_moments enable row level security;
alter table public.member_entry_moments force row level security;

revoke all on table public.member_entry_moments from anon, authenticated;
grant select on table public.member_entry_moments to authenticated;
grant all on table public.member_entry_moments to service_role;

-- A única policy: o dono lê a própria linha. Sem INSERT/UPDATE/DELETE, o
-- cliente não escreve; a rota de provisionamento escreve como service_role.
create policy member_entry_moments_select_self
on public.member_entry_moments
for select
to authenticated
using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. A purga da conta conhece o dado novo
-- ---------------------------------------------------------------------------

-- Cópia da definição vigente (20261022130524_account_deletion_hidden_and_support)
-- com uma linha a mais: a remoção do momento declarado. O resto é linha por
-- linha a mesma função — mudar qualquer outra coisa aqui reabriria uma decisão
-- que não é desta migration.
create or replace function public.finalize_account_deletion(
  p_user_id uuid,
  p_error text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_due_at timestamptz;
  v_finalized_at timestamptz;
begin
  select due_at, finalized_at into v_due_at, v_finalized_at
  from public.account_deletion_requests
  where user_id = p_user_id
  for update;

  if not found then
    return 'not_found';
  end if;

  -- Uma purga já concluída não volta a ser "falhou": a resposta perdida de uma
  -- chamada bem-sucedida não pode reescrever o estado de uma linha finalizada.
  if v_finalized_at is not null then
    return 'already_purged';
  end if;

  if p_error is not null then
    update public.account_deletion_requests
       set purge_last_error = left(p_error, 500)
     where user_id = p_user_id;
    return 'failed';
  end if;

  -- O prazo é o da tabela aprovada; o chamador não escolhe.
  if v_due_at > now() then
    return 'not_due';
  end if;

  -- Mídias pessoais: as referências saem aqui, os objetos do bucket saem na
  -- rota (única que fala com o Storage). Documentos de verificação nunca
  -- ficaram no schema público.
  delete from private.verification_documents where user_id = p_user_id;

  -- Perfil: o mínimo necessário para atribuir o conteúdo público permanece —
  -- display_name — porque o item 4 do ADR manda o conteúdo continuar atribuído
  -- a ele. Todo o resto do perfil é dado pessoal.
  update public.profiles
     set bio = null,
         -- DATA-001 (20261022120200): o bairro do perfil é dado pessoal e sai na purga.
         neighborhood = null,
         consent_version = 0,
         consented_at = null,
         updated_at = now()
   where user_id = p_user_id;

  delete from public.profile_affiliations where user_id = p_user_id;
  delete from public.profile_suspensions where user_id = p_user_id;
  delete from public.consent_acceptances where user_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.notification_channel_preferences where user_id = p_user_id;
  delete from public.notifications where recipient_user_id = p_user_id;
  delete from public.dm_read_states where user_id = p_user_id;
  delete from public.dm_blocks
   where blocker_user_id = p_user_id or blocked_user_id = p_user_id;
  delete from public.post_saves where user_id = p_user_id;
  delete from public.post_reactions where user_id = p_user_id;
  delete from public.post_follows where user_id = p_user_id;
  delete from public.listing_saves where user_id = p_user_id;
  delete from public.listing_alerts where owner_user_id = p_user_id;
  delete from public.recommendation_saves where user_id = p_user_id;
  delete from public.user_group_interests where user_id = p_user_id;
  delete from public.event_rsvps where user_id = p_user_id;

  -- Entidades novas do ADR-20261022 que a purga precisa conhecer. A conta nao e
  -- apagada de verdade: o GoTrue faz soft delete em auth.users, entao o ON
  -- DELETE CASCADE da FK nunca dispara aqui. Sem estas duas linhas, ocultacoes
  -- e chamados ficariam para sempre depois da exclusao.
  delete from public.hidden_questions where user_id = p_user_id;

  -- PORT-005: o momento declarado (cidade, datas e destino) é dado pessoal e
  -- some junto. O protótipo descarta o rascunho ao concluir a entrada; a linha
  -- do banco é o que a Início e as boas-vindas leem, e por isso é apagada aqui.
  delete from public.member_entry_moments where user_id = p_user_id;

  -- A resposta do chamado tambem foi para a fila de envio, endereçada ao e-mail
  -- da epoca. Se a pessoa trocou o endereco antes de excluir a conta,
  -- purge_account_contact_data (que limpa POR ENDERECO) nao acha essa linha, e
  -- ela sobreviveria com assunto e texto da resposta. O vinculo e o ticket_id no
  -- payload, nao o destinatario; por isso a remocao vem antes do chamado.
  delete from public.outbox o
   where o.type = 'support_answered'
     and exists (
       select 1
       from public.support_tickets t
       where t.user_id = p_user_id
         and t.id::text = o.payload ->> 'ticket_id'
     );

  delete from public.support_tickets where user_id = p_user_id;

  -- A pessoa pode ter respondido chamados de terceiros antes de sair. A resposta
  -- fica (e dela que o destinatario depende), mas a autoria sai: o ON DELETE SET
  -- NULL da FK nao dispara, porque a exclusao real e soft delete.
  update public.support_tickets
     set answered_by = null
   where answered_by = p_user_id;

  -- Participação sai; posse NÃO é dissolvida (ver rodapé). O trigger
  -- cascade_community_membership_loss recusa remover a linha do dono, e este
  -- caminho não passa por cima dele: a mesma regra vale para a purga.
  delete from public.community_memberships cm
   where cm.user_id = p_user_id
     and not exists (
       select 1 from public.communities c
       where c.id = cm.community_id and c.owner_user_id = p_user_id
     );

  delete from public.group_memberships gm
   where gm.user_id = p_user_id
     and not exists (
       select 1 from public.groups g
       where g.id = gm.group_id and g.owner_user_id = p_user_id
     );

  delete from public.locality_memberships where user_id = p_user_id;

  -- Privilégio de operação morre com a conta; a auditoria da concessão fica.
  update public.operators
     set revoked_at = coalesce(revoked_at, now())
   where auth_user_id = p_user_id
     and revoked_at is null;

  update public.arrival_guide_entries set reviewed_by = null where reviewed_by = p_user_id;
  update public.reports set resolved_by = null where resolved_by = p_user_id;

  -- Convites familiares dos DOIS lados: como convidante (já revogados no
  -- pedido) e como convidado aceito. A linha guarda o digest e o palpite do
  -- e-mail de quem foi convidado — dado do titular, não do produto. Os vínculos
  -- (family_account_links) já saíram no pedido, então a FK de RESTRICT não
  -- segura nada aqui.
  delete from private.family_invitations
   where inviter_user_id = p_user_id or accepted_by_user_id = p_user_id;

  update public.account_deletion_requests
     set finalized_at = now(),
         purge_last_error = null
   where user_id = p_user_id;

  return 'purged';
end;
$$;

revoke all on function public.finalize_account_deletion(uuid, text)
  from public, anon, authenticated;
grant execute on function public.finalize_account_deletion(uuid, text) to service_role;

commit;
