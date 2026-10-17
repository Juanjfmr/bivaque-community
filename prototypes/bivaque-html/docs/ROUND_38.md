# Bivaque — Rodada 38: anúncio e negócio com a foto até o topo

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-038.task.yml` (R1). Base: `3d17d7bf`.
Lote mobile. Referências: Swiggy, talabat e Insight Timer, no Mobbin.

**Veredito: PASS.**

## O que mudou

- **Foto:** no celular, a foto do anúncio e a do negócio começam no topo da tela, de borda a
  borda e em 4:3. Ganham uns 100 px e o detalhe fica com cara de app.
- **Barra:**
  - fica transparente sobre a foto, com voltar e buscar em círculos escuros e translúcidos;
  - quando a foto passa por baixo dela, volta ao normal, com fundo, linha e o título.
- **Sem mudança:** a barra de ações embaixo (salvar, compartilhar e o botão principal), as
  outras telas e o desktop.
- **Movimento reduzido:** a troca acontece sem transição.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 38 (3 verificações; 375 e 1440, claro) | PASS, 6/6 |
| Gate completo | PASS |

Capturas: `.visual/bivaque-html-round38/telas/`.
