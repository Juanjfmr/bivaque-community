# Handoff — 2026-09-10 — orquestração das telas

Sessão anterior: Claude Opus 5, como orquestrador. O OpenCode assume daqui.
Este documento é operacional: estado, armadilhas e o que fazer a seguir.
Leia a seção "Armadilhas" antes de rodar qualquer coisa — cada uma custou horas.

`origin/main` neste handoff: **`0323a94`**.

## Estado dos worktrees

| worktree | branch | estado |
|---|---|---|
| `bivaque-guia` | `fix/recon-030-guia-artigo` | **RECON-030 fechado** — 5 commits, gate verde, `main` já integrada |
| `bivaque-fidelidade-pranchas` | `fix/achados-revisao-pr54` | **RECON-037 fechado** — 4 commits, gate verde, revisão independente PASS-COM-RESSALVA |
| `bivaque-entrada` | `fix/recon-018-entrada` | executando — 15 arquivos no disco, 0 commits |
| `bivaque-busca` | `fix/recon-021-busca-global` | executando — 13 arquivos, 0 commits |
| `bivaque-salvos` | `fix/recon-032-salvos` | executando — 20 arquivos, 0 commits |
| `bivaque-perfil` | `fix/recon-020-perfil` | recém-disparado |
| `bivaque-resposta` | `fix/recon-035-resposta` | recém-disparado |
| `bivaque-rev2` | destacado em `22f6b10` | worktree de revisão somente-leitura, sem `node_modules` |

**Nada foi empurrado.** Os dois lotes fechados esperam integração.

O repositório principal `C:\Users\juana\bivaque-community` está em
`codex/ajuste-de-auditoria` com ~33 alterações não commitadas de OUTRAS sessões.
Não trabalhe nele. Backups das alterações em `git stash create`: `31a0024` e `9fa6e2c`.

## Resultado dos lotes desta sessão — conferido, não auto-relatado

Gate rodado por mim em cada um, com o código de saída lido direto.

| lote | gate | escopo | o que falta |
|---|---|---|---|
| RECON-020 · perfil/onboarding | **verde** | limpo | revisão independente |
| RECON-030 · artigo do Guia | **verde** | 2 desvios declarados | prova de banco (pgTAP), revisão |
| RECON-032 · salvos/denúncias/mensagens | **verde** | 10 desvios | ver colisão abaixo; revisão |
| RECON-037 · guard-rails | **verde** | limpo | revisão feita: PASS-COM-RESSALVA |
| RECON-035 · resposta que resolveu | vermelho **de ambiente** | limpo | revisão; ver contenção abaixo |
| RECON-021 · busca global | vermelho **real** | 1 desvio | senha chumbada, abaixo |
| RECON-018 · entrada web | não fechou | limpo | 15 arquivos no disco, 0 commits |

**RECON-021 — defeito real.** `tests/e2e/global-search-flow.spec.ts:23` chumba
`password: "<redacted-local-credential>"`. A varredura de segredos reprova, e o AGENTS.md
exige leitura do ambiente com erro quando nenhuma fonte supre. Também criou
`.omo-evidence/` DENTRO do repositório, e tocou `(shell)/guide/page.tsx`, que é
área do RECON-030 (já fechado).

**RECON-018 — não commitou.** Trabalho íntegro no disco, `gate --fast` verde,
morreu em E2E com timeouts. Retomar por sessão, rodar o gate completo SOZINHO e
commitar.

**Colisão a resolver antes de integrar.** RECON-021 e RECON-032 alteraram os dois
`apps/web/app/components/bivaque/app-shell.tsx`, nenhum dos dois autorizado a
isso pelo seu contrato. Vão conflitar.

**Contenção de CPU produz falso vermelho.** Com quatro ou cinco executores
rodando build/teste juntos, testes de timeout curto estouram. O
`display-name-policy.test.ts` falhou no gate do RECON-035 em 10.459 ms e passa
isolado em 554 ms. Antes de "consertar" um teste que estourou tempo, rode-o
sozinho. Serializar o gate evita a classe inteira.

## Fila

18 contratos de prancha (`RECON-018` a `RECON-035`), todos válidos no
`task-contract.mjs`, todas as 31 pranchas cobertas. Executados: **033, 030, 037**.
Em execução: 018, 020, 021, 032, 035. Restam: 019, 022, 023, 024, 025, 026, 027,
028, 029, 031, 034.

Os sete ADRs de 09/09 estão **todos `approved`** — nenhum lote está bloqueado por
decisão pendente. O item desmarcado no card `RECON-PRANCHAS-RESTANTES` que diz o
contrário é drift.

**Colisões de escopo a evitar ao paralelizar:** `RECON-031` toca preferências de
notificação (mesma área do 037); `RECON-034` toca `components/shell/` (mesma área
do 021); `RECON-020` e `RECON-018` compartilham `(preauth)/`.

## Armadilhas — leia antes de rodar

**Modelos.** Os dois implementadores são `opencode-go/deepseek-v4.1-flash` e
`alibaba-token-plan/qwen3.8-flash`. O **Qwen está com cota esgotada e volta dia 15**.
Cota esgotada **falha em silêncio**: o processo escreve só a linha de banner
(55 bytes), queima CPU por horas e não produz nada, sem mensagem de erro. Para
distinguir de travamento: dispare algo trivial no outro modelo — se ele responde
na hora, é cota.

**`opencode run` é one-shot.** Sempre instrua "NÃO DELEGUE A SUBAGENTES": o turno
termina e qualquer subagente pendente é perdido com o trabalho. Uma execução do
RECON-030 terminou com `EXIT=0` e **zero arquivos** por isso.

**O código de saída do wrapper mente.** `cmd | tail` devolve o código do `tail`.
Sempre `> arquivo 2>&1; echo "EXIT=$?"`. E `EXIT=0` não prova trabalho: confira
`git status` no worktree.

**Como saber se um executor travou.** Três sinais juntos, nunca um só:
log parado **e** sem processo filho de build/teste **e** sem escrita em arquivo.
CPU alta sem escrita é normal — build, gate e E2E levam horas sem tocar arquivo
rastreado. Matei quatro executores produtivos por ignorar isso.

**Diff contra alvo móvel.** `git diff origin/main..HEAD` mostra como alterado o
que a *main* mudou, não só o que o executor mudou. Acusei um lote de apagar um
guard-rail que na verdade entrou na `main` depois que o worktree foi criado.
Compare contra o commit-base do worktree, não contra `origin/main`.

**Banco compartilhado.** Worktree isola arquivo, não banco. Há um Supabase local
só. Ninguém pode rodar reset/migration enquanto outros executam. `test:db` exige
banco SEM seed; rodar contra banco semeado quebra seis asserts de perfil e parece
regressão real. O hook `bash-guard` bloqueia `db:reset` incondicionalmente.

**Escopo.** Compare os arquivos entregues contra `allowed_paths` do contrato, um a
um. Não confie no relatório do executor: um deles declarou honestamente dois
desvios e omitiu os que importavam.

**`board.json`.** Editar por script com `JSON.stringify` reformata o arquivo
inteiro. Rode `npx pnpm@11.18.0 exec biome format --write` depois.

## Aberto, e de quem é

**R3 — decisão do dono, não do agente:**
- `BLOCK-SUSPENSION-EXPOSURE` (card na main): `is_suspended` vaza pela coluna em
  `profiles` via Data API para qualquer membro da mesma cidade. Verificado em
  runtime. Os commits `42c055d`/`3acaadd` fecharam as duas vias de `/rpc` e **não**
  fecham a coluna. Fechar exige tirar a coluna da exposição — schema, policy, dado
  pessoal.
- `.env.example` e `lib/support.ts` com Gmail pessoal; `NEXT_PUBLIC_` entra no
  bundle. `tests/scope/support-channel.test.mjs` virou no-op.
- `"Sair da operação"` desloga (`operator-shell.tsx`). A branch irmã
  `codex/fidelidade-pranchas` faz o oposto. A prancha 58 não desempata.

**Integração pendente:**
- `codex/fidelidade-pranchas` e `codex/ajuste-de-auditoria` têm **duas
  implementações do mesmo shell de operação** (`operation-shell.tsx` e
  `operator-shell.tsx`), ambas reescrevendo `(admin)/layout.tsx`. Vão conflitar.
  A comparação está na conversa: a do `ajuste-de-auditoria` é a base melhor.
- Ressalvas da revisão do RECON-037: drift em `docs/PRODUCT_STATUS.md:109`
  (afirma que `event_invite` não está mapeado — virou falso); cabeçalho de
  `denied-publish.spec.ts` impreciso; merge com `origin/main` antes de aterrissar.

## Como disparar um lote

```
opencode run --dir <worktree> --model opencode-go/deepseek-v4.1-flash --auto "<prompt>" > log 2>&1; echo "EXIT=$?"
```

Worktree novo precisa de `npx pnpm@11.18.0 install --frozen-lockfile` (~2 min).
Porta própria por executor se subir servidor: 3127, 3137, 3147, 3157, 3167, 3177
já usadas.

O prompt mínimo que funciona está em
`%TEMP%\claude\C--Users-juana-bivaque-community\95a2b7fe-*\scratchpad\tela.txt`,
com `CONTRATO`, `BRANCH` e `PORTA` para substituir.

## O que não repetir

O erro que mais custou nesta sessão não foi técnico: foi **produzir documento
sobre o trabalho em vez do trabalho**. Card, comentário de PR, parecer comparativo,
mensagem de commit longa — cada um defensável, o conjunto atrasou as telas.
Prova de runtime e declaração de pendência são obrigatórias; o resto é ruído.
