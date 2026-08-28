# Handoff — triagem do E2E, para execução no OpenCode

> Escrito em 2026-08-22 por uma sessão remota que **não consegue rodar E2E**: exige Docker,
> Supabase de pé e banco semeado. O trabalho está preparado até onde dá; a execução é aí.
> Contrato: [`tasks/E2E-001.task.yml`](tasks/E2E-001.task.yml).

## Por que isto existe

O PR #28 (merge `4892362`) destravou o gate — que estava vermelho desde `5325c35` por um
falso positivo do scanner de segredos. Consequência que ninguém previu: a CI passou a
chegar ao E2E pela primeira vez em semanas, e o E2E **estava quebrado o tempo todo**.

```
18 failed | 4 skipped | 473 passed (9.6m)
```

Não é regressão do PR #28. Verificado arquivo por arquivo: aquele diff não toca produto,
migration, seed nem spec de E2E, e nenhum dos seis specs que falham foi alterado. A CI
vermelha estava **escondendo** essas falhas, não causando.

## O que está quebrado

| Spec | Assert que falha | Sintoma |
|---|---|---|
| `community-invitations.spec.ts:72` | `getByRole("button", { name: /Copiar/ })` | o botão de copiar o link de convite não renderiza |
| `community-invitations.spec.ts:92` | `url.searchParams.get("next")` | vem `null` — o redirect para onboarding **perde o destino** |
| `empty-locality.spec.ts:129` | `getByText("Você é dos primeiros aqui.")` | a copy honesta de localidade vazia não aparece |
| `event-invites.spec.ts:64` | `getByRole("heading", { name: /Convidar para este evento/ })` | a seção de convite do evento não renderiza |
| `group-admin-cycle.spec.ts:103` | `getByRole("button", { name: /Cancelar pedido/i })` | o botão de cancelar pedido não aparece |
| `community-batch-approval.spec.ts:68` | `getByRole("checkbox", { name: /Selecionar/ }).nth(4)` | os cinco checkboxes de seleção não renderizam |
| `synthetic-people-interaction.spec.ts:167` | — | timeout de 180s, contexto fechado |

Cada uma falha nas três viewports (a de batch approval em duas, a de personas só em
`desktop-1440`), o que dá os dezoito.

**O segundo item merece olhar primeiro.** Um convidado não verificado que abre o link é
mandado para o onboarding sem `?next`, então termina o cadastro e **não volta para o
convite**. Se for regressão real, é ciclo de usuário quebrado, não cosmético.

## Ordem de execução

```sh
npx pnpm@11.18.0 exec supabase start      # Docker precisa estar de pé
npx pnpm@11.18.0 db:reset                 # COM seed — o E2E autentica como usuário semeado
npx pnpm@11.18.0 test:e2e
```

Para investigar uma de cada vez, `--headed` ajuda no spec de personas:

```sh
npx pnpm@11.18.0 exec playwright test tests/e2e/community-invitations.spec.ts --headed
```

## Armadilhas que valem mais que o diagnóstico

- **Não rode captura visual nem dev server entre `db:reset` e `test:db`.** É o gatilho do
  perfil fantasma "Visual Capture", e ele quebra seis asserts de pgTAP parecendo regressão.
- **Os dois `db:reset` são deliberados.** pgTAP precisa de `--no-seed`; o E2E precisa do
  seed. Estados mutuamente exclusivos — não colapse.
- **`dev-server.pid` velho** faz o loop visual conectar num servidor que não existe.
- **`notFound()` no Next 16 responde 200.** Se for escrever asserção de negação, verifique
  a UI, não o status.
- **PostgREST só resolve embed onde existe FK.** Vários pares deste schema referenciam
  `auth.users` separadamente, sem FK entre si — o embed falha calado e a tela renderiza
  vazia. **Leia o `error` de toda consulta.** Foi assim que a lista de membros de grupo
  ficou quebrada sem ninguém notar, e três dos sintomas acima têm exatamente essa cara.

## O que entregar

Um relatório em `docs/agents/`, e nada além disso nesta unidade. Para cada uma das dezoito:

1. **Classificação** — regressão real de produto, spec desatualizado, ou artefato de ambiente.
2. **Evidência** — o que você observou, não o que deduziu. Screenshot, saída, ou a consulta
   que retorna vazio.
3. **Se regressão:** qual comportamento quebrou e desde quando, se der para datar.
4. **Se spec desatualizado:** qual decisão o tornou obsoleto, com o documento que a registra.

E, no fim, **um contrato proposto por área**, com o `risk_level` que cada uma merece —
convite e onboarding puxam para R2 pelo vocabulário da `RISK_MATRIX`; o que tocar policy
ou schema `private` puxa para R3.

**Não conserte nada aqui, e não marque spec como `fixme` para baixar a contagem.** O
contrato proíbe as duas coisas: a primeira porque cada área merece revisão independente,
a segunda porque esconder o vermelho é o que produziu esta situação.

## Como o harness novo se aplica

O merge `4892362` trouxe os sete papéis e as sete skills para o repo. Para esta tarefa:

- **`explorer`** para achar onde cada elemento ausente deveria ser renderizado — o grafo
  (`codebase-memory-mcp`, `project: "bivaque-community"`) responde isso mais barato que grep.
- **`runtime-verifier`** para rodar e ler a saída. Ele não conserta: classifica.
- **`reviewer`** entra depois, quando os contratos de correção existirem — e quem
  implementar não revisa.
- A skill **`runtime-proof`** é a régua: existir no código não é evidência de que renderiza.

Os planos citam `/run-plan`; este é contrato, não plano. A skill equivalente é
[`execute-task`](../../.claude/skills/execute-task/SKILL.md), versionada no repo desde o merge.
