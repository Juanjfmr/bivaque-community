-- Publicação só dentro de um grupo (lote 5, tarefa N2, ADR-20261023-comunidade-do-prototipo).
--
-- O protótipo não tem feed da cidade: na cidade há perguntas e respostas
-- (Indicações), e publicar existe só dentro de um grupo. A tela acompanha — o
-- compositor deixa de oferecer as audiências cidade e vila — e o BANCO é quem
-- recusa, para que nenhum outro caminho (RPC antiga, compositor de outra tela,
-- chamada direta ao PostgREST, UPDATE do autor) reintroduza a publicação solta.
--
-- A recusa é da POLICY de insert, não de um CHECK na tabela: o seed de
-- desenvolvimento carrega publicações antigas de cidade (`group_id is null`) e
-- um CHECK derrubaria o `db reset` com seed. A policy vale para o papel
-- `authenticated`; o seed escreve como postgres, que não passa por RLS.
--
-- O escopo da publicação continua exclusivo (`posts_single_scope`: grupo XOR
-- comunidade), então uma publicação de grupo tem `community_id` nulo. O que a
-- policy exige é que ela tenha um grupo. O escopo de escrita continua o de
-- sempre (`private.can_write_post_to`): membro ativo da localidade e membro do
-- grupo (ou grupo Aberto da cidade), e nunca conta suspensa.

drop policy if exists posts_insert_locality_member on public.posts;
create policy posts_insert_locality_member
on public.posts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  -- A regra deste lote: sem grupo não há publicação. `community_id` sozinho
  -- (publicação de vila) e os dois nulos (publicação de cidade inteira) caem
  -- aqui, na mesma cláusula.
  and group_id is not null
  and private.can_write_post_to(locality_id, community_id, group_id)
  and not public.is_account_suspended(auth.uid())
  -- Condição da policy ANTIGA (20260915101543) que a recriação não pode perder:
  -- a conta que pediu exclusão também não publica. A versão anterior deste
  -- arquivo omitiu esta cláusula e uma conta "meio apagada" voltava a publicar
  -- em grupo. Comparar com a policy substituída é parte da revisão.
  and not private.account_deletion_requested((select auth.uid()))
);

-- ── O grupo é imutável depois de criado ─────────────────────────────────────
--
-- A policy acima só protege o INSERT: o autor de uma publicação de grupo ainda
-- conseguia `update public.posts set group_id = null` e transformá-la em
-- publicação de cidade, entrando pela porta dos fundos. RLS não compara a linha
-- antiga com a nova, então a recusa vive num gatilho BEFORE UPDATE: o grupo não
-- muda — nem para nulo, nem para outro grupo — depois de a linha existir.
--
-- O gatilho NÃO toca o INSERT de propósito: o seed carrega publicações antigas
-- de cidade (`group_id is null`) e um gatilho de insert derrubaria o `db reset`
-- com seed, a mesma razão pela qual a recusa de insert é de policy e não de
-- CHECK. Linhas antigas sem grupo continuam podendo ser atualizadas (o grupo
-- não muda), então moderação e edição seguem funcionando.
create or replace function private.prevent_post_group_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.group_id is distinct from old.group_id then
    raise exception 'o grupo de uma publicacao nao pode mudar depois de criada'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists posts_group_immutable on public.posts;
create trigger posts_group_immutable
before update on public.posts
for each row
execute function private.prevent_post_group_change();

-- ── O perfil não lista publicação sem grupo ─────────────────────────────────
--
-- `profile_posts_for` devolvia também a publicação de cidade (community_id e
-- group_id nulos) e a de vila (community_id, sem grupo). Com a publicação
-- restrita ao grupo — e o escopo exclusivo (`posts_single_scope`) — essas linhas
-- só existem como legado do seed, e o perfil não é caminho para elas
-- reaparecerem. A visibilidade é decidida no servidor pela participação no
-- grupo: quem é aprovado no grupo vê a publicação dele no alvo; quem não é, não
-- vê.
create or replace function public.profile_posts_for(
  p_target_user_id uuid,
  p_viewer_user_id uuid
)
returns table (
  id uuid, locality_id uuid, community_id uuid, group_id uuid,
  post_type post_type, content text, photo_path text, link_url text,
  poll_options jsonb, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is not null and (select auth.uid()) <> p_viewer_user_id then
    raise exception 'p_viewer_user_id must match the caller for authenticated requests';
  end if;

  return query
  select
    p.id, p.locality_id, p.community_id, p.group_id, p.post_type,
    p.content, p.photo_path, p.link_url, p.poll_options, p.created_at
  from public.posts p
  where p.user_id = p_target_user_id
    and p.is_deleted = false
    -- Sem grupo, a publicação não se mostra no perfil: cidade inteira e vila
    -- deixaram de ser destinos (mesma regra da policy de insert).
    and p.group_id is not null
    and exists (
      select 1 from public.group_memberships gm
      where gm.group_id = p.group_id
        and gm.user_id = p_viewer_user_id
        and gm.status = 'approved'
    )
  order by p.created_at desc
  limit 50;
end;
$function$;

revoke all on function public.profile_posts_for(uuid, uuid) from public, anon;
grant execute on function public.profile_posts_for(uuid, uuid) to service_role, authenticated;