-- R3: o perfil declara Força Armada e OM — e a leitura de terceiro passa a ser
-- POR ALVO, não por varredura.
--
-- Achado do crítico adversarial de 17/09/2026 (veredito FAIL, achado A2, HIGH):
-- sob a policy anterior (user_id = auth.uid() OR (is_visible AND
-- shares_locality_with(user_id))) a RLS filtrava LINHA, não LISTAGEM. Como a
-- tabela vive no schema public e authenticated tinha SELECT, o PostgREST
-- expunha o endpoint e UM request devolvia todas as declarações visíveis de
-- todo mundo que compartilha a cidade:
--
--   GET /rest/v1/profile_affiliations?select=user_id,field,value&is_visible=eq.true
--
-- Isso é o "todos da OM X" que o produto-mãe proíbe por anti-mosaico, e num
-- piloto municipal é praticamente o efetivo da unidade. A visibilidade por
-- campo continua sendo a decisão; o que muda é que ela passa a ser respondida
-- para UM alvo por vez.
--
-- Duas peças: a policy de SELECT volta a ser só do dono (ninguém lista a
-- tabela), e a leitura de terceiro passa pela RPC por-alvo, que também aplica
-- os vetos que faltavam (achados A3 e A4): conta suspensa não lê, e titular
-- com exclusão pedida e ainda não purgada não é exposto.

-- 1. A tabela deixa de ser listável.
drop policy profile_affiliations_select_own_or_visible on public.profile_affiliations;

create policy profile_affiliations_select_own
on public.profile_affiliations
for select
to authenticated
using (user_id = (select auth.uid()));

comment on policy profile_affiliations_select_own on public.profile_affiliations is
  'O dono le as proprias linhas (inclusive as ocultas, para poder editar). Terceiro nao lista a tabela: a leitura de outra pessoa passa por public.profile_affiliations_for(). A policy nao consegue expressar "so este alvo", e era exatamente isso que permitia a enumeracao em lote.';

-- 2. A leitura de terceiro, por alvo e com os vetos.
create function public.profile_affiliations_for(p_target_user_id uuid)
returns table (field text, value text, is_visible boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select a.field, a.value, true
  from public.profile_affiliations a
  where a.user_id = p_target_user_id
    -- So o que o dono marcou como visivel. Oculto nao vira linha nula: nao vira
    -- linha nenhuma, e e indistinguivel de "nunca declarado" (ver o pgTAP).
    and a.is_visible
    -- Quem pergunta precisa ser gente: sem sessao nao ha perfil para ler.
    and (select auth.uid()) is not null
    -- A3: conta suspensa nao le. O veto existia so em WITH CHECK de INSERT, o
    -- que deixava um suspenso com JWT valido (1h) enumerando normalmente.
    and not public.is_account_suspended((select auth.uid()))
    -- A4: titular que pediu exclusao e ainda nao foi purgado nao e exposto. A
    -- policy de profiles ja tinha esta guarda; a de afiliacao nao tinha.
    and not exists (
      select 1
      from public.account_deletion_requests r
      where r.user_id = p_target_user_id
        and r.finalized_at is null
    )
    -- O mesmo alcance de sempre: o proprio dono, ou quem compartilha cidade.
    and (
      p_target_user_id = (select auth.uid())
      or private.shares_locality_with(p_target_user_id)
    );
$$;

comment on function public.profile_affiliations_for(uuid) is
  'Leitura por alvo das declaracoes VISIVEIS (Forca Armada e OM). Substitui a varredura da tabela: aplica visibilidade por campo, veto de conta suspensa no leitor e guarda de exclusao pendente no alvo.';

revoke all on function public.profile_affiliations_for(uuid) from public;
revoke all on function public.profile_affiliations_for(uuid) from anon;
grant execute on function public.profile_affiliations_for(uuid) to authenticated;

-- 3. A OM e texto livre e nao pode carregar posto, patente nem endereco.
-- Paridade com a bio (profiles_bio_no_forbidden_terms): a D2 mantem esses dados
-- FORA, e sem barreira no banco o campo de 80 caracteres vira o lugar onde eles
-- entram pela porta dos fundos.
--
-- NOT VALID de proposito: a constraint passa a valer para escrita nova sem
-- invalidar a migration caso exista linha antiga que a viole.
--
-- Ressalva honesta: lista de termos e barreira imperfeita (basta escrever errado
-- de proposito). Ela impede o caso comum, nao o adversario decidido; o que fecha
-- a enumeracao em massa e a revogacao da listagem acima.
alter table public.profile_affiliations
  add constraint profile_affiliations_om_no_rank_or_address
  check (
    field <> 'om'
    or (
      value !~* '\m(CPF|CEP|rua|avenida|alameda|travessa|rodovia|estrada|bairro|n[ºo]|numero|número|km)\M'
      and value !~* '\m(capit[ãa]o|tenente|coronel|major|sargento|subtenente|cabo|soldado|almirante|brigadeiro|aspirante|cel|sgt|ten|cap)\M'
    )
  ) not valid;

comment on constraint profile_affiliations_om_no_rank_or_address on public.profile_affiliations is
  'A D2 mantem fora do produto os dados de hierarquia militar e de localizacao residencial. "general" fica de fora da lista de proposito: "Quartel General" e nome legitimo de OM, e falso positivo aqui recusa uma declaracao verdadeira.';
