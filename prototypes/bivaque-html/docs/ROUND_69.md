# Bivaque — Rodada 69: lançamento sem cobrança

Data: 19/10/2026. Contrato: `docs/agents/tasks/HTML-069.task.yml` (R3, com o
[ADR-20260820-alcance-pago](../../../docs/decisions/ADR-20260820-alcance-pago.md)).
Lote Lançamento (R69 a R71). Base: `main` em `6c6947c1`, protótipo R68 (`3d427b0d…`).
Candidato: build `8941cd6d…`.

**Veredito: PASS** no protótipo.

## Decisão

O dono decidiu, em 19/10/2026, lançar sem cobrança.

O protótipo da R63 contrariava o ADR de alcance pago, que já estava aceito:

- ele limitava o plano grátis a 5 conversas novas por mês, e o ADR rejeita limitar o grátis;
- ele vendia "Destaque de momento" e "Plano do negócio" no espaço Patrocinado, e o ADR proíbe vender posição
  e anúncio no feed.

O ADR, por sua vez, foi escrito para "vilas", e o produto hoje é organizado por cidade e bairro. A cobrança
depende de CNPJ. O produto pago só volta com um ADR novo, antes da primeira cobrança.

## O que mudou

Tudo fica atrás de `paidPlans()` (`features/businesses/plans.js`), que lê `window.BIVAQUE_LABS?.paidPlans`
e é desligado por padrão.

- **Patrocinado some de todo lugar:** `isSpon` e `spotActive` dão falso. Saem a Início (o 3º cartão de
  "Serviços recomendados"; no celular, o 2º), a seção Patrocinado de Negócios, a pílula da página do
  negócio, "Negócios relacionados" na pergunta e o filtro da Comunidade. Os exemplos marcados com `spon`
  aparecem como negócios comuns, na ordem das indicações.
- **Conversas sem limite:** `planReplyGate` nunca bloqueia, e o aviso de limite não aparece.
- **Planos:** o diálogo explica que a página é gratuita e completa (cidade inteira, indicações, conversas
  sem limite), que os planos pagos vêm depois, sempre identificados, e que a ordem das indicações nunca é
  vendida. Não há preço nem escolha.
  - Nas métricas da página aparece "Página gratuita, com conversas sem limite", e o botão diz
    "Planos (em breve)".
- **Painel do Bivaque:**
  - a visão geral não mostra o indicador "Receita dos planos";
  - a aba passa a se chamar "Negócios", com o aviso "Lançamento sem cobrança", e mostra a contagem de
    negócios, quantos têm responsável, quantos aguardam e os pedidos de orçamento;
  - sai tudo de plano, receita e vencimento.

O código do produto pago continua no lugar, guardado pelas próprias provas.

## Provas

- `round69-proof.mjs`, 4 checkpoints em 375-light e 1440-light: **8/8 PASS**.
  - Contra a base R68 (375-light): **0/4**.
- **Provas dos planos com a chave ligada:** a opção nova `labs` do `runProof` liga
  `window.BIVAQUE_LABS` antes de a página carregar.
  - R06: 6/6. R35: 9/9. R52: 5/5. R63: 11/11. R65: 16/16. Todas em 375-light.
  - Sem a chave, falhavam só nas verificações do produto pago, como esperado.
- **R13 e R50**, que mencionam planos sem depender do pago: verdes sem a chave.
- **Gate:** `npx pnpm@11.18.0 gate` **verde** (lint, typecheck, testes, segredos). O build web pulou, como sempre na worktree.
- **Build final** (`8941cd6d…`, depois de restaurar o fim de linha CRLF de `owner/business-team.js`): R69 8/8 e R52 5/5 de novo.

## Base visual

A Início muda: o cartão Patrocinado sai de "Serviços recomendados", e entra o 4º negócio por
indicações. A comparação estrita com a base R68 deve mostrar essa diferença, e a nova base fica para o
fechamento do lote.
