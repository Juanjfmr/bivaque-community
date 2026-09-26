-- Onda F — fecha o ciclo de indicação no banco.
-- group_id ganha FK real e o escopo passa a ser validado por membership;
-- respostas ganham edição/exclusão pelo autor.

alter table public.recommendation_requests
  drop constraint if exists recommendation_requests_group_id_fkey;

alter table public.recommendation_requests
  add constraint recommendation_requests_group_id_fkey
  foreign key (group_id) references public.groups (id) on delete cascade;

grant update, delete on table public.recommendation_replies to authenticated;

drop policy if exists recommendation_requests_select_locality
  on public.recommendation_requests;
drop policy if exists recommendation_requests_insert_locality
  on public.recommendation_requests;
drop policy if exists recommendation_replies_select
  on public.recommendation_replies;
drop policy if exists recommendation_replies_insert
  on public.recommendation_replies;

create policy recommendation_requests_select_locality
on public.recommendation_requests
for select
to authenticated
using (
  author_id = (select auth.uid())
  or (
    locality_id is not null
    and private.can_see_locality_recommendation(locality_id)
  )
  or (
    group_id is not null
    and private.is_group_member(group_id)
  )
);

create policy recommendation_requests_insert_locality
on public.recommendation_requests
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and (
    (
      locality_id is not null
      and group_id is null
      and private.is_locality_member(locality_id)
    )
    or (
      locality_id is null
      and group_id is not null
      and private.is_group_member(group_id)
    )
  )
);

create policy recommendation_replies_select
on public.recommendation_replies
for select
to authenticated
using (
  author_id = (select auth.uid())
  or exists (
    select 1
    from public.recommendation_requests req
    where req.id = recommendation_replies.request_id
      and (
        (
          req.locality_id is not null
          and private.can_see_locality_recommendation(req.locality_id)
        )
        or (
          req.group_id is not null
          and private.is_group_member(req.group_id)
        )
      )
  )
);

create policy recommendation_replies_insert
on public.recommendation_replies
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.recommendation_requests req
    where req.id = recommendation_replies.request_id
      and (
        (
          req.locality_id is not null
          and private.can_see_locality_recommendation(req.locality_id)
        )
        or (
          req.group_id is not null
          and private.is_group_member(req.group_id)
        )
      )
  )
);

create policy recommendation_replies_update_own
on public.recommendation_replies
for update
to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy recommendation_replies_delete_own
on public.recommendation_replies
for delete
to authenticated
using (author_id = (select auth.uid()));
