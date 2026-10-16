# Bivaque — Rodada 23: filtros em pílulas

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-023.task.yml` (R2). Base: `fdb6dba0`.
Implementa a maquete aprovada pelo usuário: `.visual/bivaque-html-round23/maquete/`. Os
esqueletos de carregamento passam para a Rodada 24.

**Veredito: PASS.**

## O que mudou

- **Barra de pílulas** logo abaixo do título.
  - Imóveis: Filtros, Tipo, Total por mês, Quartos, Bairro, Disponível, Aceita pets e Mobiliado.
  - Desapegos: Filtros, Categoria, Preço, Estado, Retirada e Bairro.
  - A pílula mostra o valor escolhido ("Até R$ 3.000", "2+ quartos"), e "Filtros" mostra
    quantos filtros estão ativos.
  - No celular a barra rola de lado; no desktop quebra em linhas.
- **Painéis:**
  - cada pílula abre só o seu filtro: folha que sobe de baixo no celular, painel suspenso logo
    abaixo da pílula no desktop;
  - "Filtros" abre tudo: tela cheia no celular, painel lateral no desktop;
  - o botão mostra a contagem antes de aplicar ("Ver 4 imóveis");
  - fechar, Esc ou Voltar descartam o que não foi aplicado, e o Voltar fecha só o painel;
  - o foco volta para a pílula, e os atalhos C, Ctrl K e "/" não abrem nada por baixo.
- **Preço:**
  - faixas prontas ("Até R$ 3.000"), mínimo e máximo digitáveis e o slider para ajuste fino;
  - em imóveis vale o total do mês, aluguel mais condomínio.
- **Disponível para morar** (novo nos imóveis):
  - filtros: agora, até 30 dias, até 60 dias ou até uma data;
  - o editor tem o campo opcional, e o cartão e o detalhe mostram "Disponível agora" ou
    "Disponível a partir de 12/11".
- **Atalhos de um toque:** Aceita pets e Mobiliado.
- **Bairro:** vários de uma vez.
- **Ordenar** fica junto da contagem ("2 imóveis encontrados · Mais recentes").
- **Selos nos cartões:** disponibilidade dos imóveis e retirada dos desapegos.
- **Subtítulos:** "Para alugar em Manaus" e "À venda em Manaus". Saiu "de quem está de
  mudança", porque nem todo desapego é mudança.
- **Filtros por tela:** cada tela guarda os próprios filtros. Antes, o preço escolhido em Imóveis
  aparecia em Desapegos.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 23 (11 verificações; 375 e 1440, claro) | PASS, 22/22 |
| Rodada 22, sem as verificações dos controles antigos | PASS, 10/10 |
| Rodada 21 | PASS, 10/10 |
| Gate completo | PASS |

Pendente para o fechamento do lote: a verificação do slider de preço na Rodada 10, que usava o
slider na própria tela do catálogo, precisa passar a usar o painel. Candidato: `d6d0d9dd…`.
