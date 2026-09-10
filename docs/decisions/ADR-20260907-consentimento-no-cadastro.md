---
id: ADR-20260907-consentimento-no-cadastro
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-07
expires_at:
linked_plan:
critic_verdict:
critic_review:
---

# Consentimento no cadastro, não como tela de portão

## Problem

O aceite hoje é uma tela inteira em `/consent`, e o proxy manda para ela
qualquer navegação sem o cookie `bivaque-consent-version` na versão corrente.
Na prática ela reaparece: cookie limpo, expirado ou de versão antiga devolve a
pessoa ao portão a cada visita — é o defeito registrado em RUN-001.

O responsável pelo produto determinou, e diz já ter determinado antes, que o
aceite apareça **somente no cadastro**, como nas plataformas que o público já
usa. Que isto não estivesse registrado em lugar nenhum do repositório é
provavelmente a razão de a instrução ter se perdido.

## Decision

O aceite é **uma linha no formulário de cadastro**, com link para a versão
completa. Não é tela, não é portão, e não reaparece depois.

- Cadastro passa a ter uma caixa de seleção obrigatória para criar a conta,
  citando Política de Privacidade e Código de Conduta com link para cada uma.
- O aceite é gravado no servidor **na criação da conta**, com as duas versões,
  pelo mesmo `record_consent_acceptance` que a tela usava. Nada muda no banco.
- O portão de consentimento sai do proxy. Quem já entrou não é mais interrompido.
- `/consent` continua existindo como rota, sem ser portão. Ela deixa de ser o
  caminho normal e passa a ser o caminho de exceção — ver Riscos.
- O mobile ganha `POST /api/consent`, porque Server Action não serve o app
  nativo (processo de construção §5). O endpoint resolve o autor pelo token,
  nunca por um id vindo do corpo.

O que **não** muda: o aceite continua sendo registrado no servidor antes da
ação que o exige, com versão, como manda a §8 do processo de construção. Mover
para o cadastro torna isso mais correto, não menos: passa a ser condição de
existir a conta, em vez de um portão depois dela.

## Alternatives considered

1. **Manter a tela-portão.** É o comportamento atual e o defeito relatado.
2. **Tela só no primeiro acesso, sem cookie.** Ainda é uma tela a mais entre a
   pessoa e o produto, e some o link para a versão completa no momento da
   decisão.
3. **Aceite implícito por uso.** Rejeitado: sem registro versionado não há como
   provar o aceite, e é o que a LGPD exige demonstrar.

## Market or reference baseline

Instagram, Facebook, gov.br: uma linha no cadastro, com link para os termos.
Nenhum deles interrompe a navegação de quem já aceitou.

## Proposed divergence from baseline

Nenhuma.

## Evidence and sources

- Instrução do responsável, 07/09/2026: aceite "somente na hora do cadastro do
  usuário... um com um link pra versão completa, apenas isso".
- `apps/web/proxy.ts` — o portão que sai.
- `apps/web/app/(preauth)/consent/actions.ts` — `record_consent_acceptance`,
  reaproveitado sem mudança.
- `packages/domain/src/consent.ts` — `CONSENT_VERSION` e
  `CODE_OF_CONDUCT_VERSION`, ambas 2.
- RUN-001 (trabalho em andamento de outra sessão) — o defeito do cookie stale.

## Benefits

Uma barreira a menos entre a pessoa e o produto. O aceite passa a acontecer
onde a pessoa espera. O defeito do cookie deixa de ter superfície.

## Risks

- **Mudança de versão dos termos deixa de ter caminho de coleta.** Com o portão
  fora, subir `CONSENT_VERSION` não pede nada a ninguém. Esta ADR aceita isso
  para o estado atual — versão 2, sem usuários em produção — e registra que uma
  atualização de termos precisará de um aviso próprio, não do portão de volta.
  É o que as plataformas citadas fazem.
- **Contas criadas antes desta mudança** podem não ter aceite registrado. Sem
  usuários reais, o custo é nulo hoje; `/consent` continua alcançável como
  caminho de exceção para isso.
- RUN-001 perde quase todo o motivo. O trabalho daquela sessão continua no
  worktree e não foi apagado; quem retomá-lo decide o que sobra.

## Reversal cost

Baixo. O portão é uma condição no proxy e a tela continua existindo.

## Success metric

Uma pessoa cria conta, aceita na mesma tela, e não vê aceite de novo em
nenhuma navegação seguinte. O aceite existe em `consent_acceptances` com as
duas versões.

## Reopen condition

Mudança de termos que exija recoleta, ou exigência legal de reapresentação.

## Approval

**Aprovada pelo responsável pelo produto em 07/09/2026**: "a tela de
consentimento ela não deve aparecer... ela deve aparecer somente na hora do
cadastro do usuário. Igual todas as outras redes sociais... um com um link pra
versão completa, apenas isso."
