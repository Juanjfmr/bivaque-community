-- Salvamento de referência do guia (prancha 12/61: o marcador do topo do guia
-- e a aba Guia em /salvos).
--
-- Mesmo desenho de `recommendation_saves` (20260802001100): o salvamento é do
-- usuário, a leitura é só dele, e o INSERT exige que ele possa VER o alvo —
-- salvar não pode virar caminho para fixar referência de outra cidade nem
-- entrada ainda pendente na fila do operador.
create table public.guide_entry_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_id uuid not null references public.arrival_guide_entries (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);

create index guide_entry_saves_user_idx
  on public.guide_entry_saves (user_id, saved_at desc);

alter table public.guide_entry_saves enable row level security;
alter table public.guide_entry_saves force row level security;

revoke all on table public.guide_entry_saves from public, anon, authenticated;
grant select, insert, delete on table public.guide_entry_saves to authenticated;

-- Cada um vê apenas os próprios salvamentos.
create policy guide_entry_saves_select_own
on public.guide_entry_saves
for select
to authenticated
using (user_id = (select auth.uid()));

-- Só se salva referência aprovada da própria localidade: a mesma condição da
-- policy de leitura de `arrival_guide_entries`, escrita aqui para que o
-- salvamento não dependa da ordem em que as policies são avaliadas.
create policy guide_entry_saves_insert_own
on public.guide_entry_saves
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.arrival_guide_entries entry
    where entry.id = guide_entry_saves.entry_id
      and entry.status = 'approved'
      and private.is_locality_member(entry.locality_id)
  )
);

-- Remover o próprio salvamento é sempre permitido — inclusive de referência
-- que saiu do ar depois, senão o item ficaria preso na lista.
create policy guide_entry_saves_delete_own
on public.guide_entry_saves
for delete
to authenticated
using (user_id = (select auth.uid()));
