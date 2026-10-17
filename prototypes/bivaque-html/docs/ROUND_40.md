# Bivaque — Rodada 40: galeria de fotos com gestos de app

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-040.task.yml` (R1). Base: `269c673b`.
Lote mobile 2. Referências: Photo Browser do Framework7; Perplexity, Fresha e Tripadvisor,
no Mobbin.

**Veredito: PASS.**

## O que mudou

- **A foto acompanha o dedo:**
  - para o lado, troca de foto com um deslize curto;
  - para baixo, a foto desce, o fundo esmaece e, passando de 120 px (ou num gesto rápido), a
    galeria fecha;
  - um arrasto curto volta ao lugar.
- **Ampliar:**
  - pinça (até 4x) e toque duplo (2,5x no ponto tocado);
  - ampliada, a foto se arrasta sem sair da área visível e as setas saem;
  - outro toque duplo volta ao tamanho normal.
- **Mouse e teclado:** clique duplo, Ctrl + roda (a pinça do trackpad) e as teclas +, - e 0.
- **Sem mudança:** miniaturas, contador, setas, foco preso, Esc e o voltar do navegador.

## Defeitos achados pela prova e corrigidos antes do commit

- **Toque duplo com a foto ampliada:** todo toque virava arraste, e o toque duplo não conseguia
  voltar ao tamanho normal. Agora o toque só vira arraste depois que o dedo anda.
- **Clique simples na foto fechava a galeria:** o ponteiro ficava preso ao palco no primeiro
  toque, e o clique ia para o palco. Agora ele só é preso quando o gesto começa.
- **Deslize rápido que chega sem movimento intermediário:** é reconhecido pela posição final.
- **Relógio dos gestos:** usa `performance.now()`, que não muda com o relógio do aparelho.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 40 (6 verificações; 375 e 1440, claro) | PASS, 12/12 |
| Rodada 18 (galeria original) | PASS, 20/20 (a prova passou a tocar no palco da foto, onde um toque de verdade cai) |
| Gate completo | PASS |

Capturas: `.visual/bivaque-html-round40/telas/`.
