# Auditoria da marca nas telas

Este contrato complementa `docs/agents/VISUAL_GUIDE.md` §9. Ele avalia a identidade oficial
sem liberar a migração geral de tema, shell ou tokens ativos.

## O que a captura mede

- presença de uma assinatura oficial em cada tela capturada;
- substituição pendente de marcas recompostas com ícone, fonte ou texto;
- tamanho mínimo da composição usada;
- contraste coerente entre a versão do logo e o fundo;
- uso indevido do Pátio como assinatura principal;
- identificação semântica fornecida pelo componente `BrandMark`.

Ausência da marca oficial e wordmark provisório entram como dívida **média**. Uma assinatura
oficial aplicada abaixo do mínimo, sem contraste ou com Pátio no lugar do Glifo é erro **alto**,
porque já constitui uso incorreto.

> **Atualizado em 2026-08-30.** Este parágrafo condicionava a dívida a
> `FRONTEND-VISUAL-AAA` estar congelado. O card saiu de `frozen` por autoridade
> explícita do owner, e a migração de paleta e tipografia para a identidade
> oficial já está feita (`ADR-20260828-sistema-visual-editorial`, emendado). O
> que **continua** devendo é o passo 3 da Ativação futura: substituir os
> wordmarks provisórios pelo componente `BrandMark`, e os ícones/manifest do
> passo 4. Enquanto isso, a dívida média acima segue valendo — pelo wordmark
> provisório, não pelo congelamento.

## O que exige julgamento visual

Em cada fold de 375, 768 e 1440 px, registrar:

1. se a marca é reconhecível sem disputar com a ação primária;
2. se a composição escolhida corresponde ao espaço disponível;
3. se a área de proteção de `X` é perceptivelmente preservada;
4. se o Brasa continua restrito ao limiar estrutural;
5. se o Pátio enquadra conteúdo sem parecer um segundo logo;
6. se fotografia ou fundo preservam contraste e leitura em três segundos.

## Seleção por escala

| Largura disponível | Assinatura |
|---|---|
| 120 px ou mais | Principal, stacked ou wordmark conforme composição |
| 72–119 px | Horizontal compacto |
| 32–71 px | Símbolo mestre |
| 16–24 px | Símbolo otimizado correspondente |

Não medir apenas a caixa do arquivo: conferir a leitura real na captura.

## Evidência mínima do veredito

O relatório de uma tela tocada deve informar:

- composição e versão de cor usadas;
- tamanho renderizado nos três viewports;
- contraste do fundo;
- presença ou ausência de clear space;
- qualquer marca provisória ainda encontrada;
- decisão: `PASS`, `FIX` ou `DEFERRED — FRONTEND-VISUAL-AAA`.

`DEFERRED` só vale para ausência/substituição pendente. Uso incorreto de um arquivo oficial
nunca pode ser adiado como dívida estética.
