# Bivaque — Rodada 47: tocar sem redesenhar

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-047.task.yml` (R1). Base: `addfccdf`.
Lote de volume.

**Veredito: PASS.**

## O que mudou

- **Salvar anúncio ou negócio** troca só os botões daquele item (cartão, folha do bairro, página
  do anúncio): ícone, rótulo e estado. A lista não é redesenhada; o foco volta ao botão.
- **"Útil" no feed do grupo** troca só a publicação tocada.
- **Telas que mostram o resultado do toque continuam redesenhando:** Salvos (o cartão sai), Você
  (a contagem muda) e listas com o atalho de comparar imóveis salvos.
- **Foco:** o botão novo do Material só aceita foco depois de desenhar o interior; o foco espera
  `updateComplete`.

## Correção junto

- **Bloco mínimo de 24 (R45):** com o mesmo filtro, uma lista curta que ganhava um item (o próprio
  negócio recém-criado) guardava o tamanho antigo e escondia o novo. Pego pela prova da R06.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 47 (4 verificações; 375 e 1440, claro) | PASS, 8/8 |
| Provas antigas com salvar ou Útil: 03, 06, 07, 09, 19, 31, 33, 41, 42 | PASS |
| Gate (lint, tipos, testes, segredos) | PASS |
