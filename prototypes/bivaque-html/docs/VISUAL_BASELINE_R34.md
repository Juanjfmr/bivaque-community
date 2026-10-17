# Bivaque — base visual congelada no fechamento do lote C (Rodadas 29 a 34)

Data: 17/10/2026. Aprovada pelo usuário ("Congelar"), depois da revisão do lote, das correções e
da bateria completa.

- **Arquivo:** `.visual/bivaque-html-round34/baseline/round34.html`.
- **SHA-256:** `8dcad9cdf3806445bd0ed46edef3428a37d126fd9fbb6ff6f04fb31cd9cac30d`.
- **Código:** o mesmo do commit que adiciona este registro. Sem o arquivo local, a base é
  remontada a partir dele (`scripts/bivaque-html/round13-baseline.mjs`).
- **Substitui** a base da Rodada 28 (`57f4e391…`) nas comparações estritas.

## O que mudou em relação à base da Rodada 28

| Tela (comparação estrita) | Mudança |
| --- | --- |
| Agenda | Agrupada por dia ("Hoje", "Amanhã", dia por extenso) e filtro por público com contagem (R32) |
| Início, Criar, Guia, Salvos, Meus anúncios e Você | Iguais |

As outras mudanças do lote ficam fora das telas da comparação estrita:

- cartão para compartilhar (R29);
- comparar imóveis salvos (R30);
- mapa de bairros (R31);
- avisos empilhados (R33);
- celebração ao indicar (R34).

Elas são cobertas pelas provas das Rodadas 29 a 34.

## Bateria do fechamento

- Rodadas 001 a 34: PASS, depois das correções registradas em [ROUND_34](ROUND_34.md).
- A prova de execução falha só no defeito já registrado do HTML original congelado
  (`open-thread`).
