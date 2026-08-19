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

## Atualização pós round 2 (2026-08-19)

**Lições do round 2**:

1. **`test:db` completo é viável** — 64/66 arquivos rodaram sem falhas. As 2 falhas restantes
   são **pré-existentes** (e em um dos casos o autor já marcou como "draft" no corpo do commit
   que introduziu o test). **Recomendação**: rodar `test:db` completo em rodadas futuras e
   listar separadamente as falhas pré-existentes para não atribuir regressões falsas ao diff
   corrente.
2. **Verificação β mais profunda em tasks pré-sessão é valiosa** — encontrou 1 lacuna menor
   (F1 desiredStatus hidden field — lógica correta, UI legada) que o round 1 não pegou.
3. **`git show <sha> -- <path>` é a forma mais rápida de confirmar o que um commit pré-sessão
   realmente entregou**, sem precisar rodar o ambiente de novo.
4. **A regra 6 da §12 se aplica à auditoria**: a migration que tem a coluna deve ser a mesma
   que tem a função que lê essa coluna — ao auditar, conferir se o commit da coluna é o mesmo
   que o commit da função. Exemplo positivo: `locality_transfer.sql` (T1) tem coluna +
   declare_locality_transfer + provision_member_locality; `locality_degradation.sql` (T3)
   tem coluna + degrade/reverse/can_write_post_to + policies.

## Limitação adicional descoberta (round 2)

**Lacunas menores de UI vs. lógica de negócio**: no F1, a RPC `join_group` deriva status
corretamente (public → approved, private → pending, ver `20260802001000_groups_moderation.sql:296-303`),
mas o formulário continua enviando um campo hidden `desiredStatus` que é silenciosamente
ignorado pelo action. O comentário no código reconhece: *"The form can still send desiredStatus
for now, and it is silently ignored — Step 5 of the plan removes the hidden field from the markup."*
→ **Lacuna menor registrada**, lógica de negócio correta, UI legada.

Para futuras auditorias: **separar "lógica de negócio" de "UI/surface"** ao reportar lacunas.
