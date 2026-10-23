-- PORT-004 (lote 4, frente B): troca do documento durante a análise.
--
-- O protótipo oferece "Enviar outro documento" com o arquivo ainda na fila
-- (`renderEntryPending` em prototypes/bivaque-html/src/features/entry/account.js).
-- O servidor de hoje não permitia: a tabela admite uma única análise pendente
-- por pessoa (`verification_documents_one_pending_per_user`), e
-- `submit_verification_document` recusa o segundo arquivo com 23505. Esta
-- função substitui a linha pendente na mesma transação, em vez de abrir uma
-- segunda análise paralela — o operador continua decidindo um arquivo por
-- pessoa, e a decisão vale para o mais recente.
--
-- A autorização não muda: security definer, execute só para service_role,
-- chamado pelo servidor Next, que resolve o chamador pelos cookies. A tabela
-- privada continua fora da Data API, e a preferência do membro não passa por
-- aqui.
--
-- Correção da revisão independente (P1): a troca concorrente com a decisão do
-- operador podia voltar a aprovação para `pending`. A conferência de `verified`
-- acontecia antes de qualquer trava, então o operador aprovava no intervalo, o
-- delete não achava mais a linha pendente, a função inseria o documento novo e
-- `upsert_verification_outcome(..., 'pending')` sobrescrevia o `verified`. A
-- função agora trava antes de decidir qualquer coisa, e explica a ordem das
-- travas no corpo.
--
-- Correção da revisão independente (P2): não existe varredura agendada de
-- objetos do bucket. O cron diário `bivaque-verification-document-ttl-purge`
-- (`verification_documents_purge_expired`) só marca a linha como `purged`; a
-- varredura de órfãos da action roda apenas no próximo envio da mesma pessoa e
-- só alcança objetos com mais de uma hora; `/api/internal/account-deletion`
-- limpa a pasta de contas excluídas. Um caminho substituído cuja remoção falha
-- ficava, portanto, para sempre. A tabela privada
-- `private.verification_document_removals` registra esse resto.
--
-- Terceira correção da revisão (desenho do coordenador, 22/10/2026):
--
-- 1) P1 — duas trocas simultâneas da MESMA pessoa podiam fechar um deadlock
--    (40P01) com a decisão do operador. A segunda troca esperava a linha do
--    documento antigo, que a primeira já apagou sem commit, e em seguida pedia
--    a linha do resultado enquanto o operador segurava a linha do documento
--    novo e esperava a do resultado: o delete e a decisão ficavam esperando um
--    pelo outro. A função passa a tomar uma trava consultiva por pessoa antes
--    de qualquer linha; a segunda troca só começa depois do commit da primeira,
--    encontra o documento NOVO pendente e segue a mesma ordem da decisão.
--    `decide_verification_document` não muda.
--
-- 2) P2 — a fila de remoção nasce na MESMA transação da troca. Antes, quem
--    enfileirava era a action, depois de duas tentativas de `storage.remove`;
--    se o processo morresse entre o commit da troca e o enqueue, o caminho
--    ficava sem linha e sem fila, e nenhuma varredura agendada o alcançaria.
--    Agora a linha nasce com a troca e a action só a apaga, pela função
--    `complete_verification_document_removal`, quando o objeto sai do bucket.
--    Se a remoção falha, a linha fica na fila. O processador da fila é o
--    cartão VERIF-REMOVAL-WORKER, fora desta entrega.

-- Fila de remoção de objetos substituídos.
--
-- Só service_role alcança: o schema `private` não está na Data API e as
-- permissões são mínimas, como nas outras tabelas de confiança. A linha guarda
-- apenas o caminho do objeto (que já começa pelo id da pessoa), nunca conteúdo
-- do documento.
create table private.verification_document_removals (
  id uuid primary key default gen_random_uuid(),
  storage_object_path text not null unique check (char_length(storage_object_path) > 0),
  enqueued_at timestamptz not null default now()
);

alter table private.verification_document_removals enable row level security;
alter table private.verification_document_removals force row level security;

revoke all on table private.verification_document_removals from public;
revoke all on table private.verification_document_removals from anon;
revoke all on table private.verification_document_removals from authenticated;
grant all on table private.verification_document_removals to service_role;

create function public.replace_verification_document(
  p_user_id uuid,
  p_storage_object_path text,
  p_mime_type text
)
returns table (
  document_id uuid,
  replaced_storage_object_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_id uuid;
  v_replaced_path text;
  v_status private.verification_status;
begin
  if p_storage_object_path is null or btrim(p_storage_object_path) = '' then
    raise exception 'storage_object_path is required';
  end if;

  if p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png') then
    raise exception 'unsupported document mime type';
  end if;

  -- Trava consultiva por pessoa: a primeira instrução que toca o banco.
  --
  -- Ela põe as trocas da MESMA pessoa em fila. Sem ela, a segunda troca
  -- esperava a linha do documento antigo, que a primeira já tinha apagado, e
  -- logo depois pedia a linha do resultado — enquanto o operador segurava a
  -- linha do documento novo e esperava a do resultado. As duas transações
  -- ficavam esperando uma pela outra (40P01). Com a trava aqui, a segunda troca
  -- espera o commit da primeira sem segurar linha nenhuma, encontra o documento
  -- NOVO pendente e segue a mesma ordem da decisão: documento, depois resultado.
  --
  -- A chave (`verification_document:<uuid>`) é por pessoa, então trocas de
  -- pessoas diferentes continuam em paralelo. A trava é de transação e sai no
  -- commit/rollback; nada de estado é lido antes dela.
  perform pg_advisory_xact_lock(
    hashtextextended('verification_document:' || p_user_id::text, 0)
  );

  -- Serialização com a decisão do operador.
  --
  -- decide_verification_document (20260821000040, revisada em 20260922153901)
  -- trava primeiro a linha do documento pendente e grava `verified` em
  -- private.verification_outcomes na mesma transação, pelo upsert de
  -- private.upsert_verification_outcome. As duas transações tomam as travas na
  -- MESMA ordem — documento, depois resultado — e nenhuma decisão de estado é
  -- lida antes da trava do resultado, que é o ponto de serialização.
  --
  -- A ordem importa: travar o resultado primeiro (o caminho natural, já que é
  -- a linha da decisão) fecha um deadlock (40P01) com o operador, que segura a
  -- linha do documento enquanto espera a do resultado. A ordem adotada não tem
  -- ciclo: quem chega depois encontra o estado já commitado. A trava consultiva
  -- acima é anterior às duas e não cria ciclo com a decisão, que não a toma.
  perform 1
    from private.verification_documents d
   where d.user_id = p_user_id
     and d.review_status = 'pending'
   for update;

  -- A linha do resultado pode não existir (primeiro envio, sem documento em
  -- análise). O insert garante uma linha para travar, com o mesmo `pending` que
  -- esta função gravaria no fim; `do nothing` preserva a decisão já existente.
  insert into private.verification_outcomes (user_id, status)
  values (p_user_id, 'pending')
  on conflict (user_id) do nothing;

  select o.status into v_status
    from private.verification_outcomes o
   where o.user_id = p_user_id
   for update;

  if v_status = 'verified' then
    raise exception 'user is already verified';
  end if;

  -- O arquivo anterior ainda não recebeu decisão: a linha sai e o caminho
  -- entra na fila de remoção na MESMA transação. Antes, quem enfileirava era a
  -- action, depois de duas tentativas de `storage.remove`; se o processo
  -- morresse entre o commit da troca e o enqueue, o caminho não ficava nem em
  -- linha nem em fila. A action continua apagando o objeto na hora e, quando o
  -- `storage.remove` funciona, apaga a linha da fila por
  -- complete_verification_document_removal; se a remoção falha, a linha
  -- simplesmente fica para o processador da fila (VERIF-REMOVAL-WORKER). Sem
  -- pendente (a análise já terminou ou nunca começou), a função só registra o
  -- arquivo novo.
  delete from private.verification_documents d
   where d.user_id = p_user_id
     and d.review_status = 'pending'
  returning d.storage_object_path into v_replaced_path;

  if v_replaced_path is not null then
    insert into private.verification_document_removals (storage_object_path)
    values (v_replaced_path)
    on conflict (storage_object_path) do nothing;
  end if;

  insert into private.verification_documents (
    user_id,
    storage_object_path,
    mime_type,
    expires_at
  )
  values (
    p_user_id,
    p_storage_object_path,
    p_mime_type,
    now() + interval '7 days'
  )
  returning id into v_document_id;

  perform private.upsert_verification_outcome(p_user_id, 'pending');

  return query select v_document_id, v_replaced_path;
end;
$$;

revoke all on function public.replace_verification_document(uuid, text, text) from public;
revoke all on function public.replace_verification_document(uuid, text, text) from anon;
revoke all on function public.replace_verification_document(uuid, text, text) from authenticated;
grant execute on function public.replace_verification_document(uuid, text, text) to service_role;

-- Chamada pela action do servidor quando o objeto substituído sai do bucket.
-- É idempotente: sem linha (já processada pelo worker da fila, ou caminho que
-- nunca foi substituído), não faz nada.
create function public.complete_verification_document_removal(
  p_storage_object_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_storage_object_path is null or btrim(p_storage_object_path) = '' then
    raise exception 'storage_object_path is required';
  end if;

  delete from private.verification_document_removals r
   where r.storage_object_path = p_storage_object_path;
end;
$$;

revoke all on function public.complete_verification_document_removal(text) from public;
revoke all on function public.complete_verification_document_removal(text) from anon;
revoke all on function public.complete_verification_document_removal(text) from authenticated;
grant execute on function public.complete_verification_document_removal(text) to service_role;
