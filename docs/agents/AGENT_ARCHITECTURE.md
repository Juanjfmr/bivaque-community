# Arquitetura de execução por agentes — v1

> Status: vigente desde 2026-08-22. Substitui a configuração de agentes anterior
> (`code-reviewer`, `explore-haiku`, `test-writer`, `test-runner`).
> A auditoria que motivou esta versão está em
> [`HARNESS-PHASE0-2026-08-22.md`](HARNESS-PHASE0-2026-08-22.md).

## 1. O princípio

Não é "mais colaboração entre agentes = mais qualidade".
É **mais independência + melhores contratos + melhores juízes = mais qualidade**.

Um implementador que explica a própria solução ao revisor antes do primeiro parecer
destrói a revisão: o revisor passa a avaliar a explicação, não o código. Erro
correlacionado entre agentes que conversam é invisível na revisão — é exatamente o erro
que sobrevive.

Três frases que decidem o desenho inteiro:

- **A unidade de execução é o contrato, não o agente.** Agente é intercambiável.
- **Existir não é evidência. Comportamento observado é evidência.**
- **Tentativa esgotada nunca vira PASS.** Vira `FAIL`, `BLOCKED` ou `HUMAN_DECISION`.

## 2. O laço

```
                         TASK CONTRACT
                              │
                    ┌─────────┴─────────┐
                    │                   │
               exploration         risk routing
                    │                   │
                    └─────────┬─────────┘
                              ↓
                         IMPLEMENTER
                              │
                              ↓
                    gate determinístico
                              │
                              ↓
                          REVIEWER
                        (independente)
                              │
                              ↓
                     RUNTIME VERIFIER
                              │
                    ┌─────────┴─────────┐
                    ↓                   ↓
                   PASS                FAIL
                    │                   │
                 FECHA           reparo (retry_budget)
                                        │
                                     ESCALA
```

`implementer ≠ reviewer ≠ runtime-verifier`, sempre. São três perguntas diferentes:

| Papel | Pergunta que responde |
|---|---|
| implementer | "o contrato está cumprido?" |
| reviewer | "a solução está correta?" |
| runtime-verifier | "a propriedade acontece de verdade?" |

Um `PASS` do revisor não fecha tarefa. Quem fecha é a prova de runtime.

## 3. Os sete papéis

| Arquivo | Modelo | Escreve? | Papel |
|---|---|---|---|
| `.claude/agents/explorer.md` | haiku | não | localizar mecanismo, medir raio de impacto |
| `.claude/agents/implementer.md` | sonnet | sim | executar o contrato + a prova, na mesma unidade |
| `.claude/agents/reviewer.md` | opus | não | revisão independente: contrato → fronteira → qualidade |
| `.claude/agents/runtime-verifier.md` | sonnet | não | rodar a prova e adjudicar PASS/FAIL/BLOCKED |
| `.claude/agents/security-auditor.md` | opus | não | especialista de fronteira de confiança (RLS, dado pessoal) |
| `.claude/agents/visual-designer.md` | opus | sim | produzir **um** candidato isolado de experimento visual |
| `.claude/agents/experiment-judge.md` | opus | não | comparação cega entre candidatos |

Roteamento por custo é deliberado: descoberta é barata (haiku), execução é média (sonnet),
julgamento é caro (opus). Rodar tudo no modelo mais caro é desperdício, não rigor.

`tests/scope/agent-architecture.test.mjs` trava esse conjunto: papel somente-leitura que
ganhar `Write`/`Edit` derruba a suíte.

## 4. Padrões de composição — e quando cada um vale

O default **não** é time. O default é isolamento; time é exceção justificada.

```
Precisa de comunicação entre os agentes?
   │
   ├── não ──→ subagentes isolados   (o caso comum)
   │
   └── sim ──→ time                  (justifique por quê)
```

**Um blocker normal** — producer → reviewer → verifier, isolados:

```
implementer → gate → reviewer → runtime-verifier
```

**Vários itens independentes** — fan-out/fan-in, desde que caminhos e estado não colidam
(banco local é único: duas tarefas que precisam de `db:reset` não rodam juntas):

```
          ┌─ executor A → reviewer A ─┐
router ───┤                           ├──→ runtime-verifier
          └─ executor B → reviewer B ─┘
```

**Fronteira de confiança (R3)** — pool de especialistas em paralelo:

```
implementer ──┬──→ reviewer          ─┐
              └──→ security-auditor  ─┴──→ runtime-verifier
```

**Experimento (EXP)** — o oposto de time, de propósito:

```
contrato visual congelado
        ├── designer A (isolado)
        ├── designer B (isolado)
        └── designer C (isolado)
                  ↓
           juiz cego (A/B/C)
                  ↓
          evidência comparativa
                  ↓
           DECISÃO HUMANA
```

## 5. Roteamento por risco

O nível vem de [`docs/decisions/RISK_MATRIX.md`](../decisions/RISK_MATRIX.md) e é
recalculado pelo validador de contrato a partir do que a tarefa **toca**.

| Nível | Composição mínima | Fecha com |
|---|---|---|
| R0 | implementer + gate | gate verde |
| R1 | implementer → reviewer → runtime-verifier | prova de runtime |
| R2 | idem + ADR aprovado | prova de runtime + veredito do revisor |
| R3 | idem + `security-auditor` em paralelo | prova de runtime + aprovação humana no ADR |

`CRITICAL`/`HIGH` do `security-auditor` bloqueia o fechamento independentemente do revisor.

## 6. Contrato de tarefa

Formato, campos e semântica: [`TASK_CONTRACT.md`](TASK_CONTRACT.md).
Contratos vivem em `docs/agents/tasks/*.task.yml` e são validados por comando:

```sh
node scripts/agents/task-contract.mjs
```

Contrato inválido não vai para execução. O validador recusa, entre outras coisas:
baseline não medido, `allowed_paths` sem fronteira, prova que não é executável,
risco declarado abaixo do que a tarefa toca, revisor não independente e
`on_budget_exhausted: PASS`.

## 7. O que cada camada faz — e o que ela não pode fazer

```
HOOKS       impedem o obviamente perigoso     (não julgam qualidade)
SKILLS      ensinam procedimento              (não substituem prova)
AGENTS      especializam responsabilidade     (não decidem produto)
CONTRATO    define o que é "pronto"           (não executa)
TESTES      produzem evidência determinística (não interpretam)
VERIFIER    adjudica a evidência              (não conserta)
HUMANO      decide o que é questão de produto (não é opcional em R3)
```

Nenhuma camada deve tentar cobrir a de baixo. Hook não é juiz; verificador que conserta
vira executor e perde a função; agente não assina fechamento de incidente.

## 8. O que foi absorvido de fora, e o que foi recusado

Comparação com o `revfactory/harness`, feita em 2026-08-22.

**Absorvido:** auditoria formal do próprio harness antes de mudar qualquer coisa (Phase 0);
separação explícita entre agente e skill; taxonomia de padrões de composição;
*progressive disclosure* (SKILL.md curto + `references/` sob demanda); skill medida com
A/B em vez de adotada por convicção; QA de fronteira lendo produtor e consumidor juntos.

**Recusado, e por quê:**

| Prática | Por que não entra aqui |
|---|---|
| time como default para 2+ agentes | produz erro correlacionado e ancoragem do revisor |
| comunicação livre producer ↔ reviewer | o parecer perde o valor que justifica existir |
| todos os agentes no modelo mais caro | custo sem ganho; roteamento por tarefa é melhor |
| QA que corrige o que encontra | verificador que conserta deixa de ser verificador |
| retry até conseguir | orçamento explícito, e o fim do orçamento é escalada |
| `PASS` forçado depois de N tentativas | fechar sem evidência é a falha que este repo já cometeu |

## 9. Onde isto ainda não fecha

Honestidade sobre o próprio harness, para não repetir o erro do mapa antigo:

- **A composição não é executada por código.** Este documento descreve o laço; quem o
  cumpre é quem orquestra a sessão. O que está travado por teste é a **estrutura**
  (papéis, ferramentas, skills, contrato) — não a sequência em tempo de execução.
- **Nenhuma skill foi medida ainda.** O protocolo A/B está escrito em
  `experiment-protocol`; nenhuma das sete passou por ele. Elas são hipóteses.
- **O E2E continua exigindo humano** pelos motivos de estado de banco descritos em
  `docs/superpowers/plans/README.md`. Nenhuma mudança aqui altera isso.
