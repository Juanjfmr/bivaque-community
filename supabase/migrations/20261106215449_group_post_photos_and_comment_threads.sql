-- RUN-021 / ADR-20261101: quatro fotos por publicação e respostas em um nível.
-- Colunas aditivas: a primeira foto continua em photo_path para os leitores antigos.
alter table public.posts add column photo_paths text[] not null default '{}'
  check (cardinality(photo_paths) <= 4 and array_position(photo_paths, null) is null);

create function private.guard_group_post_photos()
returns trigger language plpgsql set search_path = '' as $$
declare v_path text;
begin
  if cardinality(new.photo_paths) > 0 then
    foreach v_path in array new.photo_paths loop
      if v_path not like new.user_id::text || '/%'
        or v_path like '%..%' or v_path like '%//%' or position(chr(92) in v_path) > 0 then
        raise exception 'invalid photo path' using errcode = '23514';
      end if;
    end loop;
    new.photo_path := new.photo_paths[1];
    if new.post_type <> 'photo' then
      raise exception 'photos require photo type' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_group_post_photos() from public, anon, authenticated;
create trigger group_post_photos_guard
before insert or update of photo_paths, photo_path, user_id, post_type on public.posts
for each row execute function private.guard_group_post_photos();

-- A subconsulta passa pela RLS de posts: grupo fechado continua reservado.
alter policy event_photos_select_scoped on storage.objects
using (
  bucket_id = 'event-photos'
  and exists (
    select 1 from public.posts p
    where not p.is_deleted
      and (p.photo_path = storage.objects.name or storage.objects.name = any(p.photo_paths))
  )
);

alter table public.comments
  add column parent_id uuid references public.comments(id) on delete set null,
  add column reply_to_id uuid references public.comments(id) on delete set null;

create index comments_parent_created_idx on public.comments(parent_id, created_at, id)
where parent_id is not null;
create index comments_reply_to_idx on public.comments(reply_to_id) where reply_to_id is not null;
create index comments_post_created_idx on public.comments(post_id, created_at, id);

-- As colunas antigas mant?m os grants; s? a cria??o pode escolher o fio.
revoke update on public.comments from authenticated;
grant update (id, post_id, user_id, content, created_at, is_deleted) on public.comments to authenticated;

create function private.guard_group_comment_thread()
returns trigger language plpgsql set search_path = '' as $$
declare v_target public.comments;
begin
  if tg_op = 'UPDATE' then
    if new.post_id is distinct from old.post_id then
      raise exception 'comment thread is immutable' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.reply_to_id is null then
    if new.parent_id is not null then
      raise exception 'reply target required' using errcode = '23514';
    end if;
    return new;
  end if;
  -- SECURITY INVOKER: alvo invisível pela RLS não pode originar uma resposta.
  select * into v_target from public.comments
  where id = new.reply_to_id and post_id = new.post_id and not is_deleted;
  if not found or v_target.id = new.id then
    raise exception 'invalid reply target' using errcode = '23514';
  end if;
  new.parent_id := coalesce(v_target.parent_id, v_target.id);
  return new;
end;
$$;
revoke all on function private.guard_group_comment_thread() from public, anon, authenticated;
create trigger group_comment_thread_guard
before insert or update of post_id, parent_id, reply_to_id on public.comments
for each row execute function private.guard_group_comment_thread();

