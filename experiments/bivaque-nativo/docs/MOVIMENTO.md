# Movimento no Bivaque nativo

Artboards: `botao` 56 × 56 dp; `chip` conteúdo com altura mínima de 44 dp; `carregando` 48 × 24 dp; `vazio` 240 × 180 dp. Arquivos exatos: `botao.riv`, `chip.riv`, `carregando.riv`, `vazio.riv` em `assets/rive/`.

| Máquina | Estados e inputs | Cores claro / escuro | Curva e duração |
| --- | --- | --- | --- |
| `botao` (`botao.riv`) | `parado`, `pressionado`, `enviando`, `feito`, `erro`; `pressionado` e `enviando` boolean, `feito` e `erro` triggers | Ação `#26424F` / `#E8ECEE`; texto `#FFFFFF` / `#101417`; Brasa `#B84A3A` / `#E07A5A` | toque: mola 180 ms; check linear 220 ms; tremor 220 ms em trechos de 45 ms |
| `chip` (`chip.riv`) | `inativo`, `ativo`; `ativo` e `pressionado` boolean | inativo `#F3F5F6` / `#101417`; ativo `#26424F` / `#E8ECEE`; texto `#1C262B` / `#101417` | cor/escala ease-in-out 220 ms; toque ease-out 120 ms |
| `carregando` (`carregando.riv`) | `onda`; `progresso` number opcional | pontos `#26424F` / `#E8ECEE` | ease-in-out 1000 ms em loop; para quando concluir |
| `vazio` (`vazio.riv`) | `repouso`, `brilho`; `reproduzir` boolean | superfície `#F3F5F6` / `#101417`; brilho `#FFFFFF` / `#1A2024` | estrela ease-in-out 2000 ms em loop enquanto reproduzir |

Redução de movimento interrompe loops e troca estados diretamente.

## Como ligar

Exporte o `.riv` para `assets/rive/` e registre em `assets/rive/index.ts` com `require`, por exemplo `botao: require("./botao.riv")`. `ARQUIVOS_RIVE` é o mapa único; sem arquivo, o componente usa fallback Reanimated.
