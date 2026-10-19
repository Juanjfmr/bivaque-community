# Bivaque — Rodada 51: Cidades do Painel do Bivaque

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-051.task.yml` (R2: guarda o nome de quem é convidado). Base: `899e66a0`.
Lote do painel do dono.

**Veredito: PASS.**

## O que mudou

- **Página Cidades** (`#dono/cidades`), na navegação do console:
  - tabela com famílias, chegadas em 60 dias, chegadas atendidas, perguntas sem resposta e
    embaixadores;
  - saúde de cada cidade ("Saudável", "Atenção", "Precisa de ajuda"); a pior vem primeiro;
  - no celular, cada cidade vira um cartão com os rótulos.
- **Detalhe da cidade**, no painel lateral:
  - os números da cidade e os embaixadores (ou "Ninguém ainda");
  - "Convidar embaixador": só o nome, gravado no registro do dono e mostrado na tabela
    ("+1 convite");
  - "Ver perguntas paradas": abre Filas já filtrada pela cidade e pelo tipo.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 51 (4 verificações; 375 e 1440, claro) | PASS, 8/8 |
| Rodadas 49 e 50 | PASS, 14/14 e 8/8 |
| Gate (lint, tipos, testes, segredos) | PASS |

Capturas: `.visual/bivaque-html-round51/telas/`.
