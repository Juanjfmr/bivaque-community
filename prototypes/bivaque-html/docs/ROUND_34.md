# Bivaque — Rodada 34: celebração ao indicar um negócio

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-034.task.yml` (R1). Base: `f81d392c`.

**Veredito: PASS.**

## O que mudou

- **Ao indicar um negócio:**
  - o número de indicações cresce e volta (420 ms);
  - oito pontos saem do número e somem em menos de um segundo;
  - o avatar de quem indicou entra na pilha logo depois.
- **Movimento reduzido:** nada anima e nenhum ponto aparece. O aviso e a contagem são os mesmos.
- **Leitor de tela:** os pontos ficam fora da leitura (`aria-hidden`); o aviso continua sendo o
  que anuncia a indicação.
- **Código:** `shell/celebrate.js` (Web Animations, sem biblioteca); estilo `.burst` em
  `styles/empty-states.css`.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 34 (3 verificações; 375 e 1440, claro) | PASS, 6/6 |
| Gate completo | PASS |

Captura: `.visual/bivaque-html-round34/telas/indicar-1440.png` (animação pausada em 250 ms).
