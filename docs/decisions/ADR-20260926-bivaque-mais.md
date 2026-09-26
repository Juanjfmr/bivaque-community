---
id: ADR-20260926-bivaque-mais
status: accepted
risk: R3
owner: Juan
approved_at: 2026-09-26
accepted_at: 2026-09-26
expires_at:
linked_plan:
critic_verdict: pending
critic_review: Decisão de produto do dono na sessão de 26/09/2026. A execução depende dos pré-requisitos abaixo; revisão independente ainda não rodou.
---

# Bivaque+: benefícios pagos fora do app

## Problem

Quem é militar, veterano, pensionista ou familiar já compra academia, plano de saúde, seguro de
carro e telefonia, quase sempre sozinho e sem poder de negociação. Associações de classe negociam
isso em grupo e cobram mensalidade. O Bivaque reúne essas pessoas numa comunidade verificada, mas
o cânone (BIVAQUE.md §7) diz que o acesso nunca é cobrado e que se cobra o papel, não a pessoa.

## Decision

Decisões do dono em 26/09/2026:

- **D1 — Bivaque+ é uma vertical de Benefícios, paga pela pessoa.** Associação com mensalidade,
  em degraus, que dá acesso a benefícios negociados em grupo: academias (Wellhub), plano de saúde,
  seguro de carro e telefonia.
- **D2 — Só benefícios externos.** Nada dentro do app fica bloqueado ou melhor para quem paga:
  comunidades, indicações, Mercado, Moradia, Encontros, mensagens, selo, ordem e alcance são
  iguais para todos. É isso que mantém "acesso nunca é cobrado" verdadeiro.
- **D3 — Desconto de negócio local não é Bivaque+.** O desconto para a comunidade oferecido na
  página do negócio vale para todos os membros (ADR-20260925-pagina-do-negocio, D13).

**Continua proibido:** crédito consignado militar, inclusive como "benefício" de parceiro;
intermediar pagamento de serviço de terceiros; usar dado de verificação (vínculo, situação) para
vender, repassar ou perfilar a pessoa para parceiros sem consentimento próprio e específico.

## Prerequisites before any build

1. **Veículo jurídico** (BIVAQUE.md §7.6): associação ou empresa com CNPJ que possa firmar os
   convênios.
2. **Plano de saúde coletivo por adesão:** entidade de classe elegível e administradora de
   benefícios registrada na ANS.
3. **Seguro:** corretora registrada na SUSEP como parceira; o Bivaque não vende seguro.
4. **Wellhub e telefonia:** convênio corporativo assinado.
5. **LGPD:** base legal e termo para o que é compartilhado com cada parceiro (em geral, só nome e
   elegibilidade, nunca CPF bruto ou dado de verificação sem consentimento).
6. **Cobrança recorrente** (Asaas ou equivalente), com cancelamento em um passo.

Sem 1 a 4, não há tela de Benefícios: uma vertical sem parceiro assinado é promessa vazia.

## Alternatives considered

- **Bivaque+ liberar recursos no app** (selo, prioridade, recursos extras). Recusada em 26/09:
  cobraria a pessoa pelo acesso e criaria duas classes de membro.
- **Descontos locais exclusivos para associados.** Recusada em 26/09: deixaria a cidade pior para
  quem não paga.

## Market or reference baseline

Associações e clubes de benefícios de militares e servidores cobram mensalidade por convênios de
saúde, seguros e academias negociados em grupo. Wellhub vende acesso por convênio corporativo.

## Risks

- **Parceiro que empurra consignado ou produto financeiro.** Cláusula contratual e revisão de cada
  oferta antes de publicar.
- **Dado da comunidade virar produto.** D2 e o item 5 dos pré-requisitos.
- **Promessa sem parceiro.** Nenhuma tela antes de convênio assinado.

## Reversal cost

Baixo antes do primeiro associado; alto depois, por causa de contratos e cobrança recorrente.

## Approval

Dono (Juan), sessão de 26/09/2026: descreveu a vertical ("associação Bivaque+ com níveis pagos
que dá acesso ao Wellhub, planos de saúde, seguro de carro, telefonia e descontos em negócios
locais") e escolheu "Só externos; desconto local para todos".
