# Bivaque — Rodada 15: plano de chegada e saída como linha do tempo

Data: 15/10/2026. Contrato: `docs/agents/tasks/HTML-015.task.yml` (R2). Base: Rodada 14.
Segundo item da ordem aprovada. Referências: Timeline da Dice UI e Vertical Titled Stepper,
do 21st.dev.

**Veredito: PASS.**

## Revisão independente

Aprovada, sem CRITICAL ou HIGH.
- **MEDIUM corrigido:** a trilha não encostava no próximo nó quando o texto quebrava. Agora
  os nós ficam no topo da etapa e a trilha vai de um nó ao outro.
- **MEDIUM corrigido:** a prova não conferia o ícone do cartão de saída do desktop nem rodava
  no tema escuro. Agora confere e roda.
- **LOW corrigidos:**
  - a contagem de dias é conferida com o número exato;
  - data inválida não mostra "NaN dias";
  - o contador tem nome acessível;
  - plano todo concluído mostra "Tudo pronto";
  - o halo tem alternativa sem `color-mix`;
  - o realce de passar o mouse só existe onde há mouse;
  - plano vazio não divide por zero.

## O que mudou

O plano de chegada e o de saída, na Início e no "Ver plano completo", deixaram de ser uma
lista de caixas de marcar e viraram uma **trilha vertical**:

- cada etapa é um nó circular ligado ao próximo:
  - **concluída**: ✓ e trilha na cor da marca;
  - **próxima**: halo e selo "Próxima";
  - **pendente**: nó vazado;
- no topo, um **contador de dias** até a chegada (avião pousando) ou até a mudança
  (caminhão);
- marcar uma etapa avança o selo "Próxima" para a etapa seguinte.

Vale em todas as larguras. O controle de marcar continua sendo o mesmo `md-checkbox`, agora
redondo, com as mesmas ações. Por isso as provas antigas do plano continuam valendo.

A prova pegou um ícone que não existe na fonte embutida (`flight_takeoff`). Ele foi trocado
por `local_shipping`, também no cartão de saída da Início do desktop.

## Prova

As conferências rodaram no candidato `fea1feae…` (Rodadas 14 e 15 juntas):

| Prova | Resultado |
| --- | --- |
| Rodada 14 (11 verificações; 375, 768, 1024 e 1440, claro e escuro) | PASS, 55/55 |
| Rodada 15 (5 verificações; 375, 768, 1024 e 1440, claro e escuro) | PASS, 30/30 |
| Rodada 13 (375, 1024 e 1440) | PASS, 48/48 |
| Rodadas 02 e 01 | PASS (72/72 na 02) |
| Gate completo | PASS (lint, typecheck, build, test, secrets) |

A dica "Ctrl K" na busca e a fonte corrigida do "C" no painel Criar mudam a Início e o
Criar do desktop, que estão congelados como base visual. Até o novo congelamento, que
depende da aprovação das telas pelo usuário e acontece no fechamento do lote, a prova
visual estrita acusa essa diferença conhecida. A bateria completa também roda no
fechamento do lote.
