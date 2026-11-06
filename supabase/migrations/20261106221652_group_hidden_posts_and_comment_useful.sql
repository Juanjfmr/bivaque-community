-- RUN-021: preferências pessoais e Útil no comentário sob a RLS da sessão.
create table public.hidden_posts (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index hidden_posts_post_idx on public.hidden_posts(post_id);
alter table public.hidden_posts enable row level security;
alter table public.hidden_posts force row level security;
revoke all on public.hidden_posts from public, anon, authenticated;
grant select, insert, delete on public.hidden_posts to authenticated;
grant all on public.hidden_posts to service_role;
create policy hidden_posts_select_own on public.hidden_posts for select to authenticated
using (user_id = (select auth.uid()));
create policy hidden_posts_insert_own on public.hidden_posts for insert to authenticated
with check (
  user_id = (select auth.uid())
  and not private.account_deletion_requested((select auth.uid()))
  and exists (
    select 1 from public.posts p where p.id = hidden_posts.post_id
      and not p.is_deleted and private.is_group_member(p.group_id)
  )
);
create policy hidden_posts_delete_own on public.hidden_posts for delete to authenticated
using (user_id = (select auth.uid()));

create table public.comment_reactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);
create index comment_reactions_comment_idx on public.comment_reactions(comment_id);
alter table public.comment_reactions enable row level security;
alter table public.comment_reactions force row level security;
revoke all on public.comment_reactions from public, anon, authenticated;
grant select, insert, delete on public.comment_reactions to authenticated;
grant all on public.comment_reactions to service_role;
create policy comment_reactions_select_visible on public.comment_reactions for select to authenticated
using (exists (
  select 1 from public.comments c join public.posts p on p.id = c.post_id
  where c.id = comment_reactions.comment_id and not c.is_deleted and not p.is_deleted
));
create policy comment_reactions_insert_own on public.comment_reactions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and not public.is_account_suspended((select auth.uid()))
  and not private.account_deletion_requested((select auth.uid()))
  and exists (
    select 1 from public.comments c join public.posts p on p.id = c.post_id
    where c.id = comment_reactions.comment_id and not c.is_deleted and not p.is_deleted
      and private.is_group_member(p.group_id)
      and private.can_write_post_to(p.locality_id, p.community_id, p.group_id)
  )
);
create policy comment_reactions_delete_own on public.comment_reactions for delete to authenticated
using (user_id = (select auth.uid()));

-- A exclusão da conta faz soft delete no Auth: o cascade sozinho não basta.
-- O hook participa da mesma transação em que a purga marca sua conclusão.
create function private.purge_group_preferences()
returns trigger language plpgsql set search_path = '' as $$
begin
  delete from public.hidden_posts where user_id = new.user_id;
  delete from public.comment_reactions where user_id = new.user_id;
  return new;
end;
$$;
revoke all on function private.purge_group_preferences() from public, anon, authenticated;
create trigger purge_group_preferences_after_account
after update of finalized_at on public.account_deletion_requests
for each row when (old.finalized_at is null and new.finalized_at is not null)
execute function private.purge_group_preferences();

-- Mantém a assinatura pública usada pela web antiga. A seleção passa pela RLS,
-- filtra preferências ANTES do range e desempata por id para não repetir a página.
create or replace function public.feed_group(p_group_id uuid, p_order text default 'recent')
returns table (
  id uuid, locality_id uuid, user_id uuid, group_id uuid, post_type public.post_type,
  content text, photo_path text, link_url text, poll_options jsonb, created_at timestamptz,
  comment_count bigint, reaction_count bigint, my_reaction boolean, my_follow boolean,
  display_name text
)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.locality_id, p.user_id, p.group_id, p.post_type, p.content,
    p.photo_path, p.link_url, p.poll_options, p.created_at,
    (select count(*) from public.comments c where c.post_id = p.id and not c.is_deleted),
    (select count(*) from public.post_reactions r where r.post_id = p.id),
    exists (select 1 from public.post_reactions r where r.post_id = p.id and r.user_id = (select auth.uid())),
    exists (select 1 from public.post_follows f where f.post_id = p.id and f.user_id = (select auth.uid())),
    (select pr.display_name from public.profiles pr where pr.user_id = p.user_id
      order by (pr.locality_id = p.locality_id) desc, pr.locality_id limit 1)
  from public.posts p
  join public.groups g on g.id = p.group_id and not g.is_deleted
  where p.group_id = p_group_id and not p.is_deleted
    and case when p_order = 'hidden' then
      exists (select 1 from public.hidden_posts h where h.post_id = p.id and h.user_id = (select auth.uid()))
    else
      not exists (select 1 from public.hidden_posts h where h.post_id = p.id and h.user_id = (select auth.uid()))
    end
    and (p_order <> 'saved' or exists (
      select 1 from public.post_saves s where s.post_id = p.id and s.user_id = (select auth.uid())
    ))
  order by case when p_order = 'discussed' then
    (select count(*) from public.comments c where c.post_id = p.id and not c.is_deleted)
    else 0 end desc,
    p.created_at desc, p.id desc;
$$;
revoke all on function public.feed_group(uuid, text) from public, anon;
grant execute on function public.feed_group(uuid, text) to authenticated;

