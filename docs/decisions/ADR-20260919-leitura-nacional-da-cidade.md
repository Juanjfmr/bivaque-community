---
id: ADR-20260919-leitura-nacional-da-cidade
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-19
expires_at:
linked_plan: docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md
supersedes_partially: ADR-20260816-transferencia-e-pertencimento (somente a recusa da leitura nacional; ver "Relação com decisões anteriores")
critic_verdict: pending
critic_review: "2026-09-23 revisão 1: FAIL (2 BLOCKER). 2026-09-23 revisão 2 (independente, sem ler a 1): PASS COM CONDICOES, 0 BLOCKER, condições C-1..C-8. Esta versão incorpora C-1..C-8 e as decisões do dono sobre colunas técnicas e verificado sem cidade; aguarda confirmação independente das condições."
---

# Leitura nacional do nível municipal e o seletor de localidade

Revisão de 2026-09-23. A decisão de produto é a de 19/09. Esta versão fixa o
contrato técnico depois de duas revisões independentes e registra as decisões
complementares do dono de 23/09 (citadas em "Approval").

## Problem

Duas queixas de produção:

1. **O membro não consegue consultar outra cidade.** Um militar que sai do Rio de
   férias para Brasília não vê nada de Brasília: `arrival_guide_entries` e `events`
   são liberados por vínculo (`private.is_locality_member`; policy
   `arrival_guide_select_approved_locality_member` em
   `20260815210000_arrival_guide_curation.sql` e `events_select_locality_member`
   em `20260820060533_fix_events_insert_returning_rls.sql:39-73`). A interface já
   promete: `CityReference` lê `const viewing = locality ?? current`
   (`apps/web/app/components/bivaque/city-reference.tsx:79`) e consulta
   `.eq("locality_id", viewing.id)` (`:123`); para outra cidade a RLS nega e a tela
   mostra vazio — lista vazia fingindo "não há nada".
2. **O membro não consegue mudar a residência.** O vínculo mora em
   `locality_memberships`. `declare_locality_transfer(destino, prazo)` existe, é
   `security definer`, tem `grant execute … to authenticated`
   (`20260819021416_locality_transfer.sql:91-142`) e nenhum código do app a chama
   (só comentários em `(shell)/inicio/right-rail.tsx:126` e `localidade/page.tsx:13`).

## Decision

### D1 — Quem lê, e por qual mecanismo

**Quem entra:** titular verificado (`private.is_verified_holder`,
`20260802000700_authorization_helpers.sql:68-81`) **com vínculo corrente em
alguma cidade**. O titular aprovado por identidade ainda sem cidade
(`ADR-20260922-aprovacao-por-identidade-sem-cidade`) **não** lê: ele precisa
escolher a cidade no onboarding (decisão do dono, 23/09), e o proxy já o leva a
`/onboarding/locality`; a exigência de vínculo repete essa regra no banco, que é a
fronteira real. O vínculo é verificado por um helper novo
`private.has_current_locality_membership(uuid)`, `security definer`,
`set search_path = ''`, `revoke all … from public`, que consulta
`public.locality_memberships` (`kind = 'current'`).

**Quem não entra:** `anon`; conta não verificada; verificado sem cidade; familiar
aceito por convite que não tenha verificação própria (o familiar fica de fora por
não ter `verification_outcome`, não por regra do gate — um familiar que se
verifique por conta própria e tenha cidade lê, como qualquer titular).

#### D1a — Eventos de nível cidade: policy aditiva

```sql
create policy events_select_city_level_verified_holder
on public.events for select to authenticated
using (
  community_id is null
  and group_id is null
  and private.is_verified_holder((select auth.uid()))
  and private.has_current_locality_membership((select auth.uid()))
);
```

Sem subconsulta a `events` (a auto-referência quebrou `INSERT … RETURNING`,
`20260820060533`). `private.can_access_event` não é tocado.

#### D1b — Guia (entradas, artigos e seções): funções de leitura, não policy

A tabela do Guia guarda, na mesma linha aprovada, colunas operacionais
(`submitted_by` em `20260915210000_guide_entry_suggestion.sql:17`; `source`,
`source_reply_id`, `confidence`, `review_note` em
`20260815210000_arrival_guide_curation.sql`; `guide_articles.curated_by` em
`20260910202110_guide_article.sql`). Policy de RLS filtra **linhas**, não
colunas, e o grant é de tabela. **Decisão do dono (23/09): as colunas técnicas
não saem da cidade.** Por isso a leitura nacional do Guia **não** ganha policy
nas tabelas — a RLS atual delas fica exatamente como está — e passa por funções
`security definer` que devolvem só os campos de referência:

- `public.national_guide_entries(p_locality_id uuid)` → `id, locality_id, category,
  name, description, website_url, phone, reviewed_at` de
  `arrival_guide_entries` com `status = 'approved'` da localidade pedida;
- `public.national_guide_article(p_entry_id uuid)` → artigo `status = 'published'`
  de entrada `approved` (título, resumo, seções publicadas com `anchor`,
  `position`, título e corpo, `reviewed_at`), **sem** `curated_by` nem revisões.

Regras de todas as funções: `security definer`, `set search_path = ''`, `stable`;
checam `private.is_verified_holder((select auth.uid()))` e
`private.has_current_locality_membership((select auth.uid()))` e, se falharem,
devolvem conjunto vazio **e** a interface sabe distinguir (ver D5);
`revoke all … from public, anon`; `grant execute … to authenticated`. Nenhuma
devolve `submitted_by`, `curated_by`, `source`, `source_reply_id`, `confidence`
nem `review_note`. A nota da curadoria continua visível só dentro da cidade.

**Ler não é participar:** nenhuma linha de vínculo é criada, nenhuma vila é
concedida, nada é publicável, nenhum RSVP, convite, pergunta, correção de artigo,
salvamento ou sugestão é possível na cidade visitada.

### D2 — O que continua fechado, de propósito

- **posts e feed municipal** (`can_access_post_scope`,
  `20260805214709_community_scope.sql:264-275`);
- **RSVP** (`event_rsvps`, `can_access_event`, `20260805214709:392-407`),
  **convites** (`event_invites`, `20260806171204_event_invites.sql:39-88`) e
  **pergunta ao organizador** (`open_event_question`,
  `20260911051230_event_question_thread.sql:55`);
- **eventos de grupo e de comunidade** (o predicado exige
  `community_id is null and group_id is null`);
- **entradas `pending`/`rejected` do Guia e todas as colunas técnicas**, mesmo de
  linha aprovada (D1b);
- **correção de artigo** (`guide_correction_requests_insert_own` exige
  `is_locality_member`, `20260910202110:176-191`), **salvar** referência
  (`guide_entry_saves`, `20260915190000_guide_entry_saves.sql:34-49`) e **sugerir**
  referência (`suggest_guide_entry` grava na localidade do solicitante);
- **vitrine de prestadores** (`can_see_provider`,
  `20260825185327_provider_showcase.sql`) — o alcance é consentimento do prestador.

### D3 — A cidade visitada é filtro efêmero

A cidade que se visita chega por parâmetro de URL (`?locality=`: links "Ver
todos" do `CityReference`, `city-reference.tsx:203,226`, e o seletor de cidade do
shell do O06, PR #76) ou por estado local de tela (`/localidade`, `useState`).
**Nunca é persistida no servidor**: nem coluna em `profiles`, nem tabela, nem
preferência, nem registro de navegação. Persistir "cidade que pretendo visitar"
seria dado pessoal novo (plano de deslocamento) e exige outro ADR.

### D4 — Mudar residência é a transferência declarada

`declare_locality_transfer(p_destination_locality_id, p_term_date)`: destino vira
corrente na hora; origem vira `leaving`, legível e publicável até o prazo. Troca
simples continua recusada (alternativa D do `ADR-20260816`). A pessoa declara a
data. Única escrita nova, pela RPC existente.

### D5 — O que a tela mostra ao visitante

O visitante é quem lê uma cidade em que não tem vínculo. Nenhuma tela oferece a ele
uma ação que o servidor vai recusar (nenhum botão que devolve 42501):

- **Detalhe de evento de outra cidade:** sem RSVP, sem "Pedir mais informações";
  no lugar, uma frase: confirmar presença e perguntar ao organizador é para quem é
  da cidade (decisão do dono, 23/09).
- **Rota `/events/[id]/perguntas`** de evento de outra cidade: não renderiza o
  formulário; mostra a mesma frase.
- **Organizador:** a tela do visitante não mostra nome, foto nem link de perfil do
  organizador de outra cidade (o perfil segue negado por
  `shares_locality_with`/`profile_is_visible_to_viewer`).
- **Artigo do Guia de outra cidade:** abre, via `national_guide_article`
  (decisão do dono, 23/09), **sem** "Sugerir atualização", "Salvar" e nota da
  curadoria.
- **Estado vazio:** a tela distingue "a leitura desta cidade não está liberada
  para você" (não verificado, sem cidade) de "esta cidade ainda não tem eventos /
  referências". Hoje a lista de eventos ramifica por contagem de
  `locality_memberships` da cidade vista (`events/page.tsx:590-610`), que para o
  visitante é sempre 0 — isso muda junto.
- **Service role:** leitura do visitante usa o cliente de sessão (anon + cookies),
  como `events/[id]/page.tsx` já faz (`getAuthClient()`). É proibido resolver
  perfil de organizador de outra cidade por `service_role`
  (`apps/web/lib/supabase/server.ts`). Exceção existente e documentada:
  `events/event-invites-actions.ts:41,62-74` resolve o nome do organizador por
  service role **para o convidado**, que tem vínculo; não é caminho de visitante e
  fica como está. A entrega inclui guarda de fonte (teste de escopo) de que nenhum
  arquivo do caminho de visitante importa `lib/supabase/server`.

### D6 — Texto livre de evento: risco aceito

Só `events.venue` tem `CHECK` contra endereço residencial e militar
(`20260802001200_events_rsvp.sql:19-27`); `title` e `description` são texto
livre. Decisão do dono (23/09): aceitar o risco, sem estender a checagem — o evento
de cidade já é público para a cidade, a responsabilidade pelo texto é de quem
organiza, e deny-list em texto livre dá falso positivo. Mitigação real: denúncia e
moderação existentes; condição de reabertura (a).

## Alternatives considered

1. **Manter como está.** Zero risco novo; mantém a promessa vazia. Rejeitada.
2. **Só eventos.** Menor superfície; perde o Guia, a referência mais útil de quem
   chega. Rejeitada.
3. **Eventos + Guia (esta decisão)**, com o Guia por funções que omitem colunas
   técnicas.
4. **Abertura por analogia** (vitrine, perguntas, feed). Rejeitada: consentimento
   do prestador; perguntar e o feed são participação.
5. **Leitura anônima.** Rejeitada: tornaria referência da comunidade conteúdo
   público indexável.
6. **Guia por policy de tabela** (versão de 19/09). Rejeitada em 23/09: exporia as
   colunas técnicas de linhas aprovadas ao país.

## Market or reference baseline

Produtos de comunidade com recorte geográfico separam descoberta de participação:
eventos e referências públicas de outra região aparecem para quem está logado;
grupos, conversa e presença exigem participação. Neste repositório a separação já
é regra escrita: `PROCESSO-DE-CONSTRUCAO.md` §3 e §8 e a spec de 08/09 §3.1
("Cidade de exploração é filtro… O catálogo nacional pode mostrar dados de
descoberta autorizados em outra cidade").

## Proposed divergence from baseline

Portão mais estreito que o de mercado: titular verificado com cidade, não conta
logada; colunas operacionais nunca saem da cidade; vitrine fechada por
consentimento.

## Evidence and sources

Citadas ao longo do texto; resumo: policies atuais
(`20260815210000`, `20260820060533:39-73`, `20260910202110:136-165`); helper
(`20260802000700:68-81`); fechamentos (`20260805214709:264-275,392-407`,
`20260806171204:39-88`, `20260911051230:55`, `20260915190000:34-49`,
`20260910202110:176-191`, `20260825185327`); guardas
(`rls-or-column-regression.test.sql:321-327,454-458,587,697`,
`full-regression.sql:181`, `tests/scope/rls-structure.test.mjs`); interface
(`city-reference.tsx:79,123,203,226`, `events/page.tsx:590-610`,
`events/[id]/perguntas/page.tsx:195,249`, `guide/[id]/page.tsx:349-361`,
`events/event-invites-actions.ts:41,62-74`).

## Benefits

O militar em trânsito lê eventos e Guia da cidade de destino antes de chegar. A
promessa da interface deixa de ser vazia. A transferência declarada ganha porta.

## Risks

- Texto livre de evento lido nacionalmente (D6) — aceito, com reabertura.
- Identidade do organizador — mitigada por D5 (cliente de sessão, guarda de fonte).
- Policy ou função mal escrita abre o que D2 fecha — mitigado pelos predicados
  fixos, pelas funções que listam colunas explicitamente e pelos negativos.
- `INSERT … RETURNING` em `events` — mitigado (A13).
- Fixtures: os testes existentes de "outra cidade não vê" usam um usuário não
  verificado (`fixtures/foundation.inc:49-55`); o fixture novo de "verificado em
  outra cidade" é outro usuário, e aqueles testes não mudam.
- Suporte: visitante esperando confirmar presença — mitigado pela frase de D5.

## Reversal cost

Baixo: uma migration que remove a policy de eventos, as funções e o helper, e volta
a contagem de `events` para 3. Nenhum dado novo (D3). As tabelas do Guia não
ganham policy, então nada a desfazer nelas.

## Success metric

Contrato de testes abaixo verde em banco sem seed, junto da migration; em produção,
nenhum incidente de privacidade sobre evento/Guia de outra cidade em 30 dias.

## Reopen condition

(a) Denúncia de evento de cidade com endereço residencial, OM ou dado pessoal lido
por alguém de outra cidade; (b) qualquer caminho que exponha nome do organizador
ou coluna técnica do Guia fora da cidade; (c) pedido para ampliar a leitura a
familiar sem verificação, verificado sem cidade, `anon`, vitrine, perguntas ou
feed; (d) falha de qualquer negativo.

## Relação com decisões anteriores

- **`ADR-20260816-transferencia-e-pertencimento`** (accepted): substituído só na
  recusa da alternativa B quanto à **leitura**; perguntar segue fechado; a
  transferência declarada continua sendo o caminho. Recebe ponteiro.
- **`ADR-20260909-guia-artigo-estruturado`** (approved): a leitura do artigo era da
  localidade do membro. Esta decisão acrescenta a leitura nacional **por função**,
  sem mudar as policies daquele ADR nem o fluxo de correção (que segue local).
- **`ADR-20260921-curadoria-assistida-do-guia`** (approved): parte de "a única
  policy de leitura de `arrival_guide_entries` exige `status = 'approved'`". A
  premissa continua verdadeira: a tabela não ganha policy (D1b).
- **`ADR-20260922-aprovacao-por-identidade-sem-cidade`** (accepted): o verificado
  sem cidade não recebe a leitura nacional (D1); escolhe a cidade no onboarding.

## What this ADR does not decide

Mercado e Moradia nacionais; perguntar na cidade visitada; cancelar a transferência;
notificações entre cidades; leitura nacional para familiar sem verificação própria.

## Contrato de testes (mesma entrega da migration; pgTAP em banco sem seed)

Fixture novo: titular verificado **com vínculo corrente em outra cidade** e um
verificado **sem vínculo**. Os usuários dos fixtures existentes não mudam.

A. Eventos: (A1+) verificado com cidade A lê evento de cidade de B; (A2−) não lê
evento de grupo de B; (A3−) nem de comunidade de B; (A4−) não verificado não lê;
(A5−) `anon` não lê; (A6−) familiar sem verificação não lê; (A7−) verificado sem
cidade não lê; (A8−) não insere evento em B (42501); (A9−) não atualiza evento de
B; (A10−) não cria RSVP em B (42501); (A11−) não lê `event_rsvps` de B; (A12−) não
lê `event_invites` de B; (A13+) `insert … returning *` em evento funciona; (A14+)
membro de B lê evento de B; (A15−) verificação revogada não lê; (A16−) não lê post
municipal de B; (A17−) `open_event_question` em evento de B dá 42501.

B. Guia: (B1+) `national_guide_entries(B)` devolve a entrada aprovada de B ao
verificado com cidade A; (B2−) não devolve pendente nem rejeitada; (B3−) não
devolve nada a não verificado, verificado sem cidade, familiar sem verificação;
(B4−) `anon` não executa a função; (B5−) o resultado não tem as colunas
`submitted_by`, `source`, `source_reply_id`, `confidence`, `review_note`;
(B6+) `national_guide_article` devolve artigo publicado e suas seções de entrada
aprovada de B; (B7−) não devolve artigo `draft`/`withdrawn` nem de entrada
pendente, nem as seções deles; (B8−) o resultado não tem `curated_by`; (B9−)
leitura direta de `arrival_guide_entries`, `guide_articles` e
`guide_article_sections` de B pelo verificado de A continua vazia (a RLS das
tabelas não mudou); (B10−) não salva entrada de B; (B11−) não cria
`guide_correction_requests` em B; (B12−) `suggest_guide_entry` grava em A;
(B13+) membro de B continua lendo o Guia de B pelas tabelas.

C. Vitrine: (C1−) verificado de A não vê prestador sem alcance em A
(`can_see_provider`).

D. Guardas: `rls-or-column-regression.test.sql:587` → 4, com o motivo no mesmo
commit; `:697` **não muda** (continua 1); `:321-327`, `:454-458` e
`full-regression.sql:181` intactos; `tests/scope/rls-structure.test.mjs` verde;
`supabase/tests/guide-article.sql`, `arrival-guide.sql` e `authz-denied-matrix.sql`
verdes sem alteração (o usuário `...003` segue não verificado).

E. Interface (componente ou E2E, positivo e negativo): visitante não vê RSVP,
"Pedir mais informações", formulário de `/perguntas`, nome/link do organizador,
"Sugerir atualização", "Salvar" nem nota da curadoria; membro da cidade continua
vendo todos; estado "leitura não liberada" distinto de "cidade vazia"; guarda de
fonte de que nenhum arquivo do caminho de visitante importa `lib/supabase/server`.

## Approval

Aprovação humana explícita por Juan em **2026-09-19**: *"Eu quero as duas coisas,
poder mudar meu local de residência declarando transferência, e uma simples
consulta em outra localidade, por exemplo, um militar que sai do RJ de férias para
Brasília, poderia ver entre outras coisas os eventos da cidade."*

Decisões complementares de Juan em **2026-09-23**, nesta sessão, respondendo às
perguntas feitas depois dos pareceres independentes:

- implementar a leitura nacional junto com o conserto dos grupos: "Conserto + ADR
  nacional";
- texto livre de evento (D6): "Aceitar o risco";
- artigo do Guia de outra cidade (D1b/D5): "Abre também";
- botão "Pedir mais informações" do visitante (D5): "Esconder e explicar";
- colunas técnicas do Guia (D1b): "Esconder os técnicos";
- verificado sem cidade (D1): "ele foi aprovado, mas deve escolher uma cidade no
  onboarding".

Pela `RISK_MATRIX.md` isto é **R3**. A implementação só começa com
`critic_verdict: PASS` confirmado por revisão independente desta versão.
