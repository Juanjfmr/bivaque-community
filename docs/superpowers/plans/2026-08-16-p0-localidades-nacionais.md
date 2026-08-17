# P0 — localidades nacionais

> Plano de execução. Escrito em **2026-08-16** e **reescrito no mesmo dia**, depois da sessão de
> treze decisões que mudou a forma da admissão e reabriu o pertencimento. Marque `- [x]` conforme
> avança e **commite por task**.
>
> Leia [`README.md`](README.md) deste diretório inteiro antes de começar.

## Os quatro ADRs que este plano executa

Leia os quatro **antes** de abrir qualquer task. Eles não se repetem aqui.

| ADR | Risco | O que decide |
|---|---|---|
| [`national-localities`](../../decisions/ADR-20260816-national-localities.md) | R3 | o Bivaque é nacional desde o cadastro; Manaus é piloto operacional |
| [`forma-da-admissao`](../../decisions/ADR-20260816-forma-da-admissao.md) | R3 | admissão em duas fases; nome sugerido pelo Portal e confirmado; waitlist geográfica sai |
| [`transferencia-e-pertencimento`](../../decisions/ADR-20260816-transferencia-e-pertencimento.md) | R3 | pertencimento deixa de ser exclusivo; um perfil por pessoa; **a P0 leva só a base** |
| [`shells-e-navegacao`](../../decisions/ADR-20260816-shells-e-navegacao.md) | R2 | papéis são shells; navegação é container — **executado nas ondas D2 e E, não aqui** |

## Dois portões antes da primeira linha de código

**1. Os quatro ADRs estão `critic_verdict: pending`.** Três são R3. A `RISK_MATRIX.md` exige
veredito `PASS` e aprovação humana registrada — a aprovação já consta nos quatro; o critic não.
**Não comece sem o veredito.**

**2. O merge do `origin` já foi feito em 2026-08-16**, então o ADR das localidades existe
localmente. Se você está numa cópia anterior, reconcilie antes: os quatro ADRs são o insumo deste
plano.

## Por que esta P0 vem antes de D2, E e F

`PILOT_LOCALITY_ID` aparece **15 vezes em 8 arquivos de runtime**, e **6 desses 8 são editados
pelas ondas D2, E e F**:

| Arquivo | Chamadas | Onda que edita |
|---|---|---|
| `apps/web/lib/onboarding/verifyAndProvision.ts` | 4 — linhas 86, 94, 155, 163 | D2 (Tasks 2, 4, 6) |
| `apps/web/app/(shell)/community/page.tsx` | 3 — linhas 82, 142, 317 | E (Tasks 2, 4) |
| `apps/web/app/components/bivaque/feed-right-rail.tsx` | 2 — linhas 56, 60 | E |
| `apps/web/app/(shell)/profile/page.tsx` | 1 — linha 130 | E (Task 7) |
| `apps/web/app/(shell)/guide/page.tsx` | 1 — linha 47 | E (Task 8) |
| `apps/web/app/(shell)/events/page.tsx` | 1 — linha 252 | F (Tasks 3, 4) |
| `apps/web/app/components/bivaque/feed-composer.tsx` | 1 — linha 30 | E |
| `apps/web/app/components/bivaque/app-shell.tsx` | 1 — linha 243 | E |

Rodar as ondas primeiro é escrever teste sobre essas linhas e reabri-las aqui depois.

**E há uma razão mais forte, que apareceu com a decisão da transferência.** A Task 3 muda duas
chaves primárias. Isso é a única parte irreversível depois de existir usuário real, num projeto
sem staging (D42). Ela tem que acontecer **antes do primeiro membro**, não depois.

## O guardrail de terminologia

Errar isto é como a confusão volta:

- **Multi-localidade da plataforma** — o Bivaque opera várias localidades. **Já é assim no
  modelo**; esta P0 remove o acoplamento que impede o uso.
- **Localidade corrente do usuário** — depois da Task 3, a pessoa tem **uma** localidade corrente
  e, no máximo, um vínculo de saída com prazo. A P0 entrega só a **base de schema** disso; o
  prazo, o lembrete e a degradação são a onda de transferência.
- **Multi-localidade simultânea sem limite** — recusada. Não é isto que a Task 3 constrói.
- **Multi-tenancy / organizações** — dimensão separada de geografia. **Fora de escopo**, e não
  descreva esta P0 como introduzindo ou removendo tenancy.

## O que este plano não faz

Prazo e degradação da transferência (onda própria, logo depois), múltiplas localidades sem
limite, histórico de mudança de localidade, tenancy, white-label, billing, os dois consoles
(onda D2), containers de navegação (onda E), interesses e grupos sugeridos (onda E). Se uma task
parecer pedir uma dessas, ela está errada — **pare e reporte**.

---

## Task 1: o catálogo canônico de municípios, e os feriados

`public.localities` (`20260802000100_locality_profile_foundation.sql:11-19`) tem `slug`,
`city_name`, `state_code`, `country_code` e `admission_mode`. **Não tem código IBGE**, que é a
identificação canônica que a issue #20 pede.

- [x] **Step 1: de onde vem o dado**

  [BrasilAPI](https://brasilapi.com.br/docs), verificada na fonte em 2026-08-16:

  | Endpoint | Devolve |
  |---|---|
  | `GET https://brasilapi.com.br/api/ibge/uf/v1` | 27 unidades federativas — `{ id, sigla, nome, regiao, capital }` |
  | `GET https://brasilapi.com.br/api/ibge/municipios/v1/{UF}` | municípios da UF — `{ nome, codigo_ibge }` |
  | `GET https://brasilapi.com.br/api/feriados/v1/{ano}` | `{ date, name, type, weekday }` — 14 itens em 2026 |

  Amostra real de `/municipios/v1/AM`: `{"nome":"ALVARÃES","codigo_ibge":"1300029"}`.

  Duas propriedades do payload que decidem o código, e nenhuma é óbvia:

  - **`nome` vem em CAIXA ALTA e com acento.** `"ALVARÃES"`, não `"Alvarães"`. Normalize para
    exibição e guarde o normalizado.
  - **`codigo_ibge` é string, não número.** Sete dígitos. Tratar como número é a porta para
    perder zero à esquerda no dia em que alguém reformatar. **Guarde como texto.**

- [x] **Step 2: a BrasilAPI é dependência de geração, nunca de runtime**

  `scripts/localities/generate-catalog.mjs` consulta os 27 UFs, monta as linhas e **emite SQL
  versionado no repositório**. O onboarding nunca chama a BrasilAPI.

  Duas razões, e a segunda não é arquitetura.

  **Arquitetura.** O Portal da Transparência já é um terceiro no caminho crítico da admissão, com
  throttle, circuit breaker e punição de 8 horas (§7.9). Pôr um segundo terceiro no mesmo caminho
  multiplica o modo de falha para obter dado que **muda de década em década**.

  **Termos de uso.** O [README da BrasilAPI](https://github.com/BrasilAPI/BrasilAPI) pede
  explicitamente que não se faça crawling nem validação automatizada em volume: *"O volume de
  consultas deve ter a natureza de uma pessoa real requisitando um determinado dado."* Serviço
  gratuito, voluntário, em beta, sem garantia de disponibilidade. Vinte e sete requisições uma
  vez, para gerar artefato versionado, respeita isso. Uma chamada por cadastro, não.

  O script roda quando alguém decide rodar. **Não entra em CI, não entra em build, não entra em
  request.** Vale para toda a BrasilAPI neste repositório — ver o apêndice.

- [x] **Step 3: a migration**

  `npx pnpm@11.18.0 exec supabase migration new locality_ibge_catalog`.

  - `ibge_code text` com `check (ibge_code ~ '^[0-9]{7}$')`, **`unique`**. É a identidade
    canônica: sem ela, "Bom Jesus" vira quatro localidades por erro de grafia.
  - `ibge_code` fica nullable só o tempo da migration de dados, e a mesma migration o torna
    `not null` depois de preencher Manaus.
  - **O `slug` tem que carregar a UF.** O schema declara `slug text not null unique` (`:13`), e
    nomes de município se repetem entre estados — "Bom Jesus" existe em vários. Slug só com o nome
    **colide na inserção** e a carga morre no meio. Gere `bom-jesus-pi`: sem acento, minúsculo,
    hifenizado, sufixo da UF.
  - Preserve a linha de Manaus e o UUID dela. Reescrever o `id` quebra `locality_memberships`,
    `profiles`, `posts`, `groups`, `events` e os pgTAP que fixam UUID. **`update`, nunca
    `delete`+`insert`.**

- [x] **Step 4: a carga**

  O SQL gerado entra como migration de dados timestamped. **Não como `seed.sql`:** o seed é o de
  desenvolvimento local e é apagado por `db:reset --no-seed`, que é como o pgTAP roda. Catálogo
  tem que existir nos dois estados.

- [x] **Step 5: feriados nacionais, pelo mesmo script**

  Enquanto o script está aberto, gere a tabela de feriados nacionais, alguns anos à frente, na
  mesma migration de dados. Não é escopo criativo: é insumo da **Task 4 da onda F** (encontro
  recorrente), e gerar agora evita uma segunda visita à BrasilAPI.

  **Só feriado nacional existe nessa rota.** Feriado municipal e estadual não estão lá; não os
  invente e não os semeie à mão.

- [x] **Step 6: testes**

  - pgTAP em `supabase/tests/locality-catalog.sql`: `ibge_code` único e obrigatório; código com 6
    dígitos rejeitado; **Manaus manteve o UUID original** (asserção literal sobre o id); o total
    de linhas bate com a contagem que o script registrou — **grave o número produzido no cabeçalho
    da migration** e asserte contra ele, em vez de escrever de memória um total de municípios.
  - pgTAP dos feriados: os anos esperados existem e 2026-02-16 consta como Carnaval.
  - Unitário sobre o gerador: `"ALVARÃES"` vira `"Alvarães"`; o slug de `"Bom Jesus"/PI` é
    `bom-jesus-pi`; **dois municípios homônimos em UFs diferentes produzem slugs distintos** —
    este é o teste da task.

- [x] **Step 7: gate e commit**

  `feat(localities): canonical IBGE municipality catalog and national holidays`.

---

## Task 2: `admission_mode` deixa de ser uma bomba armada

Achado da análise de 2026-08-16, e **nem o ADR nem a issue o mencionam** — o critério de aceite
procura por `PILOT_LOCALITY_ID` e não pega isto.

`public.localities.admission_mode` existe desde `20260802000100:17`, com **default
`waitlist_only`**. O enum ganhou `verification_gated` em `20260809120000` e Manaus foi movida em
`20260809120100`. **Nenhuma linha de runtime lê essa coluna** — confirmado por
`grep -rn "admission_mode" apps/web packages`, que volta vazio.

Consequência: quando a Task 1 inserir os municípios, **cada cidade nova nasce `waitlist_only`**.
Se alguém depois ligar a coluna ao gate, a restrição que este plano remove do código volta pelos
dados — e a decisão 3 do ADR das localidades é violada sem que exista uma linha de
`PILOT_LOCALITY_ID` em lugar nenhum. É o `pilot=true` que a decisão 8 proíbe, já no schema antes
de a decisão existir.

- [x] **Step 1: o default muda**

  `alter column admission_mode set default 'verification_gated'`, e `update` nas linhas do
  catálogo. Elegibilidade é o CPF contra o Portal, não a geografia.

- [x] **Step 2: a coluna sobrevive, com propósito escrito**

  Não remova. `invite_only` e `waitlist_only` continuam sendo exceções legítimas para uma
  localidade específica no futuro; o que muda é **deixarem de ser o padrão**. O comentário na
  migration diz isso com todas as letras, incluindo que nenhum código de runtime lê a coluna hoje.

- [x] **Step 3: o teste de escopo que trava a recaída**

  `tests/scope/admission-mode.test.mjs`: o default no schema é `verification_gated`, e nenhuma
  localidade do catálogo está em `waitlist_only`. Quem quiser exceção quebra o teste e justifica —
  que é o comportamento desejado.

- [x] **Step 4: gate e commit**

  `fix(localities): admission mode stops encoding rollout as eligibility`.

---

## Task 3: a base do pertencimento — duas chaves primárias

**A task mais perigosa do plano, e a única irreversível.** Ela existe agora, e não na onda de
transferência, por um motivo só: mudar chave primária depois de existir usuário real em produção,
sem staging (D42), é a migração que mais dói.

Executa a base do
[`ADR-20260816-transferencia-e-pertencimento`](../../decisions/ADR-20260816-transferencia-e-pertencimento.md).
**Leia o ADR inteiro antes de começar.** A P0 entrega uma localidade por pessoa; o prazo, o
lembrete e a degradação são a onda seguinte.

> ### Antes de debugar qualquer coisa nesta task
>
> Os seis asserts de `supabase/tests/locality-profile-access.sql` mudam aqui. **São exatamente os
> mesmos seis que o perfil fantasma "Visual Capture" quebra** (`AGENTS.md` §Known traps,
> `README.md` deste diretório). Durante esta task vai ser difícil distinguir regressão real de
> armadilha conhecida.
>
> **Antes de atribuir qualquer falha ao seu diff:** `db:reset` limpo, sem dev server e sem
> captura visual rodando, depois `test:db`. Se a falha some, era o fantasma.

- [x] **Step 1: `locality_memberships` aceita mais de uma linha**

  A chave primária vira `(user_id, locality_id)`. O `unique (user_id, locality_id)` que hoje
  convive com a PK (`20260802000100:25`) **não faz nada** enquanto `user_id` for PK — é
  exatamente a chave que este passo promove. Remova a redundância ao promover.

  `private.is_locality_member(target_locality_id)`
  (`20260802000300_foundation_rls.sql:21-26`) **não muda uma linha**: é um teste de pertencimento
  a conjunto, e já funciona com N linhas. Confirme lendo, não presuma.

- [x] **Step 2: `profiles` perde a localidade — e o alcance é maior que uma coluna**

  Um perfil por pessoa. `locality_id` sai de `public.profiles`, junto com a FK composta para
  `locality_memberships (user_id, locality_id)` (`20260802000100:38-40`) e o índice
  `profiles_locality_visibility_idx` (`:43-44`).

  **Inventário medido em 2026-08-16 — confirme antes de mexer, e refaça o grep:**

  **Três policies leem `locality_id` de `profiles`:**

  | Policy | Onde | Vira |
  |---|---|---|
  | `profiles_select_visible_in_locality` | recriada em `20260814052814_remove_hidden_visibility.sql:37` | "divide alguma localidade comigo" |
  | `profiles_insert_self` | `20260802000300:72-79` | só `user_id = auth.uid()` |
  | `profiles_update_self` | `20260802000300:81-89` | só `user_id = auth.uid()` |

  `profiles_select_community_comember` (`20260805214709:536`) **não** usa `locality_id` — usa
  `community_memberships`. Não a toque.

  **Nove junções `pr.locality_id = p.locality_id`, em cinco migrations**, todas viram
  `pr.user_id = p.user_id`:

  `20260802000900_community_feed.sql:142` · `20260802001600_reports.sql:199` ·
  `20260804212011_post_reactions.sql:136` · `20260805170545_fix_post_scope_leak.sql:242` ·
  `20260805214709_community_scope.sql:509` · `20260805215020_community_feeds.sql:74,156,233`.

  As três últimas são `feed_posts`, `feed_community` e `feed_group`. Recrie com
  `drop function` + `create function` — `create or replace` com `returns table` falha quando
  qualquer nome de coluna difere — e **repita os `revoke`/`grant`**: recriar descarta os
  privilégios, e esquecer isso deixa `authenticated` sem `execute` e o feed inteiro em branco.

- [x] **Step 3: "quem pode ver meu perfil" passa a ser calculado**

  `profiles_select_visible_in_locality` deixa de comparar uma coluna e passa a perguntar se quem
  olha divide **alguma** localidade com o dono do perfil, pelas memberships.

  Isso é mais correto que hoje, e é o ponto em que um erro vira vazamento entre cidades. **Teste
  positivo e negativo obrigatórios** (§12 regra 7), e o negativo é o que importa: membro de
  Manaus **não** vê perfil de membro exclusivo do Rio.

- [x] **Step 4: a P0 continua entregando uma localidade por pessoa**

  O schema passa a permitir duas linhas; **o produto ainda cria uma**. Não construa aqui o
  vínculo de saída, o prazo, o lembrete nem o seletor — é a onda de transferência, e misturar
  torna esta task impossível de revisar.

- [x] **Step 5: testes**

  - pgTAP em `supabase/tests/locality-membership-multi.sql`: duas memberships para o mesmo
    usuário são aceitas; `is_locality_member` devolve verdadeiro para as duas; **um usuário sem
    membership não vê perfil de ninguém** (negativo).
  - `supabase/tests/locality-profile-access.sql` — os seis asserts mudam de forma. Releia cada um
    antes de reescrever: eles descrevem a propriedade de privacidade, não a implementação.
  - `locality-profile-deny-cross-user.sql`, `authz-allowed-matrix.sql`,
    `authz-denied-matrix.sql`, `full-regression.sql`, `post-scope-leak.sql`,
    `community-feeds.sql`, `post-reactions.sql`, `reports-denials.sql` — todos tocam as junções
    ou as policies. **Rode a suíte inteira**, não só o arquivo novo.

- [x] **Step 6: gate e commit**

  `feat(locality): belonging stops being exclusive and the profile becomes one per person`.

---

## Task 4: a admissão se parte em duas fases

Executa o [`ADR-20260816-forma-da-admissao`](../../decisions/ADR-20260816-forma-da-admissao.md).

`verifyAndProvision.ts` faz tudo entre as linhas 59 e 106: consulta o Portal, decide
elegibilidade **e** cria membership e profile. Como não há momento em que a pessoa seja
consultada, os dois dados que só ela pode fornecer são inventados: a localidade vira constante
(`:86`, `:94`) e o nome vira `"Novo membro"` (`:95`).

A §4.1 diz o contrário: **cada fato é atestado por quem consegue atestá-lo.** O Estado atesta
elegibilidade; a pessoa declara onde mora; o dono da comunidade atesta a vila.

- [x] **Step 1: `verify` e `provision`**

  `verifyAndProvision` se parte em duas funções. `verify` consulta o Portal, consome tentativa,
  grava o outcome e para. `provision` recebe localidade e nome **já validados** e cria membership
  e profile.

  O import de `PILOT_LOCALITY_ID` (`:3`) sai do arquivo. As quatro chamadas somem **por
  construção**, não por substituição — que é a diferença entre corrigir e remendar.

- [x] **Step 2: `provision` exige localidade, sem default**

  Campo obrigatório na entrada. **Um default aqui é `PILOT_LOCALITY_ID` disfarçado**, e
  reintroduz o bug no primeiro chamador que esquecer de passar.

- [x] **Step 3: a reconciliação de `pending` não provisiona**

  Isto resolve, sem coluna nova, o problema que a D2 Task 2 enfrentaria:
  `private.verification_outcomes` (`20260802000200:25-36`) guarda `status`, `eligibility_class` e
  `checked_at` — nenhuma localidade —, e o `profiles` só nascia quando a verificação passava.

  O job responde **"esta pessoa é elegível?"** e para. Não há localidade a guardar num `pending`,
  porque a pergunta ainda não foi feita. Não adicione `intended_locality_id` a
  `verification_outcomes`: seria dado coletado que pode nunca ter uso, o que a LGPD trata como
  finalidade sem propósito.

- [x] **Step 4: o gate reconhece "elegível sem membership"**

  `onboarding/status/page.tsx:58` hoje faz `if (membershipResult.data !== null || status ===
  "verified") redirect("/community")`. Depois desta task isso está **errado**: quem é `verified`
  sem membership tem que ir para o passo da Task 5, não para o feed.

  Este é o estado novo que a fase dupla cria, e é o mais fácil de esquecer.

- [x] **Step 5: testes**

  - Unitário: `verify` não escreve em `locality_memberships` nem em `profiles` (**negativo, e é o
    teste da task**); `provision` sem localidade é erro de tipo, não silêncio.
  - pgTAP em `supabase/tests/provision-locality.sql`: provisionar em duas localidades produz duas
    memberships corretas; o perfil é **um só** nos dois casos (consequência da Task 3).
  - Unitário sobre o job de reconciliação: verificado enfileira `outbox` e **não** cria membership.

- [x] **Step 6: gate e commit**

  `refactor(onboarding): split eligibility from provisioning`.

---

## Task 5: o passo pós-elegibilidade

A tela onde a pessoa informa o que só ela sabe. Acontece uma vez, com ela presente, depois de
saber que passou.

- [x] **Step 1: localidade, obrigatória, validada no servidor**

  Seleção de UF e depois município, com busca por nome. 27 + N opções não cabem num `<select>`
  único — e o `Select` do HeroUI é o componente, não um `<select>` cru.

  O catálogo é servido pelo backend a partir da tabela da Task 1. **Nunca pela BrasilAPI em
  runtime.**

  `api/onboarding/route.ts` valida contra o catálogo **antes** de provisionar. Aceite `ibge_code`
  ou o `id` da localidade — escolha um e use o mesmo em todo o fluxo. **Não aceite texto livre de
  cidade:** é o caminho para o catálogo duplicado que o risco 2 do ADR descreve. Localidade
  ausente ou desconhecida → 400, sem eco de mensagem de banco.

- [x] **Step 2: o nome — o Portal sugere, a pessoa confirma**

  Hoje `classifyPortalResponse` (`lib/portal/classify.ts`) lê `orgao`, `situacao` e
  `tipoServidor` e **joga fora**; `VerificationResult` (`lib/portal/types.ts`) carrega `status` e
  `eligibilityClass`. Essa é a fronteira da D11 implementada em código.

  O nome civil passa a atravessar essa fronteira **em memória, para preencher o campo**, e a
  pessoa confirma ou ajusta. **O que persiste é a declaração dela**, não o extrato do registro
  federal — é assim que a D11 continua de pé.

  **Organização militar, posto e situação continuam proibidos de persistir.** `AGENTS.md:205`, a
  D11 e o [`ADR-20260811-om-declarada`](../../decisions/ADR-20260811-om-declarada.md), que segue
  `proposed` com cinco pré-requisitos abertos. Não amplie o `VerificationResult` além do nome.

- [x] **Step 3: a política de nomes (D23) se aplica aqui**

  `20260802000100:31-40` valida só comprimento 2-80. Migration nova: normalização Unicode NFC,
  barrar caracteres de controle e marcas bidi. É segurança, não produto — nome que se lê como
  outro é o vetor mais barato de engano numa rede onde as pessoas se reconhecem por nome.

  Este é o único lugar do produto onde a política tem onde ser aplicada, e é por isso que ela sai
  da onda E e vem para cá.

- [x] **Step 4: o que NÃO entra neste passo**

  **Assuntos de interesse e grupos sugeridos ficam na onda E.** Em cidade recém-aberta não existe
  grupo a sugerir, e o passo apareceria vazio exatamente onde a solidão já é o risco 1 do ADR.
  Coletar agora para usar depois quebraria a regra 3 da §12 e a exigência de finalidade declarada
  na coleta.

  **Pedido de entrada em vila também não.** Misturaria dois atestadores diferentes na mesma
  interação, e a §5.2 os separa de propósito.

- [x] **Step 5: testes**

  - Unitário sobre a rota: `ibge_code` válido passa; código inexistente é 400; **código com
    formato certo mas ausente do catálogo é 400** (negativo — é a diferença entre validar formato
    e validar existência); ausência de localidade é 400.
  - pgTAP em `supabase/tests/display-name-policy.sql`: nome com `U+202E` rejeitado; caractere de
    controle rejeitado; nome legítimo com acento passa.
  - Unitário: nenhum campo além do nome atravessa `VerificationResult` — **teste de escopo**, que
    é o que impede a OM de entrar por descuido.
  - E2E: o formulário lista municípios de uma segunda UF e conclui a escolha.

- [x] **Step 6: gate e commit**

  `feat(onboarding): post-eligibility step with locality and confirmed name`.

---

## Task 6: o convite familiar herda a localidade corrente do titular

`acceptFamilyInvitationAndProvision` (`verifyAndProvision.ts:130-175`) grava
`PILOT_LOCALITY_ID` em `:155` e `:163`.

- [x] **Step 1: a regra, e ela ficou mais precisa que no ADR**

  A localidade do dependente é a **corrente** do titular no momento do **aceite**.

  Três precisões, e a terceira só existe por causa da Task 3:

  - **do aceite, não do envio** — se o titular foi transferido entre convidar e aceitar, o
    dependente cai onde a família está, não sozinho numa cidade de onde todos saíram;
  - **corrente, não de saída** — se o titular tiver um vínculo de saída ativo (onda de
    transferência), o dependente vai para o destino;
  - **nunca escolhida pelo dependente** — o convite familiar é a única via que concede acesso sem
    CPF (D16), com cota de 5 por titular. Deixar o convidado escolher transformaria isso em cinco
    contas não verificadas colocáveis em qualquer município do Brasil.

- [x] **Step 2: o titular sem membership**

  Estado que hoje não pode acontecer — `is_verified_holder` protege o envio — mas que o código
  precisa tratar com erro explícito em vez de gravar nulo.

- [x] **Step 3: testes**

  pgTAP em `supabase/tests/family-invite-locality.sql`: titular em Manaus produz dependente em
  Manaus; titular numa segunda localidade produz dependente **naquela** (é o teste que prova a
  decisão); titular sem membership faz o aceite falhar (negativo); **dependente não consegue
  escolher a própria localidade** (negativo).

- [x] **Step 4: gate e commit**

  `fix(family-invite): derive the dependant locality from the holder`.

---

## Task 7: o shell resolve a localidade — reescrita em 2026-08-17

> **Esta task foi tentada, compila, e não deve ser commitada como está.** O trabalho está na
> árvore, sem commit. Leia esta seção inteira antes de tocar em qualquer arquivo: **a maior parte
> se aproveita** e a correção é cirúrgica, não um recomeço.
>
> **O que se aproveita, e é bom:** `tests/scope/no-pilot-locality.test.mjs` está **melhor do que
> esta task pedia** — tira comentários antes de buscar, preserva string literal, pega o UUID cru
> de Manaus, tem guarda contra passar vazio e testa o próprio stripper. **Não reescreva.** O
> inventário de call sites e o `tests/e2e/two-localities.spec.ts` também ficam.
>
> **O que muda: a forma do resolvedor e o número de leituras.**

### O que a primeira tentativa produziu, e por que não passa

`lib/locality.ts` expõe `getCurrentLocalityId(supabase): Promise<string | null>`, que faz uma
consulta por chamador. O resultado medido:

| Arquivo | Chamadas |
|---|---|
| `community/page.tsx` | **3** — linhas 44, 94, 154 |
| `feed-right-rail.tsx` | 1 — linha 51 |
| `app-shell.tsx` | 1 — linha 42 |
| `events/page.tsx` | 1 — linha 250 |
| `guide/page.tsx` | 1 — linha 47 |
| `profile/page.tsx` | 1 — linha 129 |

São **oito call sites, onze chamadas** — e `feed-right-rail` e `app-shell` renderizam dentro da
`community/page`, então **abrir a home dispara cinco consultas para o mesmo valor**. Era
literalmente o que o Step 1 original proibia: *"espalhar oito consultas é trocar um acoplamento
por outro, e a próxima tela adiciona a nona"*.

Três defeitos concretos, além da contagem:

1. **`.order("joined_at", { ascending: true }).limit(1)` devolve a membership mais ANTIGA.** Na
   onda T o vínculo antigo é a cidade de **origem** — a que a pessoa está deixando. Este
   resolvedor vai devolver a cidade errada, e não é um caso de "precisa reescrever": é resultado
   incorreto, silencioso.
2. **`if (error) return null` engole o erro.** Falha de infraestrutura vira "você não tem
   localidade", que vira tela vazia. É exatamente a armadilha que o
   [`README.md`](README.md) deste diretório documenta: *"leia o `error` de toda consulta"*.
3. **`?? ""` em cinco lugares** produz `.eq("locality_id", "")`. O Postgres não devolve vazio —
   devolve `invalid input syntax for type uuid`. É um caminho de erro que ninguém desenhou, com
   mensagem que não diz a causa real.

### A forma correta

- [x] **Step 1: resolver uma vez, no servidor, no shell**

  A resolução acontece em **`apps/web/app/(shell)/layout.tsx`**, que é Server Component e roda
  uma vez por navegação. Um provider de cliente montado ali entrega o valor aos componentes de
  cliente — mesmo padrão do `ToastProvider`, que o `AGENTS.md` manda manter montado.

  Vale saber: `middleware.ts:108-113` **já consulta** `locality_memberships` no gate. O valor já
  é buscado uma vez por requisição; o problema é jogá-lo fora e buscar de novo cinco vezes.

- [x] **Step 2: a forma do valor, e por que não é um id solto**

  ```ts
  type LocalityContext = {
    current: { id: string; cityName: string }
    // onda T acrescenta aqui, sem tocar em nenhum consumidor:
    // outbound: { id: string; cityName: string; endsAt: string; readOnly: boolean } | null
  }
  ```

  Três propriedades, cada uma resolvendo um dos problemas acima:

  - **É objeto, não `string`.** A onda T acrescenta um campo; nenhum consumidor muda de
    assinatura. É a diferença entre acrescentar e reescrever onze lugares.
  - **Carrega `cityName`.** As Tasks 3 e 4 da onda E precisam do nome da cidade para o rótulo da
    navegação, o título da rota e o chip de alcance. Sem ele, cada tela consulta `localities` de
    novo — a nona consulta, de novo.
  - **`current` é não-nulo.** Ver o Step 3.

  A escolha de **qual** membership é a corrente não pode ser "a mais antiga". Enquanto a P0
  entrega uma por pessoa, qualquer critério funciona — e é justamente por isso que ele tem que
  ser explícito e comentado agora, senão a onda T herda `joined_at asc` e devolve a cidade que a
  pessoa está deixando.

- [x] **Step 3: o `null` morre no shell, não nas folhas**

  Dentro de `(shell)`, a localidade **nunca** é nula: quem não tem membership não deveria ter
  passado pelo gate — é o estado "elegível sem membership" que a Task 1 da D2 roteia para o passo
  de localidade da Task 5.

  Então o `layout.tsx` resolve e, se vier nulo, **redireciona**; não renderiza. O provider recebe
  valor não-nulo e o TypeScript garante o resto: nenhum consumidor trata `null`, porque o tipo não
  permite. **Onze tratamentos viram um, e o invariante fica estrutural em vez de combinado.**

  E o erro da consulta **é lido**. Falha de infraestrutura não é "sem localidade": é falha, e
  sobe.

- [x] **Step 4: os call sites**

  `community/page.tsx` (44, 94, 154) · `feed-right-rail.tsx` (51) · `app-shell.tsx` (42) ·
  `events/page.tsx` (250) · `guide/page.tsx` (47) · `profile/page.tsx` (129).

  Nos componentes de cliente, o `useEffect` que busca a localidade **some** — e com ele a condição
  de corrida do primeiro render, em que o valor ainda é nulo enquanto o feed já disparou.

  `feed-composer.tsx` saiu da lista: a primeira tentativa já o resolveu por outro caminho.
  Confirme com o teste de escopo, não com esta frase.

- [x] **Step 5: a ordem dos commits — a constante sai por ÚLTIMO**

  Foi inverter isto que produziu o estado atual: a constante saiu primeiro e a migração inteira
  ficou sem ponto de commit verde.

  1. Adicionar o provider e o hook, **mantendo** o que existe. Nada consome ainda. Gate verde.
     Commit.
  2. Migrar os **Server Components** — `events`, `guide`, `profile`. Gate verde. Commit.
  3. Migrar os **Client Components** — `community/page`, `app-shell`, `feed-right-rail`. Gate
     verde. Commit.
  4. Remover `getCurrentLocalityId` **e** manter o teste de escopo passando, no mesmo commit.
     Gate verde. Commit.

  Um commit por passo, não um por task. Quando a ferramenta de edição falhar no meio — e ela
  falhou nesta task —, perde-se um arquivo, não a árvore.

- [x] **Step 6: o teste de escopo já está pronto**

  `tests/scope/no-pilot-locality.test.mjs` mecaniza o critério *"runtime não usa
  `PILOT_LOCALITY_ID` para conceder acesso, provisionar ou filtrar conteúdo"* da issue #20.
  **Não o reescreva.** Se a lista `FORBIDDEN` precisar de entrada nova, acrescente.

- [x] **Step 7: E2E**

  `tests/e2e/two-localities.spec.ts` já existe: duas sessões, duas localidades; cada uma vê o
  próprio feed, os próprios eventos e o próprio guia; **nenhuma vê conteúdo da outra** — negativo,
  e é o que prova que a mudança não abriu vazamento entre cidades.

- [x] **Step 8: não rode banco para fechar esta task**

  Esta task não toca migration nenhuma. `db:reset`, `test:db` e `db:lint` não se aplicam, e rodar
  a captura visual junto expõe ao perfil fantasma "Visual Capture". **O gate é o critério.**

- [x] **Step 9: commit final**

  `refactor(locality): resolve the member scope once in the shell`.

### Dois reparos da Task 5, que cabem aqui

Achados ao revisar esta task. São pequenos e ficam mais caros depois.

- [x] **`suggestedName` está chegando em CAIXA ALTA.** `classify.ts` lê `nomeCivil` via
  `objectString`, que passa por `normalizeString` → `.trim().toUpperCase()`. O campo do passo
  pós-elegibilidade vai propor "JOÃO DA SILVA".

  **Não mexa em `normalizeString`** — ela existe para casar contra os `Set` de órgão e situação, e
  alterá-la quebra a classificação. Leia o nome por uma função própria que só faz `trim`.

  É o mesmo caso do `"ALVARÃES"` que a Task 1 manda normalizar; aqui passou.

- [x] **O caminho `servidor.pessoa.nome` não está verificado.** Se o campo não existir com esse
  nome na resposta real, `suggestedName` fica sempre ausente e o campo sempre vazio, em silêncio.

  Dois unitários com fixture: um com o campo, devolvendo o nome com a caixa preservada; outro
  **sem** o campo, devolvendo `verified` sem `suggestedName` — o negativo é o que prova que a
  ausência não quebra a verificação. Fixture, nunca chamada real ao Portal.

---

## Task 8: a waitlist geográfica sai do caminho

- [x] **Step 1: o desvio some**

  A opção "Não sou de Manaus" (`onboarding/page.tsx:431-474`) e o link "Entrar na lista de espera
  de outras localidades" na tela de status (`onboarding/status/page.tsx:127-132`) saem. Quem é
  elegível entra; quem não é, é rejeitado — e rejeição não é geográfica.

- [x] **Step 2: a tabela fica, e a remoção é migration própria — decisão do dono, tomada**

  `public.waitlist`, a RPC `add_to_waitlist(text, text, text)`,
  `20260815120000_waitlist_desired_city.sql` e o pgTAP
  `onboarding-consent-waitlist.sql` permanecem nesta onda.

  **Não ponha um `drop` dentro da mudança que reescreve o caminho de admissão**, num projeto sem
  staging (D42). Duas mudanças, cada uma verificável sozinha.

  Marque a linha correspondente no `PRODUCT_STATUS.md` como **obsoleta**, não como entregue, e
  abra a migration de remoção como trabalho seguinte com prazo escrito. Código morto sem prazo
  vira feature aos olhos de quem chega depois.

- [x] **Step 3: o painel de demanda muda de fonte**

  A ideia de "o operador vê a demanda por cidade" sobrevive, mas não da waitlist: sob o ADR
  qualquer pessoa elegível entra na própria cidade, então o sinal está em
  `locality_memberships` por localidade. Isso pertence ao console do fundador, e o console é a
  onda **D2** — registre e siga.

- [x] **Step 4: testes**

  E2E: pessoa elegível numa segunda localidade conclui o onboarding **sem** passar por lista de
  espera. É o critério de aceite 2 da issue #20, literal.

- [x] **Step 5: gate e commit**

  `feat(onboarding): eligible members join their own locality, no geographic waitlist`.

---

## Task 9: localidade vazia não pode parecer produto quebrado

Critério de aceite 10 da issue e **risco 1** do ADR. É o custo real da decisão, e ele cai inteiro
nesta task: quem se cadastra numa cidade onde ninguém entrou vê feed vazio, guia vazio, eventos
vazios e vitrine vazia — quatro superfícies em branco no primeiro minuto.

- [ ] **Step 1: o estado vazio diz a verdade**

  Não "nenhuma publicação ainda" — isso descreve uma sala que existe e está quieta. A verdade é
  outra: **você é dos primeiros aqui.** Diga isso, e ofereça o que faz sentido para quem é o
  primeiro: convidar alguém, e o guia da própria cidade quando houver.

  O componente `EmptyState` (`app/components/bivaque/empty-state.tsx`) já existe. É copy e
  ramificação, não componente novo.

- [ ] **Step 2: a densidade é fato, não adjetivo**

  A regra da §3.4 é de 30 a 40 pessoas ativas por semana. Abaixo disso a tela admite que a cidade
  está começando, em vez de fingir movimento.

- [ ] **Step 3: Manaus continua prioritária, e isso não toca elegibilidade**

  Decisão 7 do ADR. Prioridade vive no runbook e na métrica — **não** numa condicional que decide
  acesso. Se você precisar de um `if` sobre Manaus para implementar prioridade, o desenho está
  errado: **pare e reporte**.

- [ ] **Step 4: teste**

  E2E: sessão numa localidade sem conteúdo vê o estado vazio com caminho de ação, e **não** vê
  mensagem de erro nem tela em branco.

- [ ] **Step 5: gate e commit**

  `feat(ux): honest empty state for localities that are just starting`.

---

## Task 10: reconciliar o canon, e a auditoria

O ADR exige a reconciliação **antes do merge da implementação**, porque enquanto ela não
acontece existem duas fontes de verdade contraditórias.

- [ ] **Step 1: `BIVAQUE.md`**

  | Trecho | Diz hoje | Passa a valer |
  |---|---|---|
  | §1.2 | público restrito a "de Manaus" | elegibilidade nacional; Manaus é piloto operacional |
  | §5.2 / D14 | "Manaus" é a concessão após verificação | a **localidade escolhida** é a concessão |
  | §8 / D31 | escopo nacional fora; outras cidades adiadas | escopo nacional é o produto |
  | D02 | Manaus é a unidade do piloto | Manaus é prioridade de rollout |
  | §4.3 | perfil com uma localidade | um perfil por pessoa; a localidade vive na membership |

  **Preserve as partes não geográficas.** A D14 é o caso a cuidar: sem a metade geográfica, ela
  continua dizendo que a vila exige aprovação do dono — o alicerce da onda E e da própria decisão
  da transferência.

  Registre como decisão nova na tabela §9, com data e motivo, apontando para os quatro ADRs. Uma
  decisão só muda ali com data e motivo — é a regra do próprio documento.

- [ ] **Step 2: `PRODUCT_STATUS.md`**

  Mudam de sentido: "Verificação de CPF", "Waitlist" (para **obsoleta**), "Feed municipal" e as
  três linhas do §3 sobre perfil. E a nota do §"O que não foi verificado" sobre o limite do Portal
  sob rajada fica **mais** relevante, não menos: cadastro nacional é mais volume contra o mesmo
  teto de 180/min.

- [ ] **Step 3: E2E em duas localidades**

  Um `db:reset` **com seed**, pedido ao dono, uma vez. Roda o lote acumulado, incluindo
  `two-localities.spec.ts` da Task 7, que é o critério de aceite 8 da issue.

- [ ] **Step 4: auditoria visual**

  `node scripts/visual/loop.mjs` sobre `/onboarding`, `/onboarding/status`, o passo novo da Task
  5, `/community` e o estado vazio da Task 9. Veredito em
  `docs/agents/VISUAL_AUDIT-2026-08-XX-p0-localidades.md`.

- [ ] **Step 5: fechar os ADRs**

  Os quatro passam de `proposed` a `accepted`, com `critic_verdict` preenchido. O
  `linked_plan` do de transferência aponta para a onda seguinte, não para cá — a P0 leva só a base.

- [ ] **Step 6: commit**

  `docs: reconcile the canon with national localities`.

---

## Definição de pronto

Os critérios de aceite da issue #20, mais os que esta análise acrescentou:

- Gate verde após cada task.
- Pessoa elegível conclui onboarding em Manaus **e** numa segunda localidade, sem waitlist.
- `locality_memberships` e `profiles` nascem na localidade certa nos dois casos.
- **Nenhum `locality_memberships` ou `profiles` é criado sem a pessoa ter informado a
  localidade.**
- **Nenhum perfil nasce com nome inventado pelo código** — `grep` no runtime não encontra
  `"Novo membro"`.
- O job de reconciliação de `pending` não escreve membership nem profile — provado por teste.
- A localidade vinda do cliente é validada contra o catálogo no servidor — com teste negativo.
- Convite familiar deriva a localidade corrente do titular; o dependente não escolhe.
- O runtime não usa constante de localidade — **provado por teste de escopo**, não por revisão.
- **`admission_mode` não recria a restrição pelos dados.**
- **Duas memberships por usuário são aceitas pelo schema, e o perfil é um só.**
- **Membro de uma cidade não vê perfil de membro exclusivo de outra** — teste negativo.
- Nenhum campo além do nome atravessa `VerificationResult`. OM, posto e situação continuam
  proibidos.
- Localidade vazia tem UX explícita e utilizável.
- `BIVAQUE.md` reconciliado, sem descrever escopo nacional como futuro nem confundir localidade
  com tenant.
- A BrasilAPI não é chamada em nenhum caminho de runtime.

## Depois desta P0

**Onda de transferência** — prazo, lembrete, degradação para somente-leitura e seletor de
localidade, sobre a base da Task 3. Depois D2, E e F, nesta ordem. As três têm nota de precedência
no cabeçalho apontando para cá; a **Task 7 da D2 foi superada** pela Task 8 daqui e não deve ser
executada.

---

## Apêndice: o resto da BrasilAPI, e o veredito de cada parte

Levantado em 2026-08-16 a partir de `services/` no
[repositório](https://github.com/BrasilAPI/BrasilAPI) e de chamadas reais aos endpoints. Existe
para que a próxima onda não refaça a avaliação — e, principalmente, para que ninguém adote o item
da linha "proibido" achando que é boa ideia.

**Regra para todos os adotados:** geração, nunca runtime. Artefato versionado no repositório.
Nenhuma chamada dentro de request, build ou CI.

### Adotado

| Dado | Rota | Onde entra |
|---|---|---|
| Municípios por UF | `/api/ibge/municipios/v1/{UF}` → `{nome, codigo_ibge}` | **Task 1** |
| Unidades federativas | `/api/ibge/uf/v1` → 27 itens | **Task 1** |
| Feriados nacionais | `/api/feriados/v1/{ano}` → `{date, name, type, weekday}`; 14 em 2026 | **Task 1 Step 5**, consumido pela **onda F, Task 4** |

**Feriados e o encontro recorrente.** O caso que quebra implementação ingênua não é só "dia 31 em
mês de 30": é a reunião de toda primeira sexta caindo no Carnaval. A onda F **avisa o
organizador** e não move a data — churrasco de vila em feriado costuma ser o ponto, não o
problema.

### Candidato real, mas é da onda G

**CNPJ** — `/api/cnpj/v1/{cnpj}`. Dois usos legítimos na conta de prestador (D37, D45): confirmar
`situacao_cadastral: ATIVA` antes de aceitar uma ficha, e usar `codigo_municipio_ibge` para
amarrar o prestador à **mesma identidade canônica** do catálogo da Task 1 — o que faz a busca de
prestador por vila e cidade (D44) casar sem tradução de grafia.

**E carrega uma armadilha de privacidade.** A resposta traz 47 campos de topo, entre eles **`qsa`**
— o quadro de sócios e administradores, que é **dado pessoal de terceiros** —, mais `logradouro`,
`numero`, `complemento`, `cep`, `email`, `ddd_telefone_1` e `ddd_telefone_2`. Persistir o payload
é a mesma violação que a D11 proíbe para o Portal.

Se a onda G adotar: extrair **`cnpj`, `razao_social`, `nome_fantasia`, `situacao_cadastral`,
`codigo_municipio_ibge`** e descartar o resto **antes de tocar o banco**; nunca logar a resposta;
nunca mandá-la ao Sentry. Pelo `RISK_MATRIX.md` isso é decisão de ADR, não de plano.

### Proibido, e o motivo importa mais que a regra

**CEP** — `/api/cep/v2/{cep}`. É o endpoint mais útil da BrasilAPI e o mais perigoso aqui. A D11
proíbe persistir **endereço residencial**, e autocomplete de endereço existe para ser guardado. O
produto já trata CEP como PII no sentido contrário: `detectCep` avisa o membro quando ele digita
um CEP num post. Adotar a consulta seria o produto oferecendo, na porta de entrada, exatamente o
dado que ele avisa a pessoa para não publicar. **Não integrar.**

**CPF** — existe `services/cpf.js` no repositório e **nenhum endpoint público de consulta na
documentação**. Se um dia aparecer, ele **não substitui o Portal**, e esta linha existe para
impedir a "otimização": o Portal não é consultado para saber se o CPF existe, e sim se a pessoa é
militar federal, veterana ou pensionista — que é a elegibilidade inteira (§4.1). Além disso a D11
proíbe guardar CPF em claro e o §4.2 exige resposta genérica e idêntica para todos os casos de
falha.

### Sem relação com este produto

`cambio`, `tickers` (ações da B3), `fipe`, `cvm`, `banco-central`, `pix` (a D26 proíbe
intermediar transação), `isbn`, `oms`, `tuss`, `sefaz`/`ibpt`, `indices`, `eleicoes`, `cptec`,
`universities`, `registro`, `ddd`.

O `ddd` merece uma frase porque parece próximo: ele mapeia DDD para UF e municípios, e a tentação
é validar se o telefone bate com a localidade escolhida. **Não faça** — militar transferido
carrega o chip da cidade anterior por anos, e essa validação rejeitaria exatamente o público de
dezembro.
