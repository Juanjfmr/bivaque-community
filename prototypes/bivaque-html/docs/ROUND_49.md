# Bivaque — Rodada 49: Painel do Bivaque

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-049.task.yml` (R1). Base: `324b690d`.
Lote do painel do dono. Maquete v2 aprovada: "Sim, como na v2". Referências: Shopify, Reddit,
Employment Hero, Fresha e Klaviyo, no Mobbin.

**Veredito: PASS.**

## Por que a v2

A primeira maquete morava dentro do app e tinha botões de um clique para decisões sérias. A v2,
aprovada, segue os consoles maduros: área própria, a métrica que define o Bivaque no centro,
"O que mudou" no lugar de atividade recente e revisão com contexto antes de decidir.

## O que mudou

- **Entrada:** Você → Controles do protótipo → "Ver como dono do Bivaque" (rota `#dono`).
- **Fora da navegação do app:** a barra de cima, a lateral, a de baixo e o Criar somem; o console
  tem a própria navegação e "Voltar ao app".
- **Visão geral:**
  - "Chegadas atendidas": quantas famílias que chegaram tiveram resposta ou contato na primeira
    semana, com meta de 80% e quebra por cidade;
  - famílias ativas, perguntas resolvidas em 24 h e receita dos planos, com tendência;
  - "O que mudou": o que saiu do normal, com a ação ao lado;
  - filtro por cidade, que muda a métrica principal, as métricas e a fila;
  - "Dados de exemplo" à vista: o protótipo não tem dados de várias cidades nem de receita.
- **Precisa de você:** fila com prazo (atrasada em vermelho) e abas por tipo. "Revisar" abre o
  painel lateral (no celular, a folha de baixo):
  - denúncia: as denúncias com motivo, abrir o anúncio, "Dispensar" ou "Remover" com motivo;
  - verificação: documento (exemplo), o que conferir, histórico; aprovar, recusar com motivo ou
    pedir outro documento;
  - página reivindicada: o que conferir; aprovar marca a página como do responsável;
  - perguntas paradas há 48 h: as perguntas e "Chamar embaixadores", que avisa quando a cidade
    não tem embaixador.
- **Denúncia de verdade no app:** antes, só um aviso de dependência. Agora o formulário pede o
  motivo, registra e a denúncia entra na fila do dono; denunciar de novo o mesmo conteúdo avisa
  que já está em revisão.
- **Celular:** a fila vem antes das métricas.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 49 (7 verificações; 375 e 1440, claro) | PASS, 14/14 |
| Rodadas 06, 11 e 16 (denúncia; a 11 adaptada ao formulário com motivo) | PASS, 12/12, 26/26 e 18/18 |
| Gate (lint, tipos, testes, segredos) | PASS |

Capturas: `.visual/bivaque-html-round49/telas/`. Maquetes: `.visual/bivaque-html-owner/`.
