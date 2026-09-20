# Indicações — correção Mobbin de 20/09/2026

Este registro substitui a proposta exploratória de usar um polegar com o rótulo `Indicar`.

## Referências observadas

- Nextdoor — Posting a recommendation: https://mobbin.com/flows/b12a50ef-727e-4be2-92d3-85ab55730c2d
- Nextdoor — Asking AI for local favorites: https://mobbin.com/flows/80e874ae-f568-4ad3-b0f9-9c91213c3f86
- Nextdoor — Home: https://mobbin.com/flows/f3c0a105-1443-4497-9f1c-20aa376762aa
- Nextdoor — Reporting a post: https://mobbin.com/flows/867693ef-fafa-46de-ae50-a84d3edcce7b

## Decisão de interação

- `Responder` abre a contribuição; o polegar não representa indicar.
- A resposta procura e vincula uma referência do Guia antes de ser enviada.
- Sem correspondência, a resposta é publicada imediatamente como `Ainda não está no Guia` e a
  referência candidata segue para curadoria humana.
- Aprovação ou mesclagem posterior liga retroativamente a resposta ao item canônico do Guia.
- O MVP não introduz `Isso ajudou?`, curtida ou polegar. `Resolveu meu pedido`, disponível à autora, é o único sinal de fechamento.
- `Denunciar` permanece no menu de overflow.
- A autora do pedido pode marcar `Resolveu meu pedido` sem depender da curadoria.

## Pranchas substituídas

- `01-web-inicio.png`: intenções explícitas e pedido com ação `Responder`.
- `44-mobile-publicacao.png`: escolha de intenção, busca no Guia e candidato fora do Guia.
- `45-web-publicacao.png`: busca no Guia antes do pedido e fallback para a comunidade.
- `74-web-guia-curadoria.png`: origem, deduplicação e aprovação humana.
- `80-web-recomendacoes.png`: resposta vinculada ou candidata, publicação imediata e revisão.

As versões anteriores foram preservadas em `history/2026-09-20-mobbin-indicacoes/`. A versão da
Home anterior ao ajuste de densidade e a prancha 80 anterior à remoção do feedback foram
preservadas em `history/2026-09-20-home-compacta/`.

## Ajuste de implementação

- Na Home de membro ativo, retorno relevante vem antes do lançador compacto de intenções.
- As duas ações não formam um hero permanente nem deslocam o feed para fora da dobra.
- Estado novo ou vazio pode usar explicações maiores.
- HeroUI fornece comportamento acessível; não define hierarquia, densidade ou aparência da tela.
- A implementação não está aceita sem operação real e comparação visual em 375, 768 e 1440.
