# Design — Entidade Comunidade

> Data: 2026-08-05 · Status: aprovado para plano de implementação
> Contexto anterior: [`docs/journeys/MAP.md`](../../journeys/MAP.md), especialmente
> §0.2 (vazamentos) e §7 Padrão 6 (coluna de escopo sem política).

---

## 1. Problema

O schema tem dois níveis: **localidade → grupo**. O produto precisa de três.

Um grupo hoje é uma coisa só: um espaço temático dentro da cidade. Mas
existem dois tipos de pertencimento que o modelo não distingue:

- **Interesse** — "Corrida de rua em Manaus". Qualquer verificado entra
  porque quer. Conjunto ilimitado.
- **Circunstância** — a Vila de Ajuricaba, a Turma de formação. Você
  pertence porque mora ali ou porque esteve naquela turma. O fato existe
  fora do app.

Falta a segunda. Sem ela, conteúdo de uma vila de ~300 imóveis fica
exposto à cidade inteira, e a coordenação que hoje acontece em grupos de
WhatsApp dispersos não tem para onde migrar.

### 1.1 Guard-rail de definição

> **Se o pertencimento é por interesse, é grupo. Se é por circunstância,
> é comunidade.**

Esta linha é o que mantém o conjunto de comunidades limitado pelo mundo
real, e não pela imaginação dos usuários. É ela que torna o
provisionamento manual sustentável indefinidamente (§7.1).

---

## 2. Decisões

| # | Decisão | Justificativa |
|---|---|---|
| **D1** | Comunidade tem **feed próprio**, além de conter grupos | É como uma vila se comporta: existe a conversa geral e existem os recortes temáticos |
| **D2** | Um grupo pertence a **no máximo uma** comunidade (`groups.community_id` nulável) | Multi-comunidade tornaria a visibilidade a união de N conjuntos — difícil em RLS, difícil de explicar, e dilui a propriedade de círculo fechado |
| **D3** | Criação **delegada**: operador cria e nomeia um dono; o dono governa | Uma ação de operador por comunidade, para sempre. A carga não acumula com uso nem com usuários |
| **D4** | Entrada por **pedido + aprovação** do dono/moderadores | Reusa integralmente o modelo de grupo privado (`pending`/`approved`) |
| **D5** | Escopo **exclusivo + herança transitiva** (abordagem A) | Uma única fonte de verdade para o escopo. Impossível divergir |
| **D6** | Home da comunidade é **agregada** | Com ~47 membros, quatro feeds separados ficam todos vazios, e feed vazio mata piloto pequeno |
| **D7** | Remoção **nunca bloqueia**; grupo órfão transfere ao dono da comunidade | Regra que trava remoção transforma "ser dono de grupo" em escudo contra expulsão |
| **D8** | `groups.community_id` **imutável**, para todos os papéis | Mover o container por baixo invalida o invariante transitivo silenciosamente |
| **D9** | Membro aprovado vê a **lista completa**, inclusive perfis `hidden` | Decisão do produto. Exige aviso explícito de divulgação na entrada (§8) |

### 2.1 Caminho para quórum (D3)

A autorização de criação mora **no grant e na RPC, nunca no dado**.

Proibido: `check (created_by = <operador>)` na tabela, ou policy que
codifique quem pode criar. Trocar delegação por quórum no futuro deve ser
uma RPC nova com outro grant — zero migration em membership ou escopo.

---

## 3. Modelo de dados

### 3.1 Tabelas novas

```
communities
  id              uuid pk
  locality_id     uuid not null → localities
  name            text not null
  description     text
  created_by      uuid not null → auth.users
  owner_user_id   uuid not null → auth.users
  is_deleted      boolean not null default false
  created_at      timestamptz not null default now()
  unique (id, locality_id)          -- alvo das FKs compostas

community_memberships
  community_id    uuid not null → communities
  user_id         uuid not null → auth.users
  role            community_membership_role   default 'member'
  status          community_membership_status default 'pending'
  joined_at       timestamptz not null default now()
  primary key (community_id, user_id)
```

Enums próprios — `community_membership_role` (member/moderator/owner) e
`community_membership_status` (pending/approved). **Não** reusar os de
grupo: enum compartilhado entre domínios trava os dois.

**Sem coluna `visibility`.** Comunidade pública seria contradição — se
qualquer um entra, é interesse, e interesse é grupo. Toda comunidade se
comporta como grupo privado: metadados descobríveis, conteúdo fechado.
Compatível com a regra `"Never: secret groups"` da migration 010.

**RLS nas duas tabelas novas**, `enable` + `force`, seguindo a convenção
da casa. Grants mínimos, `revoke all` de `anon` e `authenticated` antes.

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `communities` | qualquer membro da localidade (metadado descobrível, para poder pedir entrada) | só `service_role` (§7.1) | só via RPC / `service_role` | ninguém |
| `community_memberships` | membros `approved` da mesma comunidade (D9) | via RPC `request_community_membership` | via RPCs de moderação | via RPC de remoção |

`communities` sem policy de `DELETE` para nenhum papel: remoção é
`is_deleted` (§7.5), preservando trilha de auditoria — mesmo desenho que
`reports` na migration 016.

### 3.2 Colunas adicionadas

```
groups  + community_id uuid null → communities   (imutável, D8)
posts   + community_id uuid null → communities
events  + community_id uuid null → communities
```

### 3.3 Invariantes

**I1 — Escopo exclusivo.** Em `posts` e `events`:

```sql
check (num_nonnulls(group_id, community_id) <= 1)
```

Um post no nível da vila carrega `community_id`. Um post dentro de grupo
carrega só `group_id` — o escopo de comunidade é transitivo (I3).

**I2 — Coerência de localidade.** Grupo, post e evento de uma comunidade
têm de estar na mesma localidade dela. Via FK composta contra
`communities (id, locality_id)`, seguindo o padrão que `profiles` já usa
contra `locality_memberships`.

**I3 — Herança de membership.** Para entrar num grupo com
`community_id = C`, é preciso membership `approved` em C.

Vale em **dois** lugares, deliberadamente:
- na RPC `join_group` — mensagem de erro útil;
- em **trigger** sobre `group_memberships` — defesa que não depende de
  ninguém lembrar de chamar a RPC.

Os dois vazamentos de §0.2 do MAP nasceram de confiar que a camada de
cima checaria.

---

## 4. Escopo de acesso

### 4.1 A regra

> **"Público" é relativo ao container.**

| Grupo | Visibilidade | Quem enxerga |
|---|---|---|
| Sem comunidade | `public` | Membros da localidade |
| Sem comunidade | `private` | Membros do grupo |
| Em comunidade C | `public` | Membros de **C** |
| Em comunidade C | `private` | Membros do grupo |

Sem isso, um grupo público dentro da vila vira porta dos fundos para a
cidade inteira.

### 4.2 Helper

O `private.can_access_post_scope` da migration 018 ganha um parâmetro:

```sql
can_access_post_scope(p_locality_id, p_community_id, p_group_id) =
  private.is_locality_member(p_locality_id)
  and (p_community_id is null or private.is_community_member(p_community_id))
  and (
    p_group_id is null
    or private.is_group_member(p_group_id)
    or (
      grupo é public
      and (
        grupo.community_id is null                              -- container = localidade
        or private.is_community_member(grupo.community_id)      -- container = comunidade
      )
    )
  )
```

`private.is_community_member(uuid)` espelha `is_group_member`: exige
`status = 'approved'`, `security definer`, `set search_path = ''`.

Escrita usa o mesmo portão, conforme estabelecido em 018.

### 4.3 Nomenclatura

Não usar "locality" no nome de helpers novos de escopo genérico. Posts
nacionais (§10.2) tornarão a localidade opcional, e renomear helper
referenciado por N policies é caro.

---

## 5. Feeds

### 5.1 Três funções, não uma parametrizada

| Função | Retorna |
|---|---|
| `feed_posts(locality_id)` | Cidade: `community_id is null` **e**, no ramo de grupo público, `groups.community_id is null` |
| `feed_community(community_id)` | Agregado (D6): posts do nível da vila **+** posts dos grupos internos visíveis ao chamador |
| `feed_group(group_id)` | O grupo isolado. Resolve a linha 5d do MAP (`Ausente/P2`) |

Cada uma tem grant, teste e plano de execução próprios. Uma função
polimórfica seria um lugar só para errar em três escopos.

### 5.2 Set-based, não por linha

**As três funções resolvem as memberships do chamador uma vez e fazem
join** — não chamam `can_access_post_scope` por linha.

```sql
with minhas_comunidades as (
  select community_id from public.community_memberships
  where user_id = (select auth.uid()) and status = 'approved'
),
meus_grupos as (
  select group_id from public.group_memberships
  where user_id = (select auth.uid()) and status = 'approved'
)
...
```

**Também trocar `feed_posts` da migration 018**, que hoje avalia
`can_access_post_scope` por linha. Correto e irrelevante com 50 membros;
degrada com volume.

As **policies de RLS continuam usando o helper por linha** — ali não há
alternativa. A otimização é exclusiva das RPCs.

### 5.3 Cinco estados de filtro, não quatro

A fileira de chips precisa de: **Tudo** (agregado, padrão) · **Da vila**
(só nível comunidade) · um chip por grupo interno.

O mockup inicial tinha quatro chips para cinco situações — não havia como
ver só os posts do nível da vila.

---

## 6. Eventos

`events` recebe `community_id` e a mesma regra de container (§4.1),
estendendo a policy `events_select_locality_member` que a migration 017
já reescreveu para grupos.

**Fan-out de notificação é superfície de vazamento própria.** Evento de
comunidade não pode notificar a cidade inteira. A suíte
`notifications-approved-events` precisa ganhar o caso de comunidade — não
basta ajustar a policy de `select`.

RSVP herda o escopo do evento: quem não acessa o evento não pode
confirmar presença.

---

## 7. Criação, membership e moderação

### 7.1 Criação

`create_community(p_name, p_description, p_locality_id, p_owner_user_id)`
— grant **apenas** para `service_role`.

Enquanto o painel administrativo não existe, provisionar é passo de
runbook via SQL, como o `PILOT_RUNBOOK` já faz para convite familiar.

**Consequência de sequenciamento: o modelo de comunidade não depende da
Onda 0.** O que depende é a UI de provisionamento, não a capacidade.

Escala: o custo é O(número de comunidades), não de usuários. Vilas têm
teto físico (dezenas). Turmas acumulam a dezenas por ano. Trinta mil
usuários em trinta vilas dá o mesmo trabalho que quinhentos.

### 7.2 RPCs de membership

`request_community_membership` · `approve_community_member` ·
`remove_community_member` · `add_community_moderator` ·
`remove_community_moderator` · `transfer_community_ownership`

A última não é enfeite: numa vila o dono é transferido de cidade, e o
problema do sucessor precisa de saída. Grupos já resolveu — espelhar.

`create_group` ganha `p_community_id` opcional, exigindo membership
`approved` na comunidade.

**Assunção:** qualquer membro aprovado cria grupo interno, espelhando o
nível da cidade. Restringir a moderador depois é uma linha.

### 7.3 Cascata (D7)

Sair da comunidade — ou ser removido, ou ter `approved` rebaixado —
remove das memberships dos grupos internos. **Trigger** sobre
`community_memberships`, não código de aplicação.

Se a pessoa removida **é dona de grupos internos**, esses grupos
transferem automaticamente para o dono da comunidade, que é `not null` e
portanto sempre existe. A remoção nunca falha por causa disso.

**Exceção:** remover o dono da comunidade é bloqueado até
`transfer_community_ownership` rodar. Não recria o escudo de D7 porque é
ação administrativa sobre si mesmo e afeta exatamente uma pessoa.

Posts de quem saiu permanecem. Sair muda acesso, não autoria.

### 7.4 Imutabilidade (D8)

Trigger que bloqueia `update` de `groups.community_id` para **todos os
papéis**, inclusive `service_role`.

Diferente do `block_authenticated_soft_delete` da 016, que libera
`service_role`: lá o operador executa uma ação completa; aqui executaria
uma ação incompleta — mover sem reconciliar memberships — produzindo
exatamente o vazamento que a regra impede. Escotilha que produz o bug não
é escotilha.

### 7.5 Moderação

`communities.is_deleted` entra no caminho de `service_role` da migration
016.

**Não** adicionar `community` ao enum `report_target_type` na v1:
conteúdo dentro da vila já é denunciável como post ou comentário, e
comunidade abusiva é assunto de operador.

---

## 8. Privacidade da lista de membros (D9)

Membro `approved` vê a lista completa da comunidade, **inclusive perfis
com `profiles.visibility = 'hidden'`**.

Duas consequências obrigatórias:

**8.1 Divulgação no ponto de entrada.** A tela de pedido de entrada deve
declarar que o nome ficará visível aos membros mesmo com perfil oculto.
Sobrescrever calado uma escolha de privacidade já feita seria
inconsistente com um produto que se recusa a persistir posto, OM e
endereço.

**8.2 Policy nova em `profiles`.** Co-membros de comunidade passam a ver
`display_name` de perfis `hidden`. `profiles` é a tabela mais sensível da
fundação e a mais coberta por testes — `locality-profile-access`,
`locality-profile-deny-cross-user` e as duas matrizes de authz afirmam
que perfil oculto não aparece.

**Mecanismo: policy permissiva adicional, nunca alteração da existente.**
Em Postgres, policies permissivas são combinadas por `OR`, então a nova
apenas *amplia* para o recorte de co-membros — a policy atual continua
intacta e as suítes existentes continuam válidas sem edição. Qualquer
solução que precise **alterar** `profiles_select_*` está errada e deve
ser rejeitada na revisão.

Resultado: perfil oculto segue invisível para a cidade, e passa a ser
visível apenas para quem é co-membro `approved` da mesma comunidade.

---

## 9. Matriz de vazamento → suíte de teste

Arquivo novo `supabase/tests/community-scope.sql`, fixture
`supabase/tests/fixtures/communities.inc`. `post-scope-leak.sql`
permanece focado no que já cobre.

**A fixture precisa de duas comunidades** — com uma só, o caso 15 passa
por acidente.

| # | Cenário | Esperado |
|---|---|---|
| 1 | Membro da cidade lê post do nível da vila | negado |
| 2 | Membro da cidade lê post de grupo **público dentro** da vila | negado |
| 3 | Membro `pending` da vila lê conteúdo dela | negado |
| 4 | Membro da vila lê post de grupo privado interno onde não está | negado |
| 5 | Membro da vila lê post de grupo público interno | **permitido** |
| 6 | Removido da vila mantém acesso a grupo interno | impossível — cascata |
| 7 | Entrar em grupo da vila sem membership na vila | negado na RPC **e** no trigger |
| 8 | `feed_posts` da cidade devolve algo da vila | negado |
| 9 | `feed_community` para não-membro | vazio |
| 10 | `feed_group` de grupo interno para não-membro da vila | vazio |
| 11 | Post com `group_id` **e** `community_id` | rejeitado pelo CHECK |
| 12 | Grupo de comunidade em outra localidade | rejeitado pela FK composta |
| 13 | Membro da vila posta no nível da vila | **permitido** |
| 14 | Autenticado sem vínculo chama qualquer RPC de feed | vazio |
| 15 | Membro da vila A lê conteúdo da vila B | negado |
| 16 | Remover dono de grupo interno órfana o grupo | não — transfere ao dono da comunidade |
| 17 | `update groups.community_id` por qualquer papel | rejeitado pelo trigger |
| 18 | Remover o dono da comunidade sem transferir | bloqueado |
| 19 | Perfil `hidden` co-membro da vila | visível ao co-membro |
| 20 | Perfil `hidden` para membro da cidade fora da vila | invisível |
| 21 | Evento de comunidade notifica a cidade | negado |

Linhas **2, 6, 7, 16 e 17** são as que justificam a suíte: são os modos
de falha que jamais aparecem em teste de caminho feliz.

---

## 10. Conflitos conhecidos e datados

Registrados como decisões conscientes, não descuidos.

### 10.1 Turma × movimentação (conflito real)

`communities.locality_id` é `not null`. **Turma não é geográfica.**

Pior: turma é a única comunidade que *deveria* sobreviver à
transferência. No modelo atual, o militar transferido perde a localidade
e, com ela, a turma. **O caso que mais justifica turma existir é o que o
desenho quebra.**

No piloto Manaus-only não aparece. Saída futura: `locality_id` nulável
(comunidade sem localidade = nacional). Migration aditiva, mas ver §10.2.

### 10.2 Posts nacionais custam mais que uma coluna

A escada de escopo tem a localidade como raiz — comunidade e grupo apenas
*estreitam*. Nacional é mais **largo**, não mais estreito: quebra a
suposição de raiz obrigatória.

A coluna é aditiva; **a política não**. `locality_id` nulável obriga ramo
de nulo em toda policy do post surface, e `feed_posts(p_locality_id)` não
serve para feed nacional — vira função nova. É reescrita de política.

### 10.3 Multi-localidade é da fundação, não da comunidade

```sql
create table public.locality_memberships (
  user_id uuid primary key ...
```

`user_id` é PK: uma pessoa, uma localidade, para sempre. E `profiles` tem
FK composta para `(user_id, locality_id)` com `user_id` também PK.

`private.is_locality_member` já é um `exists`, então **funciona sem
alteração** quando houver várias linhas. O bloqueio é a PK e a FK de
`profiles`.

Nada neste design assume localidade única — a comunidade herda de graça o
que a fundação resolver.

---

## 11. Migrations

**A — modelo e escopo (atômica).** Tabelas, enums, colunas, constraints,
FKs compostas, triggers de invariante, helpers, policies e as três
funções de feed. Inclui a troca de `feed_posts` para set-based.

Atômica porque carrega a garantia do **Padrão 6** do MAP: a coluna de
escopo e as políticas que a leem entram **na mesma migration**. Foi assim
que `posts.group_id` ficou nove migrations vazando, com um comentário
prometendo `"in future"`.

**B — RPCs.** Criação, membership, moderação, `create_group` com
`p_community_id`. Pode vir depois sem risco de vazamento.

Gates a cada migration: `db:reset` · `test:db` verde · `db:lint` sem
erros. `tests/scope/*.test.mjs` não cobre SQL e não deve mudar.

---

## 12. Fora de escopo

- Mural de avisos (post por papel dentro de um grupo) — exige permissão
  de escrita por papel, que não existe em lugar nenhum do schema.
- `community` como `report_target_type`.
- Convite direto para comunidade — entrada é por pedido (D4).
- Comunidade aninhada em comunidade.
- Marketplace dentro da vila — segunda vertical, decisão de produto já
  registrada.
