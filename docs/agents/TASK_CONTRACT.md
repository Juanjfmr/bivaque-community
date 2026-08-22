# Task contract — formato e semântica

A unidade de execução do harness. Vive em `docs/agents/tasks/<ID>.task.yml`,
copiado de [`tasks/TEMPLATE.task.yml`](tasks/TEMPLATE.task.yml) e validado por comando:

```sh
node scripts/agents/task-contract.mjs            # valida docs/agents/tasks/
node scripts/agents/task-contract.mjs <arquivo>  # valida um arquivo
node scripts/agents/task-contract.mjs --json     # saída estruturada
```

Exit 0 = todo contrato válido. **Contrato inválido não vai para execução.**

## Por que um contrato, e não um pedido

"Peça ao agente de frontend para corrigir as tabs" tem três problemas: não diz o que é
pronto, não diz onde ele pode escrever, e não diz como se prova. O agente pode mudar de
modelo, de harness e de sessão; o contrato continua.

## Campos

| Campo | Obrigatório | O que é, e por que existe |
|---|---|---|
| `task_id` | sim | `<PREFIXO>-<NNN>`. Prefixos: `DS` design system, `RUN` achado de execução, `EXP` experimento, `HRN` harness, `SEC` fronteira de confiança |
| `objective` | sim | a propriedade que o produto passa a ter — não a tarefa que o agente executa |
| `authority` | sim | de onde vem a autoridade: spec, ADR, auditoria, linha do `PRODUCT_STATUS.md`. Tarefa sem autoridade é improviso |
| `baseline` | sim | estado **medido** antes de executar: `FAIL-EVIDENCED`, `PASS-EVIDENCED` ou `NOT-APPLICABLE`, com `evidence` |
| `allowed_paths` | sim | fronteira de escrita. `**` e `.` são recusados: blast radius não declarado é blast radius infinito |
| `forbidden` | sim | o que a tarefa não faz mesmo parecendo certo. É cerca — **não** eleva risco |
| `acceptance` | sim | condições verificáveis por quem não confia no executor |
| `proof` | sim | como a aceitação vira evidência. Pelo menos uma prova **executável** |
| `risk` | sim | rótulo de categoria, livre (`acessibilidade`, `harness`, `privacidade`) |
| `risk_level` | sim | `R0`–`R3` da [`RISK_MATRIX`](../decisions/RISK_MATRIX.md) |
| `adr` | em R3 | caminho para o ADR aprovado em `docs/decisions/` |
| `reviewer_must_differ_from_executor` | sim | `true` fora de R0. Revisor ancorado não é revisor |
| `blocked_by` | não | registra que a tarefa é válida mas não pode fechar agora: prova impedida por achado pré-existente ou decisão pendente. O validador marca `BLOQUEADO` |
| `retry_budget` | não | inteiro 1–5, padrão 3 **aplicado pelo validador** (que reporta o teto efetivo). Tentativas de reparo do mesmo item |
| `on_budget_exhausted` | não | `FAIL`, `BLOCKED` ou `HUMAN_DECISION`. **`PASS` é recusado** |
| `closure` | sim | `requires_runtime_evidence: true` fora de R0 |

## As sete recusas do validador

Cada uma existe porque a ausência já custou trabalho neste repositório:

1. **Baseline não medido.** Quem não mediu não sabe se está corrigindo ou reescrevendo.
2. **`allowed_paths` sem fronteira.** Escopo cresce sozinho quando ninguém o declarou.
3. **Prova não executável.** "Li o código" não é prova. Existir não é evidência.
4. **Risco declarado abaixo do que a tarefa toca.** Elevação automática pelo vocabulário
   da `RISK_MATRIX`; tocar em RLS, policy, migration, CPF ou schema `private` é R3.
5. **R3 sem ADR.** Decisão R3 não é do agente.
6. **Revisor não independente fora de R0.** Ver §1 da arquitetura.
7. **`on_budget_exhausted: PASS`.** Fechar por cansaço é como o mapa antigo passou a mentir.

## Elevação automática

O nível efetivo é o **maior** entre o declarado e o exigido pelo conteúdo. Declarar baixo
não rebaixa a tarefa — só adiciona um erro de declaração.

O escaneamento cobre `objective`, `allowed_paths`, `acceptance` e `risk`: o que a tarefa
**toca**. `forbidden` fica de fora de propósito — proibir mexer em migration não pode
transformar a tarefa em R3.

O casamento é **por palavra inteira** (com plural), não por substring: `rls` não casa com
"urls", `secret` não casa com "secretaria", `auth` não casa com "author". No outro sentido,
o termo é `private` e não `private.`, porque a forma usada no `AGENTS.md` é "schema
`private`" — exigir o ponto literal deixava passar como R0 justamente o caso que mais
precisa de R3.

O vocabulário de elevação **não** é duplicado no validador: ele é lido do bloco
`Automatic elevation terms` da própria [`RISK_MATRIX.md`](../decisions/RISK_MATRIX.md).
Duplicá-lo criaria drift entre a régua e o validador — e faria o scanner de privacidade
acusar termo comercial proibido dentro de código de produto, com razão.

## Parser

O validador lê um subconjunto restrito de YAML para não trazer dependência nova. O
subconjunto é este, e nada além:

| Suportado | Forma |
|---|---|
| mapa | `chave: valor`, aninhado por indentação |
| lista | `- item` sob a chave |
| escalar em bloco | `chave: >` (dobrado) e `chave: \|` (literal) |
| escalar entre aspas | `"valor"` / `'valor'`, com comentário de cauda opcional |
| comentário | linha inteira, ou cauda de linha de chave — **nunca** dentro de bloco |
| tipos | inteiro, `true`/`false`, resto é string |

Fora disso o parser **para alto**, com o número da linha, em vez de interpretar errado:
aspas não fechadas, linha que não é `chave: valor`, indentação inesperada.

Duas armadilhas fechadas por teste, porque as duas passavam caladas antes: `#` é conteúdo
dentro de escalar em bloco (um objetivo citando "issue #42" era truncado), e o comentário
de cauda sai mesmo quando o valor está entre aspas (senão o valor guardava aspas e
comentário dentro de si).

**Se o formato precisar crescer além desta tabela, a decisão certa deixa de ser estender o
parser e passa a ser adotar um parser YAML de verdade.** Cada extensão desta tabela é uma
nova classe de caso de borda para manter.
