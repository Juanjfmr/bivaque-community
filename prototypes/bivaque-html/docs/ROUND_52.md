# Bivaque — Rodada 52: Negócios e planos, Pessoas e equipe

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-052.task.yml` (R2: guarda o nome de quem é
convidado). Base: `ee09174a`. Lote do painel do dono.

**Veredito: PASS.**

## O que mudou

- **Negócios e planos** (`#dono/negocios`):
  - planos pagos, receita do mês, patrocinados e pedidos de orçamento, por cidade;
  - "Vencem em 7 dias", com "Lembrar" (fica no registro; nenhuma mensagem real sai);
  - todos os negócios, com plano, indicações e situação ("Com responsável" ou "Aguardando
    responsável"); o nome abre a página do negócio no app.
- **Receita coerente:** a da visão geral e a de Negócios e planos saem do mesmo cálculo (planos
  dos negócios do protótipo e os de exemplo das outras cidades): R$ 4.870 em todas, R$ 978 em
  Manaus.
- **Pessoas e equipe** (`#dono/equipe`):
  - moderação com a carga de cada um (o que você assumiu nas filas aparece aqui);
  - embaixadores por cidade e convites enviados;
  - "Convidar moderador", com nome e cidade.
- **"O que mudou"** leva às páginas: planos vencendo → Negócios e planos; Brasília → Cidades.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 52 (5 verificações; 375 e 1440, claro) | PASS, 10/10 |
| Rodadas 49 a 51 | PASS, 14/14, 8/8 e 8/8 |
| Gate (lint, tipos, testes, segredos) | PASS |

Capturas: `.visual/bivaque-html-round52/telas/`.
