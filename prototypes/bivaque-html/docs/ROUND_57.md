# Bivaque — Rodada 57: caminhos quebrados simples

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-057.task.yml` (R2). Lote: `docs/LOTE_FUNCIONAL.md`.
Origem: `docs/AUDITORIA_FUNCIONAL_2026-10-18.md`, itens A1, A2, A3, A7 e B12.
Base: HEAD `50f0bd8d`, build sem alterações com SHA256 `19df283b…` (Rodada 56).

**Veredito: PASS.**

## O que mudou

- **Aviso de proposta abre o pedido (A1).** `noticeDestination` passou a resolver `pedido` (detalhe)
  só quando o pedido existe, é da cidade atual e é acessível (da própria pessoa ou visível para a
  empresa do ramo). A lista de propostas aparece ao abrir.
- **Aviso que leva a Pedidos de serviço (A1).** `pedidos` entrou entre os destinos sem id.
- **Aviso de pedido que sumiu** continua na caixa, com a explicação "O conteúdo deste aviso não está
  mais disponível".
- **"Você organiza" no próprio encontro (A2).** Na Agenda, o encontro que a pessoa organiza mostra
  "Você organiza" no lugar de "Vou" e abre o encontro. Não há mais botão de presença para ele.
- **Interesse no próprio anúncio (A3).** `contact()` recusa anúncio próprio com "Este anúncio é seu."
  e não cria conversa.
- **Menu de toque longo do próprio anúncio (A3).** Oferece "Ver anúncio" no lugar de "Tenho
  interesse" e não oferece "Denunciar…". O menu de anúncio de terceiros não mudou.
- **Pedido de entrada em grupo fechado pode ser cancelado (A7).** A página do grupo mostra "Cancelar
  pedido" em vez do botão desabilitado "Pedido enviado". Cancelar zera o pedido, tira a pessoa da lista
  de solicitações do grupo (se estiver lá) e avisa "Pedido cancelado.". O botão de pedir volta.
  - O protótipo ainda não grava quem pediu entrada em `g.requests`; o filtro fica pronto para o back-end.
- **Contador de Salvos em Você (B12).** A contagem e a lista Salvos usam as mesmas funções
  (`savedItemList` e `savedBizList`). Anúncio removido sai dos dois; negócio fora de `live` sai dos dois.
  - A "ocultação" citada na auditoria não se aplica aqui: anúncio salvo não tem campo `hidden`; esse
    campo é de perguntas.

Fora do escopo desta rodada: rota `catalogo` e ações `catalog-filter`/`search-from-home` (item E da
auditoria).

## Prova

Prova: `scripts/bivaque-html/round57-proof.mjs`, 8 checkpoints (um por caminho), em 375 e 1440 claro.
O checkpoint de aviso de pedido sumido passa também no baseline: é o controle negativo.

Baseline (antes das mudanças, 375 claro): 7 de 8 FAIL.

| Prova | Resultado (última linha lida) |
| --- | --- |
| Rodada 57 (375 e 1440, claro) | `PASS: 16/16 checkpoints; JS errors 0; external 0` |
| Rodada 04 (375 claro) | `PASS: 14/14 checkpoints; JS errors 0; external 0` |
| Rodada 05 (375 claro) | `PASS: 12/12 checkpoints; JS errors 0; external 0` |
| Rodada 11 (375 claro) | `PASS: 13/13 checkpoints; JS errors 0; external 0` |
| Rodada 12 (375 claro) | `PASS: 9/9 checkpoints; JS errors 0; external 0` |
| Rodada 17 (375 claro) | `PASS: 8/8 checkpoints; JS errors 0; external 0` |
| Rodada 06 (375 claro) | `PASS: 6/6 checkpoints; JS errors 0; external 0` |
| Rodada 03 (375 claro) | `PASS: 18/18 checkpoints; JS errors 0; external 0` |
| Rodada 13 (375 claro) | `PASS: 16/16 checkpoints; JS errors 0; external 0` |
| Rodada 16 (375 claro) | `PASS: 9/9 checkpoints; JS errors 0; external 0` |
| Rodada 25 (375 claro) | `PASS: 8/8 checkpoints; JS errors 0; external 0` |
| Rodada 30 (375 claro) | `PASS: 5/5 checkpoints; JS errors 0; external 0` |
| Rodada 43 (375 claro) | `PASS: 7/7 checkpoints; JS errors 0; external 0` |
| Rodada 01 (seis contextos da prova) | `PASS: C:\…\.visual\bivaque-html-round01\independent-functional` |
| Gate rápido (lint, tipos) | `GATE VERDE (--fast: testes não rodaram).` |

Capturas e relatórios: `.visual/bivaque-html-round57/functional/`.
