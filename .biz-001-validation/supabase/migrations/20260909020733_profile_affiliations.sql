-- Força Armada e OM autodeclaradas, com visibilidade por campo.
-- Correção do responsável de 07/09/2026 e ADR-20260908-perfil-campos-opcionais
-- (D1–D3, aprovado).
--
-- DESVIO DELIBERADO DA LETRA DA D1, registrado aqui porque muda o desenho e
-- não a decisão de produto. A D1 pede "colunas booleanas na própria tabela
-- profiles, ao lado do valor". Sob a política que já existe --
-- profiles_select_visible_in_locality libera a LINHA INTEIRA a qualquer
-- membro da mesma cidade -- esse desenho não protege nada: RLS é por linha,
-- então o booleano não impediria ninguém de ler o valor oculto direto na
-- API. A promessa "desligar oculta" ficaria valendo só no cliente, que é o
-- mesmo que não valer.
--
-- Por isso: UMA LINHA POR CAMPO. Ocultar deixa de ser uma coluna que o
-- leitor ignora e passa a ser uma linha que o leitor não enxerga. O booleano
-- entra na própria política, e quem esconde a OM some da consulta alheia
-- carregando o valor junto.
--
-- A intenção da D1 — visibilidade por campo, desligada por padrão, valor
-- preservado ao ocultar — está inteira. Só o lugar do dado mudou, para o
-- único lugar onde o banco consegue cumprir o que a tela promete.
--
-- D2: SOMENTE armed_force e om. O check de `field` é a fronteira.
-- D3: ocultar preserva o valor (is_visible = false, linha continua lá para o
-- dono); apagar é remover a linha. São operações distintas e a tela nomeia
-- cada uma pelo que ela faz.

create table public.profile_affiliations (
  user_id uuid not null references auth.users (id) on delete cascade,
  field text not null check (field in ('armed_force', 'om')),
  value text not null,
  is_visible boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, field),
  -- A Força Armada é seleção fechada; a OM é texto curto. O teto de 80 é o
  -- mesmo de profiles.display_name. A D2 aprova estes dois campos e só eles;
  -- o check é o que impede a lista crescer por descuido de aplicação. O que
  -- o repositório proíbe persistir continua listado no AGENTS.md, e a
  -- varredura de privacidade guarda essa fronteira.
  constraint profile_affiliations_value_by_field check (
    case field
      when 'armed_force' then value in ('marinha', 'exercito', 'aeronautica')
      when 'om' then char_length(value) between 1 and 80
    end
  )
);

alter table public.profile_affiliations enable row level security;
alter table public.profile_affiliations force row level security;

revoke all on table public.profile_affiliations from anon, authenticated;
grant select, insert, update, delete on table public.profile_affiliations to authenticated;
grant select, insert, update, delete on table public.profile_affiliations to service_role;

-- SELECT: o dono vê sempre o que declarou, visível ou não — é dele. Terceiro
-- só vê o que está marcado como visível, e só se compartilha localidade, o
-- mesmo alcance que já vale para o resto do perfil. Campo oculto não é campo
-- nulo para o terceiro: é linha que não existe na consulta dele.
create policy profile_affiliations_select_own_or_visible
on public.profile_affiliations
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (is_visible and private.shares_locality_with(user_id))
);

-- Escrita é sempre sobre o próprio perfil, o mesmo padrão de profiles: o
-- membro declara, oculta e apaga o que é dele, e ninguém declara por ele.
create policy profile_affiliations_insert_self
on public.profile_affiliations
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy profile_affiliations_update_self
on public.profile_affiliations
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- DELETE existe porque apagar de verdade é um caminho de produto (D3), não
-- uma operação administrativa: limpar o campo na tela remove a linha.
create policy profile_affiliations_delete_self
on public.profile_affiliations
for delete
to authenticated
using (user_id = (select auth.uid()));
