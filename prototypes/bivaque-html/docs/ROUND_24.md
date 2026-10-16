# Bivaque — Rodada 24: fotos carregando e estados vazios ilustrados

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-024.task.yml` (R1). Base: `bdf77a5a`.
Último item da ordem aprovada. Referências: Skeleton e Empty State, do 21st.dev.

**Veredito: PASS.**

## Decisão

O protótipo não busca dados na rede, e as telas aparecem na hora. Um esqueleto em tela inteira
exigiria um atraso artificial, então ele foi usado só onde existe espera de verdade: as fotos.
Elas são grandes, decodificam depois de a tela aparecer e chegam ao rolar a página.

## O que mudou

- **Fotos:**
  - a moldura dos cartões, do destaque do anúncio e das miniaturas pisca suavemente até a foto
    carregar, e a foto entra com um esmaecer;
  - foto que falha não deixa a moldura carregando para sempre;
  - a etiqueta do cartão continua visível;
  - com movimento reduzido, a moldura fica parada.
- **Estados vazios:**
  - os 23 estados vazios do app ganharam uma ilustração leve: mancha tonal, anel tracejado,
    ícone num círculo elevado e três pontos;
  - a ilustração é feita em SVG e CSS, sem imagem nova e sem peso;
  - o ícone flutua de leve, e os pontos piscam; com movimento reduzido, tudo fica parado;
  - a ilustração é oculta do leitor de tela; título, texto e ação continuam iguais.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 24 (6 verificações; 375 e 1440, claro) | PASS, 12/12 |
| Rodada 23 | PASS |
| Gate completo | PASS |

Fecha o lote. A revisão independente única, a bateria completa, o novo congelamento visual com
aprovação e o deploy vêm em seguida.
