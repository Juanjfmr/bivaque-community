# ADR-20261114-ci-ciclo-rapido-e-completo-no-fechamento

Status: Aceito por delegação — aguarda ratificação

Data: 14/11/2026

## Contexto

Cada push em PR roda a CI inteira: o job "Install, test, and build" faz install, lint, typecheck,
testes de unidade e varredura de credenciais, e depois sobe a stack Supabase, builda, roda pgTAP,
db:lint e os dois lotes de E2E (16 a 23 min por run, ex.: PR #223 em 16m48s, PR #222 em 23m25s).
O workflow "App mobile-first" roda em paralelo e leva 38 a 45 min (PR #223: 44m55s; PR #222:
38m10s). Cada ciclo de implementação e revisão paga esse custo inteiro, mesmo para mudanças que
não tocam banco nem E2E.

O dono deu instrução direta em 14/11/2026: "Aprimore esse processo, não da pra ter 45min de ci a
cada ciclo. No máximo 5 minutos e roda o teste completo no final do lote".

A mudança desloca QUANDO as verificações de segurança rodam (pgTAP/RLS, E2E de negação, varredura
de credenciais), por isso é tratada como R3 por delegação, com revisão independente e parecer do
security-auditor antes do merge.

## Decisão

1. **Job fast em todo pull_request e push.** Checkout, pnpm, node, install, lint, typecheck,
   typecheck dos specs E2E, `pnpm test` (unidade, privacidade, escopo) e varredura de credenciais.
   Sem Supabase, sem build, sem E2E de navegador. Alvo de 5 min por ciclo; timeout de 10 min.
2. **O job completo mantém TODOS os steps atuais** e o nome "Install, test, and build". Roda
   apenas quando: push na main, workflow_dispatch, ou PR com a label `ci:full`.
3. **Os workflows visuais ganham o mesmo gate.** "App mobile-first" e "HTML R72" rodam apenas
   nas mesmas condições (push main, dispatch, ou label `ci:full`), preservando seus filtros de
   paths.
4. **Aplicar a label dispara o completo.** `on.pull_request.types` passa a incluir `labeled`
   (junto de opened, synchronize, reopened) nos três workflows. Enquanto a label estiver no PR,
   cada push seguinte também roda o completo.
5. **Rito de fechamento.** O coordenador aplica `ci:full` no fechamento do lote, espera o
   completo verde (gate + visuais) e só então mergeia. PR sem a label é ciclo em andamento, não
   está apto a merge. A suíte completa continua pré-requisito de merge (LANCAMENTO.md); o que
   muda é o momento, não a exigência.
6. Runner ubuntu-24.04 (RUN-146) e pin do Playwright 1.51.1 inalterados.

## Alternativas consideradas

1. **Manter tudo a cada push (status quo).** Rejeitada pelo dono: 45 min por ciclo inviabiliza
   o ritmo de lotes.
2. **Filtro por paths no job completo** (rodar só quando o diff toca banco/E2E). Rejeitada:
   frágil — mudança no app pode quebrar E2E da web, dependências compartilhadas escapam do
   filtro, e o diff "inocente" é justamente o que quebra fluxo integrado. Também não dá ao dono
   o controle explícito de "completo no final do lote".
3. **Encolher a suíte completa** (tirar E2E stateful ou os visuais para caber em 5 min).
   Rejeitada: o mandato exige o fluxo completo provado; remover cobertura para acelerar a CI é
   ajustar a régua ao resultado.
4. **Branch protection exigindo o check completo.** Considerada como trava mecânica contra
   merge sem o completo; rejeitada por ora: o rito do quadro envia commits direto para a main
   (`HEAD:main`) e a protection bloquearia esse caminho. A garantia fica no rito de fechamento.
   Reabrir se algum merge acontecer sem o completo verde.

Escolhida: fast sempre + completo por label, o desenho explícito do dono.

## Riscos e custo de reversão

- **Risco principal: mergear com só o fast verde** (esquecer a label). Mitigação: o rito de
  fechamento (label → completo verde → merge) e a regra de que PR sem label não está apto a
  merge. Sem branch protection (alternativa 4), a trava é de processo, não mecânica.
- Regressão que só o completo pega pode sobreviver a vários ciclos dentro do lote; é detectada
  no fechamento, antes do merge. Custo: corrigir no fechamento em vez de no meio do ciclo.
  Aceitável porque o lote é a unidade de trabalho.
- A varredura de credenciais continua em TODO push (dentro do fast); frequência inalterada.
- Reversão: um commit de revert (só workflows). Sem dado, sem migração, sem dependência.

## Métrica de sucesso e condição de reabertura

- Job fast em até 5 min por ciclo, medido no PR do lote RUN-147; completo e visuais apenas no
  fechamento (ou push na main).
- Reabrir se: um merge acontecer sem o completo verde, ou o fast passar de 5 min de forma
  sistemática.

## Prova

No PR do lote RUN-147: sem a label, só o fast roda (duração medida); com a label `ci:full`, o
completo e os visuais rodam. Registrado no cartão RUN-147.

## Revisão e auditoria

Implementação delegada pelo contrato `RUN-147`. Antes do merge: revisão independente por outro
modelo e parecer do `security-auditor` sobre o diff entregue, registrados em
[RATIFICACAO.md](RATIFICACAO.md).