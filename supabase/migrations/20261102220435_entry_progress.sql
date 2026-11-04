-- F01 ligado ao banco (LAN-F01, ADR-20261101-entrada-unica-por-codigo e
-- ADR-20261102-progresso-da-entrada) — o rascunho da entrada.
--
-- ── por que uma tabela, e não colunas em `profiles` ──────────────────────────
-- A entrada por código tem etapas que ainda não são fato consumado: a pessoa
-- escolhe cidade e momento antes de a verificação terminar, marca interesses
-- antes de o vínculo existir, e pode fechar o app em qualquer uma delas. As
-- tabelas canônicas não representam estado intermediário (o vínculo só nasce no
-- provisionamento, e `profile_localities` não existe), então o rascunho precisa
-- de um lugar próprio para a retomada decidir a etapa.
--
-- O rascunho é mínimo de propósito: só o que ainda não está no banco canônico
-- (`etapa`, `concluidas`, `via`, `convite`, `verificacao` e as escolhas ainda
-- não gravadas). Nome, cidade, momento, interesses e avisos vão para as tabelas
-- que já são donas deles no provisionamento; o rascunho é apagado quando a
-- entrada termina e na purga da conta.
--
-- ── privacidade ──────────────────────────────────────────────────────────────
-- É dado pessoal: `authenticated` só LÊ a própria linha. Não há policy de
-- INSERT/UPDATE/DELETE nem grant de escrita — quem grava é a rota
-- `/api/app/entry/progress` (service_role), depois de a sessão ser resolvida no
-- servidor. A regra de escopo e a policy que a lê entram nesta migration.
--
-- ── purga ────────────────────────────────────────────────────────────────────
-- O GoTrue faz soft delete em `auth.users`, então o ON DELETE CASCADE nunca
-- dispara; a função de purga ganha a linha de delete, copiada da definição
-- vigente (20261023110000) com essa única diferença.

begin;

-- ---------------------------------------------------------------------------
-- 1. O rascunho da entrada
-- ---------------------------------------------------------------------------

create table public.entry_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Versão do fluxo em `apps/app/src/previa-f01/fluxo.ts`; rascunho de versão
  -- antiga é trocado pelo inicial quando o servidor responde.
  versao integer not null,
  -- Etapa atual, na ordem do fluxo. A lista de etapas é a do app e a rota
  -- (única escritora) valida a lista; o banco garante formato e tamanho, que é
  -- o que impede valor arbitrário e texto longo na coluna.
  etapa text not null,
  -- Escolhas ainda não gravadas nas tabelas canônicas (nome, cidade, momento,
  -- interesses, grupos e avisos). Sempre objeto; listas, quando houver, vão
  -- dentro dele.
  estado jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entry_progress_versao check (versao between 1 and 1000),
  constraint entry_progress_etapa_formato check (etapa ~ '^[a-z][a-z-]{1,20}$'),
  constraint entry_progress_estado_objeto check (jsonb_typeof(estado) = 'object')
);

comment on table public.entry_progress is
  'Rascunho da entrada (LAN-F01): versão, etapa e escolhas ainda não gravadas no banco canônico. Uma linha por pessoa; o dono só lê, a rota grava e apaga.';
comment on column public.entry_progress.versao is
  'Versão do fluxo do app; rascunho de versão antiga volta ao inicial.';
comment on column public.entry_progress.etapa is
  'Etapa atual do fluxo F01, na ordem de apps/app/src/previa-f01/fluxo.ts.';
comment on column public.entry_progress.estado is
  'Escolhas ainda não gravadas (nome, cidade, momento, interesses, grupos, avisos). Objeto JSON; dado pessoal, apagado no fim da entrada e na purga.';

create trigger entry_progress_set_updated_at
before update on public.entry_progress
for each row execute function private.set_updated_at();

alter table public.entry_progress enable row level security;
alter table public.entry_progress force row level security;

revoke all on table public.entry_progress from anon, authenticated;
grant select on table public.entry_progress to authenticated;
grant all on table public.entry_progress to service_role;

-- A única policy: o dono lê a própria linha. Sem INSERT/UPDATE/DELETE, o
-- cliente não escreve; a rota grava como service_role depois de resolver a
-- sessão no servidor.
create policy entry_progress_select_self
on public.entry_progress
for select
to authenticated
using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. A purga da conta conhece o dado novo
-- ---------------------------------------------------------------------------

-- Cópia da definição vigente (20261023110000_member_entry_moments.sql) com uma
-- linha a mais: o delete do rascunho. O resto é linha por linha a mesma função.
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

  -- O rascunho da entrada (progresso do onboarding) também é dado pessoal e
  -- some junto; quem concluiu a entrada já não tem linha, porque a rota apaga
  -- o rascunho ao provisionar.
  delete from public.entry_progress where user_id = p_user_id;

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
