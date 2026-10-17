# Bivaque — Rodada 19: contador animado com avatares de quem indicou

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-019.task.yml` (R1). Base: `dce5c4f9`.
Sexto item da ordem aprovada. Referências: Number Ticker e componentes de prova social, do
21st.dev.

**Veredito: PASS.**

## O que mudou

- **Número que sobe ao aparecer:**
  - o HTML já traz o valor final; sem JavaScript ou com movimento reduzido, nada anima;
  - anima uma vez, só quando o número entra na tela, em 0,9 s;
  - redesenhar a mesma tela (salvar, tema, avisos) mostra o valor final sem recomeçar;
  - durante a animação o leitor de tela lê só o valor final.
- **Avatares de quem indicou:**
  - só pessoas que deixaram relato, até 3, e "+N" para o restante; ocultos do leitor de tela,
    porque o número já diz a contagem;
  - negócio sem relatos não mostra avatares;
  - os tons de cor dos dados (c1 a c4) ganharam pares com contraste de 4,5:1 ou mais.
- **Onde aparece:**
  - página do negócio, em todas as larguras: "N indicações da comunidade" com contador e
    avatares;
  - cartões de serviço da Início do desktop: contador e avatares;
  - cartão "famílias estão chegando": só o contador;
  - a Início do celular e do tablet não muda.

## Revisão independente

Sem CRITICAL nem HIGH.

- **MEDIUM corrigido:** o avatar c4 tinha contraste de 1,18:1 no tema claro. Agora todos os
  tons passam de 4,5:1, e a fonte subiu para 11 px.
- **MEDIUM corrigido:** o número voltava a 0 a cada redesenho da tela, como ao salvar. Agora
  só a primeira vez que a rota é desenhada anima.
- **MEDIUM corrigido:** o título do cartão de chegada pulava o escape quando começava com o
  contador. Agora o cartão recebe HTML já seguro, e os números são convertidos para inteiro.
- **MEDIUM corrigido:** a verificação "valor final fora da tela" passava sem verificar nada.
  Agora rola o `#main` e falha se o contador já estiver à vista no celular. Entraram
  verificações de redesenho no meio da animação e de valor hostil em "famílias chegando".
- **LOW corrigidos:**
  - leitor de tela sem números intermediários;
  - sem piscar o valor final por um quadro antes do zero;
  - observador desligado a cada desenho;
  - anel dos avatares na cor do cartão; borda visível em alto contraste.

Fora do escopo: a Início do celular (`features/home/views.js`) ainda escreve
`state.incoming` sem escape. Não muda o visual, mas fica para uma rodada do celular.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 19 (8 verificações; 375 claro e escuro, 768, 1440 claro e escuro) | PASS, 40/40 |
| Rodada 19 contra o build sem as correções | FAIL esperado: redesenho e valor hostil |
| Rodadas 13 e 09 (375, 768, 1440 claro e escuro) e 01 | PASS: 64/64, 16/16, PASS |
| Gate completo | PASS |

Candidato: `38eef2bf…`. A bateria completa e o novo congelamento visual acontecem no fechamento
do lote.
