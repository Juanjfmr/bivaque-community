# Bivaque — Rodada 09: melhorias invisíveis

Data: 14/10/2026. Contrato: `docs/agents/tasks/HTML-009.task.yml` (R2). Base: `d9c9f262`.

**Veredito: PASS.** O pacote Material agora é reproduzível, as fotos mostram progresso acessível e o alto contraste do sistema é suportado, sem mudança no visual normal. Regressão completa e gate verdes.

## 1. Pacote Material reproduzível

- O pacote deixou de ser uma cópia congelada sem origem e passou a ser **gerado por
  `scripts/bivaque-html/build-material.mjs`**, a partir de `@material/web` 2.5.0 e
  `esbuild` 0.28.2. As dependências ficam numa pasta isolada (`.visual/material-build`,
  ignorada pelo Git), instaladas com `npm ci` a partir do **lockfile versionado** em
  `scripts/bivaque-html/material-build/`. O script recusa o build se qualquer versão
  instalada, inclusive `lit`, `lit-html` e `tslib`, divergir desse lockfile.
- Duas execuções geraram o mesmo arquivo byte a byte (SHA256 `ec6322c4…`), com as 188
  notas de licença preservadas.
- Componentes: **32 → 38**. O pacote antigo registrava 32; a contagem inicial de 33/34
  incluía `md-tab`, que é atributo, e `md-menu-item`, que era mencionado mas não
  registrado. Entraram `md-menu-item`, `md-input-chip`, `md-suggestion-chip`,
  `md-slider`, `md-fab` e `md-secondary-tab`. Os 5 últimos ficam disponíveis para a
  Rodada 10 e **não aparecem no visual desta rodada**.
- Peso: o pacote foi de 363 KB para 432 KB, e o HTML de 2,80 MB para 2,87 MB (+2,5%),
  dentro do orçamento de +120 KB verificado pela prova.

## 2. Indicador de processamento de fotos

Ao escolher fotos no editor de anúncio, aparece "Preparando foto 2 de 3…" com
`md-circular-progress`. A região de aviso (`role=status`) fica sempre presente e só o
texto muda, para o leitor de tela anunciar. Arquivos acima de 12 MB são recusados antes
e não entram na contagem.

## 3. Alto contraste do sistema (`forced-colors`)

Arquivo novo e isolado: `styles/high-contrast.css`, que só vale quando o sistema está em
alto contraste. Nesse modo, o navegador remove os fundos e o app perdia significado; as
regras devolvem contorno aos selos, balões, aviso, botão Criar e cartões, sublinham a aba
ativa, mantêm as **barras de resultado das enquetes** e reforçam o foco. O modo normal não
muda.

## Revisão independente

Não houve achado CRITICAL nem HIGH.

- **MEDIUM:** a reprodutibilidade era parcial, porque `lit` e `tslib` não estavam
  fixados. Corrigido com o lockfile versionado e a conferência de todas as versões.
- **LOW:** a contagem errava com arquivo recusado; o aviso que aparece e some podia não
  ser anunciado; e o comentário falava em 33 componentes. Os três foram corrigidos, e
  há um checkpoint novo para a contagem.
- **LOW** não corrigido: a checagem de registro dentro do script é estática e poderia
  contar uma consulta como se fosse registro. A verificação definitiva é a da prova no
  navegador (`material-components-registered`).

## Prova

| Prova | Resultado |
| --- | --- |
| Build do Material (versões e lockfile) e build do HTML | PASS (mesmo SHA256 em duas execuções; versões conferidas contra o lockfile) |
| Rodada 09, matriz completa | PASS, 24/24, 0 erros JS, 0 requisições externas |
| Rodada 08 (movimento) | PASS, 42/42 |
| Rodadas 07 / 06 / 05 / 04 / 03 / 02 | 48/48 / 36/36 / 72/72 / 78/78 / 108/108 / 71/72 na bateria: a captura mostrou o reinício aplicado e o teste lendo antes da gravação assíncrona; a espera fixa virou espera por condição, e o checkpoint passou 12/12 em duas execuções completas |
| Rodadas 01 e 00.1 | PASS / PASS |
| Visual (referência congelada, com o pacote reconstruído) | PASS (o pacote reconstruído não alterou a renderização de referência) |
| Gate completo | PASS (lint, typecheck, build, test, secrets) |

Candidato: `814850d8168ba3b74645ba42742205e4bdb45d57b171c51d7257fe3c02db75ff`.

## Movido para a Rodada 10

Listas oficiais (`md-list`) e o botão de salvar oficial **não são invisíveis**: trocar a
estrutura das linhas e dos botões muda o visual. Por isso foram para a Rodada 10, que tem
aprovação visual.
