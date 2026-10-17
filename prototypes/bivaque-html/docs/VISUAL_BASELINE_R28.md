# Bivaque — base visual congelada no fechamento do lote B (Rodadas 25 a 28)

Data: 16/10/2026. Aprovada pelo usuário ("Congele"), depois da revisão do lote, das correções e da
bateria completa.

- **Arquivo:** `.visual/bivaque-html-round28/baseline/round28.html`.
- **SHA-256:** `57f4e391d25238264c86801e60851e072abf1df7ae6c74a1f825f53b67b217f8`.
- **Código:** o mesmo do commit que adiciona este registro. Sem o arquivo local, a base é
  remontada a partir dele (`scripts/bivaque-html/round13-baseline.mjs`).
- **Substitui** a base da Rodada 24 (`4678825f…`) nas comparações estritas.

## O que mudou em relação à base da Rodada 24

| Tela (comparação estrita) | Mudança |
| --- | --- |
| Você | Linha nova "Alertas de busca" (R25) |
| Início, Criar, Guia, Agenda, Salvos e Meus anúncios | Iguais; as pequenas diferenças de pixel nas fotos são ruído de decodificação |

As outras mudanças do lote ficam fora das telas da comparação estrita:

- faixa "Avise-me" nos filtros (R25);
- plano com anel, visível só no modo chegando ou saindo (R26);
- imóvel em etapas (R27);
- explicação do selo verificado (R28).

Elas são cobertas pelas provas das Rodadas 25 a 28.

## Bateria do fechamento

- Rodadas 001 a 28: PASS.
- A prova de execução falha só no defeito já registrado do HTML original congelado
  (`open-thread`).
- Uma verificação da Rodada 12 (`tampered-indication-group-rejected`) falhou uma vez em 1440
  escuro e passou 6 de 6 repetida isoladamente: instabilidade de tempo ao ler o aviso de rodapé,
  sem relação com o lote.
