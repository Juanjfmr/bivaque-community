# Bivaque — Rodada 30: comparar imóveis salvos

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-030.task.yml` (R1). Base: `b8c7b8ba`.
Segundo item do lote C, no padrão das propostas lado a lado da Rodada 16.

**Veredito: PASS.**

## O que mudou

- **Entrada:** em Salvos, com dois ou mais imóveis salvos, uma faixa oferece "Comparar".
- **Comparação:**
  - colunas do menor para o maior total do mês, com as linhas alinhadas entre si;
  - cada coluna traz foto, total (aluguel + condomínio), quartos, área, vagas, disponibilidade
    e comodidades;
  - os destaques "Menor total", "Mais quartos", "Maior área" e "Disponível antes" aparecem só
    quando os valores diferem; não há ranking pago.
- **Ações em cada coluna:** "Ver anúncio" e "Tirar dos salvos". Com menos de dois imóveis, a
  comparação fecha e explica o motivo.
- **Celular:** as colunas rolam de lado.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 30 (5 verificações; 375 e 1440, claro) | PASS, 10/10 |
| Gate completo | PASS |
