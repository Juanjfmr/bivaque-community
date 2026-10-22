-- Ocultar para mim (ADR-20261022, secao 2).
--
-- O protótipo guardava `hiddenByMe` na própria pergunta, no aparelho. Aqui é o
-- vínculo entre a pessoa e a pergunta: cada par é único, e a linha é só dela.
--
-- Ocultar NÃO é moderação. `recommendation_requests.is_deleted` continua sendo
-- a decisão da operação, que vale para todos; esta tabela vale para uma pessoa
-- e é reversível (apagar a linha mostra de novo). Por isso o caminho de
-- leitura da lista da Comunidade precisa conhecer as duas coisas — o que a
-- moderação escondeu e o que a pessoa ocultou.
--
-- Escopo do ADR: só perguntas. Esconder uma pessoa inteira é o bloqueio, que
-- já existe.

create table public.hidden_questions (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null references public.recommendation_requests (id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

-- O caminho de leitura da lista pergunta por (pessoa, pergunta) na ordem
-- inversa: a PK começa em user_id, então o índice abaixo cobre o NOT EXISTS por
-- pergunta, e o cascade da pergunta também.
create index hidden_questions_request_idx
  on public.hidden_questions (request_id, user_id);

alter table public.hidden_questions enable row level security;
alter table public.hidden_questions force row level security;

-- Mínimo do cliente: ler, criar e apagar as próprias linhas. Sem update — não
-- existe "mudar a data da ocultação", e a ausência de grant é a primeira
-- barreira, antes da policy.
revoke all on table public.hidden_questions from anon, authenticated;

grant select, insert, delete on table public.hidden_questions to authenticated;

create policy hidden_questions_select_own
on public.hidden_questions
for select
to authenticated
using (user_id = (select auth.uid()));

-- Só se oculta o que se consegue ler: a subconsulta roda sob a policy de
-- `recommendation_requests`, então pergunta de outra cidade ou de grupo do qual
-- a pessoa não participa não vira linha. Sem isso, o id de uma pergunta
-- invisível serviria de oráculo de existência.
create policy hidden_questions_insert_own
on public.hidden_questions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.recommendation_requests r
    where r.id = request_id
  )
);

create policy hidden_questions_delete_own
on public.hidden_questions
for delete
to authenticated
using (user_id = (select auth.uid()));
