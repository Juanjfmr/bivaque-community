-- Convite de familiar por código curto (ADR-20261022-entrada-do-prototipo, item 2).
--
-- O convite existia só por link: o token de 32 bytes era gerado no servidor,
-- usado uma vez e nunca guardado em claro — a tabela guarda o digest. Quem
-- recebia o e-mail não recebia link nenhum, e quem perdia a mensagem dependia
-- de quem convidou para copiar a URL da tela de perfil.
--
-- Aqui nasce o código digitável:
--   * 8 caracteres de um alfabeto de 31 (sem 0, O, 1, I e L), o que dá ~8,5e11
--     combinações — adivinhar não é viável, e o alfabeto não produz par
--     ambíguo na leitura em voz alta;
--   * uso único: aceitar move a linha para `accepted`, e revogar move para
--     `revoked`; reenviar gira o código junto com o token;
--   * validade de 7 dias, a mesma do token;
--   * guardado SÓ como hash (sha256), exatamente como o token — o código em
--     claro existe uma vez, no retorno do servidor que o criou, e no payload do
--     outbox que o entrega por e-mail (a mesma escolha já feita para o
--     destinatário cru do e-mail).
--
-- Duas funções, porque são dois momentos:
--   * `family_invite_code_preview` valida o código ANTES de existir conta e
--     devolve o status mais só o que a tela mostra: o nome de quem convidou, o
--     rótulo mascarado do e-mail convidado e o prazo;
--   * `family_invite_code_accept` consome o código DEPOIS que a conta existe e
--     delega o vínculo a `private.accept_family_invitation`, que continua sendo
--     a única porta que cria `family_account_links` e que confere o e-mail do
--     aceitante contra o digest do convite.
--
-- Código errado, vencido, revogado ou já usado respondem a MESMA coisa
-- (`unavailable`): um dos quatro não pode virar oráculo de qual convite existe.
-- O excesso de tentativas tem status próprio (`rate_limited`), porque a ação
-- corretiva é outra — esperar, não pedir convite novo.
--
-- Nenhum desses resultados é exceção. Uma exceção desfaz a transação inteira da
-- chamada — e com ela o insert da tentativa —, então o limite passaria a contar
-- só quem acertou e quem tenta adivinhar nunca seria barrado. As funções
-- devolvem um `status` e a transação confirma a tentativa, no padrão de
-- `consume_verification_attempt` (20260815133000), que devolve booleano em vez
-- de lançar. Só entrada inválida (digest com tamanho errado) continua sendo
-- exceção: ali não existe tentativa a contar.
--
-- Limite de tentativas por origem e por e-mail: janela móvel de uma hora,
-- contada em tabela, com o status genérico para quem estourou.

alter table private.family_invitations
  add column code_hash bytea
  check (code_hash is null or octet_length(code_hash) = 32);

-- Um código, um convite. O índice é parcial porque as linhas antigas (e as
-- criadas por link antes desta migration) não têm código.
create unique index family_invitations_code_hash_idx
  on private.family_invitations (code_hash)
  where code_hash is not null;

create table private.family_invite_code_attempts (
  id bigint generated always as identity primary key,
  -- Origem da tentativa (hash do endereço de rede; o IP cru não é guardado).
  origin_digest bytea not null check (octet_length(origin_digest) = 32),
  -- E-mail tentado, quando conhecido: no aceite é o e-mail da conta; no
  -- preview é o que a pessoa digitou, se digitou.
  email_digest bytea check (email_digest is null or octet_length(email_digest) = 32),
  -- Hash do código tentado. Guardar o hash (e não o valor) permite auditar
  -- tentativa repetida sem criar um dicionário de códigos.
  code_hash bytea not null check (octet_length(code_hash) = 32),
  created_at timestamptz not null default now()
);

create index family_invite_code_attempts_origin_idx
  on private.family_invite_code_attempts (origin_digest, created_at desc);

create index family_invite_code_attempts_email_idx
  on private.family_invite_code_attempts (email_digest, created_at desc)
  where email_digest is not null;

alter table private.family_invite_code_attempts enable row level security;
alter table private.family_invite_code_attempts force row level security;

revoke all on table private.family_invite_code_attempts from anon, authenticated;
grant all on table private.family_invite_code_attempts to service_role;

-- Janela e tetos num só lugar: a tela não os repete, e a prova pgTAP usa os
-- mesmos números.
create function private.family_invite_code_rate_limit()
returns table (window_interval interval, origin_max integer, email_max integer)
language sql
immutable
set search_path = ''
as $$
  select interval '1 hour', 15, 10;
$$;

revoke all on function private.family_invite_code_rate_limit() from public;
revoke all on function private.family_invite_code_rate_limit() from anon;
revoke all on function private.family_invite_code_rate_limit() from authenticated;
grant execute on function private.family_invite_code_rate_limit() to service_role;

-- Registra a tentativa ou devolve `rate_limited` quando o teto já estourou. A
-- contagem vem ANTES do insert: a décima sexta tentativa da mesma origem é
-- recusada, não a décima sétima — e a recusada não entra na conta, senão o
-- limite nunca deixaria de valer.
create function private.record_family_invite_code_attempt(
  p_origin_digest bytea,
  p_email_digest bytea,
  p_code_hash bytea
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window interval;
  v_origin_max integer;
  v_email_max integer;
  v_count integer;
begin
  if p_origin_digest is null or octet_length(p_origin_digest) <> 32 then
    raise exception 'origin digest must be 32 bytes' using errcode = '22023';
  end if;

  if p_code_hash is null or octet_length(p_code_hash) <> 32 then
    raise exception 'code hash must be 32 bytes' using errcode = '22023';
  end if;

  if p_email_digest is not null and octet_length(p_email_digest) <> 32 then
    raise exception 'email digest must be 32 bytes' using errcode = '22023';
  end if;

  select window_interval, origin_max, email_max
  into v_window, v_origin_max, v_email_max
  from private.family_invite_code_rate_limit();

  -- A tabela de tentativas é descartável por desenho: só a janela importa, e
  -- um dia de histórico é folga suficiente para auditar abuso recente. A poda
  -- é por origem, que é o índice disponível — varrer a tabela inteira a cada
  -- tentativa seria um preço alto para limpar linhas que ninguém lê.
  delete from private.family_invite_code_attempts
  where origin_digest = p_origin_digest
    and created_at < now() - interval '1 day';

  select count(*)::integer
  into v_count
  from private.family_invite_code_attempts
  where origin_digest = p_origin_digest
    and created_at > now() - v_window;

  if v_count >= v_origin_max then
    return 'rate_limited';
  end if;

  if p_email_digest is not null then
    select count(*)::integer
    into v_count
    from private.family_invite_code_attempts
    where email_digest = p_email_digest
      and created_at > now() - v_window;

    if v_count >= v_email_max then
      return 'rate_limited';
    end if;
  end if;

  insert into private.family_invite_code_attempts (origin_digest, email_digest, code_hash)
  values (p_origin_digest, p_email_digest, p_code_hash);

  return 'ok';
end;
$$;

revoke all on function private.record_family_invite_code_attempt(bytea, bytea, bytea) from public;
revoke all on function private.record_family_invite_code_attempt(bytea, bytea, bytea) from anon;
revoke all on function private.record_family_invite_code_attempt(bytea, bytea, bytea)
  from authenticated;
grant execute on function private.record_family_invite_code_attempt(bytea, bytea, bytea)
  to service_role;

-- Preview: valida o código sem sessão e devolve só o que a tela do convite
-- mostra. `p_email_digest` é opcional: quando a pessoa já digitou o e-mail, a
-- tentativa também conta contra aquele endereço, e o par código + e-mail é
-- conferido antes de a conta existir.
--
-- O resultado é `status` (`ok`, `unavailable`, `email_mismatch` ou
-- `rate_limited`), nunca exceção: a exceção desfaria o insert da tentativa
-- feito por `record_family_invite_code_attempt` e o limite não contaria erro.
-- Os campos da tela só vêm preenchidos quando `status = 'ok'`.
create function private.family_invite_code_preview(
  p_code_hash bytea,
  p_origin_digest bytea,
  p_email_digest bytea default null
)
returns table (
  status text,
  inviter_name text,
  invitee_email_hint text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation private.family_invitations;
  v_attempt text;
begin
  v_attempt := private.record_family_invite_code_attempt(
    p_origin_digest,
    p_email_digest,
    p_code_hash
  );

  if v_attempt = 'rate_limited' then
    status := 'rate_limited';
    return next;
    return;
  end if;

  select fi.*
  into v_invitation
  from private.family_invitations fi
  where fi.code_hash = p_code_hash
    and fi.status = 'pending'
    and fi.expires_at > now();

  -- Errado, vencido, revogado ou usado: uma resposta só.
  if not found then
    status := 'unavailable';
    return next;
    return;
  end if;

  -- O convite vale para um e-mail só. Quando a tela já sabe o endereço — a
  -- pessoa digitou no formulário de criar conta —, conferir aqui evita criar
  -- a conta para depois descobrir que ela não pode ser vinculada.
  -- `email_mismatch` é distinto de propósito: só chega nele quem já tem o
  -- código certo, então a frase não vira oráculo de convites. O aceite
  -- continua com a resposta genérica, porque lá o código já é a credencial.
  if p_email_digest is not null and p_email_digest <> v_invitation.invitee_email_digest then
    status := 'email_mismatch';
    return next;
    return;
  end if;

  -- O nome de exibição de quem convidou é o que o protótipo mostra na faixa do
  -- convite. Possuir o código já prova conhecimento do convite; o nome não
  -- acrescenta dado que o convite não carregue.
  select p.display_name
  into inviter_name
  from public.profiles p
  where p.user_id = v_invitation.inviter_user_id;

  status := 'ok';
  inviter_name := coalesce(inviter_name, 'Alguém da família');
  invitee_email_hint := v_invitation.invitee_email_hint;
  expires_at := v_invitation.expires_at;

  return next;
  return;
end;
$$;

revoke all on function private.family_invite_code_preview(bytea, bytea, bytea) from public;
revoke all on function private.family_invite_code_preview(bytea, bytea, bytea) from anon;
revoke all on function private.family_invite_code_preview(bytea, bytea, bytea) from authenticated;
grant execute on function private.family_invite_code_preview(bytea, bytea, bytea) to service_role;

-- Aceite por código: consume o código e delega o vínculo à função que já
-- existia (20260820000005), que confere o e-mail do aceitante contra o digest
-- do convite e cria `family_account_links`. Nenhuma regra de vínculo é
-- reimplementada aqui.
--
-- Devolve `status` (`ok`, `unavailable` ou `rate_limited`) e o id do vínculo —
-- nunca exceção para o resultado do código, pelo mesmo motivo do preview: a
-- tentativa precisa sobreviver à resposta. Quando o vínculo falha por dentro
-- (e-mail diferente, corrida perdida, revogação no meio), o `status` vira
-- `unavailable` e a tentativa continua gravada.
create function private.family_invite_code_accept(
  p_code_hash bytea,
  p_accepted_by_user_id uuid,
  p_origin_digest bytea
)
returns table (
  status text,
  link_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation private.family_invitations;
  v_email_digest bytea;
  v_link_id uuid;
  v_attempt text;
begin
  select extensions.digest(lower(trim(u.email)), 'sha256')
  into v_email_digest
  from auth.users u
  where u.id = p_accepted_by_user_id;

  -- A tentativa é contada com o e-mail do aceitante quando existe: é o limite
  -- por e-mail que impede adivinhar o código de um convite de outra pessoa.
  v_attempt := private.record_family_invite_code_attempt(
    p_origin_digest,
    v_email_digest,
    p_code_hash
  );

  if v_attempt = 'rate_limited' then
    status := 'rate_limited';
    return next;
    return;
  end if;

  if v_email_digest is null then
    -- Sem e-mail não há convite a aceitar; a resposta é a mesma dos outros
    -- casos para não dizer nada sobre o convite.
    status := 'unavailable';
    return next;
    return;
  end if;

  -- `for update` segura a linha: sem ele, dois aceites simultâneos do mesmo
  -- código passariam os dois pela leitura antes de qualquer update.
  select fi.*
  into v_invitation
  from private.family_invitations fi
  where fi.code_hash = p_code_hash
    and fi.status = 'pending'
    and fi.expires_at > now()
  for update;

  if not found then
    status := 'unavailable';
    return next;
    return;
  end if;

  begin
    v_link_id := private.accept_family_invitation(
      v_invitation.token_digest,
      p_accepted_by_user_id
    );
  exception
    -- E-mail diferente, corrida perdida, revogação no meio: a resposta é a
    -- mesma do código inexistente. O bloco é uma subtransação: desfaz só o
    -- vínculo, nunca o insert da tentativa.
    when sqlstate 'P0001' or sqlstate 'P0002' or sqlstate 'P0003' or sqlstate 'P0004' then
      v_link_id := null;
  end;

  if v_link_id is null then
    status := 'unavailable';
    return next;
    return;
  end if;

  status := 'ok';
  link_id := v_link_id;

  return next;
  return;
end;
$$;

revoke all on function private.family_invite_code_accept(bytea, uuid, bytea) from public;
revoke all on function private.family_invite_code_accept(bytea, uuid, bytea) from anon;
revoke all on function private.family_invite_code_accept(bytea, uuid, bytea) from authenticated;
grant execute on function private.family_invite_code_accept(bytea, uuid, bytea) to service_role;

-- Criar convite com código: delega ao criador de 4 argumentos (mesma transação,
-- mesmas regras de titular verificado e teto de 5) e grava o hash na linha que
-- ele acabou de criar. Sem duplicar o corpo da função.
create function private.create_family_invitation(
  p_inviter_user_id uuid,
  p_token_digest bytea,
  p_invitee_email_digest bytea,
  p_invitee_email_hint text,
  p_code_hash bytea
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation_id uuid;
begin
  if p_code_hash is null or octet_length(p_code_hash) <> 32 then
    raise exception 'code hash must be 32 bytes' using errcode = '22023';
  end if;

  v_invitation_id := private.create_family_invitation(
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest,
    p_invitee_email_hint
  );

  update private.family_invitations
     set code_hash = p_code_hash
   where id = v_invitation_id;

  return v_invitation_id;
end;
$$;

revoke all on function private.create_family_invitation(uuid, bytea, bytea, text, bytea) from public;
revoke all on function private.create_family_invitation(uuid, bytea, bytea, text, bytea) from anon;
revoke all on function private.create_family_invitation(uuid, bytea, bytea, text, bytea)
  from authenticated;
grant execute on function private.create_family_invitation(uuid, bytea, bytea, text, bytea)
  to service_role;

-- Reenviar já reemite o token (20260915230000). Agora reemite o código junto:
-- o código antigo deixa de existir no mesmo instante.
create function private.resend_family_invitation(
  p_invitation_id uuid,
  p_inviter_user_id uuid,
  p_token_digest bytea,
  p_invitee_email_digest bytea,
  p_code_hash bytea
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation_id uuid;
begin
  if p_code_hash is null or octet_length(p_code_hash) <> 32 then
    raise exception 'code hash must be 32 bytes' using errcode = '22023';
  end if;

  v_invitation_id := private.resend_family_invitation(
    p_invitation_id,
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest
  );

  update private.family_invitations
     set code_hash = p_code_hash
   where id = v_invitation_id;

  return v_invitation_id;
end;
$$;

revoke all on function private.resend_family_invitation(uuid, uuid, bytea, bytea, bytea) from public;
revoke all on function private.resend_family_invitation(uuid, uuid, bytea, bytea, bytea) from anon;
revoke all on function private.resend_family_invitation(uuid, uuid, bytea, bytea, bytea)
  from authenticated;
grant execute on function private.resend_family_invitation(uuid, uuid, bytea, bytea, bytea)
  to service_role;

-- Wrappers públicos: só service_role. O navegador nunca fala com estas funções
-- diretamente; quem traduz o status em resposta é a Server Action.
create function public.family_invite_code_preview(
  p_code_hash bytea,
  p_origin_digest bytea,
  p_email_digest bytea default null
)
returns table (
  status text,
  inviter_name text,
  invitee_email_hint text,
  expires_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select * from private.family_invite_code_preview(
    p_code_hash,
    p_origin_digest,
    p_email_digest
  );
$$;

revoke all on function public.family_invite_code_preview(bytea, bytea, bytea) from public;
revoke all on function public.family_invite_code_preview(bytea, bytea, bytea) from anon;
revoke all on function public.family_invite_code_preview(bytea, bytea, bytea) from authenticated;
grant execute on function public.family_invite_code_preview(bytea, bytea, bytea) to service_role;

create function public.family_invite_code_accept(
  p_code_hash bytea,
  p_accepted_by_user_id uuid,
  p_origin_digest bytea
)
returns table (
  status text,
  link_id uuid
)
language sql
security definer
set search_path = ''
as $$
  select * from private.family_invite_code_accept(
    p_code_hash,
    p_accepted_by_user_id,
    p_origin_digest
  );
$$;

revoke all on function public.family_invite_code_accept(bytea, uuid, bytea) from public;
revoke all on function public.family_invite_code_accept(bytea, uuid, bytea) from anon;
revoke all on function public.family_invite_code_accept(bytea, uuid, bytea) from authenticated;
grant execute on function public.family_invite_code_accept(bytea, uuid, bytea) to service_role;

create function public.create_family_invitation(
  p_inviter_user_id uuid,
  p_token_digest bytea,
  p_invitee_email_digest bytea,
  p_invitee_email_hint text,
  p_code_hash bytea
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.create_family_invitation(
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest,
    p_invitee_email_hint,
    p_code_hash
  );
$$;

revoke all on function public.create_family_invitation(uuid, bytea, bytea, text, bytea) from public;
revoke all on function public.create_family_invitation(uuid, bytea, bytea, text, bytea) from anon;
revoke all on function public.create_family_invitation(uuid, bytea, bytea, text, bytea)
  from authenticated;
grant execute on function public.create_family_invitation(uuid, bytea, bytea, text, bytea)
  to service_role;

create function public.resend_family_invitation(
  p_invitation_id uuid,
  p_inviter_user_id uuid,
  p_token_digest bytea,
  p_invitee_email_digest bytea,
  p_code_hash bytea
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.resend_family_invitation(
    p_invitation_id,
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest,
    p_code_hash
  );
$$;

revoke all on function public.resend_family_invitation(uuid, uuid, bytea, bytea, bytea) from public;
revoke all on function public.resend_family_invitation(uuid, uuid, bytea, bytea, bytea) from anon;
revoke all on function public.resend_family_invitation(uuid, uuid, bytea, bytea, bytea)
  from authenticated;
grant execute on function public.resend_family_invitation(uuid, uuid, bytea, bytea, bytea)
  to service_role;
