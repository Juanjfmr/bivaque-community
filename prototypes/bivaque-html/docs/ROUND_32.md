# Bivaque — Rodada 32: agenda agrupada por dia

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-032.task.yml` (R1). Base: `a8b4c24b`.
Decisão delegada pelo usuário. Referência do Mobbin: lista de eventos do Luma, agrupada por data
e com chips de categoria e contagem.

**Veredito: PASS.**

## O que mudou

- **Agrupamento por dia:** os encontros ficam sob "Hoje", "Amanhã" ou o dia por extenso
  ("Domingo, 25 de outubro"), em ordem. O cabeçalho do dia fica preso no topo ao rolar.
- **Filtro por público:**
  - os encontros não têm tema, então o filtro usa o dado que já existe e importa para esse
    público: para quem chega, mora ou sai;
  - cada chip mostra a contagem, com a pílula deslizante da Rodada 21;
  - chips sem encontro não aparecem;
  - filtro vazio oferece "Ver todos".
- Encontros passados continuam fora da agenda.

## Achado anotado, não alterado

Alguns encontros de exemplo têm um horário no texto do local ("17h") e outro no campo de hora
("09:00"). Isso vem dos dados de exemplo e já existia antes da rodada.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 32 (3 verificações; 375 e 1440, claro) | PASS, 6/6 |
| Rodada 05, encontros | PASS, 24/24 |
| Gate completo | PASS |
