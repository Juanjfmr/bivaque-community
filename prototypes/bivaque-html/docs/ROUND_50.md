# Bivaque — Rodada 50: Filas do Painel do Bivaque

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-050.task.yml` (R1). Base: `ec0f792b`.
Lote do painel do dono.

**Veredito: PASS.**

## O que mudou

- **Navegação do console:** "Visão geral" e "Filas", com a contagem do que está aberto. Abaixo
  de 1024 px, a lateral sai e as duas ficam no topo.
- **Página Filas** (`#dono/filas`; também por "Abrir filas" na visão geral):
  - "Abertas" e "Decididas", por tipo e por cidade;
  - ordenar por prazo (a atrasada primeiro) ou pelas mais recentes;
  - cada linha tem prazo, responsável, "Assumir" e "Revisar";
  - listas longas em blocos, como no resto do app.
- **Assumir:** você vira o responsável pelo item; a moderadora de exemplo aparece onde já assumiu.
- **Decididas e desfazer:** cada decisão guarda título, tipo, cidade, motivo e o que é preciso
  para desfazer. "Desfazer" devolve o anúncio às listas, reabre as denúncias, desfaz a página
  reivindicada e põe o item de volta na fila, com registro.
- **Celular:** prazo e responsável na mesma linha, ações embaixo.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 50 (4 verificações; 375 e 1440, claro) | PASS, 8/8 |
| Rodada 49 | PASS, 14/14 |
| Gate (lint, tipos, testes, segredos) | PASS |

Capturas: `.visual/bivaque-html-round50/telas/`.
