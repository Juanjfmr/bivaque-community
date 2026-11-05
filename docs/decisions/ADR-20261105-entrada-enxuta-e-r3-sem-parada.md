---
id: ADR-20261105-entrada-enxuta-e-r3-sem-parada
status: Aceito por delegação — aguarda ratificação
risk: R3
owner: Juan
approved_at: 2026-11-05 (por delegação do dono; pedido explícito de 05/11 para simplificar e não parar em R3)
expires_at:
linked_plan: docs/LANCAMENTO.md (F01) e docs/decisions/RISK_MATRIX.md
critic_verdict: pass
critic_review: decisão do dono em 05/11 ("super engenharia", "retrabalho à toa", "pode tomar essa decisão")
---

# A entrada fica como está, sem novas camadas antes do lançamento; R3 deixa de parar o trabalho

## Problem

A entrada (F01) consumiu desde 02/08 cerca de 588 commits e 43 migrations ligadas a entrada, limites,
convites e verificação. O desenho mudou quatro vezes (senha em 07/09, protótipo em 22/10, código sem senha
em 01/11, web antiga para o app) e cada lote R3 passou por várias rodadas: implementação, revisão,
auditoria, emenda (SEC-007, SEC-008, RUN-004 rodadas 1 e 2), nova revisão. Cada ressalva baixa virava mais
uma rodada. O dono chamou isso de super engenharia em 05/11 e pediu para simplificar e acelerar.

## Decision

### 1. A entrada está congelada no que foi integrado no PR #128

ADR-20261101 (Google, Apple ou código no e-mail, sem senha) com as emendas já integradas é a entrada do
lançamento. Não há novo redesenho da entrada antes de pessoas reais usarem.

### 2. Sai do caminho do lançamento (volta só se o uso real pedir)

- Desafio humano (Turnstile) no envio do código — `ENTRADA-DESAFIO-HUMANO` fica `frozen`.
- Send Email Hook ou Auth próprio para fechar o resíduo do `/auth/v1/verify` público — o resíduo continua
  aceito (já estava no ADR-20261101); só reabre com abuso observado.
- Ajuste fino do disjuntor global e do limite por IP — o que existe fica; produção usa os limites do
  painel do Supabase (ajuste do dono, já em BLOCK-RESEND).
- Revisão às cegas pela régua Nextdoor e auditoria de acessibilidade separada como portões do F01. A
  acessibilidade mínima é a do E2E (contraste medido, teclado, alvos).

### 3. O que ainda fecha o F01

Uma rodada única e curta: rotas do convite sem pepper respondem 503 (hoje 500); o combinado não avança o
marcador de quem não tem vínculo; pgTAP negativo da permissão do job de purga. Depois disso o LAN-F01
fecha com a prova que já existe. Retirar a tela antiga da entrada no `apps/web` vira cartão próprio, fora
do portão do F01.

### 4. Processo enxuto para R2 e R3 (vale para todas as jornadas)

- **Ninguém para esperando aprovação.** O agente decide, escreve o código e lista a decisão em
  `RATIFICACAO.md`; o dono ratifica em lote no fim.
- **ADR só para decisão nova.** Seguir um ADR aceito ou o protótipo não pede ADR nem parecer de crítico;
  basta citar o ADR no cartão. As "evidências mínimas" (referência de mercado, três alternativas) valem
  só para ADR novo.
- **Uma revisão por PR, não por rodada.** R3: uma auditoria do `security-auditor` antes do merge. R1/R2:
  uma revisão de contrato. Entre rodadas, o portão é o CI.
- **No máximo uma rodada de correção depois da revisão.** Achado bloqueante ou alto é corrigido nela;
  médio e baixo viram cartão no quadro, não outra rodada.
- Continuam fora da delegação: dado pessoal real ou CPF real em teste, banco de produção, segredo no
  repositório.

## Alternatives

1. **Manter o processo e só cortar escopo** — cortaria o Turnstile e o hook, mas as próximas jornadas
   repetiriam as várias rodadas por R3. Rejeitado: o atraso vem tanto do processo quanto do escopo.
2. **Rebaixar entrada, convite e acesso para R1 no validador** — mais rápido, mas tira a auditoria de
   segurança de RLS e dado pessoal. Rejeitado: a auditoria única por PR é barata e pega o que importa.
3. **Refazer a entrada com o Auth padrão puro, sem limitador próprio** — mais simples no papel, mas joga
   fora código integrado e provado. Rejeitado: seria mais um retrabalho, o que o dono pediu para parar.
4. **Escolhida:** congelar a entrada, cortar o que é endurecimento sem uso real e enxugar o processo.

## Risks and reversal

- Sem desafio humano, um abuso de volume pode bater no disjuntor global e travar envios por um tempo.
  Mitigação: limites do painel em produção e o cartão congelado, pronto para reabrir.
- Menos rodadas podem deixar passar um achado médio. Mitigação: ele fica registrado como cartão.
- Reverter é editar este ADR e a seção da matriz; nenhum dado ou migration muda.
