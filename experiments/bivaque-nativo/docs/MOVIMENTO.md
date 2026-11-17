# Movimento no Bivaque nativo

Os arquivos Rive devem ser exportados como `botao.riv`, `chip.riv`, `carregando.riv` e
`vazio.riv`, registrados em `assets/rive/index.ts`. Todas as durações são curtas e respeitam
redução de movimento no app.

| Máquina      | Estados                                              | Inputs                                                                             | Transições                                                                                                                                          |
| ------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `botao`      | `parado`, `pressionado`, `enviando`, `feito`, `erro` | `pressionado` (boolean), `enviando` (boolean), `feito` (trigger), `erro` (trigger) | `parado`→`pressionado` em 120 ms; retorno em mola 180 ms; `enviando` dura até input mudar; `feito` desenha check em 220 ms; `erro` treme em 220 ms. |
| `chip`       | `inativo`, `ativo`                                   | `ativo` (boolean), `pressionado` (boolean)                                         | Cor e escala interpolam em 220 ms; pressão reduz escala a 0,98 em 120 ms.                                                                           |
| `carregando` | `onda`                                               | `progresso` (number, opcional)                                                     | Três pontos percorrem uma onda em 1000 ms e repetem; parar quando o carregamento termina.                                                           |
| `vazio`      | `repouso`, `brilho`                                  | `reproduzir` (boolean)                                                             | Barraca permanece estática; estrela pulsa entre 70% e 100% em 2000 ms, em loop enquanto reproduzir.                                                 |

Use transições sem overshoot pronunciado. O app usa Lottie ou Reanimated como fallback enquanto
os `.riv` não existem.
