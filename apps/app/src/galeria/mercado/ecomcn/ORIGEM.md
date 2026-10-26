# Blocos da bancada de Mercado

Fontes consultadas em 26/10/2026, licença MIT preservada em LICENSE:

- https://ecomcn.vercel.app/r/product-grid.json
- https://ecomcn.vercel.app/r/filter-panel.json
- https://ecomcn.vercel.app/r/filter-sheet.json
- https://github.com/its-Inbarajan/ecomcn

A grade preserva o slot de renderização e os estados de carga/vazio. O cartão
usa Card, Badge e Button do shadcn já presentes no Bivaque. O painel preserva
composição, chips, foco e expansão das listas; usa apenas facetas de lista,
incluindo faixas de preço. Removidos controles de estoque, cores e medidas que
não são usados nesta cena. A folha preserva filtros provisórios e aplicação.

Não foi incorporado use-filter-params: os filtros são controlados pelo React
na bancada, sem escrever no histórico do navegador. Traduzidos textos, trocados
ícones por Material Symbols e ajustados os tokens e alvos de toque. Nenhuma
dependência instalada. A cena não substitui Mercado nem aprova a onda 1.

O acionador sintético de carga da bateria é ocultado somente enquanto esta
cena está montada. Ele não pertence ao produto nem à composição avaliada.

Sheet e Checkbox em components/ui derivam do registro oficial radix-nova;
imports de cn apontam para o helper local. Os demais componentes ui são os já
instalados. A origem do código é verificável; não se atribui ao ecomcn a cena
inteira nem se afirma cópia integral dos blocos.
