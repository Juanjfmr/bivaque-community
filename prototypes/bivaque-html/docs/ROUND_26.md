# Bivaque — Rodada 26: primeiros passos de quem chega

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-026.task.yml` (R1). Base: `2a220d65`.
Segundo item do lote B. Referências do Mobbin: "Finish setup 2/5" (Rakuten), "Get ready to
sell" (Shopify) e "1/3 Welcome" (Fitbit).

**Veredito: PASS.**

## Achado antes de construir

O cartão do plano da Rodada 15 já fazia quase tudo nas duas larguras: dias que faltam, etapas
feitas, a próxima etapa marcada e "Ver plano completo". Em vez de criar outra tela, a rodada
acabou o cartão existente com o que faltava do padrão das referências.

## O que mudou

- **Anel de progresso no lugar da barra fina:**
  - mostra "2/6" no centro, com o rótulo "2 de 6 etapas concluídas" para o leitor de tela;
  - acompanha a marcação das etapas.
- **Continuar:**
  - leva direto ao destino da próxima etapa; por exemplo, "Moradia" abre Imóveis;
  - o leitor de tela ouve "Continuar: Pediatra e plano de saúde";
  - no celular o botão ocupa a largura toda, e no desktop o tamanho do texto;
  - com o plano concluído, o botão some.
- Vale para o plano de chegada e o de saída.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 26 (4 verificações; 375 e 1440, claro) | PASS, 8/8 |
| Rodada 15, plano | PASS, 10/10 |
| Gate completo | PASS |
