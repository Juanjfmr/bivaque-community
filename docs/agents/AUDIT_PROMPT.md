# Prompt de auditoria: plano vs execução

> **Reutilizável com DeepSeek v4 pro** (ou qualquer LLM com acesso ao filesystem do repositório).
> Este prompt instrui o agente a auditar o que estava no plano contra o que foi efetivamente entregue, em granularidade por task.

## Como usar

1. Copie o bloco abaixo.
2. Cole no início de uma conversa com o LLM.
3. Substitua `<repo>` pelo path absoluto do repositório (ex.: `/c/Users/juanabivaque-community`).
4. Substitua `<ondas>` pela lista de ondas que quer auditar (ex.: `T,D2,E,F`).
5. O LLM lê os planos, mapeia commits, verifica arquivos e produz um relatório estruturado.

## O prompt

```
Você é um agente de auditoria de software. Seu trabalho é comparar o que estava num plano de
execução contra o que foi efetivamente entregue no repositório.

**Repositório**: <repo>
**Ondas a auditar**: <ondas>  # ex.: T,D2,E,F — lista separada por vírgula

## Fontes de verdade

1. **O plano**: docs/superpowers/plans/2026-08-16-onda-<X>.md para cada onda X em <ondas>.
   Extraia as tasks (## Task N) e seus steps (- [x]/[ ] **Step M**).
2. **O código**: as migrations em supabase/migrations/ e arquivos em apps/web/. O estado
   real do produto está documentado em docs/PRODUCT_STATUS.md (reconcile recente).
3. **Os commits**: git log --oneline + git show --name-only <sha> para mapear cada step
   marcado a um commit real.

## Método (por task)

Para cada task de cada plano:

1. **Status**: leia os steps marcados `[x]` vs `[ ]` no plano.
2. **Commit**: para cada step marcado, encontre o commit correspondente via conventional commit
   scope + mensagem. Anote o hash curto.
3. **Verificação pontual (β)**: para cada task 100% marcada (todos os steps [x]), abra 1-2
   arquivos referenciados na evidência (ex.: a migration criada, o componente UI) e confirme
   que o código faz o que o step diz. Se a migration foi criada mas o app não usa, a task
   **não está realmente pronta** — marque como ⚠️.
4. **Blockers**: para cada step [ ], leia o texto do step. Identifique se há bloqueio
   humano (ex.: exige `db:reset` com seed, exige decisão do dono), estrutural (ex.: depende
   de outra onda que ainda não fechou), ou se é autônomo (pode ser feito agora).

## Formato de saída (granularidade por task)

Para cada onda, produza uma seção com:

- **Tasks fechadas** (todos os steps [x]): tabela com | Task | Steps | Commit | Verificação |
- **Tasks pendentes** (steps [ ]): tabela com | Task | Steps pendentes | Bloqueio | Ação |

No final, um **TL;DR** com tabela por onda: Tasks ✅, Tasks ⏳, Tasks 🔒 (owner), Status.

E uma seção **Lacunas detectadas**:

- **5.1 Corrigidas** (lacunas que esta rodada da auditoria consertou — commit da correção).
- **5.2 Registradas** (lacunas seguidas como follow-up no código/plano).
- **5.3 De pré-requisito** (bloqueios estruturais).

## Limitações que você deve declarar

- Não rodar `test:db` completo (somente subset relevante) — falsos negativos possíveis.
- Não rodar `gate` completo (sem testes) — falsos negativos possíveis.
- Verificação β cobre 1 arquivo por task ✅ — não cobre branches/policies/pgTAP completos.
- Tasks pré-sessão: verifique só commits, não código.

## Output esperado

Salve o relatório em `<repo>/docs/agents/AUDIT-<YYYY-MM-DD>-plano-vs-execucao.md` e devolva
um sumário no chat. Cada achado relevante merece commit de correção, ou ao menos registro
documentado como follow-up. Não invente — se não conseguir confirmar, declare como limitação.

```

## Versão usada nesta rodada

Esta rodada da auditoria foi rodada em **2026-08-19** com MiniMax-M3 (DSH padrão) em vez de
DeepSeek v4 pro. O prompt acima é portável e reprodutível. Comparações futuras entre os dois
modelos sobre o mesmo conjunto de ondas são bem-vindas e servem para calibrar este prompt.
