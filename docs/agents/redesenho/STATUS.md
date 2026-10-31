# R3 — execução por lotes, 25/10/2026

O dono autorizou "Pode dividir": até três rodadas próprias por lote menor.
O bloqueio anterior de autorização foi resolvido; o checkpoint `64dc6218` continua WIP.
Nenhuma permissão, migration ou integração foi aprovada por essa autorização.

## Lote atual

- RED-006 e C1 **APROVADAS localmente pelo Codex em 25/10**, somente no escopo
  das seis suítes: 97/97 asserções, db:lint e gate completo verdes com build.
  Orçamento usado 3/3; nenhum reparo adicional foi aberto para esta etapa.
- RED-007 **EXECUTADA pelo executor em 25/10, ainda SEM aprovação**: as duas
  suítes de conversa contextual/pergunta ao organizador, 40/40 asserções
  (10 + 30), db:lint e gate completo verdes com build; rodadas próprias 3/3.
  Julgamento é do Codex; nenhuma permissão/RLS aprovada. Ver a seção **RED-007**.
- Banco agregado continua FAIL: 154 arquivos/2081 executadas, 45 vermelhos
  (27 abortos + 18 falhas de asserção). Sem aprovação global de permissões/RLS.
- Próxima cadeia RED-007-C1: só se o Codex abrir lista de correções; mesma etapa e
  orçamento, nunca um lote novo. Sem correção aberta, o julgamento encerra a etapa.
- Próximo marcador R3: .visual/coordenacao/RED-007-PRONTO.txt. O `finally` da cadeia
  publica o marcador; executor e triagem **não** escrevem PRONTO.
- APP-003-C1 segue isolada; quadro e STATUS do app permanecem intocados.
- Revisão independente final de segurança, cobertura/golden/tipos seguem pendentes.

## Próximos lotes autorizados

1. Demais fixtures remanescentes, em lotes pequenos definidos após o julgamento atual
   (a classe A caiu de 41 (RED-004) para 35 (RED-005), 29 (RED-006) e para **27
   abortos agora**, exatamente as oito suítes já entregues; `event-question-with-service-request.sql`,
   citado aqui como pendente, saiu neste lote).
2. Permissões/transições, cobertura por célula, golden e tipos públicos, também subdivididos
   se necessário. A matriz aprovada continua sendo a autoridade.
3. Prova final pela fila, gate completo e revisão independente de segurança.

## RED-007 — o que foi feito (executor, 25/10/2026; SEM aprovação)

Escopo: as duas suítes de conversa contextual/pergunta ao organizador ainda abortando
(`RED-006 §5`). Contrato `../tasks/RED-007.task.yml` (R3). Executado inteiro em **3 rodadas
próprias** (2 de reconhecimento dirigido só com os dois arquivos + 1 prova integral do contrato);
sem `BLOCKED`/`HUMAN_DECISION`. Migration, seed, tipos, fixtures compartilhadas, matrizes, scripts e
gate **intactos**; nenhum grant ou policy alterado.

### Arquivos e números por arquivo

| Arquivo | Plano antigo → novo | Aborto (linha) | Rodada de reconhecimento 2 | Prova integral |
|---|---|---|---|---|
| `supabase/tests/event-question-with-service-request.sql` | 10 → 10 | l.48 (`provider_reach` `community`, 4 colunas/3 valores) | **ok** 10/10 | **ok** |
| `supabase/tests/dm-context-denials.sql` | 25 → **30** | l.50 (`group_visibility: "public"`) | **ok** 30/30 | **ok** |

Total do lote: **40 asserções** (10+30), todas verdes. Nenhum `select plan()` reduzido;
`dm-context-denials` **cresceu** 25→30 por cobertura. Mapa completo antigo→atual, papéis de
medição, classificação do agregado, limites e dúvidas em `R3-RED-007.md`.

### O que mudou (mecânica e cobertura)

- `event-question-with-service-request.sql`: `provider_reach` vira `('locality','00000000-…-0001',
  'free')` — 4 colunas/4 valores (`R1-209`, `mudada`). Positivo (pergunta convive com pedido),
  idempotência e recusa de outro contexto **preservados**; nenhum ator/evento fabricado.
- `dm-context-denials.sql`: grupo 400…099 `'public'` → `'open'` (enum recriado, `R1-203`). Negativa
  `provider` retargetada de 010 (a montagem antiga supunha "outra vila") para **003 de outra cidade**
  — a vila foi extinta com `R1-220`/ADR-20261024 §4, e o caso de outra cidade é **novo e
  independente**; entrou o **positivo autorizado** do mesmo alvo (001, mesma cidade). Entraram ainda
  a negativa de **anônimo** (grant do RPC) e a de **perda de acesso** (`R1-229`, `mudada`; `F5`;
  `E5`): grupo Fechado, positivo com os dois membros, `leave_group` real, reabertura recusada.
  Terceiro, bloqueio, contexto inválido, duplicação, ordem e nome nulo **preservados**.

### Provas (saída real, pela fila)

- `node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs banco`
  → as duas `ok`; suíte **154 arquivos, 2081 asserções, Result: FAIL**, **45 vermelhos**
  (27 abortos `Wstat≠0` + 18 falhas de asserção). Log `RED-007-banco-1.log`.
- `node scripts/agents/prova-fila.mjs -- npx pnpm@11.18.0 db:lint` → **"No schema errors
  found", exit 0**. Log `RED-007-db-lint.log`.
- `npx pnpm@11.18.0 gate`, com as duas públicas derivadas de `supabase status -o env` no mesmo
  processo (nenhuma chave impressa, nenhum `env.local`) → **GATE VERDE, exit 0**: lint 8s /
  typecheck 19s / typecheck:e2e 7s / **build 67s (não pulado)** / test 31s / secrets 7s;
  escopo 141/141. Log `RED-007-gate.log`.
- Migration intacta: SHA256 `56CAD1E65F941627836951DF1C93EDB61CC403BBB285BFB21787332D4F7D1FA3`.

### Agregado (rodada 3, FAIL)

154 arquivos, **2081 asserções executadas**, **45 vermelhos = 27 abortos + 18 falhas de asserção**
(era 2041 / 47 = 29 + 18 na C1 da RED-006). Executadas subiram **+40** (o plano inteiro do lote, que
antes abortava e contribuía zero); abortos caíram **29 → 27**, exatamente as duas suítes; as 18
falhas de asserção seguem iguais. **2081 não são 2081 aprovadas.**

### Limites e dúvidas (RED-007)

1. **Sem aprovação.** Julgamento de permissão/RLS é do Codex; revisão final de segurança é
   independente; o banco completo segue sem PASS. Nenhum marcador PRONTO escrito pelo executor.
2. **Negativas de insert direto são de grant, não de contexto.** As assertivas 2/4/5/16-18 de
   `dm-context-denials` recebem 42501 por o INSERT da tabela ter sido revogado (`20260825212538`),
   não por `can_dm_between`/ordem. As descrições originais ficaram no TAP; o bloqueio/contexto real
   é medido pelas assertivas de mensagem (19, 20, 25, 26) e por `open_conversation` (21, 28-30).
3. **Alvo do negativo `provider`.** Trocado para 003 (outra cidade) com positivo de 001; se o Codex
   preferir outra montagem, é decisão da revisão.
4. **`database.generated.ts`** continua não regenerado (precisa do banco) — pendência herdada.

## Confirmação alvo/ambiente da RED-007 (executor, 25/10/2026)

Worktree `C:\Users\juana\.codex\worktrees\redesenho-r3\bivaque-community`, branch
`codex/redesenho-r3`, base **`ef2bd20c`** (lida em `RED-007-base.txt`). Alvo local: contêiner
`supabase_db_bivaque-community` (healthy) e demais serviços do projeto `bivaque-community`; nenhum
outro projeto com esse nome. Porta 3000 **livre** antes e depois das provas; trava da fila
(`%TEMP%\bivaque-prova-fila.lock`) **ausente**; `apps/web/.env.local` e `dev-server.pid` **ausentes**
— a armadilha do "perfil fantasma" fica fora. Reset, pgTAP e `db:lint` **só** pela fila do
contrato. As duas variáveis públicas do gate foram derivadas de `supabase status -o env` **no mesmo
processo**, sem imprimir chave e sem criar `env.local`. Logs UTF-8 em `.visual/coordenacao/`.

## Confirmação alvo/ambiente, escrita ANTES da prova de banco desta frente

Data 25/10/2026. Worktree `C:\Users\juana\.codex\worktrees\redesenho-r3\bivaque-community`
(branch `codex/redesenho-r3`, base `5b88c167`). Este é o alvo: o stack Docker local é o
projeto `bivaque-community`, o único com esse nome. Sem `db push`, `--linked`, `env.local`,
instalação, subagentes ou segundo plano; reset e pgTAP só pela fila.

- Porta 3000: **livre** antes e depois das provas (nenhum `next start`/preview).
- Trava da fila (`%TEMP%\bivaque-prova-fila.lock`): **ausente** — nenhuma prova em curso.
- Captura visual deste worktree: **não está rodando** — a armadilha do "perfil fantasma" fica fora.
- Contêineres do alvo no ar: `supabase_db_bivaque-community` (healthy), além de storage, auth,
  rest, kong, inbucket, studio. Nenhuma outra frente usou esta fila nesta janela.
- As duas variáveis públicas do gate foram derivadas de `supabase status -o env` **no mesmo
  processo** do comando; nenhuma chave foi impressa e nenhum `env` foi criado.

## Confirmação alvo/ambiente da RED-006 (executor, 25/10/2026)

Worktree `C:\Users\juana\.codex\worktrees\redesenho-r3\bivaque-community`, branch
`codex/redesenho-r3`, base **`b0e4e7a4`** (lida em `RED-006-base.txt`). Alvo local:
contêiner `supabase_db_bivaque-community` (healthy) e demais serviços do projeto
`bivaque-community`; nenhum outro projeto com esse nome. Porta 3000 **livre** antes das
provas; trava da fila (`%TEMP%\bivaque-prova-fila.lock`) **ausente**; captura visual deste
worktree **não rodando** (`dev-server.pid`/`.log` ausentes) — a armadilha do "perfil
fantasma" fica fora. Reset e pgTAP **só** pela fila do contrato. As duas variáveis públicas
do gate foram derivadas de `supabase status -o env` **no mesmo processo**, sem imprimir
chave e sem criar `env.local`.

## RED-006 — o que foi feito

Executado **inteiro** em **2 rodadas próprias**. A rodada 1 corrigiu as fixtures legadas
e fechou as seis verdes; a rodada 2 trocou o papel da ação de cancelamento para o papel real
(`service_role`; o parâmetro é a **conta-alvo** da purga, não um ator autenticado) e
reconfirmou as seis. A retomada C1 usou a rodada restante 3/3 — ver a seção
**RED-006-C1** abaixo. Sem `BLOCKED`/`HUMAN_DECISION`.

### Arquivos e números por arquivo

| Arquivo | Plano | Rodada 1 | Rodada 2 | Mudança |
|---|---|---|---|---|
| `supabase/tests/service-request-cancelled-notice.sql` | 8 | ok | ok | `communities` (vila) sai; `provider_accounts` 3 valores→3; `settle_account_possessions` medido como `service_role` |
| `supabase/tests/service-request-first-reply-notice.sql` | 8 | ok | ok | `provider_reach` `community`→`locality` |
| `supabase/tests/service-request-open-cap.sql` | 8 | ok | ok | idem (duas contas) |
| `supabase/tests/service-request-conversation-per-request.sql` | 13 | ok | ok | idem |
| `supabase/tests/service-request-tracking.sql` | 26 | ok | ok | idem + comentário vila→cidade |
| `supabase/tests/service-requests.sql` | 31 | ok | ok | `provider_reach` do painel →`locality`; negativo exclusivo da vila (002 `pending` na vila A) **extinto** com a vila (`R1-220`, `mudada`; ADR-20261024 §4) e substituído por um negativo **novo e independente** de outra cidade (003) |

**94 asserções** (8+13+8+8+26+31) nas rodadas 1-2, todas verdes. Nenhum `select plan()` reduzido;
nenhum negativo apagado. A C1 elevou `cancelled-notice` a 11 (negativas do canal de purga) — ver a
seção C1. Mapa completo antigo→atual em `R3-RED-006.md` §3.

### As quatro falhas prévias de `service-requests` (classificação individual)

Registradas na RED-005 (15 executadas, 4 vermelhas, aborto na linha 291). **Uma causa raiz:**
fronteira de alcance vila→cidade (`R1-220`, `mudada`) tornou o ator 002 (mesma cidade)
**dentro** do alcance, então o `throws_ok` "fora do alcance não cria" passou a não lançar e o
pedido vazado contaminou os contadores das outras três. **Nenhum defeito real de autorização.**
O negativo exclusivo da vila (002 `pending` na vila A) foi **extinto com a vila** (R1-220/
ADR-20261024 §4); o negativo de outra cidade (003, `42501`) que entra no lugar é **novo e
independente**, sem afrouxar expectativa. Detalhe individual em `R3-RED-006.md` §4.

### Agregado (rodada 2, FAIL)

154 arquivos, **2038 asserções executadas**, **47 vermelhos = 29 abortos + 18 falhas de
asserção**. Abortos caíram **35→29** (as seis deste lote); falhas de asserção seguem 18;
executadas subiram **1959→2038 (+79)** = plano inteiro do lote (94) menos os 15 que
`service-requests` rodava antes do aborto. Classificação em `R3-RED-006.md` §5.

### Instrumento e gate

- **Nada do instrumento foi tocado** (gate, scripts, fixtures compartilhadas, seed, tipos,
  matrizes intactos). Na rodada 2, `git status` mostrava as seis suítes e o novo `R3-RED-006.md`;
  no estado final da C1, as seis suítes + `STATUS.md` + `R3-RED-006.md` — nada mais (ver §C1).
- `db:lint`: "No schema errors found", exit 0.
- Gate completo: verde com as duas variáveis públicas no processo, sem `env.local`.
- Migration intacta: SHA256 `56CAD1E65F941627836951DF1C93EDB61CC403BBB285BFB21787332D4F7D1FA3`.
- Depois dos escritos documentais, `lint` (exit 0; 11 warnings + 50 infos não bloqueantes, como na
  RED-005) e `test:secrets` (exit 0) foram reconfirmados no estado final; o gate completo acima mede
  o código, que os documentais não alteram.

### Provas (todas nesta sessão, saída real)

- `node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs banco`
  (rodada 1) → as seis `ok`; **154 arquivos, 2038 asserções, FAIL**, 47 vermelhos.
  Log `RED-006-banco-1.log`.
- Mesmo comando (rodada 2, após `service_role`) → as seis `ok`; **154 arquivos, 2038
  asserções, FAIL**, 47 vermelhos (29+18). Log `RED-006-banco-2.log`.
- `node scripts/agents/prova-fila.mjs -- npx pnpm@11.18.0 db:lint` → exit 0. Log `RED-006-db-lint.log`.
- `npx pnpm@11.18.0 gate` → **GATE VERDE**: lint 8s / typecheck 22s / typecheck:e2e 8s /
  **build 62s (não pulado)** / test 31s / secrets 11s; escopo 141/141. Log `RED-006-gate.log`.

### Dependência concreta fora do lote

`event-question-with-service-request.sql` aborta (linha 48) com a **mesma** montagem obsoleta
de `provider_reach` (`community`/3 valores), fora de `allowed_paths`; não corrigido, registrado
para o próximo lote de fixtures. Não é defeito de autorização.

### Documentais

`R3-RED-006.md` criado, com mapa antigo→atual por arquivo, planos, contagem por função, papel de
medição, as quatro falhas classificadas, agregado, limitações e dúvidas.

### Estado e dúvidas (RED-006)

Execução comprovada nas seis suítes (8+13+8+8+26+31 = 94 asserções nas rodadas 1-2, todas `ok`),
`db:lint` exit 0 e gate verde com build. A C1 (rodada 3/3) elevou `cancelled-notice` a 11 e fechou
as correções do julgamento — ver a seção C1. **Não me declaro aprovado**: julgamento de permissão/RLS
e revisão independente continuam com o Codex; o banco completo segue sem PASS. Nenhum commit.

1. **Contradição interna da matriz** (não alterei nada): `R1-155` (`provider_accounts.community id`)
   está `mantida`, mas a seção 3 e a migration removem a coluna. Segui a seção 3 e a migration.
2. **Negativo "fora do alcance".** O caso exclusivo da vila (002 `pending` na vila A) foi extinto
   com a vila (R1-220/ADR-20261024 §4); o negativo de outra cidade (003) é novo e independente, sem
   apagar o terceiro 002 da mesma cidade. Se o Codex preferir outra montagem, é decisão da revisão.
3. **Papel de `settle_account_possessions`**: `EXECUTE` só de `service_role`; medido com
   `set local role service_role`. `p_user_id` é a **conta-alvo** da purga (quem sai), não o ator
   autenticado — a autorização vem do canal, não do UUID. A C1 mediu as negativas de `authenticated`
   e `anon` (42501) sobre alvo válido, antes da purga.
4. **`event-question-with-service-request.sql`** carrega a mesma montagem obsoleta e segue abortando;
   fora de `allowed_paths`, registrado como dependência do próximo lote.

## RED-006-C1 — correções do julgamento, rodada 3/3

Retomada C1 (`../tasks/RED-006-correcoes-1.md`), mesma etapa e orçamento: o executor já havia
gasto as rodadas 1-2; esta é a rodada restante **3/3**, não um lote novo. Sem instalação,
subagente, segundo plano, commit ou PRONTO. Migration, seed, tipos, fixtures compartilhadas,
matrizes, scripts e gate **intactos**; nenhum grant ou policy alterado.

### O que mudou (por arquivo)

| Arquivo | Plano antigo → novo | Mudança |
|---|---|---|
| `service-request-cancelled-notice.sql` | 8 → **11** | antes da purga, negativas reais de `authenticated` e `anon` sobre alvo válido (42501) + observação de que nenhum pedido mudou; só então a purga como `service_role` |
| `service-requests.sql` | 31 → 31 | a leitura negada a outra cidade (003) saiu de antes da criação (tabela vazia) para depois de existir pedido real e de a parte autorizada lê-lo; identidade restaurada depois; terceiro 002 da mesma cidade preservado |
| `R3-RED-006.md` | — | mapa corrigido (extinção da vila + novo negativo independente), `p_user_id` como conta-alvo, descrições de 002/003 sem "verificado", `git status` real |

Nenhum `select plan()` diminuído. Total do lote: **8→11, 13, 8, 8, 26, 31 = 97**.

### Provas (rodada 3, saída real)

- `node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs banco`
  → as seis `ok`; **154 arquivos, 2041 asserções, Result: FAIL**, 47 vermelhos
  (29 abortos `Wstat≠0` + 18 falhas de asserção). Log `RED-006-C1-banco.log`.
  Subiu de 2038 para 2041 (+3 = as negativas novas de `cancelled-notice`); `service-requests`
  trocou de lugar a mesma asserção.
- `node scripts/agents/prova-fila.mjs -- npx pnpm@11.18.0 db:lint` → **"No schema errors found",
  exit 0**. Log `RED-006-C1-db-lint.log`.
- `npx pnpm@11.18.0 gate`, com `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  derivadas de `supabase status -o env` **no mesmo processo** (nenhuma chave impressa, nenhum
  `env.local`) → **GATE VERDE, exit 0**: lint 8s / typecheck 16s / typecheck:e2e 8s / **build 61s
  (não pulado)** / test 31s / secrets 9s; escopo 141/141. Log `RED-006-C1-gate.log`. O gate mede o
  código; os docs escritos depois dele foram reconferidos com `lint` (exit 0; 11 warnings + 50 infos,
  o mesmo baseline da RED-005) e `test:secrets` (exit 0).

Migration intacta: SHA256 `56CAD1E65F941627836951DF1C93EDB61CC403BBB285BFB21787332D4F7D1FA3`.
Estado final do `git status --porcelain`: as seis suítes (M), `STATUS.md` (M) e `R3-RED-006.md` (??)
— nada além dos `allowed_paths`.

### Limites da C1

A leitura negada de `service-requests` usa o id do pedido real (guardado em
`current_setting`), para não ser tautológica; o negativo de `settle_account_possessions` prova o
grant ausente para `authenticated`/`anon`, mas o efeito da purga continua medido pelo canal
privilegiado. Agregado **FAIL**, permissões/RLS e segurança **sem aprovação**. Relato do executor;
revisão é do Codex e a segurança final é independente.

## RED-005 — o que foi feito

Executado **inteiro**; a primeira rodada deixou cinco suítes verdes e a sexta abortou no plano
por erro meu de contagem (`plan(15)` com 16 asserções — havia um `lives_ok` que eu não contei).
Corrigido em uma linha; a rodada 2 fechou as seis. Sem `BLOCKED`/`HUMAN_DECISION`.

### Arquivos e números por arquivo

| Arquivo | Plano | Rodada 1 | Rodada 2 | Mudança |
|---|---|---|---|---|
| `supabase/tests/consulta-outra-cidade.sql` | 19 | ok | ok | evento de vila → evento de **grupo fechado**; anúncio de vila → anúncio **pausado**; foto idem; 4 negativas |
| `supabase/tests/provider-account-boundary.sql` | 10 | ok | ok | apresentação da vila → **ficha própria do prestador**; grupos/evento como fixture para a negativa não ser vazia |
| `supabase/tests/provider-invitation.sql` | 16 | ok | ok | convite passa a ser do **operador** (positivo novo) com negativo do morador; cota 5→50; vínculo de vila → **sem ficha de prestador** |
| `supabase/tests/provider-invitation-read.sql` | 16 | Bad plan (15/16) | ok | leitura devolve **localidade**; medida como **`anon`**; duas negativas novas (não-hex, espaço); extinção "comunidade apagada" |
| `supabase/tests/provider-revocation.sql` | 10 | ok | ok | revogação passa a ser do **operador** (`service_role` + ator explícito); console da vila → **`revoked_by`**; fixture defeituosa corrigida |
| `supabase/tests/provider-showcase-scope.sql` | 19 | ok | ok | alcance só `locality`; negativas passam a **outra cidade**; entram alcance inativo e ficha removida |

Nenhum `select plan()` foi reduzido, nenhum negativo apagado sem substituto, nenhuma migration
ou permissão alterada. Mapa completo em `R3-RED-005.md` §3, com o ID R1 de cada extinção de vila
e o substituto **novo e independente** marcado como tal.

### Instrumento e gate

- **Nada do instrumento foi tocado neste lote** (gate, scripts, fixtures compartilhadas intactos).
- `db:lint`: "No schema errors found", exit 0.
- Gate completo: verde com as duas variáveis públicas no processo, sem `env.local`.

### Provas (todas nesta sessão, saída real)

- `node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs banco`
  (rodada 1) → as seis no log; `provider-invitation-read` vermelha só pelo plano.
  Suíte **154 arquivos, 1959 asserções, FAIL**, **54 vermelhos**. Log `RED-005-banco-1.log`.
- Mesmo comando (rodada 2) → **as seis `ok`**; suíte **154 arquivos, 1959 asserções, FAIL**,
  **53 vermelhos** (35 abortos + 18 falhas de asserção), todos alheios ao lote.
  Log `RED-005-banco-2.log`.
- `node scripts/agents/prova-fila.mjs -- npx pnpm@11.18.0 db:lint` → exit 0. Log `RED-005-db-lint.log`.
- `npx pnpm@11.18.0 gate` → **GATE VERDE**: lint 9s / typecheck 18s / typecheck:e2e 7s /
  **build 83s (não pulado)** / test 31s / secrets 8s. Log `RED-005-gate.log`.
- Migration intacta: SHA256 `56CAD1E65F941627836951DF1C93EDB61CC403BBB285BFB21787332D4F7D1FA3`
  (= checkpoint); `git status` mostra somente as seis suítes.

### Documentais

- `R3-RED-005.md` criado, com mapa antigo→atual por arquivo, planos, logs, rodadas, falhas,
  limitações e dúvidas.

## O que NÃO consegui (classificado, não corrigido)

Suíte completa vermelha em **53 arquivos alheios** ao lote — classificação completa em
`R3-RED-005.md` §4:

- **A — vila/esquema legado (35 abortos)**: era 41; os seis deste lote saíram. Restam
  `posts.group_id` NOT NULL, `communities`/`community_memberships`, `feed_community`,
  enum `group_visibility`, bucket `community-images`, grants de `group_memberships`/`post_reactions`.
- **B — asserção falha sem aborto (18)**: `group-join-reason` (10), `notifications-approved-events`
  (6), `rls-or-column-regression.test` (5) e menores. Precisa triagem para separar regressão de drift.
- **C — suíte nova do RED-003 vermelha (5, subconjunto de B)**: `redesenho-bloqueio` (2),
  `redesenho-definicoes` (1), `redesenho-evento-pergunta` (4), `redesenho-grupos` (1),
  `redesenho-publicacoes` (3). É comportamento da própria leva aprovada; lote próprio.

**1959 asserções executadas não são 1959 aprovadas.** O banco completo segue sem PASS.

## Dúvidas

1. **Contradição interna da matriz aprovada** (não alterei nada): `R1-003`, `R1-108` e `R1-155`
   estão marcadas `mantida` em `R2-matriz-vila-fundacao.md`, mas a seção 3 do mesmo documento e a
   migration removem `community_id`. Segui a seção 3 e a migration. Se a intenção era outra, é
   ajuste de documentação do coordenador.
2. **Substitutos das extinções de vila.** Usei uma negativa/positiva nova exigida pela matriz em
   cada extinção, em vez de reduzir o plano. Se o Codex preferir plano menor só com a extinção
   registrada, é decisão da revisão.
3. **Medição de `revoke_provider_account`.** O `EXECUTE` é só de `service_role` e a função confere
   o ator pelo parâmetro; medi com `set local role service_role` (caminho real do servidor, sem
   superusuário). Não existe um papel "sem serviço" estável para medir a ausência de grant.
4. **Classe B (18).** Parte pode ser drift pré-existente do esquema antigo, não regressão deste
   lote; não investiguei causa por estar fora do escopo autorizado.

## Estado

Execução deste lote comprovada nas seis suítes (19/10/16/10/19/16 = 90 asserções, todas `ok`
na rodada 2), `db:lint` exit 0 e gate verde com build. **Não me declaro aprovado**: revisão
independente e julgamento de permissão/RLS continuam pendentes com o Codex; o banco completo
segue sem PASS. Nenhum commit feito.

---

# Histórico — RED-004 (aprovado), mantido como registro

## RED-004 — o que foi feito

Executado **inteiro** em uma rodada de banco + uma correção do próprio gate (formatação
de `scripts/gate.mjs`); nenhum dos seis exigiu segunda rodada. Sem `BLOCKED`/`HUMAN_DECISION`.

### Arquivos e números por arquivo

| Arquivo | Plano | Asserções executadas/aprovadas | Mudança |
|---|---|---|---|
| `supabase/tests/declared-arrivals.sql` | 8 | 8/8 ok | fila de vila removida → sinal de localidade (`declare_locality_transfer` + `list_locality_arrivals_volume`); 3 positivos e 5 negativos preservados |
| `supabase/tests/listing-alerts.sql` | 38 | 38/38 ok | só remove `community_id` (mecânica) |
| `supabase/tests/listing-lifecycle.sql` | 24 | 24/24 ok | só remove `community_id` (mecânica) |
| `supabase/tests/listing-market.sql` | 37 | 37/37 ok | 003/005 de comunidade viram rascunhos (dono 004/002); 6 asserções retargetadas, polaridade mantida |
| `supabase/tests/listings-moradia.sql` | 33 | 33/33 ok | 003 (vila) vira rascunho do membro 004; 4 asserções retargetadas |
| `supabase/tests/endereco-por-escolha.sql` | 8 | 8/8 ok | 002 (vila) vira rascunho; 1 negativo retargetado |

Nenhum `select plan()` reduzido, nenhum negativo apagado, nenhuma migration/permissão alterada.
Mapa negativo→asserção em `R3-RED-004.md`.

### Instrumento e gate

- `conferir-retrato.test.mjs`: `escape` → `escapeRegex` (biome). Formatação nos três scripts.
- `scripts/gate.mjs`: `hasEnv` aceita arquivo **ou** `NEXT_PUBLIC_SUPABASE_URL` +
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` no processo; nenhum estágio removido, scanner intacto.

### Provas (da sessão da RED-004, saída real)

- `node --test scripts/redesenho/conferir-retrato.test.mjs scripts/redesenho/conferir-matriz.test.mjs`
  → **2 pass / 0 fail**.
- `node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs banco`
  → os **seis ok**; suíte **154 arquivos, 1875 asserções, FAIL** (FAIL alheio ao lote).
  Log `.visual/coordenacao/RED-004-banco-1.log`.
- `node scripts/agents/prova-fila.mjs -- npx pnpm@11.18.0 db:lint` → "No schema errors found", **exit 0**.
- `npx pnpm@11.18.0 gate` → **GATE VERDE**: lint 8s / typecheck 23s / typecheck:e2e 9s /
  **build 151s (não pulado)** / test 43s / secrets 8s. Log `.visual/coordenacao/RED-004-gate-2.log`.

## Julgamento RED-004 — Codex, 25/10/2026

**APROVADO somente o lote de seis fixtures e correções conhecidas do gate/lint.**
Não é aprovação da migration, de permissões/RLS ou do banco completo.

- Marcador tratado: `.visual/coordenacao/RED-004-PRONTO.txt`, 25/10 15:46:14 -04.
  Não repetir o julgamento deste marcador. Triagem Qwen e diff confrontados por trechos.
- R1-301 está removida na matriz: a fila exclusiva da vila pode sair. Corrigida a redação
  que equiparava a negação de moderador dessa fila ao novo caso de própria cidade.
  São casos distintos; negações remanescentes de operador/cidade continuam presentes.
  Os novos casos de rascunho não são a mesma fronteira de audiência da vila extinta.
- Positivo de publicar item na cidade continua presente em listing-market; o positivo
  adicional de imóvel não substitui essa cobertura. Nenhum plano das seis suítes diminuiu.
- Provas do julgador, uma execução de cada: conferências 2/2; seis arquivos verdes,
  planos 8 + 38 + 24 + 37 + 33 + 8 = 148 asserções. Reset e pgTAP somente pela fila.
  Alvo confirmado: project bivaque-community, contêiner local supabase_db_bivaque-community,
  porta 55322; nenhum servidor na 3000. db:lint exit 0, sem erros de schema.
- Banco agregado: 154 arquivos, 1875 asserções executadas, **FAIL**, 59 arquivos com
  Wstat não zero. Esse agregado continua aberto; não são 1875 asserções aprovadas.
- Gate completo VERDE, sem build pulado: lint 10s, types 17s, types E2E 6s,
  Next 82s, test 39s, secrets 8s. Variáveis públicas locais no processo; nenhum env criado.
- Logs `.visual/coordenacao/RED-004-julgamento-{conferencias,banco,db-lint,gate}.log`.
  Migration permanece com hash SHA256 56CAD1E65F941627836951DF1C93EDB61CC403BBB285BFB21787332D4F7D1FA3.
- A classe C destaca cinco arquivos da classe B, não se soma aos 59. Causas restantes
  exigem diagnóstico; não foram classificadas automaticamente como dívida preexistente.
- Próximo lote RED-005 autorizado: consulta-outra-cidade e cinco suítes provider,
  sem editar migration, seed, tipos, matrizes ou fixtures compartilhadas. Defeito real
  de permissão deve continuar vermelho, com dependência concreta para lote de comportamento;
  proibido afrouxar teste ou repetir tentativas sem mudança. Contrato validado R3, até 3 rodadas.
- A frente app segue com seu executor; quadro e STATUS daquele worktree não foram editados
  para evitar colisão. Consolidar aqui e no quadro central na próxima janela sem escritor app.
- Revisão final independente de segurança segue pendente. Sem merge, push ou deploy.
## Prova do julgador RED-005 — alvo confirmado em 25/10/2026

Stack local supabase_db_bivaque-community, porta 55322, sem servidor na porta 3000.
Migration SHA256 56CAD1E65F941627836951DF1C93EDB61CC403BBB285BFB21787332D4F7D1FA3.
Uma execução de banco pela fila, db:lint pela fila e gate; julgamento ainda pendente.
## Julgamento RED-005 — Codex, 25/10/2026

- Marcador tratado: RED-005-PRONTO.txt de 2026-10-25T18:36:03.8169373-04:00,
  executor=0 e triagem=0. APROVADO apenas como adaptação de seis suítes/fixtures.
- Diff lido por hunks, contrato, relato e triagem confrontados com definições SQL e
  autoridades por trechos. Nenhuma migration, seed, grant de produção ou policy alterada.
- Achado A da triagem rejeitado por evidência: consulta-outra-cidade.sql:25 já importa
  communities.inc, inclusive na base 5b88c167. Essa fixture cria o grupo fechado
  800...002 e seu dono aprovado (linhas 25-33 e 48). O negativo não usa grupo inexistente.
  Não há fundamento para trocar código ou gastar outra rodada nesse achado.
- Achados B e C corrigidos documentalmente: polaridade negativa→negativa e lista de
  alterações incluindo os documentos permitidos. Newline final ausente é higiene sem
  impacto observado, não motivou reexecução nem mudança SQL. Não foram enfraquecidos testes.
- service_role na revogação corresponde ao grant efetivo e confere ator explícito no
  servidor; membro authenticated é negado e anon lê convite pelo canal real. Isso aceita
  o instrumento deste lote, sem aprovar o conjunto de RLS, permissões ou backend.
- Provas próprias uma vez, no stack local confirmado acima: seis arquivos ok, planos
  consulta 19, boundary 10, invitation 16, invitation-read 16, revocation 10, showcase 19:
  **90/90**, sem aborto/Bad plan. Banco agregado **FAIL**, 154 arquivos/1959 executadas,
  **53 arquivos vermelhos: 35 abortos + 18 falhas de asserção**. Nenhum atribuído
  automaticamente à dívida preexistente; causas e negativas abertas seguem pendentes.
- db:lint exit 0, sem erros de schema. Gate completo exit 0: lint 6s, types 13s,
  types E2E 5s, build 64s, test 35s, secrets 6s. Escopo 141/141, sem etapa pulada.
  Lint emitiu 11 warnings e 50 infos não bloqueantes; não foram tratados como erros.
- Logs .visual/coordenacao/RED-005-julgamento-{banco,db-lint,gate}.log e classificação
  por arquivo em RED-005-julgamento-falhas.md. Migration SHA256 permanece
  56CAD1E65F941627836951DF1C93EDB61CC403BBB285BFB21787332D4F7D1FA3.
- O executor escreveu marcador prematuro antes da triagem; não foi aceito como entrega.
  A cadeia o substituiu ao terminar. RED-006 proíbe explicitamente produtor/triagem de
  escrever PRONTO; somente o finally do script publica o marcador real.
- Divergência textual R1-003/108/155 versus remoção aprovada de community_id fica anotada
  para reconciliação documental no lote de cobertura/permissões; não reabre a decisão
  do dono nem autoriza restaurar vila. Revisão final independente continua obrigatória.
- RED-006 é escopo novo: seis suítes distintas de chamados/conversas, planos-base
  8+13+8+8+26+31=94. Corrigir fixtures legadas, classificar quatro falhas prévias de
  service-requests e preservar falha real fora do escopo, sem afrouxar expectativas.
  Contrato válido R3, até três rodadas; não é renovação do orçamento da RED-005.
- Disco: 31 GiB livres antes do lote. Sem env.local, push, merge ou deploy. Registro
  central e quadro serão consolidados no intervalo sem produtor app, para evitar colisão.
- Próxima: RED-006, aguardando .visual/coordenacao/RED-006-PRONTO.txt.
  App: APP-003-C1, aguardando .visual/coordenacao/APP-003-C1-PRONTO.txt.

Fonte aprovada RED-005: commit 5f5de530. Contrato seguinte RED-006 validado separadamente;
provas históricas da RED-004 e julgamento da RED-005 não devem ser repetidos por marcador antigo.
## Prova do julgador RED-006 — alvo confirmado, 25/10/2026

Stack local supabase_db_bivaque-community porta 55322, sem servidor na porta 3000.
Migration SHA256 56CAD1E65F941627836951DF1C93EDB61CC403BBB285BFB21787332D4F7D1FA3.
Prova pela fila e gate uma vez; julgamento pendente, sem aprovação por relato.
## Julgamento RED-006 — Codex, 25/10/2026, CORREÇÕES

- Marcador RED-006-PRONTO.txt de 2026-10-25T19:23:03.3775217-04:00 tratado,
  executor=0, triagem=0. Não repetir este marcador como entrega nova.
- Conferidos STATUS, relato, triagem e hunks das seis suítes, fixtures e definições
  pertinentes. Provas próprias uma vez: banco pela fila confirma seis arquivos ok,
  planos 8+13+8+8+26+31=94, agregado FAIL 154 arquivos/2038 executadas e
  47 arquivos vermelhos (29 abortos + 18 falhas de asserção). db:lint exit 0.
- A classificação das quatro falhas antigas de service-requests é coerente: ator 002
  está na cidade do alcance após a remoção da vila; sua criação inesperada contaminava
  as leituras e a contagem. Isso não prova o novo negativo de leitura: agora, quando
  ele roda, ainda não há pedido algum. A medição retargetada precisa de dado existente
  e positivo autorizado antes da negação, preservando o terceiro 002 da mesma cidade.
- settle_account_possessions tem EXECUTE somente para service_role na definição lida.
  Aceita-se esse canal para o efeito da purga, com ajuste técnico explícito no contrato;
  faltam chamadas negadas authenticated/anon. p_user_id é a conta-alvo, não um ator
  autenticado. O parâmetro não prova autorização e postgres só observa efeitos.
- A antiga condição 002 pending na vila foi extinta; o negativo com 003 em outra cidade
  é novo e independente. A afirmação de nenhuma extinção e mera montagem equivalente
  deve ser corrigida, com R1-220/ADR. As descrições de 002/003 como verificados também
  excedem a fixture, que só registra outcome de 001; corrigir texto sem shared fixtures.
- Lista única RED-006-correcoes-1.md, contrato R3 validado, mesma etapa/budget. C1
  usa somente a rodada restante 3/3 após as duas do executor, nunca um lote artificial.
- Logs .visual/coordenacao/RED-006-julgamento-{banco,db-lint,gate}.log e classificação
  de cada arquivo vermelho em RED-006-julgamento-falhas.md. Gate completo exit 0:
  lint 6s, types 20s, types E2E 5s, build 72s, test 26s, secrets 7s. Escopo 141/141,
  nenhuma etapa pulada. O verde não resolve os defeitos de medição acima; CORREÇÕES.
- Migration SHA256 intacto: 56CAD1E65F941627836951DF1C93EDB61CC403BBB285BFB21787332D4F7D1FA3.
  Código e relato do produtor continuam WIP sem commit/aprovação. Apenas contrato,
  tarefa de correções e STATUS entram no commit do julgamento. Sem merge/push/deploy.
- Disco antes do lote: 31 GiB livres. Segurança final independente permanece pendente.
- Próxima: RED-006-C1, aguardando .visual/coordenacao/RED-006-C1-PRONTO.txt;
  app APP-003-C1, aguardando .visual/coordenacao/APP-003-C1-PRONTO.txt.

## Prova do julgador RED-006-C1 — alvo confirmado em 25/10/2026

Stack local supabase_db_bivaque-community, porta 55322, sem servidor na porta 3000.
Migration SHA256 56CAD1E65F941627836951DF1C93EDB61CC403BBB285BFB21787332D4F7D1FA3.
Uma prova de banco pela fila, db:lint pela fila e gate completo; julgamento pendente.
## Julgamento RED-006-C1 — Codex, 25/10/2026, APROVADO no escopo

- Marcador tratado RED-006-C1-PRONTO.txt de 2026-10-25T19:55:42.2100390-04:00,
  executor=0 e triagem=0. Encerrada a mesma RED-006 na rodada 3/3, sem orçamento novo.
- Revisados seis itens da lista única, diff contra b0e4e7a4 e delta do snapshot C1.
  Quatro suítes fora do reparo permanecem byte a byte iguais ao snapshot (SHA256).
  Migration/seed/tipos/shared fixtures/scripts/produção intactos.
- Negativo de outra cidade agora usa pedido existente, precedido de leitura autorizada;
  papel 003 é restaurado para 001 depois. Terceiro 002 da mesma cidade preservado.
  Purga nega chamadas reais de authenticated e anon com 42501 sobre conta-alvo válida,
  confirma três pedidos abertos antes da ação e preserva oito asserções de efeito.
  Plano cancelled-notice cresceu 8→11; service-requests permanece 31.
- Mapa distingue extinção do vínculo pending da vila (R1-220/ADR) do novo negativo de
  outra cidade. Conta-alvo da purga deixou de ser confundida com ator; 002/003 não
  são descritos como verificados. Nenhum negativo não exclusivo da vila foi removido.
- Provas do julgador uma vez: seis suítes ok, planos 11+13+8+8+26+31 = **97/97**.
  Banco agregado **FAIL**: 154 arquivos/2041 executadas, **47 arquivos vermelhos**,
  29 abortos e 18 falhas de asserção; não são 2041 asserções aprovadas. db:lint exit 0.
- Gate completo exit 0, nenhuma etapa pulada: lint 7s, types 14s, types E2E 5s,
  build 56s, test 24s, secrets 6s. Lint tem 11 warnings e 50 infos não bloqueantes.
  Logs .visual/coordenacao/RED-006-C1-julgamento-{banco,db-lint,gate}.log; cada arquivo
  vermelho está classificado em RED-006-C1-julgamento-falhas.md, sem causa presumida.
- Achado baixo de claim.role residual na chamada anon aceito como limite: o papel SQL
  efetivo é anon e a recusa EXECUTE ocorre antes do corpo, logo a fronteira medida
  não depende do JWT residual. Não se apresenta esta suíte como prova de RLS nem do
  chamador HTTP de produção. Higiene de claims fica anotada para revisão final de
  instrumentos; não justifica renovar orçamento ou alterar a medição após a prova.
- Aprovação só do lote de testes/fixtures. Permissões globais, cobertura por célula,
  golden, tipos e revisão final independente de segurança continuam pendentes.
- RED-007 é escopo distinto: event-question-with-service-request e dm-context-denials,
  ainda abortando em montagem provider_reach e enum group_visibility antigo. Planos
  base 10+25=35; contrato validado R3, sem mudanças de produção nem shared fixtures.
- Migration SHA256 56CAD1E65F941627836951DF1C93EDB61CC403BBB285BFB21787332D4F7D1FA3.
  Configuração pública somente no processo. Disco 31 GiB livres; sem merge/push/deploy.
  Consolidação central/quadro fica para janela sem executor app.
- Próxima: RED-007, aguardando .visual/coordenacao/RED-007-PRONTO.txt;
  app APP-003-C1, aguardando .visual/coordenacao/APP-003-C1-PRONTO.txt.
