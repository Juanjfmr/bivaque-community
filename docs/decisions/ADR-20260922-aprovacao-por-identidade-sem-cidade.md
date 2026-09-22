---
id: ADR-20260922-aprovacao-por-identidade-sem-cidade
status: proposed
risk: R3
owner: Juan
approved_at:
expires_at:
linked_plan: tools/backend-kanban/public/board.json#ONB-IDENTIDADE-SEM-CIDADE
critic_verdict: pending
critic_review:
---

# A aprovação por identidade não exige cidade: a pessoa escolhe depois, como no CPF

## Problem

`public.decide_verification_document` (versão vigente em
`supabase/migrations/20260822215307_outbox_verification_decision.sql`) só aprova quem já tem linha em
`public.locality_memberships`. Sem ela, o RPC levanta `cannot approve: no locality for the user` e usa
essa cidade para criar a membership e o perfil.

O onboarding atual pede a cidade **depois** da verificação: quem é verificado e não tem membership é
levado pelo proxy a `/onboarding/locality`, e `provision_member_locality` cria membership e perfil.
Os dois contratos se contradizem, e por isso **nenhuma pessoa nova consegue ser admitida por
identidade**. Isso vale para o caminho do Portal indisponível
(ADR-20260922-identidade-quando-portal-falha) e para o CPF recusado, que já existia.

Medido em 22/09/2026 na jornada simulada `tests/e2e/journey-entrar-e-ser-admitido.spec.ts`: o
operador clica "Aprovar documento" e recebe "Não foi possível registrar agora". O log do servidor
registra `admission decide failed` com o erro do RPC.

É R3: muda um RPC `security definer` que grava no schema `private` e decide admissão.

## Decision

**Decisão do dono em 22/09/2026, nesta sessão:** aprovar sem cidade.

Uma migration nova (a aplicada não é editada) reescreve `decide_verification_document` para, na
aprovação:

1. **Com cidade:** mantém o comportamento atual (membership, perfil, `reviewed_locality_id`).
2. **Sem cidade:** marca o documento como aprovado com `reviewed_locality_id = null`, grava o
   resultado `verified` pela mesma chamada a `private.upsert_verification_outcome`, e **não cria
   membership nem perfil**. A pessoa entra, o proxy a leva a `/onboarding/locality`, e
   `provision_member_locality` cria membership e perfil, como no CPF aprovado.
3. **Não muda:**
   - quem pode decidir (só operador, conferido pelo próprio RPC);
   - o documento expirado ou já revisado continua sem decisão;
   - a recusa segue igual;
   - o e-mail de decisão pelo outbox segue sendo enviado nos dois casos.

## Alternatives considered

1. **Aprovar sem cidade (escolhida).** Um fluxo só para CPF e identidade, e a cidade continua sendo
   escolha da pessoa.
2. **Pedir a cidade antes do envio do documento.** Mantém o RPC, mas cria dois fluxos diferentes e
   grava cidade de quem ainda não foi admitido.
3. **O operador informa a cidade ao aprovar.** Não muda a tela da pessoa, mas põe na mão do operador
   uma escolha que é dela.
4. **Comportamento atual.** Ninguém novo é aprovado por identidade.

## Market or reference baseline

Verificação de elegibilidade e escolha de contexto (cidade, unidade) são passos separados em
produtos de comunidade verificada: primeiro se prova quem é, depois se escolhe onde participar.

## Proposed divergence from baseline

None.

## Evidence and sources

- `supabase/migrations/20260822215307_outbox_verification_decision.sql`: a exigência de
  `locality_memberships` na aprovação.
- `apps/web/proxy.ts`: verificado sem membership vai para `/onboarding/locality`.
- `apps/web/app/(preauth)/onboarding/locality/page.tsx`: a cidade é escolhida depois da
  verificação.
- `supabase/migrations/20260820000007_verification_document_decision.sql`: `reviewed_locality_id`
  aceita nulo.

## Benefits

A alternativa por identidade passa a funcionar de ponta a ponta, inclusive quando o Portal cai.

## Risks

- **Perfil ausente entre a aprovação e a escolha da cidade:** é o mesmo estado de quem é verificado
  pelo CPF e ainda não escolheu cidade, que o proxy já trata.
- **`reviewed_locality_id` nulo:** relatórios que assumem cidade no documento aprovado precisam
  tolerar o nulo. Mitigação: pgTAP da aprovação sem cidade, e grep de leitores da coluna na
  implementação.

## Reversal cost

Baixo. Uma migration que volta à exigência de cidade. As aprovações já feitas continuam válidas.

## Success metric

Na jornada simulada, a pessoa com o Portal indisponível envia a identidade, o operador aprova e ela
escolhe a cidade. As lacunas `39-web-onboarding-contexto#0/#1` viram passos observados.

## Reopen condition

Uma regra de elegibilidade passar a depender da cidade no momento da aprovação.

## Approval

Decisão de produto dada pelo dono (Juan) em 22/09/2026 nesta sessão, entre três opções, escolhendo
"Aprovar sem cidade". **Este texto ainda precisa de aprovação** antes de `status: accepted`.
