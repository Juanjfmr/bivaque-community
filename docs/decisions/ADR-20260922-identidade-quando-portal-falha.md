---
id: ADR-20260922-identidade-quando-portal-falha
status: proposed
risk: R3
owner: Juan
approved_at:
expires_at:
linked_plan: tools/backend-kanban/public/board.json#ONB-CPF-SEM-SAIDA
critic_verdict: pending
critic_review:
---

# Quando o Portal falha, a identidade é oferecida na hora

## Problem

A tela `/onboarding` promete "Se não conseguirmos confirmar, você poderá enviar sua identidade", e
a decisão de 07/09/2026 (`docs/design/visual-guide-2026-09-06/DECISOES-2026-09-07.md`) define o
CPF como caminho rápido, com a identidade como alternativa. No resultado `temporary_error`, quando o
Portal da Transparência está indisponível, a promessa não se cumpre:

- `apps/web/app/(preauth)/onboarding/page.tsx` só grava a mensagem de instabilidade (`setError`). A
  saída para `/onboarding/documento` existe apenas no resultado `rejected`.
- Com a chave do Portal ausente, `verifyEligibility` (`apps/web/lib/onboarding/verifyAndProvision.ts`)
  devolve `temporary_error` **sem gravar** o resultado. `/onboarding/documento` lê
  `read_verification_status`, encontra `null` e devolve a pessoa para `/onboarding`.

Resultado: enquanto o Portal estiver fora do ar, quem chega não tem caminho nenhum. Medido na jornada
simulada de 22/09/2026 (`tests/e2e/journey-entrar-e-ser-admitido.spec.ts`, HRN-004).

É R3: mexe em verificação de identidade e na gravação do resultado da verificação no schema
`private`.

## Decision

**Decisão do dono em 22/09/2026, nesta sessão:** oferecer a identidade na hora.

1. **A tela oferece a saída.** No resultado `temporary_error`, a mensagem de instabilidade
   continua, e abaixo dela aparece a ação **"Enviar identidade agora"**, que leva a
   `/onboarding/documento`. O texto deixa claro que a análise por identidade é mais lenta que o
   CPF.
2. **O estado passa a existir também sem a chave.** O ramo de chave ausente grava `temporary_error`
   por `upsert_verification_outcome`, o mesmo RPC que o ramo de falha real do Portal já usa. Assim a
   página de documento, que já aceita `temporary_error`, abre nos dois casos. A mensagem ao
   usuário e o `errorCode` continuam os mesmos.
3. **Não muda:**
   - o CPF continua sendo o primeiro caminho;
   - o limite de três tentativas por hora (`consume_verification_attempt`) e a resposta genérica
     anti-enumeração continuam iguais;
   - nenhum dado do Portal, CPF ou motivo técnico chega ao navegador;
   - o envio da identidade continua sendo um arquivo único e completo, e a análise segue na fila do
     operador em `/admissions`.

## Alternatives considered

1. **Oferecer a identidade na hora (escolhida).** Ninguém fica travado, e o texto da tela passa a
   dizer a verdade.
2. **Liberar só depois de duas tentativas com erro.** Poupa a fila em quedas curtas, mas a pessoa
   espera sem saber se vai resolver, e o contador de tentativas passaria a decidir produto.
3. **Esperar o Portal voltar, tirando a promessa da tela.** Mais simples, mas trava toda entrada
   enquanto a queda durar e contradiz a decisão de 07/09.
4. **Comportamento atual.** Promete uma alternativa que não abre.

## Market or reference baseline

Verificação com fonte externa costuma ter fallback manual quando a fonte cai: envio de documento
para revisão humana, com prazo informado. Deixar a pessoa sem saída na falha da fonte é o
antipadrão.

## Proposed divergence from baseline

None.

## Evidence and sources

- `apps/web/app/(preauth)/onboarding/page.tsx`: o ramo `temporary_error` só chama `setError`; o ramo
  `rejected` faz `router.push("/onboarding/documento")`.
- `apps/web/app/(preauth)/onboarding/documento/page.tsx`: redireciona só `verified`, `pending` e
  `null`, então `temporary_error` já é aceito.
- `apps/web/lib/onboarding/verifyAndProvision.ts`: o ramo de chave ausente retorna antes do
  `upsert_verification_outcome`.
- `tests/e2e/journey-entrar-e-ser-admitido.spec.ts`: lacunas `39-web-onboarding-contexto#0/#1`.

## Benefits

A entrada não depende da disponibilidade de um serviço de governo. A tela cumpre o que promete.

## Risks

- **Fila do operador:** uma queda longa do Portal manda todo mundo para a análise manual. Mitigação:
  a fila já mostra "Falha temporária", e "Reprocessar verificação" existe para reprocessar pelo CPF
  quando o Portal voltar.
- **Enumeração:** oferecer a identidade não revela nada sobre o CPF, porque a oferta vale para
  qualquer `temporary_error`, e a resposta ao navegador não muda.
- **Gravar sem chave:** um ambiente mal configurado passa a produzir `temporary_error` gravados.
  Isso é desejável, porque o operador passa a enxergar a pessoa, mas precisa estar no runbook de
  deploy.

## Reversal cost

Baixo. Retirar a ação da tela e o `upsert` do ramo de chave ausente. Os resultados já gravados
continuam válidos e reprocessáveis.

## Success metric

Com o Portal indisponível, quem tenta o CPF chega a `/onboarding/documento` com um clique, e a
solicitação aparece na fila de `/admissions`. As lacunas `39-web-onboarding-contexto#0/#1` da
jornada simulada viram passos observados.

## Reopen condition

A fila de análise manual crescer além da capacidade da operação durante quedas do Portal, ou o
Portal passar a oferecer um modo degradado que torne a espera curta e previsível.

## Approval

Decisão de produto dada pelo dono (Juan) em 22/09/2026 nesta sessão, entre três opções, escolhendo
"Oferecer identidade na hora". **Este texto ainda precisa de aprovação** antes de `status: accepted`.
A revisão crítica independente ainda não rodou.
