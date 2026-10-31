-- Onda E — curadoria do guia de chegada.
-- A leitura pública continua sendo a dos membros da localidade, mas só enxerga
-- itens aprovados. As sugestões pendentes/rejeitadas vivem na mesma tabela e
-- são revisadas pelo operador com service_role.

alter table public.arrival_guide_entries
  add column status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  add column source text not null default 'manual'
    check (source in ('manual', 'ai')),
  add column source_reply_id uuid
    references public.recommendation_replies (id) on delete set null,
  add column confidence smallint
    check (confidence is null or confidence between 0 and 100),
  add column reviewed_by uuid
    references auth.users (id) on delete set null,
  add column reviewed_at timestamptz,
  add column review_note text
    check (review_note is null or char_length(review_note) <= 500);

create index arrival_guide_entries_status_idx
  on public.arrival_guide_entries (status, created_at);

drop policy arrival_guide_select_locality_member
  on public.arrival_guide_entries;

create policy arrival_guide_select_approved_locality_member
on public.arrival_guide_entries
for select
to authenticated
using (
  private.is_locality_member(locality_id)
  and status = 'approved'
);
