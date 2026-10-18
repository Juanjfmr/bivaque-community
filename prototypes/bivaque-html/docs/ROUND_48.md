# Bivaque — Rodada 48: bairro cheio no mapa

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-048.task.yml` (R1). Base: `13662fdc`.
Lote de volume.

**Veredito: PASS.**

## O que mudou

- **Folha do bairro (celular):** na metade e na tela cheia, mostra até 12 anúncios e termina num
  cartão "Ver todos os 41 · na lista, só deste bairro", que fecha a folha e abre a lista filtrada
  pelo bairro (o mesmo caminho de "Ver só este bairro na lista").
- **Diálogo do bairro (tablet e computador):** a lista vem em blocos de 24, com a contagem e o
  carregamento ao rolar da Rodada 45.
- **Bairros com poucos anúncios** ficam iguais.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 48 (2 verificações; 375 e 1440, claro) | PASS, 4/4 |
| Rodadas 41 e 31 (folha do bairro e mapa) | PASS, 16/16 e 12/12 |
| Gate (lint, tipos, testes, segredos) | PASS |

Captura: `.visual/bivaque-html-round48/telas/`.

## Fechamento do lote de volume (rodadas 45 a 48)

Uma revisão para o lote todo e a bateria completa (375 claro, 768 claro e 1440 escuro).

### Correções da revisão (nenhum item crítico ou alto)

| Severidade | Problema | Correção |
| --- | --- | --- |
| Média | A antecedência de 600 px não valia: quem rola é o `#main`, não a janela | O observador usa o `#main` (ou o diálogo) como raiz |
| Média | Blocos acrescentados ficavam sem os gestos (segurar, deslizar) | Os gestos passam pelos blocos novos; os laços ficaram idempotentes |
| Média | "Mostrar mais" no feed perdia o foco | O foco vai ao item novo |
| Média | Salvar trocava também o item do menu de segurar | O menu fica de fora |
| Baixa | Completar pela seta não religava o carregamento | Religa |
| Baixa | O diálogo do bairro reabria com o bloco antigo | Abre no primeiro bloco |
| Baixa | Carregamento pendente valia para uma lista redesenhada | Só vale para a lista em tela |
| Baixa | "Você viu os 30 perguntas" | Artigo concorda (as perguntas, as conversas) |
| Baixa | A contagem nova não era anunciada | Região viva fixa, só o texto muda |

### Pego pelas provas antigas e pela bateria

- **Bloco mínimo de 24 (R06):** uma lista curta que ganhava um item escondia o novo; corrigido.
- **R12 e R19:** falharam uma vez por disputa de processador e passaram sozinhas.
- **R21:** o "voltar" do diálogo de cidade, com a animação ligada, desfazia a troca de endereço
  da prova; o `go()` do harness confere e troca de novo.

Base visual nova em [VISUAL_BASELINE_R48](VISUAL_BASELINE_R48.md).
