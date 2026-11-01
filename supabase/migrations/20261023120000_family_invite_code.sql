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
-- contada em tabela, com o status genérico para quem estourou. Só a tentativa
-- que FALHOU é gravada — o limite existe contra adivinhação, não contra quem
-- tem o código certo —, e a contagem e o insert ficam sob uma trava de
-- transação por origem e por e-mail, para duas chamadas simultâneas não lerem
-- a mesma contagem e passarem as duas pelo teto.

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

-- A trava do limite. Contar e inserir são dois passos: sem trava, duas chamadas
-- simultâneas leem a mesma contagem e as duas passam pelo teto. A trava é de
-- transação (`pg_advisory_xact_lock`), pela origem e — quando existe — pelo
-- e-mail, SEMPRE nessa ordem: origem antes do e-mail. A ordem fixa é o que
-- impede duas chamadas com as mesmas duas chaves de montarem um ciclo; é o
-- mesmo recurso que `open_support_ticket` já usa (20261022130521).
--
-- A chave é o hash do digest, não o digest: `hashtextextended` devolve bigint,
-- a forma de chave única. O prefixo separa origem de e-mail — sem ele, um
-- digest de origem igual a um de e-mail cairia na mesma trava sem motivo.
create function private.lock_family_invite_code_attempts(
  p_origin_digest bytea,
  p_email_digest bytea
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'family_invite_code:origin:' || pg_catalog.encode(p_origin_digest, 'hex'),
      0
    )
  );

  if p_email_digest is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'family_invite_code:email:' || pg_catalog.encode(p_email_digest, 'hex'),
        0
      )
    );
  end if;
end;
$$;

revoke all on function private.lock_family_invite_code_attempts(bytea, bytea) from public;
revoke all on function private.lock_family_invite_code_attempts(bytea, bytea) from anon;
revoke all on function private.lock_family_invite_code_attempts(bytea, bytea) from authenticated;
grant execute on function private.lock_family_invite_code_attempts(bytea, bytea) to service_role;

-- O teto, sozinho: devolve `ok` (pode seguir) ou `rate_limited`. É chamado
-- ANTES de o código ser conferido, em toda tentativa, para que quem estourou
-- com erros continue barrado até quando apresenta o código certo. Não grava
-- nada — quem grava é `record_family_invite_code_failure`, e só quando a
-- tentativa falhou.
--
-- A contagem vem antes do insert e a trava segura as duas: a décima sexta
-- tentativa da mesma origem é recusada, não a décima sétima — e a recusada não
-- entra na conta, senão o limite nunca deixaria de valer.
create function private.family_invite_code_attempt_gate(
  p_origin_digest bytea,
  p_email_digest bytea
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

  if p_email_digest is not null and octet_length(p_email_digest) <> 32 then
    raise exception 'email digest must be 32 bytes' using errcode = '22023';
  end if;

  perform private.lock_family_invite_code_attempts(p_origin_digest, p_email_digest);

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

  return 'ok';
end;
$$;

revoke all on function private.family_invite_code_attempt_gate(bytea, bytea) from public;
revoke all on function private.family_invite_code_attempt_gate(bytea, bytea) from anon;
revoke all on function private.family_invite_code_attempt_gate(bytea, bytea) from authenticated;
grant execute on function private.family_invite_code_attempt_gate(bytea, bytea) to service_role;

-- Registra a tentativa QUE FALHOU: código errado, vencido, usado, revogado ou
-- e-mail diferente do convite. Tentativa com o código certo não grava linha.
--
-- O limite existe para conter adivinhação, não para punir quem acertou, e o
-- fluxo certo passa por até três chamadas (preview, validação antes do
-- cadastro e aceite). Contando as três, quem acertava chegava ao bloqueio
-- depois de a conta já existir — e o aceite era recusado com a conta criada.
--
-- A trava é a mesma, na mesma ordem: numa chamada normal o gate já a segurou
-- nesta transação (a trava de transação é reentrante), e um chamador futuro que
-- grave sem passar pelo gate continua serializado por origem.
create function private.record_family_invite_code_failure(
  p_origin_digest bytea,
  p_email_digest bytea,
  p_code_hash bytea
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

  perform private.lock_family_invite_code_attempts(p_origin_digest, p_email_digest);

  insert into private.family_invite_code_attempts (origin_digest, email_digest, code_hash)
  values (p_origin_digest, p_email_digest, p_code_hash);
end;
$$;

revoke all on function private.record_family_invite_code_failure(bytea, bytea, bytea) from public;
revoke all on function private.record_family_invite_code_failure(bytea, bytea, bytea) from anon;
revoke all on function private.record_family_invite_code_failure(bytea, bytea, bytea)
  from authenticated;
grant execute on function private.record_family_invite_code_failure(bytea, bytea, bytea)
  to service_role;

-- Preview: valida o código sem sessão e devolve só o que a tela do convite
-- mostra. `p_email_digest` é opcional: quando a pessoa já digitou o e-mail, a
-- falha também conta contra aquele endereço, e o par código + e-mail é conferido
-- antes de a conta existir.
--
-- O resultado é `status` (`ok`, `unavailable`, `email_mismatch` ou
-- `rate_limited`), nunca exceção: a exceção desfaria o insert da tentativa e o
-- limite não contaria erro. Os campos da tela só vêm preenchidos quando
-- `status = 'ok'`.
--
-- O teto é conferido primeiro; a falha é registrada no fim (só código certo não
-- grava nada).
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
  v_gate text;
begin
  v_gate := private.family_invite_code_attempt_gate(p_origin_digest, p_email_digest);

  if v_gate = 'rate_limited' then
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

  -- Errado, vencido, revogado ou usado: uma resposta só — e a falha fica
  -- gravada, porque é ela que o limite conta.
  if not found then
    perform private.record_family_invite_code_failure(
      p_origin_digest,
      p_email_digest,
      p_code_hash
    );

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
    perform private.record_family_invite_code_failure(
      p_origin_digest,
      p_email_digest,
      p_code_hash
    );

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

-- Aceite por código: consome o código, cria o vínculo e conclui o
-- provisionamento — tudo na MESMA transação.
--
-- O vínculo continua delegado a `private.accept_family_invitation`
-- (20260820000005), a única porta que cria `family_account_links` e que confere
-- o e-mail do aceitante contra o digest do convite (20260815130000). Nenhuma
-- regra de vínculo é reimplementada aqui.
--
-- Depois do vínculo, esta função faz o que era o segundo request do servidor
-- (`apps/web/lib/convite/provision.ts`): resolve a localidade corrente do
-- titular, provisiona a membership (`public.provision_member_locality`) e grava
-- o perfil com o nome e a versão do aceite. A diferença não é de estilo: com o
-- aceite e o provisionamento em transações separadas, dois desfechos ruins eram
-- possíveis —
--
--   * convite consumido sem acesso: o vínculo confirmava, o provisionamento
--     falhava, e a pessoa ficava com conta e sem acesso. O preview exige
--     convite `pending`, então a tela nem deixava retomar;
--   * corrida entre dois aceites: os dois consultavam a ausência de membership
--     antes de provisionar, e o segundo transformava a corrente recém-criada em
--     `leaving`.
--
-- Numa transação só, qualquer falha desfaz tudo, inclusive o convite voltar a
-- `pending`: a pessoa digita o código de novo e conclui. O provisionamento fica
-- sob a trava do próprio convite (`for update`) e não repete
-- `provision_member_locality` quando a pessoa já está corrente na localidade do
-- titular — repetir fecharia a corrente e, na mesma localidade, a deixaria sem
-- corrente nenhuma.
--
-- Devolve `status` (`ok`, `unavailable` ou `rate_limited`) e o id do vínculo —
-- nunca exceção para o resultado do código, pelo mesmo motivo do preview: a
-- tentativa precisa sobreviver à resposta. Quando o vínculo falha por dentro
-- (e-mail diferente, corrida perdida, revogação no meio), o `status` vira
-- `unavailable` e a tentativa fica gravada.
--
-- Continuam sendo exceção, e não status: entrada inválida (digest com tamanho
-- errado, nome fora da política de nome, versão de aceite não positiva) e
-- titular sem localidade corrente. Não são resultado de código errado — são
-- falha de contrato —, e o aceite inteiro tem de voltar atrás.
--
-- RETOMADA: a mesma pessoa que já aceitou ESTE convite recebe `ok` e o vínculo
-- que existe. O uso é o vínculo, e ele é único por convite; este é o caminho de
-- quem perdeu a resposta do primeiro aceite (a conexão caiu depois do commit).
-- Só o aceitante do próprio convite chega aqui — outro usuário cai na resposta
-- genérica, que é o que mantém o uso único.
create function private.family_invite_code_accept(
  p_code_hash bytea,
  p_accepted_by_user_id uuid,
  p_origin_digest bytea,
  p_display_name text,
  p_consent_version integer
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
  v_holder_user_id uuid;
  v_locality_id uuid;
  v_gate text;
  v_resumed boolean := false;
begin
  if p_origin_digest is null or octet_length(p_origin_digest) <> 32 then
    raise exception 'origin digest must be 32 bytes' using errcode = '22023';
  end if;

  if p_code_hash is null or octet_length(p_code_hash) <> 32 then
    raise exception 'code hash must be 32 bytes' using errcode = '22023';
  end if;

  -- Mesma política de nome do perfil (20260817040043): recusar aqui evita um
  -- 23514 vindo do CHECK, que o servidor teria de traduzir sem contexto.
  if not private.display_name_ok(p_display_name) then
    raise exception 'display name is not valid' using errcode = '22023';
  end if;

  if p_consent_version is null or p_consent_version < 1 then
    raise exception 'consent version must be positive' using errcode = '22023';
  end if;

  select extensions.digest(lower(trim(u.email)), 'sha256')
  into v_email_digest
  from auth.users u
  where u.id = p_accepted_by_user_id;

  -- A linha do convite é travada ANTES de qualquer decisão, qualquer que seja o
  -- status. Dois aceites simultâneos do mesmo código ficam em série: o segundo
  -- espera aqui e, em Read Committed, cada comando seguinte enxerga o que o
  -- primeiro confirmou — ele cai na retomada abaixo, em vez de achar só um
  -- convite `accepted` e responder `unavailable`. Código inexistente não trava
  -- nada, e a resposta não muda: a trava não vira oráculo.
  perform 1
    from private.family_invitations fi
   where fi.code_hash = p_code_hash
   for update;

  -- Retomada: este convite já foi aceito por esta mesma pessoa e o vínculo
  -- existe. Devolver o vínculo é idempotente, não é um segundo uso — o uso é o
  -- vínculo, e ele é único por convite.
  select link.id, fi.inviter_user_id
  into v_link_id, v_holder_user_id
  from private.family_account_links link
  join private.family_invitations fi on fi.id = link.invitation_id
  where fi.code_hash = p_code_hash
    and fi.status = 'accepted'
    and fi.accepted_by_user_id = p_accepted_by_user_id
    and link.family_user_id = p_accepted_by_user_id;

  v_resumed := v_link_id is not null;

  if v_link_id is null then
    -- A tentativa é contada com o e-mail do aceitante quando existe: é o limite
    -- por e-mail que impede adivinhar o código de um convite de outra pessoa.
    v_gate := private.family_invite_code_attempt_gate(p_origin_digest, v_email_digest);

    if v_gate = 'rate_limited' then
      status := 'rate_limited';
      return next;
      return;
    end if;

    if v_email_digest is null then
      -- Sem e-mail não há convite a aceitar; a resposta é a mesma dos outros
      -- casos para não dizer nada sobre o convite.
      perform private.record_family_invite_code_failure(
        p_origin_digest,
        null,
        p_code_hash
      );

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
      perform private.record_family_invite_code_failure(
        p_origin_digest,
        v_email_digest,
        p_code_hash
      );

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
      perform private.record_family_invite_code_failure(
        p_origin_digest,
        v_email_digest,
        p_code_hash
      );

      status := 'unavailable';
      return next;
      return;
    end if;

    v_holder_user_id := v_invitation.inviter_user_id;
  end if;

  -- Retomada de quem já tem localidade corrente: o acesso já existe e é dele.
  -- Repetir o código não consulta de novo a cidade do titular — se o titular
  -- se mudou depois do aceite, a retomada não pode mover o familiar sem uma
  -- declaração de mudança.
  if not (
    v_resumed
    and exists (
      select 1
      from public.locality_memberships m
      where m.user_id = p_accepted_by_user_id
        and m.kind = 'current'
    )
  ) then
    -- A localidade do dependente é a corrente do TITULAR no momento do aceite:
    -- o dependente nunca escolhe a própria localidade. Titular sem localidade
    -- corrente é falha de contrato, e falha aqui desfaz o aceite inteiro.
    select m.locality_id
    into v_locality_id
    from public.locality_memberships m
    where m.user_id = v_holder_user_id
      and m.kind = 'current'
    order by m.joined_at desc
    limit 1;

    if v_locality_id is null then
      raise exception 'the inviting holder has no current locality' using errcode = 'P0005';
    end if;

    -- Quem já está corrente NA localidade do titular não é provisionado de
    -- novo: `provision_member_locality` fecha a corrente antes de inserir a
    -- nova, então repetir moveria a pessoa — e, na mesma localidade, a deixaria
    -- sem corrente nenhuma (o insert conflita e não vira `current`).
    if not exists (
      select 1
      from public.locality_memberships m
      where m.user_id = p_accepted_by_user_id
        and m.locality_id = v_locality_id
        and m.kind = 'current'
    ) then
      perform public.provision_member_locality(p_accepted_by_user_id, v_locality_id);
    end if;
  end if;

  -- O mesmo perfil que a rota de provisionamento grava: nome informado, aceite
  -- na versão que chegou. `consent_version` e `consented_at` só avançam — uma
  -- retomada não rebaixa o que a pessoa já aceitou.
  insert into public.profiles (user_id, display_name, visibility, consent_version, consented_at)
  values (
    p_accepted_by_user_id,
    p_display_name,
    'locality_members'::public.profile_visibility,
    p_consent_version,
    now()
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        visibility = 'locality_members'::public.profile_visibility,
        consent_version = greatest(profiles.consent_version, excluded.consent_version),
        consented_at = coalesce(profiles.consented_at, excluded.consented_at);

  status := 'ok';
  link_id := v_link_id;

  return next;
  return;
end;
$$;

revoke all on function private.family_invite_code_accept(bytea, uuid, bytea, text, integer) from public;
revoke all on function private.family_invite_code_accept(bytea, uuid, bytea, text, integer) from anon;
revoke all on function private.family_invite_code_accept(bytea, uuid, bytea, text, integer) from authenticated;
grant execute on function private.family_invite_code_accept(bytea, uuid, bytea, text, integer) to service_role;

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
  p_origin_digest bytea,
  p_display_name text,
  p_consent_version integer
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
    p_origin_digest,
    p_display_name,
    p_consent_version
  );
$$;

revoke all on function public.family_invite_code_accept(bytea, uuid, bytea, text, integer) from public;
revoke all on function public.family_invite_code_accept(bytea, uuid, bytea, text, integer) from anon;
revoke all on function public.family_invite_code_accept(bytea, uuid, bytea, text, integer) from authenticated;
grant execute on function public.family_invite_code_accept(bytea, uuid, bytea, text, integer) to service_role;

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
