# R3 — execução por lotes, 25/10/2026

O dono autorizou "Pode dividir": até três rodadas próprias por lote menor.
O bloqueio anterior de autorização foi resolvido; o checkpoint `64dc6218` continua WIP.
Nenhuma permissão, migration ou integração foi aprovada por essa autorização.

## Lote atual

- RED-005 **APROVADO localmente pelo Codex em 25/10**, somente no escopo das seis
  suítes: 90/90 asserções, db:lint exit 0 e gate completo verde, incluindo build.
  Agregado permanece FAIL: 154 arquivos/1959 executadas, 53 arquivos vermelhos
  (35 abortos e 18 falhas de asserção). Sem aprovação global de permissões/RLS.
- RED-006 é o próximo lote autorizado: seis suítes de pedidos de serviço/conversas;
  contrato ../tasks/RED-006.task.yml validado R3, máximo três rodadas próprias.
- Próximo marcador R3: .visual/coordenacao/RED-006-PRONTO.txt.
- APP-003-C1 segue isolada no outro worktree; não editar seu STATUS nem quadro.
- Julgamento de permissões e revisão independente de segurança final seguem pendentes.

## Próximos lotes autorizados

1. Demais fixtures remanescentes, em lotes pequenos definidos após o julgamento atual
   (a classe A caiu de 41 para 35 abortos, exatamente os seis deste lote).
2. Permissões/transições, cobertura por célula, golden e tipos públicos, também subdivididos
   se necessário. A matriz aprovada continua sendo a autoridade.
3. Prova final pela fila, gate completo e revisão independente de segurança.

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
