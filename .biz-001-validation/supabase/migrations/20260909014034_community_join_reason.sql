-- O motivo opcional do pedido de participação (correção do responsável de
-- 07/09/2026 §3). Tabela própria, e não coluna em community_memberships,
-- por causa da política que já existe naquela tabela:
-- community_memberships_select_comember libera a linha inteira a QUALQUER
-- membro aprovado da comunidade. Um texto que a tela promete mostrar só ao
-- autor e a quem analisa não pode morar numa linha que a comunidade toda lê —
-- RLS é por linha, não por coluna, então a separação tem que ser física.
--
-- A leitura fica com o autor e com quem modera. A checagem de moderação é
-- escrita à mão aqui em vez de chamar um helper: private.is_community_moderator
-- foi derrubado em 20260821000025 justamente para não deixar um caminho
-- auth.uid() de pé onde o chamador real é service_role. Numa policy RLS o
-- chamador real É o membro autenticado, então auth.uid() é a identidade
-- correta — e a linha consultada é a do próprio caller, que a política de
-- community_memberships sempre libera. Escrita nenhuma para authenticated:
-- entra pelo RPC security definer, junto com o próprio pedido.

create table public.community_join_reasons (
  community_id uuid not null,
  user_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  primary key (community_id, user_id),
  foreign key (community_id, user_id)
    references public.community_memberships (community_id, user_id) on delete cascade
);

alter table public.community_join_reasons enable row level security;
alter table public.community_join_reasons force row level security;

revoke all on table public.community_join_reasons from anon, authenticated;
grant select on table public.community_join_reasons to authenticated;
grant select, insert, update, delete on table public.community_join_reasons to service_role;

-- SELECT: o autor do pedido e quem analisa. Ninguém mais — nem o restante dos
-- membros aprovados, que enxergam o roster mas não a justificativa.
create policy community_join_reasons_select_author_or_moderator
on public.community_join_reasons
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.community_memberships m
    where m.community_id = community_join_reasons.community_id
      and m.user_id = (select auth.uid())
      and m.status = 'approved'
      and m.role in ('moderator', 'owner')
  )
);

-- Sem política de INSERT/UPDATE/DELETE para authenticated: toda escrita passa
-- pelo RPC abaixo, que grava o motivo na mesma transação do pedido.

-- O RPC ganha o parâmetro do motivo. A assinatura antiga é derrubada em vez de
-- sobrecarregada: duas versões visíveis ao PostgREST criam ambiguidade de
-- resolução na chamada sem o segundo argumento.
drop function public.request_community_membership(uuid);

create function public.request_community_membership(
  p_community_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locality_id uuid;
  v_reason text;
  v_inserted boolean;
begin
  select locality_id into v_locality_id
  from public.communities
  where id = p_community_id and is_deleted = false;

  if v_locality_id is null then
    raise exception 'community not found';
  end if;

  if not private.is_locality_member(v_locality_id) then
    raise exception 'not a member of this locality';
  end if;

  insert into public.community_memberships (community_id, user_id, role, status)
  values (p_community_id, (select auth.uid()), 'member', 'pending')
  on conflict (community_id, user_id) do nothing;

  -- Pedido já existente não tem o motivo reescrito: o texto pertence ao pedido
  -- que foi feito, e uma segunda chamada não é uma segunda candidatura.
  v_inserted := found;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_inserted and v_reason is not null then
    insert into public.community_join_reasons (community_id, user_id, reason)
    values (p_community_id, (select auth.uid()), left(v_reason, 500))
    on conflict (community_id, user_id) do nothing;
  end if;
end;
$$;

revoke all on function public.request_community_membership(uuid, text) from public;
revoke all on function public.request_community_membership(uuid, text) from anon;
grant execute on function public.request_community_membership(uuid, text) to authenticated;
