-- Abrir e responder chamado (ADR-20261022, secao 3.2 a 3.4).
--
-- Duas funções, porque são dois papéis:
--   * `open_support_ticket` é de quem tem conta. O e-mail vem de `auth.users`,
--     nunca do cliente, e há limite de abertura por pessoa.
--   * `answer_support_ticket` é da operação. Só `public.is_current_user_operator`
--     passa; responder grava a resposta, muda a situação, cria o aviso no app e
--     põe o e-mail na fila que já existe.
--
-- A tabela não tem insert/update/delete para `authenticated`: estas funções são
-- o único caminho. Ambas são SECURITY DEFINER com `search_path = ''` e checam o
-- chamador por `auth.uid()` — nunca por parâmetro.

create function public.open_support_ticket(
  p_topic public.support_ticket_topic,
  p_body text
)
returns public.support_tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_body text := btrim(coalesce(p_body, ''));
  v_email text;
  v_open integer;
  v_recent integer;
  v_row public.support_tickets%rowtype;
begin
  if v_user is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  if p_topic is null then
    raise exception 'support ticket topic is required' using errcode = '22023';
  end if;

  if char_length(v_body) < 10 then
    raise exception 'support ticket body is too short' using errcode = '22023';
  end if;

  if char_length(v_body) > 1000 then
    raise exception 'support ticket body is too long' using errcode = '22023';
  end if;

  -- O endereço de resposta é o da conta. Sem e-mail não existe resposta.
  select u.email into v_email
  from auth.users u
  where u.id = v_user;

  if v_email is null or btrim(v_email) = '' then
    raise exception 'account has no e-mail' using errcode = 'P0002';
  end if;

  -- Limite por pessoa. 54000 é o código da casa para teto de abertura
  -- (20260825181742:113, 20260923120000:116), e a tela o traduz em frase.
  -- Serializa as aberturas da mesma pessoa: sem isso, duas chamadas simultâneas contam o mesmo
  -- total e as duas passam pelo limite.
  perform pg_advisory_xact_lock(hashtextextended('support_ticket:' || v_user::text, 0));

  select count(*) into v_open
  from public.support_tickets
  where user_id = v_user
    and status = 'open';

  if v_open >= 5 then
    raise exception 'maximum 5 open support tickets per person'
      using errcode = '54000';
  end if;

  select count(*) into v_recent
  from public.support_tickets
  where user_id = v_user
    and created_at > now() - interval '24 hours';

  if v_recent >= 10 then
    raise exception 'maximum 10 support tickets per person in 24 hours'
      using errcode = '54000';
  end if;

  insert into public.support_tickets (user_id, email, topic, body)
  values (v_user, btrim(v_email), p_topic, v_body)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.open_support_ticket(
  public.support_ticket_topic, text
) from public, anon;

grant execute on function public.open_support_ticket(
  public.support_ticket_topic, text
) to authenticated;

create function public.answer_support_ticket(
  p_ticket_id uuid,
  p_reply text
)
returns public.support_tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator uuid := (select auth.uid());
  v_reply text := btrim(coalesce(p_reply, ''));
  v_row public.support_tickets%rowtype;
  v_email text;
begin
  if v_operator is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  -- O gate vem antes de qualquer leitura: quem não é operador não descobre nem
  -- se o chamado existe.
  if not public.is_current_user_operator(v_operator) then
    raise exception 'only operators answer support tickets' using errcode = '42501';
  end if;

  if char_length(v_reply) < 1 then
    raise exception 'support ticket reply is required' using errcode = '22023';
  end if;

  if char_length(v_reply) > 4000 then
    raise exception 'support ticket reply is too long' using errcode = '22023';
  end if;

  select * into v_row
  from public.support_tickets
  where id = p_ticket_id
  for update;

  if not found then
    raise exception 'support ticket not found' using errcode = 'P0002';
  end if;

  if v_row.status = 'answered' then
    raise exception 'support ticket already answered' using errcode = '55000';
  end if;

  update public.support_tickets
     set reply = v_reply,
         status = 'answered',
         answered_at = now(),
         answered_by = v_operator
   where id = p_ticket_id
   returning * into v_row;

  -- Aviso no app para o dono. O ator é NULO de propósito: a identidade de quem
  -- responde é da operação e não vira dado visível (mesma regra de
  -- report_resolved em deep-links.ts).
  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    v_row.user_id, null, 'support_answered', 'answered', 'support_ticket', v_row.id
  );

  -- E-mail na fila que já existe. O endereço é o do chamado: é para lá que a
  -- pessoa pediu a resposta, mesmo que tenha trocado o e-mail da conta depois.
  select u.email into v_email
  from auth.users u
  where u.id = v_row.user_id;

  if v_email is not null and btrim(v_email) <> '' then
    insert into public.outbox (recipient, channel, type, payload)
    values (
      btrim(v_email),
      'email',
      'support_answered',
      jsonb_build_object('ticket_id', v_row.id, 'topic', v_row.topic, 'reply', v_row.reply)
    );
  end if;

  return v_row;
end;
$$;

revoke all on function public.answer_support_ticket(uuid, text)
  from public, anon;

grant execute on function public.answer_support_ticket(uuid, text)
  to authenticated;
