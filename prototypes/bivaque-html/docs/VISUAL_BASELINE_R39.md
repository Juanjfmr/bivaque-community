# Bivaque — base visual congelada no fechamento do lote mobile (Rodadas 35 a 39)

Data: 17/10/2026. Aprovada pelo usuário ("Congelar e publicar"), depois da revisão do lote, das
correções e da bateria completa.

- **Arquivo:** `.visual/bivaque-html-round39/baseline/round39.html`.
- **SHA-256:** `b71c2248db814d2444f0fe03155f3a5cb1ccd0c9503def583d030c058f70a9d2`.
- **Código:** o mesmo do commit que adiciona este registro. Sem o arquivo local, a base é
  remontada a partir dele (`scripts/bivaque-html/round13-baseline.mjs`).
- **Substitui** a base da Rodada 34 (`8dcad9cd…`) nas comparações estritas.

## O que mudou em relação à base da Rodada 34

| Tela (comparação estrita) | Mudança |
| --- | --- |
| Início, celular e tablet | Organização do desktop, cidade no título e busca com exemplo (R35) |
| Todas, celular | Barra de baixo com "Criar" no centro, luz na aba ativa e ícones em SVG (R35); cidade fora da barra superior (R35); título que sobe para a barra (R36) |
| Todas, tablet e desktop | Ícones em SVG na barra lateral e Você com as iniciais (R35) |
| Início, desktop | Igual, exceto a barra lateral |

As outras mudanças do lote ficam fora das telas da comparação estrita:

- a conversa (R37);
- o detalhe com a foto até o topo (R38);
- o deslizar nas conversas (R39).

Elas são cobertas pelas provas das Rodadas 35 a 39.

## Bateria do fechamento

- Rodadas 001 a 39: PASS, depois das correções registradas em [ROUND_39](ROUND_39.md).
- A prova de execução falha só no defeito já registrado do HTML original congelado.
