-- Consulta a outra cidade (decisão do dono, 25/09/2026).
--
-- Quem é membro verificado de uma cidade pode CONSULTAR o que é público de
-- outra cidade — o cenário é o militar transferido olhando o destino antes de
-- chegar. Consultar é só ler; publicar, confirmar presença, responder e
-- conversar continuam exigindo pertencer à cidade (nenhuma policy de escrita
-- muda aqui).
--
-- Abre para leitura de qualquer membro verificado:
--   * o catálogo de cidades (`localities`) — nomes de município;
--   * referências aprovadas do Guia (`arrival_guide_entries`) e os artigos
--     publicados delas (`guide_articles`);
--   * encontros de alcance cidade (`events` sem comunidade e sem grupo);
--   * anúncios ATIVOS de alcance cidade do Mercado e de Imóveis (`listings`
--     com `locality_id`), com fotos e detalhes pela mesma porta
--     (`private.can_read_listing`, que também decide o bucket de fotos).
--
-- Continua só de quem é da cidade (não muda nada aqui):
--   * publicações, comentários e perguntas de comunidade e cidade;
--   * perfis, roster de comunidade, grupos;
--   * quem vai a um encontro (`event_rsvps` lê por `private.can_access_event`,
--     que segue exigindo ser da cidade);
--   * anúncios de alcance comunidade.
--
-- "Membro verificado" = tem uma cidade atual (`locality_memberships.kind =
-- 'current'`): a linha só existe depois da verificação (provision_member_locality).
--
-- As policies são recriadas com o MESMO nome, em vez de uma segunda policy
-- permissiva ao lado: os guardas de regressão (rls-or-column-regression) contam
-- policies por nome, e uma regra por tabela lê melhor que duas somadas por OR.
-- O alerta de anúncios (`private.can_user_read_listing`) NÃO muda: alerta
-- continua casando só com a própria cidade.

create function private.has_current_locality()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.locality_memberships membership
    where membership.user_id = (select auth.uid())
      and membership.kind = 'current'
  );
$$;

revoke all on function private.has_current_locality() from public;
grant execute on function private.has_current_locality() to authenticated;

-- ── catálogo de cidades ──────────────────────────────────────────────────────

drop policy localities_select_same_membership on public.localities;

create policy localities_select_same_membership
on public.localities
for select
to authenticated
using (
  private.is_locality_member(id)
  or private.has_current_locality()
);

-- ── Guia ─────────────────────────────────────────────────────────────────────

drop policy arrival_guide_select_approved_locality_member on public.arrival_guide_entries;

create policy arrival_guide_select_approved_locality_member
on public.arrival_guide_entries
for select
to authenticated
using (
  status = 'approved'
  and (private.is_locality_member(locality_id) or private.has_current_locality())
);

drop policy guide_articles_select_published_locality_member on public.guide_articles;

create policy guide_articles_select_published_locality_member
on public.guide_articles
for select
to authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.arrival_guide_entries e
    where e.id = guide_articles.entry_id
      and e.status = 'approved'
      and (private.is_locality_member(e.locality_id) or private.has_current_locality())
  )
);

-- ── Encontros de alcance cidade ──────────────────────────────────────────────
-- Só o ramo "sem comunidade e sem grupo" ganha a consulta; os ramos de
-- comunidade e grupo ficam exatamente como estavam.

drop policy events_select_locality_member on public.events;

create policy events_select_locality_member
on public.events
for select
to authenticated
using (
  (community_id is not null and private.is_community_member(community_id))
  or (
    community_id is null
    and group_id is null
    and (private.is_locality_member(locality_id) or private.has_current_locality())
  )
  or (
    community_id is null
    and group_id is not null
    and (
      private.is_group_member(group_id)
      or exists (
        select 1
        from public.groups g
        where g.id = events.group_id
          and g.visibility = 'public'
          and (g.community_id is null or private.is_community_member(g.community_id))
          and private.is_locality_member(g.locality_id)
      )
    )
  )
);

-- ── Anúncios de alcance cidade ───────────────────────────────────────────────
-- A porta única de leitura de anúncio, foto e detalhe de imóvel. O ramo de
-- cidade passa a aceitar qualquer membro verificado; dono e comunidade como
-- antes.

create or replace function private.can_read_listing(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.listings l
     where l.id = p_listing_id
       and (
         l.owner_user_id = (select auth.uid())
         or (
           l.status = 'active'
           and (
             (
               l.community_id is not null
               and exists (
                 select 1
                   from public.community_memberships cm
                  where cm.community_id = l.community_id
                    and cm.user_id = (select auth.uid())
                    and cm.status = 'approved'
               )
             )
             or (
               l.locality_id is not null
               and (
                 exists (
                   select 1
                     from public.locality_memberships lm
                    where lm.locality_id = l.locality_id
                      and lm.user_id = (select auth.uid())
                 )
                 or private.has_current_locality()
               )
             )
           )
         )
       )
  );
$$;
