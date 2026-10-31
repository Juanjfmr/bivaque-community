-- P3a — o banco responde QUAIS respostas estão devidas, e para na fronteira
-- de despacho.
--
-- Autoridade: docs/decisions/ADR-20260921-curadoria-assistida-do-guia.md
-- (aprovado pelo dono em 21/09/2026; R3 pela regra operável da RISK_MATRIX, que
-- torna R3 qualquer mudança que toque supabase/migrations). Card:
-- GUIA-RESPOSTA-CANDIDATA.
--
-- O que esta migration entrega:
--   1. o índice único PARCIAL em arrival_guide_entries.source_reply_id que o
--      comentário de 20260821000006:16-17 afirmava existir e não existia;
--   2. as funções `private.guide_candidate_*` — seleção das respostas devidas
--      por sinal de qualidade, teto por localidade, piso de confidence, dedup
--      contra o Guia da localidade antes de qualquer escrita, e a gravação
--      `pending` com source='ai', confidence e source_reply_id;
--   3. o nono job do padrão `bivaque-*`.
--
-- FRONTEIRA — o P3a termina aqui. Nada nesta migration chama a IA, não lê o
-- Vault e não faz `net.http_post`: o endpoint interno do Next e a perna de IA
-- são o P3b e não existem ainda. A função agendada PREPARA (seleciona as
-- elegíveis, aplica o teto por localidade e monta o payload mínimo do despacho)
-- e para. O dono do banco é "quais respostas estão devidas"; o dono do endpoint
-- é o P3b.
--
-- Nenhuma tabela nova: `arrival_guide_entries` já tem `status`, `source`,
-- `confidence` e `source_reply_id` (20260815210000:6-19). A fila do operador é
-- a própria tabela, e criar uma segunda seria duplicar o estado da curadoria.

-- ── 1. índice único parcial em source_reply_id ─────────────────────────────
--
-- Parcial porque a coluna é anulável e quase todas as linhas do Guia não vêm de
-- resposta (`source_reply_id is null`); o parcial é menor e deixa explícito no
-- catálogo que o vínculo é opcional. Sem ele, o job e a promoção manual pelo
-- operador (`promote_reply_to_guide_entry`) podem gravar duas entradas para a
-- mesma resposta e `Ver no Guia` fica ambíguo.

create unique index arrival_guide_entries_source_reply_id_key
  on public.arrival_guide_entries (source_reply_id)
  where source_reply_id is not null;

-- ── 2. os dois parâmetros, com default sensato ──────────────────────────────
--
-- São funções SQL, e não constantes no corpo das outras, pelo mesmo motivo do
-- worker do outbox: pgTAP prova o número que está valendo e o default de cada
-- chamada aparece no catálogo.

-- Teto por localidade por execução. A pressão de fila saiu do membro (decisão
-- 1) e não pode voltar pela máquina em escala maior (decisão 7): dez candidatas
-- novas por cidade por execução é o que uma revisão humana julga de uma vez.
create function private.guide_candidate_max_per_locality()
returns integer
language sql
stable
set search_path = ''
as $$
  select 10::integer;
$$;

-- Piso de confidence abaixo do qual nada entra na fila (decisão 7). Abaixo
-- disso a candidata é ruído: custa ao operador o mesmo tempo para recusar e
-- empurra a fila humana para carimbo.
create function private.guide_candidate_min_confidence()
returns smallint
language sql
stable
set search_path = ''
as $$
  select 60::smallint;
$$;

-- Chave de comparação de nome de lugar. Sem dependência nova — `unaccent` não
-- está instalado neste banco e instalar extensão para comparar nome de
-- transportadora é caro demais: minúsculas, acentos do português dobrados e
-- espaços colapsados resolvem "Colégio X" / "colegio  x".
create function private.guide_candidate_name_key(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    pg_catalog.regexp_replace(
      pg_catalog.translate(
        pg_catalog.lower(pg_catalog.btrim(coalesce(p_name, ''))),
        'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
        'aaaaaaeeeeiiiiooooouuuucnyy'
      ),
      '\s+', ' ', 'g'
    ),
    ''
  );
$$;

-- A dedup contra o Guia da localidade, ANTES de qualquer escrita (decisão 3:
-- "deduplica contra o Guia daquela localidade antes de escrever"). "Corresponde"
-- é o mesmo nome normalizado na mesma localidade, em QUALQUER status: uma
-- candidata pendente idêntica também é duplicata, e entrada já aprovada torna a
-- candidata inútil. A categoria NÃO entra na chave de propósito — a mesma
-- transportadora sob outra categoria seria o mesmo lugar duas vezes, que é
-- exatamente a fila de máquina que a decisão 7 evita.
create function private.guide_candidate_locality_has_name(
  p_locality_id uuid,
  p_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.arrival_guide_entries entry
    where entry.locality_id = p_locality_id
      and private.guide_candidate_name_key(entry.name)
          = private.guide_candidate_name_key(p_name)
  );
$$;

-- ── 3. seleção das respostas devidas ──────────────────────────────────────
--
-- O sinal de qualidade começa por `recommendation_requests.resolved_reply_id`
-- (decisão 3): é a resposta que a própria autora da pergunta marcou como a que
-- resolveu, e é o sinal mais forte que o produto já coleta (ADR-20260909,
-- aprovado). O trigger `validate_recommendation_resolved_reply`
-- (20260911025357) já garante que a marca aponta para resposta DESTA pergunta e
-- não apagada, então a junção não revalida isso.
--
-- Ficam de fora:
--   - resposta que já tem entrada vinculada — cobre os DOIS caminhos: a
--     candidata gravada por esta migration e a promoção manual do operador, que
--     grava `source_reply_id` do mesmo jeito;
--   - resposta apagada ou pedido sem localidade (escopo de grupo não tem Guia:
--     o Guia é da cidade);
--   - o que passar do teto por localidade NESTA execução.
create function private.guide_candidate_select_due(
  p_max_per_locality integer default private.guide_candidate_max_per_locality()
)
returns table (
  reply_id uuid,
  request_id uuid,
  locality_id uuid,
  request_category public.recommendation_category,
  body text,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as (
    select
      reply.id as reply_id,
      request.id as request_id,
      request.locality_id as locality_id,
      request.category as request_category,
      reply.body as body,
      request.resolved_at as resolved_at,
      row_number() over (
        partition by request.locality_id
        order by request.resolved_at desc nulls last,
                 reply.created_at desc,
                 reply.id
      ) as locality_rank
    from public.recommendation_requests request
    join public.recommendation_replies reply
      on reply.id = request.resolved_reply_id
     and reply.is_deleted = false
    where request.resolved_reply_id is not null
      and request.locality_id is not null
      and not exists (
        select 1
        from public.arrival_guide_entries entry
        where entry.source_reply_id = reply.id
      )
  )
  select
    eligible.reply_id,
    eligible.request_id,
    eligible.locality_id,
    eligible.request_category,
    eligible.body,
    eligible.resolved_at
  from eligible
  where eligible.locality_rank <= greatest(p_max_per_locality, 0)
  order by eligible.locality_id, eligible.locality_rank;
$$;

-- ── 4. a gravação da candidata — o único escritor da fila ─────────────────
--
-- Função chamável e provada por pgTAP com uma extração SINTÉTICA: ela não fala
-- com modelo nenhum e não depende de chave de provedor. Quem chama em produção
-- é o P3b, com o resultado da extração.
--
-- Devolve o id da entrada criada, ou null quando NADA foi escrito. As razões de
-- não escrever, nesta ordem:
--   1. a resposta não é (ou não é mais) resposta marcada como resolvida, ou o
--      pedido não tem localidade — erro P0002, porque é chamada errada;
--   2. `confidence` ausente ou abaixo do piso — decisão 7;
--   3. já existe entrada para ESTA resposta — nada a escrever, e a chamada
--      repetida é idempotente;
--   4. já existe entrada naquela localidade com o mesmo nome normalizado —
--      dedup ANTES da escrita, nunca dentro da fila.
-- A barreira contra duas entradas para a mesma resposta também vive na tabela,
-- no índice único parcial da seção 1: uma checagem só na função seria esquecida
-- pelo próximo chamador.
create function private.guide_candidate_enqueue(
  p_reply_id uuid,
  p_category public.arrival_guide_category,
  p_name text,
  p_description text,
  p_confidence smallint,
  p_min_confidence smallint default private.guide_candidate_min_confidence()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locality_id uuid;
  v_name text := pg_catalog.btrim(coalesce(p_name, ''));
  v_description text := pg_catalog.btrim(coalesce(p_description, ''));
  v_entry_id uuid;
begin
  select request.locality_id
    into v_locality_id
    from public.recommendation_requests request
    join public.recommendation_replies reply
      on reply.id = request.resolved_reply_id
     and reply.is_deleted = false
   where request.resolved_reply_id = p_reply_id
     and request.locality_id is not null
   limit 1;

  if v_locality_id is null then
    raise exception 'reply is not a resolved reply of a locality request'
      using errcode = 'P0002';
  end if;

  -- Piso de confidence (decisão 7). Sem confidence não há sinal de qualidade,
  -- então também não entra.
  if p_confidence is null or p_confidence < p_min_confidence then
    return null;
  end if;

  if char_length(v_name) not between 2 and 120 then
    raise exception 'guide candidate name must have between 2 and 120 characters'
      using errcode = '22023';
  end if;

  if char_length(v_description) > 500 then
    raise exception 'guide candidate description must have up to 500 characters'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.arrival_guide_entries entry
    where entry.source_reply_id = p_reply_id
  ) then
    return null;
  end if;

  if private.guide_candidate_locality_has_name(v_locality_id, v_name) then
    return null;
  end if;

  insert into public.arrival_guide_entries (
    locality_id,
    category,
    name,
    description,
    status,
    source,
    confidence,
    source_reply_id
  )
  values (
    v_locality_id,
    p_category,
    v_name,
    v_description,
    'pending',
    'ai',
    p_confidence,
    p_reply_id
  )
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

-- ── 5. a função agendada: prepara e PARA na fronteira de despacho ───────────
--
-- Nono job do padrão `bivaque-*`, igual em forma ao worker do outbox
-- (20260814174705): `pg_cron` manda, o banco prepara as linhas devidas e a
-- aplicação é dona do adaptador. A DIFERENÇA — e a fronteira do P3a — é que
-- aqui NÃO há `net.http_post`, NÃO há leitura do Vault e NÃO há chave de
-- provedor: o endpoint interno do Next não existe ainda (P3b).
--
-- O que ela entrega é o payload MÍNIMO do despacho, já com o teto por
-- localidade aplicado: `reply_id`, `locality_id` e o corpo da resposta — que é
-- o que a extração usa. **Nunca `author_id`** (decisão 6: não há razão para
-- mandar identidade junto de um trabalho que não a usa).
--
-- O P3b troca o comando do job por um `net.http_post` que:
--   1. lê endpoint e segredo do Vault;
--   2. posta este payload no endpoint interno;
--   3. recebe de volta nome, categoria e confidence;
--   4. chama `private.guide_candidate_enqueue(...)`, que é onde o piso de
--      confidence e a dedup são aplicados e o único caminho de escrita.
create function private.guide_candidate_prepare(
  p_max_per_locality integer default private.guide_candidate_max_per_locality()
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'reply_id', due.reply_id,
        'locality_id', due.locality_id,
        'body', due.body
      )
      order by due.locality_id, due.reply_id
    ),
    '[]'::jsonb
  )
  from private.guide_candidate_select_due(p_max_per_locality) as due;
$$;

revoke all on function private.guide_candidate_max_per_locality() from public;
revoke all on function private.guide_candidate_min_confidence() from public;
revoke all on function private.guide_candidate_name_key(text) from public;
revoke all on function private.guide_candidate_locality_has_name(uuid, text) from public;
revoke all on function private.guide_candidate_select_due(integer) from public;
revoke all on function private.guide_candidate_enqueue(
  uuid, public.arrival_guide_category, text, text, smallint, smallint
) from public;
revoke all on function private.guide_candidate_prepare(integer) from public;

-- Cron é dono do agendamento; a função é `private` e não é exposta à Data API.
-- Diário às 05:00 UTC: horário livre entre os oito jobs existentes (03:00,
-- 04:00, 06:00, 12:00, os de minuto e os de */5 e */15).
select cron.schedule(
  'bivaque-guide-candidate-prepare',
  '0 5 * * *',
  'select private.guide_candidate_prepare()'
);