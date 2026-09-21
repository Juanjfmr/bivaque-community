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

## Divergência registrada em 21/09/2026 — leia antes de implementar a prancha 80

O `ADR-20260921-curadoria-assistida-do-guia` (aprovado, R3) **descarta o fluxo voltado ao membro**
que a seção "Decisão de interação" acima descreve. O texto original fica neste arquivo como registro
histórico da decisão de 20/09, **não** como entrega pendente.

**Não será construído**, e a prancha 80 **painel 2** (referência candidata, chip `Ainda não está no
Guia`, "Publicar resposta e enviar candidata à revisão") **não será implementada**:

| Item de 20/09 | Situação após o ADR-20260921 |
|---|---|
| "A resposta procura e vincula uma referência do Guia antes de ser enviada" | **descartado** — a resposta é uma resposta; quem cura é o sistema |
| "Sem correspondência, a resposta é publicada imediatamente como `Ainda não está no Guia`" | **descartado** — a policy de leitura só expõe `status='approved'`, então o membro não leria a própria candidata; a etiqueta afirmaria o que o servidor não sabe |
| "Aprovação ou mesclagem posterior liga retroativamente a resposta ao item canônico" | **descartado como fluxo do membro** — a religação continua existindo, mas pelo operador (`source_reply_id`), não por ação de quem respondeu |
| "A autora do pedido pode marcar `Resolveu meu pedido` sem depender da curadoria" | **mantido em substância**; a redação do rótulo é decisão em aberto (ver abaixo) |

**Permanecem válidos** desta nota: `Responder` abre a contribuição; o MVP não introduz polegar,
curtida nem `Isso ajudou?`; `Denunciar` fica no menu de overflow; e a implementação não está aceita
sem operação real e comparação em 375, 768 e 1440.

A alimentação do Guia passa a ser trabalho de sistema, invisível ao membro: um job agendado lê
respostas com sinal de qualidade, extrai nome e categoria, deduplica contra o Guia da localidade
**antes** de escrever e grava `pending` com `source='ai'`, `confidence` e `source_reply_id`. Quando o
operador aprova, a resposta que originou a candidata passa a exibir o vínculo sozinha. Os dois
caminhos que já existiam — sugestão deliberada em `/guide/sugerir` e promoção pelo operador —
continuam sendo os caminhos de entrada do Guia.

**Continuam fora do escopo desta nota, e não são resolvidos aqui:**

- o conflito de redação entre `Ajudou a resolver` (`ADR-20260909`, aprovado, R3) e `Resolveu meu
  pedido` (pranchas de 20/09) é **decisão separada do dono**;
- o painel 3 da prancha 45 e o painel 2 da 80 seguem sendo referência de composição para o que
  existir, mas o painel 2 da 80 não tem contraparte a construir.
