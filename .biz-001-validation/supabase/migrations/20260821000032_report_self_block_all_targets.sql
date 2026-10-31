-- 032: auto-denuncia bloqueada em todos os alvos (H-Task 1)
--
-- private.reports_block_self (20260802001600) cobre post, comment e group, e
-- cai no `else v_owner_id := null` para todo o resto. Consequencia: mensagem e
-- indicacao aceitam AUTO-DENUNCIA hoje — o achado F163 do lote-2-moderacao
-- descreve o efeito, que e inflar uma fila e fabricar evidencia contra si
-- mesmo.
--
-- O `else` continua existindo e continua devolvendo null: um alvo novo que
-- ninguem lembrou de tratar nao pode fazer o insert explodir. O que ele nao
-- faz e proteger — por isso todo alvo novo entra aqui junto com o valor do
-- enum, e a Task 1 tem assercao de auto-denuncia para cada um dos seis.
--
-- O bloqueio de duplicata nao precisa de nada: o indice parcial
-- reports_one_open_per_reporter_target_idx e generico em (reporter,
-- target_type, target_id) e ja cobre os alvos novos.

create or replace function private.reports_block_self()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  case new.target_type
    when 'post' then
      select user_id into v_owner_id
      from public.posts where id = new.target_id;
    when 'comment' then
      select user_id into v_owner_id
      from public.comments where id = new.target_id;
    when 'group' then
      select owner_user_id into v_owner_id
      from public.groups where id = new.target_id;
    when 'message' then
      select sender_id into v_owner_id
      from public.dm_messages where id = new.target_id;
    when 'recommendation_request' then
      select author_id into v_owner_id
      from public.recommendation_requests where id = new.target_id;
    when 'recommendation_reply' then
      select author_id into v_owner_id
      from public.recommendation_replies where id = new.target_id;
    else
      v_owner_id := null;
  end case;

  if v_owner_id is not null and v_owner_id = new.reporter_user_id then
    raise exception 'cannot report your own content';
  end if;

  return new;
end;
$$;
