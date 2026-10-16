# Bivaque — Rodada 25: alerta de busca salva

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-025.task.yml` (R1). Base: `58526f37`.
Primeiro item do lote B. Referências do Mobbin: buscas salvas com notificação (Vestiaire
Collective) e confirmação curta com ação (Insight Timer).

**Veredito: PASS.**

## O que mudou

- **Avise-me:**
  - com filtros ativos em Imóveis ou Desapegos, uma faixa logo abaixo da contagem pergunta
    "Quer saber quando aparecer outro imóvel assim?";
  - sem filtros, a faixa não aparece, porque um alerta sem filtro não ajuda;
  - criar o alerta mostra a confirmação com desfazer, e a faixa passa a dizer "Alerta ativo
    para esta busca · Gerenciar".
- **Alertas de busca em Você:**
  - cada alerta tem um nome legível, como "Imóveis · Casa · até R$ 3.000 · aceita pets", e
    quantos anúncios cabem nele hoje;
  - é possível pausar os avisos, abrir o alerta (que reaplica os filtros) e excluir, com
    desfazer dentro da própria lista.
- **Aviso na central:**
  - um anúncio novo de outra pessoa que cabe num alerta ligado vira aviso na central da
    Rodada 17;
  - no protótipo, a chegada é simulada pelo painel ("Simular anúncio para um alerta"), que monta
    um anúncio que cabe no primeiro alerta ligado;
  - alerta pausado não avisa.
- Tudo fica só no aparelho.

## Defeito achado pela prova

Excluir um alerta dentro da lista mostrava o desfazer no aviso de rodapé, por baixo do diálogo,
sem como tocar nele. O desfazer agora fica na própria lista.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 25 (6 verificações; 375 e 1440, claro) | PASS, 12/12 |
| Gate completo | PASS |

Pelo método enxuto, a revisão independente e as provas antigas rodam no fechamento do lote B.
