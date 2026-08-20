# Product decision risk matrix

This matrix decides whether a plan can be executed directly or must pass product decision review first.

## Levels

| Level | Meaning | Approval rule |
| --- | --- | --- |
| R0 | Mechanical implementation with no product behavior change. Examples: formatting, build wiring, narrow test fixes. | Executor may proceed if the plan is otherwise valid. |
| R1 | Reversible local UX or copy change that does not affect access, privacy, security, onboarding, retention, pricing, or data shape. | May proceed after product-critic returns `PASS`. |
| R2 | Product behavior, onboarding, auth, recovery, notifications, visibility, scope, access, retention, moderation, or exclusion decisions. | Requires approved ADR and `critic_verdict: pass`. |
| R3 | Security, privacy, personal data, permissions, RLS, destructive migrations, payments, monetization, legal/compliance, or irreversible decisions. | Requires explicit human approval in an approved ADR and `critic_verdict: pass`. |

## Automatic elevation terms

Any plan containing these terms is at least R2 unless a human explicitly downgrades it in an ADR:

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

## Minimum evidence for R2/R3

- Baseline market or reference pattern.
- Explicit divergence from that baseline, or `None`.
- At least three alternatives considered.
- Risks and reversal cost.
- Success metric and reopen condition.
- Independent critic verdict of exactly `PASS`.
- Human approval recorded in the ADR.

## Incidents (postmortem is not optional)

An **incident** is any of: a privacy or personal-data leak, unauthorized access or
visibility, a destructive/irreversible operation, a CI red state caused by tooling
that writes to the local database (e.g. the "Visual Capture" ghost), or a
regression that shipped. When one happens in this repo:

- Open [`POSTMORTEM.md`](POSTMORTEM.md) **before** fixing, so the timeline captures
  the reproducing state (the fix alone often erases the evidence).
- The postmortem is **not closed** by a fix landing. It closes only when every action
  in its §5 is `[*]` with a real closing proof **and** the §6 prevention checkboxes are
  all marked, **and** a named human verifier signs §7.
- If the postmortem opens a debt entry (medium/low finding or follow-up action), it
  must be tracked in the visual/known-issues ledger — never left as prose only.
- An agent may open and fill a postmortem (R0/R1 evidence) but **may not sign §7**:
  closing an incident is a human-only act, mirroring the R3 rule.
