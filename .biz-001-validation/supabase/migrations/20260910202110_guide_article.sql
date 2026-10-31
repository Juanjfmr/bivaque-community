-- RECON-030 / ADR-20260909-guia-artigo-estruturado (R3, aprovado 09/09/2026).
--
-- O artigo do Guia (prancha 25) ESTENDE a entrada de diretório que já existe
-- (public.arrival_guide_entries, migrations 20260815181708 e 20260815210000).
-- Não cria uma segunda superfície de guia: `guide_articles.entry_id` é a chave
-- para a entrada curada, e a rota continua sendo /guide/[id] com o mesmo id.
-- `arrival_guide_entries` permanece a descoberta por categoria da prancha 12.
--
-- O corpo é texto simples por seção, nunca HTML enviado pela curadoria (D2).
-- O índice "Neste guia" é derivado das seções (position + anchor), não é um
-- campo paralelo que pode divergir do corpo.
--
-- Decisão de curadoria é operação (service_role): membro sugere, curadoria
-- aplica/rejeita por função que registra a versão publicada anterior em
-- guide_article_revisions. Enviar sugestão nunca publica (D4).
--
-- Esta migration é APENAS o schema + as funções. A prova de banco (pgTAP e
-- test:db) roda em supabase/tests/guide-article.sql, em banco SEM seed.

-- ── artigo: a extensão editorial de uma entrada do diretório ────────────────

create table public.guide_articles (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null unique
    references public.arrival_guide_entries (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  subtitle text check (subtitle is null or char_length(subtitle) <= 200),
  cover_image_url text
    check (
      cover_image_url is null
      or cover_image_url ~ '^(https?://|/)[^[:space:]]+$'
    ),
  summary text check (summary is null or char_length(summary) <= 1000),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'withdrawn')),
  curated_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guide_articles_status_idx
  on public.guide_articles (status, reviewed_at desc);

-- ── seções do artigo: o corpo e a fonte do índice ───────────────────────────

create table public.guide_article_sections (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null
    references public.guide_articles (id) on delete cascade,
  position int not null check (position >= 0),
  anchor text not null
    check (anchor ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' and char_length(anchor) <= 80),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (article_id, position),
  unique (article_id, anchor)
);

create index guide_article_sections_article_idx
  on public.guide_article_sections (article_id, position);

-- ── versão publicada anterior a cada correção aplicada ──────────────────────

create table public.guide_article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null
    references public.guide_articles (id) on delete cascade,
  snapshot jsonb not null,
  revised_by uuid references auth.users (id) on delete set null,
  revised_at timestamptz not null default now()
);

create index guide_article_revisions_article_idx
  on public.guide_article_revisions (article_id, revised_at desc);

-- ── sugestão de correção: recebe, decide, devolve ───────────────────────────

create table public.guide_correction_requests (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null
    references public.guide_articles (id) on delete cascade,
  section_id uuid
    references public.guide_article_sections (id) on delete set null,
  requester_id uuid not null references auth.users (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 2000),
  reference_text text
    check (reference_text is null or char_length(reference_text) <= 500),
  status text not null default 'received'
    check (status in ('received', 'in_review', 'applied', 'rejected')),
  decision_note text
    check (decision_note is null or char_length(decision_note) <= 1000),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guide_correction_requests_article_status_idx
  on public.guide_correction_requests (article_id, status, created_at);
create index guide_correction_requests_requester_idx
  on public.guide_correction_requests (requester_id, created_at desc);

-- ── RLS + grants ────────────────────────────────────────────────────────────
--
-- Leitura do membro: artigo publicado cuja entrada está aprovada e cuja
-- localidade é a do membro. A subconsulta em arrival_guide_entries também é
-- filtrada pela RLS dela (aprovado + membro) — defesa em profundidade.
-- Escrita de membro existe só em guide_correction_requests (sugerir).
-- A decisão é função service_role; revisões não são leitura de membro.

alter table public.guide_articles enable row level security;
alter table public.guide_articles force row level security;
alter table public.guide_article_sections enable row level security;
alter table public.guide_article_sections force row level security;
alter table public.guide_article_revisions enable row level security;
alter table public.guide_article_revisions force row level security;
alter table public.guide_correction_requests enable row level security;
alter table public.guide_correction_requests force row level security;

revoke all on table public.guide_articles from anon, authenticated;
revoke all on table public.guide_article_sections from anon, authenticated;
revoke all on table public.guide_article_revisions from anon, authenticated;
revoke all on table public.guide_correction_requests from anon, authenticated;

grant select on table public.guide_articles to authenticated;
grant select on table public.guide_article_sections to authenticated;
grant select, insert on table public.guide_correction_requests to authenticated;
grant all on table public.guide_articles to service_role;
grant all on table public.guide_article_sections to service_role;
grant all on table public.guide_article_revisions to service_role;
grant all on table public.guide_correction_requests to service_role;

create policy guide_articles_select_published_locality_member
on public.guide_articles
for select
to authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.arrival_guide_entries e
    where e.id = public.guide_articles.entry_id
      and e.status = 'approved'
      and private.is_locality_member(e.locality_id)
  )
);

create policy guide_article_sections_select_published_locality_member
on public.guide_article_sections
for select
to authenticated
using (
  exists (
    select 1
    from public.guide_articles a
    join public.arrival_guide_entries e on e.id = a.entry_id
    where a.id = public.guide_article_sections.article_id
      and a.status = 'published'
      and e.status = 'approved'
      and private.is_locality_member(e.locality_id)
  )
);

create policy guide_correction_requests_select_own
on public.guide_correction_requests
for select
to authenticated
using (requester_id = (select auth.uid()));

-- Sugerir: o solicitante é a sessão, o artigo está publicado, a entrada está
-- aprovada, a localidade é a do solicitante, e a seção (quando indicada)
-- pertence ao artigo. Nada disso publica: a decisão é humana (D4).
create policy guide_correction_requests_insert_own
on public.guide_correction_requests
for insert
to authenticated
with check (
  requester_id = (select auth.uid())
  and exists (
    select 1
    from public.guide_articles a
    join public.arrival_guide_entries e on e.id = a.entry_id
    where a.id = public.guide_correction_requests.article_id
      and a.status = 'published'
      and e.status = 'approved'
      and private.is_locality_member(e.locality_id)
  )
  and (
    section_id is null
    or exists (
      select 1
      from public.guide_article_sections s
      where s.id = public.guide_correction_requests.section_id
        and s.article_id = public.guide_correction_requests.article_id
    )
  )
);

-- ── decisão da curadoria (service_role) ─────────────────────────────────────
--
-- As duas funções são o único caminho que muda o artigo a partir de uma
-- sugestão. Aplicar registra a versão publicada ANTERIOR em
-- guide_article_revisions antes de alterar; rejeitar exige justificativa.
-- Ambas validam o operador com o mesmo gate da fila (is_current_user_operator).
-- Nenhum valor de enum novo é usado aqui — não há a armadilha de
-- "unsafe use of new value of enum type" desta migration.

create function public.apply_guide_correction(
  p_request_id uuid,
  p_operator_user_id uuid,
  p_note text,
  p_section_title text,
  p_section_body text,
  p_summary text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.guide_correction_requests;
  v_article public.guide_articles;
begin
  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators can decide guide corrections' using errcode = '42501';
  end if;

  select * into v_request
  from public.guide_correction_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'correction request not found' using errcode = 'P0002';
  end if;

  if v_request.status not in ('received', 'in_review') then
    raise exception 'correction request already decided' using errcode = '55000';
  end if;

  select * into v_article
  from public.guide_articles
  where id = v_request.article_id
  for update;

  if not found then
    raise exception 'guide article not found' using errcode = 'P0002';
  end if;

  insert into public.guide_article_revisions (article_id, snapshot, revised_by)
  values (
    v_article.id,
    jsonb_build_object(
      'title', v_article.title,
      'subtitle', v_article.subtitle,
      'cover_image_url', v_article.cover_image_url,
      'summary', v_article.summary,
      'reviewed_at', v_article.reviewed_at,
      'sections', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'position', s.position,
            'anchor', s.anchor,
            'title', s.title,
            'body', s.body
          )
          order by s.position
        )
        from public.guide_article_sections s
        where s.article_id = v_article.id
      ), '[]'::jsonb)
    ),
    p_operator_user_id
  );

  if v_request.section_id is not null and p_section_body is not null then
    update public.guide_article_sections
    set title = coalesce(nullif(btrim(p_section_title), ''), title),
        body = p_section_body,
        updated_at = now()
    where id = v_request.section_id
      and article_id = v_article.id;
  elsif p_summary is not null then
    update public.guide_articles
    set summary = p_summary,
        updated_at = now()
    where id = v_article.id;
  end if;

  update public.guide_articles
  set reviewed_at = now(),
      curated_by = p_operator_user_id,
      updated_at = now()
  where id = v_article.id;

  update public.guide_correction_requests
  set status = 'applied',
      decision_note = p_note,
      decided_by = p_operator_user_id,
      decided_at = now(),
      updated_at = now()
  where id = p_request_id;
end;
$$;

create function public.reject_guide_correction(
  p_request_id uuid,
  p_operator_user_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.guide_correction_requests;
begin
  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators can decide guide corrections' using errcode = '42501';
  end if;

  if p_note is null or btrim(p_note) = '' then
    raise exception 'a justification is required to reject' using errcode = '22023';
  end if;

  select * into v_request
  from public.guide_correction_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'correction request not found' using errcode = 'P0002';
  end if;

  if v_request.status not in ('received', 'in_review') then
    raise exception 'correction request already decided' using errcode = '55000';
  end if;

  update public.guide_correction_requests
  set status = 'rejected',
      decision_note = p_note,
      decided_by = p_operator_user_id,
      decided_at = now(),
      updated_at = now()
  where id = p_request_id;
end;
$$;

revoke all on function public.apply_guide_correction(
  uuid, uuid, text, text, text, text
) from public;
revoke all on function public.apply_guide_correction(
  uuid, uuid, text, text, text, text
) from anon;
revoke all on function public.apply_guide_correction(
  uuid, uuid, text, text, text, text
) from authenticated;
grant execute on function public.apply_guide_correction(
  uuid, uuid, text, text, text, text
) to service_role;

revoke all on function public.reject_guide_correction(uuid, uuid, text) from public;
revoke all on function public.reject_guide_correction(uuid, uuid, text) from anon;
revoke all on function public.reject_guide_correction(uuid, uuid, text) from authenticated;
grant execute on function public.reject_guide_correction(uuid, uuid, text) to service_role;
