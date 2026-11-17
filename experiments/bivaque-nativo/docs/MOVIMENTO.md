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

## Lottie (Creator)

Composições editáveis no LottieFiles Creator (workspace Drafts de Juan Felipe):

| Arquivo local | Cena editável | ID | Especificação |
| --- | --- | --- | --- |
| `assets/lottie/carregando.json` | [Abrir Carregando](https://creator.lottiefiles.com/?fileId=7a0276da-d301-4d81-b53a-5fdfc7e987af) | `7a0276da-d301-4d81-b53a-5fdfc7e987af` | 120 × 60, 60 fps, 1 s, onda em loop |
| `assets/lottie/sucesso.json` | [Abrir Sucesso](https://creator.lottiefiles.com/?fileId=6fc541d0-784b-431f-b401-536ad9008a98) | `6fc541d0-784b-431f-b401-536ad9008a98` | 96 × 96, 60 fps, 0,9 s, anel e check |
| `assets/lottie/vazio.json` | [Abrir Estado vazio](https://creator.lottiefiles.com/?fileId=902ad68b-5b87-410b-a9e6-5ae88f260dca) | `902ad68b-5b87-410b-a9e6-5ae88f260dca` | 240 × 180, 60 fps, 2,4 s, barraca em loop |

Os três JSON foram exportados em formato Lottie pelo Creator; as cenas correspondentes ficam editáveis no Creator pelos links acima.
