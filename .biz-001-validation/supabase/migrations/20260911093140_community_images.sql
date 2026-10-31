-- RECON-034 — faixa e miniatura da comunidade (pranchas 42 e 43).
--
-- O ADR-20260909-midia-de-membro fixa o contrato e esta migration o aplica por
-- inteiro, com a coluna de escopo e as policies que a leem no MESMO arquivo
-- (regra do AGENTS.md — foi a separação entre elas que produziu quatro
-- vazamentos de privacidade nesta base):
--
--   D1  bucket privado `community-images`, 10 MB, jpeg/png/webp;
--   D2  quem enxerga a comunidade lê a imagem dela — a leitura repete o
--       predicado de `communities` (membro da localidade) E exige que o objeto
--       seja o banner/miniatura ATUAL da linha, de modo que limpar o caminho
--       torna o objeto inalcançável na mesma operação, sem depender de expurgo;
--   D3  só o dono (`communities.owner_user_id`) envia, troca e remove;
--   D4  um banner e uma miniatura;
--   D5  EXIF é removido na entrada — o compositor reencoda no canvas antes de
--       enviar (mesmo caminho de `upload-photo-action.ts`) e o servidor
--       revalida tipo/tamanho.
--
-- `communities` não tinha coluna de imagem (baseline RECON-034). As colunas
-- entram nullable: comunidade sem imagem é estado real, não erro.

alter table public.communities
  add column if not exists banner_path text,
  add column if not exists thumbnail_path text;

alter table public.communities
  add constraint communities_banner_path_length
    check (banner_path is null or char_length(banner_path) between 1 and 500),
  add constraint communities_thumbnail_path_length
    check (thumbnail_path is null or char_length(thumbnail_path) between 1 and 500);

-- ── Bucket ────────────────────────────────────────────────────────────────
--
-- `on conflict do update` mantém a definição idempotente sem derrubar um bucket
-- que já exista. Nunca público: a URL assinada é emitida pelo servidor depois
-- de checar o acesso ao recurso (D2).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-images',
  'community-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- O caminho do objeto começa pelo id da comunidade: `<community_id>/banner`.
-- D2 e D3 são decididos a partir do primeiro segmento do nome.

-- ── Helper de escrita (security definer: a policy não pode reler a tabela sob
--    a RLS do chamador, que é justamente a cerca que ela impõe) ────────────
create function private.is_community_image_owner(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.communities
    where id::text = split_part(p_path, '/', 1)
      and owner_user_id = (select auth.uid())
      and is_deleted = false
  );
$$;

revoke all on function private.is_community_image_owner(text) from public;
revoke all on function private.is_community_image_owner(text) from anon;
revoke all on function private.is_community_image_owner(text) from authenticated;
grant execute on function private.is_community_image_owner(text) to authenticated;

-- ── Leitura: derivada do acesso ao recurso (D2) ───────────────────────────
--
-- Só o objeto que a comunidade referencia HOJE é legível. Objeto órfão — upload
-- interrompido, arquivo antigo depois da troca — não é alcançável pela policy,
-- mesmo que ainda exista no bucket.
create policy community_images_select_reachable
on storage.objects
for select
to authenticated
using (
  bucket_id = 'community-images'
  and exists (
    select 1
    from public.communities c
    where c.is_deleted = false
      and (
        c.banner_path = storage.objects.name
        or c.thumbnail_path = storage.objects.name
      )
      and private.is_locality_member(c.locality_id)
  )
);

-- ── Escrita: só o dono, e só dentro da própria pasta de comunidade (D3) ────
create policy community_images_insert_owner
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'community-images'
  and owner = (select auth.uid())
  and private.is_community_image_owner(name)
);

create policy community_images_update_owner
on storage.objects
for update
to authenticated
using (
  bucket_id = 'community-images'
  and owner = (select auth.uid())
  and private.is_community_image_owner(name)
)
with check (
  bucket_id = 'community-images'
  and owner = (select auth.uid())
  and private.is_community_image_owner(name)
);

create policy community_images_delete_owner
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'community-images'
  and owner = (select auth.uid())
  and private.is_community_image_owner(name)
);

-- ── Escrita da coluna: RPC com o chamador explícito ────────────────────────
--
-- O server action fala com o banco por `service_role` (que não carrega JWT do
-- humano) e passa `p_caller_user_id` resolvido do contexto autenticado. A RPC
-- REVALIDA a posse no banco — a lição registrada em supabase/AGENTS.md:
-- service_role é privilégio, não identidade de chamador.
create function public.set_community_image(
  p_community_id uuid,
  p_kind text,
  p_path text,
  p_caller_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_community_id text := p_community_id::text;
begin
  if p_kind not in ('banner', 'thumbnail') then
    raise exception 'invalid community image kind' using errcode = '22023';
  end if;

  -- O caminho tem que viver na pasta da própria comunidade: um dono não escreve
  -- ponteiro para objeto de outra.
  if p_path is not null and split_part(p_path, '/', 1) <> v_community_id then
    raise exception 'image path must live under the community folder' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.communities
    where id = p_community_id
      and owner_user_id = p_caller_user_id
      and is_deleted = false
  ) then
    raise exception 'not allowed to change this community image' using errcode = '42501';
  end if;

  if p_kind = 'banner' then
    update public.communities set banner_path = p_path where id = p_community_id;
  else
    update public.communities set thumbnail_path = p_path where id = p_community_id;
  end if;
end;
$$;

revoke all on function public.set_community_image(uuid, text, text, uuid) from public;
revoke all on function public.set_community_image(uuid, text, text, uuid) from anon;
revoke all on function public.set_community_image(uuid, text, text, uuid) from authenticated;
grant execute on function public.set_community_image(uuid, text, text, uuid) to service_role;
