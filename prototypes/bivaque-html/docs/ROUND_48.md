# Bivaque — Rodada 48: bairro cheio no mapa

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-048.task.yml` (R1). Base: `13662fdc`.
Lote de volume.

**Veredito: PASS.**

## O que mudou

- **Folha do bairro (celular):** na metade e na tela cheia, mostra até 12 anúncios e termina num
  cartão "Ver todos os 41 · na lista, só deste bairro", que fecha a folha e abre a lista filtrada
  pelo bairro (o mesmo caminho de "Ver só este bairro na lista").
- **Diálogo do bairro (tablet e computador):** a lista vem em blocos de 24, com a contagem e o
  carregamento ao rolar da Rodada 45.
- **Bairros com poucos anúncios** ficam iguais.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 48 (2 verificações; 375 e 1440, claro) | PASS, 4/4 |
| Rodadas 41 e 31 (folha do bairro e mapa) | PASS, 16/16 e 12/12 |
| Gate (lint, tipos, testes, segredos) | PASS |

Captura: `.visual/bivaque-html-round48/telas/`.
