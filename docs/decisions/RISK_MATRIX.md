# Product decision risk matrix

Classifique a mudança efetiva, reutilize decisões já aprovadas e aplique o maior risco
encontrado. Esta matriz governa decisões; não exige uma nova decisão para cada execução
do mesmo contrato. O processo atual §0 define a cadência por lote.

## Como aplicar sem reabrir decisões

1. Identifique o comportamento ou a fronteira que muda. Leitura, menção de um tema e
   alteração de sua autorização são coisas diferentes.
2. Reutilize o ADR aprovado que cobre exatamente a execução. Mudar finalidade, público,
   dado, permissão, retenção ou reversibilidade exige reavaliar a decisão.
3. Valide o contrato. A elevação automática é conservadora: não remova termos verdadeiros
   nem reduza o nível para obter verde. Registre a divergência e resolva o enquadramento
   antes de executar; o validador atual não implementa um mecanismo de dispensa.
4. Faça revisão e prova por lote, conforme a arquitetura. Não crie um novo plano, ADR
   ou sessão de crítico quando o contrato e a aprovação existentes já cobrem a mudança.

## Levels

| Level | Meaning | Approval rule |
| --- | --- | --- |
| R0 | Mechanical implementation with no product behavior change. Examples: documentation maintenance, formatting, build wiring, narrow test fixes. | Executor may proceed with applicable proof. Documentation-only changes use links/contracts/lint; executable/config changes retain their implementation gates. |
| R1 | Reversible local UX or copy change that does not affect access, privacy, security, onboarding, retention, pricing, or data shape. | Independent critic/reviewer returns `PASS`; the batch reviewer may fill this role. |
| R2 | Product behavior, onboarding, auth, recovery, notifications, visibility, scope, access, retention, moderation, or exclusion decisions. | Requires approved ADR and `critic_verdict: pass`. |
| R3 | Security, privacy, personal data, permissions, RLS, destructive migrations, payments, monetization, legal/compliance, or irreversible decisions. | Requires explicit human approval in an approved ADR and `critic_verdict: pass`. |

## Automatic elevation terms

O validador procura estes termos em `objective`, `allowed_paths`, `acceptance` e `risk`.
O piso é R2; R3 prevalece quando aplicável. `forbidden` não eleva risco.
Uma decisão humana de reenquadramento deve estar em ADR, mas não desativa o scanner:
qualquer mudança do mecanismo exige trabalho próprio e testes, nunca um bypass local.
Os títulos e blocos `text` abaixo são consumidos por `scripts/agents/task-contract.mjs`.

```text
auth
login
senha
password
OAuth
magic link
onboarding
cadastro
convite
acesso
privacidade
visibilidade
notificação
retenção
monetização
pricing
marketplace
recuperação de conta
exclusão de escopo
```

Any plan touching RLS, private data, identity verification, Supabase policies, secrets, or destructive database operations is R3.

## R3 automatic terms

The R3 row above is prose; this block is the same rule in operable form, read by
`scripts/agents/task-contract.mjs`. A plan containing any of these is R3 — it needs an
approved ADR with human approval, and the `security-auditor` runs alongside the reviewer.

```text
pagamento
payments
cobrança
monetização
monetization
pricing
marketplace
verificação de identidade
identity verification
dado pessoal
personal data
lgpd
compliance
```

RLS, policies, secrets, CPF, the `private` schema and `supabase/migrations` are also R3;
they live in the validator's own list because they name code, not policy.

## Minimum evidence for R2/R3

Para uma **decisão nova ou materialmente alterada**, registre uma vez no ADR:

- Baseline market or reference pattern.
- Explicit divergence from that baseline, or `None`.
- At least three alternatives considered.
- Risks and reversal cost.
- Success metric and reopen condition.
- Independent critic verdict of exactly `PASS`.
- Human approval recorded in the ADR.

Na execução coberta por esse ADR, referencie-o e registre somente a prova nova do lote.
O validador verifica estrutura, nível e presença/formato do caminho `adr` em R3;
ele não confirma existência/aprovação do ADR, assinatura humana ou independência real.
Esses controles continuam responsabilidade da revisão. R2 também exige ADR pela matriz,
embora sua presença ainda não seja exigida automaticamente pelo validador.

## Incidents (postmortem is not optional)

An **incident** is any of: a privacy or personal-data leak, unauthorized access or
visibility, a destructive/irreversible operation, a CI red state caused by tooling
that writes to the local database (e.g. the "Visual Capture" ghost), or a
regression that shipped. When one happens in this repo:

- Preserve reproducing evidence and open a copy of the [`POSTMORTEM.md`](POSTMORTEM.md)
  template. Do not delay urgent containment to complete the document; record timestamps
  and fill the remaining facts after containment. Do not overwrite the template.
- The postmortem is **not closed** by a fix landing. It closes only when every action
  in its §5 is `[*]` with a real closing proof **and** the §6 prevention checkboxes are
  all marked, **and** a named human verifier signs §7.
- Track corrective actions in the existing Kanban card, linked from the postmortem.
  If a visual finding already has a known-issues ledger entry, link that entry too;
  do not maintain duplicate action lists with independent statuses.
- An agent may open and fill a postmortem (R0/R1 evidence) but **may not sign §7**:
  closing an incident is a human-only act, mirroring the R3 rule.
