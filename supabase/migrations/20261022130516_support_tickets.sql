-- Chamados de ajuda (ADR-20261022, secao 3).
--
-- O Next mandava a Ajuda por e-mail, sem registro: a pessoa não acompanhava o
-- que pediu e a operação não tinha fila. Aqui nasce o registro.
--
-- A tabela não é do cliente. `authenticated` lê só as próprias linhas e só as
-- colunas do titular (`answered_by` fica fora do grant) e NÃO tem insert, update
-- nem delete: abrir e responder passam por função (`open_support_ticket` e
-- `answer_support_ticket`, na migration seguinte). A ausência de grant é a
-- primeira barreira; a policy de select é a segunda.
--
-- O ADR deixa de fora, de propósito: número de protocolo, anexos e conversa
-- dentro do chamado.

create type public.support_ticket_topic as enum (
  'conta',
  'comunidade',
  'anuncios',
  'seguranca',
  'outro'
);

create type public.support_ticket_status as enum ('open', 'answered');

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  -- Obrigatório: só quem tem conta abre chamado (decisão do dono em
  -- 22/10/2026, que diverge do protótipo). Quem está fora usa o e-mail de
  -- contato da Ajuda.
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Cópia do e-mail da conta no momento da abertura. Fica aqui porque a
  -- operação responde por e-mail e porque o endereço pode mudar na conta
  -- depois; a resposta sai para o endereço do chamado.
  email text not null check (
    char_length(email) between 3 and 320
    and position('@' in email) > 1
  ),
  topic public.support_ticket_topic not null,
  body text not null check (char_length(body) between 10 and 1000),
  status public.support_ticket_status not null default 'open',
  reply text check (reply is null or char_length(reply) between 1 and 4000),
  -- Quem respondeu. `on delete set null` de propósito: a resposta continua
  -- válida se a conta da operação for apagada, e a identidade de quem modera
  -- não vira dado permanente de outra pessoa.
  answered_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  -- Situação e conteúdo não podem divergir: um chamado respondido tem resposta
  -- e data; um aberto não tem nenhuma das duas. Sem isso, "Em andamento" com
  -- resposta dentro (ou o contrário) seria um estado representável.
  constraint support_tickets_answered_consistency check (
    (
      status = 'open'
      and reply is null
      and answered_at is null
      and answered_by is null
    )
    or (
      status = 'answered'
      and reply is not null
      and answered_at is not null
    )
  )
);

-- "Meus chamados": as linhas da pessoa, da mais nova para a mais antiga.
create index support_tickets_user_created_idx
  on public.support_tickets (user_id, created_at desc);

-- O limite de abertura conta só os abertos de uma pessoa; o índice parcial é o
-- que essa contagem usa.
create index support_tickets_user_open_idx
  on public.support_tickets (user_id)
  where status = 'open';

alter table public.support_tickets enable row level security;
alter table public.support_tickets force row level security;

revoke all on table public.support_tickets from anon, authenticated;

-- Leitura do dono, por COLUNA. `answered_by` fica de fora de propósito: a
-- identidade de quem responde é da operação e não vira dado de outra pessoa
-- (mesma regra de `report_resolved` em deep-links.ts). Um grant da tabela
-- inteira entregaria essa coluna em qualquer `select *` do titular; com grant
-- por coluna, ela exige um privilégio que o cliente não tem.
-- Escrita não existe para o cliente: as funções da migration seguinte são
-- SECURITY DEFINER e são o único caminho de criação e resposta.
grant select (
  id,
  user_id,
  email,
  topic,
  body,
  status,
  reply,
  created_at,
  answered_at
) on table public.support_tickets to authenticated;

-- A operação lê pela função de resposta; ainda assim, service_role precisa ler
-- a tabela para uma eventual conferência administrativa. Escrita continua fora:
-- responder é a função, não um UPDATE solto.
revoke all on table public.support_tickets from service_role;

grant select on table public.support_tickets to service_role;

create policy support_tickets_select_own
on public.support_tickets
for select
to authenticated
using (user_id = (select auth.uid()));
