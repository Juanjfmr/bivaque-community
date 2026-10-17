# Bivaque — base visual congelada no fechamento do lote mobile 2 (Rodadas 40 a 44)

Data: 17/10/2026. Aprovada pelo usuário ("Congelar e publicar"), depois da revisão do lote, das
correções e da bateria completa.

- **Arquivo:** `.visual/bivaque-html-round44/baseline/round44.html`.
- **SHA-256:** `eb4969db49e9dfb42c1d17c2b9ce1ad9d363ade4841725d5018b856e1ed7fbb1`.
- **Código:** o mesmo do commit que adiciona este registro. Sem o arquivo local, a base é
  remontada a partir dele (`scripts/bivaque-html/round13-baseline.mjs`).
- **Substitui** a base da Rodada 39 (`b71c2248…`) nas comparações estritas.

## O que mudou em relação à base da Rodada 39

Nas telas da comparação estrita, nada visível: Início e Salvos diferem só em subpixels da
decodificação das fotos (recortes conferidos lado a lado). As mudanças do lote ficam fora dessas
telas:

- galeria com gestos de app: arrastar para fechar, pinça e toque duplo (R40);
- folha do bairro sobre o mapa, com três alturas, e fundo que encolhe sob as folhas (R41);
- teclado certo em cada campo, preenchimento automático e vibração leve (R42);
- avisos pedidos com explicação antes e instalação como app (R43);
- busca em tela cheia com recentes, explorar e sugestões (R44).

Elas são cobertas pelas provas das Rodadas 40 a 44.

## Bateria do fechamento

- Rodadas 001 a 44: PASS, depois das correções registradas em [ROUND_44](ROUND_44.md).
- Provas antigas ajustadas para a folha dos avisos da R43, que abre depois de publicar pergunta,
  enviar pedido ou criar alerta: R04, R11, R12, R25 e R33 (ajudantes `skipPushAsk` e
  `dismissPushAsk`).
- A prova de execução falha só no defeito já registrado do HTML original congelado.
