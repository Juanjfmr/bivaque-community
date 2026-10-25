# R3 — execução por lotes, 25/10/2026

O dono autorizou "Pode dividir": até três rodadas próprias por lote menor.
O bloqueio anterior de autorização foi resolvido; o checkpoint `64dc6218` continua WIP.
Nenhuma permissão, migration ou integração foi aprovada por essa autorização.

## Lote atual

- RED-004 **aprovado localmente pelo Codex em 25/10**, apenas como lote de fixtures:
  seis arquivos, 148/148 asserções, conferências 2/2, db:lint e gate completo verdes.
- Próximo lote RED-005: seis suítes de prestador e consulta entre cidades,
  contrato `../tasks/RED-005.task.yml`, validado R3, até três rodadas próprias.
- DeepSeek executa sozinho, sem instalar ou delegar; escreve aqui o relato ao terminar.
- Qwen faz somente triagem de escopo/instrumento em `.visual/coordenacao/RED-005-triagem.md`.
- Codex julga em sessão posterior. Permissões/RLS e revisão final independente permanecem
  com Codex; a triagem Flash não aprova segurança.
- Próximo marcador: `.visual/coordenacao/RED-005-PRONTO.txt`.
- Migration deve permanecer com o hash registrado no checkpoint e em R3-HUMAN-DECISION.

## Próximos lotes autorizados

1. Demais fixtures remanescentes, em lotes pequenos definidos após o julgamento atual.
2. Permissões/transições, cobertura por célula, golden e tipos públicos, também subdivididos
   se necessário. A matriz aprovada continua sendo a autoridade.
3. Prova final pela fila, gate completo e revisão independente de segurança.

## Confirmação alvo/ambiente, escrita ANTES da prova de banco

Data 25/10/2026. Worktree `C:\Users\juana\.codex\worktrees\redesenho-r3\bivaque-community`
(branch `codex/redesenho-r3`), base `9ebc90b2`. Este é o alvo: o stack Docker local é o
projeto `bivaque-community`, o único com esse nome. Sem `db push`, `--linked`, `env.local`,
instalação, subagentes ou segundo plano; reset e pgTAP só pela fila.

- Porta 3000: **livre** (nenhum `next start`/preview nosso segurando a fila).
- Trava da fila (`%TEMP%\bivaque-prova-fila.lock`): **ausente** — nenhuma prova em curso.
- Captura visual deste worktree: **não está rodando** (nenhum `scripts/visual/loop.mjs`,
  nenhum navegador ligado a este diretório) — a armadilha do "perfil fantasma" fica fora.
- Observado: um e2e de **outra frente** (worktree `app`, APP-006) rodava na porta 3200,
  iniciado ~15:20. Ele não usa a porta 3000 nem esta fila; à hora da prova já havia
  terminado (nenhum processo `node` do `worktrees\app` vivo). Sem contaminação.

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

### Provas (todas nesta sessão, saída real)

- `node --test scripts/redesenho/conferir-retrato.test.mjs scripts/redesenho/conferir-matriz.test.mjs`
  → **2 pass / 0 fail** (o conferir-retrato passou pela 1ª vez).
- `node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs banco`
  → os **seis ok**; suíte **154 arquivos, 1875 asserções, FAIL** (FAIL alheio ao lote).
  Log `.visual/coordenacao/RED-004-banco-1.log`.
- `node scripts/agents/prova-fila.mjs -- npx pnpm@11.18.0 db:lint` → "No schema errors found", **exit 0**.
- `npx pnpm@11.18.0 gate` (processo com as duas variáveis públicas de `supabase status -o env`,
  sem imprimir chaves) → **GATE VERDE**: lint 8s / typecheck 23s / typecheck:e2e 9s / **build 151s
  (não pulado)** / test 43s / secrets 8s. Log `.visual/coordenacao/RED-004-gate-2.log`.
- Migration intacta: SHA256 `56CAD1E65F941627836951DF1C93EDB61CC403BBB285BFB21787332D4F7D1FA3`
  (= checkpoint); `git status` não mostra `supabase/migrations/`.

### Documentais

- `R3-evidencias.md`: corrigido o F2 (o `conferir-retrato` **está** na lista de provas) e o F3
  (`redesenho-evento-pergunta.sql` = 26 asserções, não 24).

## O que NÃO consegui (mapeado para lotes posteriores, não corrigido)

Suíte completa vermelha em **59 arquivos alheios** ao lote — detalhe em `R3-RED-004.md`:

- **A — vila/esquema legado (41 abortos, `Bad plan`)**: `community_id`/`communities`/
  `community_memberships`/`feed_community` ausentes, enum `group_visibility` `public|private`,
  `post_type` `poll`, `posts.group_id` NOT NULL, grants de `group_memberships`/`post_reactions`,
  bucket `community-images`. Ex.: `consulta-outra-cidade.sql:36`, `community-scope.sql:22`,
  `provider-invitation.sql:126`, `transfer-scope-denials.sql:80`.
- **B — asserção falha sem aborto (18)**: inclui `group-join-reason.sql` (10),
  `notifications-approved-events.sql` (6), `rls-or-column-regression.test.sql` (5). Precisa
  triagem para separar regressão de drift antigo.
- **C — suíte nova do RED-003 vermelha (5)**: `redesenho-bloqueio` (11-12), `redesenho-definicoes`
  (4), `redesenho-evento-pergunta` (4,14,18,23), `redesenho-grupos` (39), `redesenho-publicacoes`
  (12,14,26). É comportamento da própria leva aprovada; lote próprio.

## Dúvidas

1. **`R3-evidencias.md` e o bloco do F2.** Corrigi afirmando que a prova do `conferir-retrato`
   passou na RED-004. Se a coordenação prefere que a evidência do RED-003 fique só descritiva
   (sem citar a RED-004), é ajuste de uma linha.
2. **Reposicionamento de negativos de comunidade.** A vila não tem análogo de leitura por ator
   (qualquer membro com cidade lê anúncio ativo); traduzi os negativos de comunidade para
   "rascunho alheio" (dono vs não-dono), a única negação de leitura que sobrevive. Se o Codex
   preferir outra fronteira (pausado, ou o dono do alerta), é decisão da revisão.
3. **Classe B (18).** Parte pode ser drift pré-existente do esquema antigo, não regressão deste
   lote; não investiguei causa por estar fora do escopo autorizado.
4. **`useConst` em `retrato.mjs`.** Deixei o aviso (não é erro; fora da autorização "só formatação
   e escape"). Se quiserem zero avisos, é uma linha.

## Estado

Execução deste lote comprovada nas seis fixtures (8/38/24/37/33/8 planos, todas ok), `db:lint`
exit 0 e gate verde com build. **Não me declaro aprovado**: revisão independente e julgamento de
permissão/RLS continuam pendentes com Codex; o banco completo segue sem PASS. Nenhum commit feito.

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
