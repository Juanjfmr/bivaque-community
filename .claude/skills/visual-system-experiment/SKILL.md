---
name: visual-system-experiment
description: >
  Run a visual design experiment (EXP): several isolated candidates against one
  frozen visual contract, judged blind against the audit rubric. Use when
  choosing a direction for a screen or a system-wide visual decision — not for
  ordinary UI fixes, which are plain contract work.
---

# visual-system-experiment

Experimento visual serve para **decidir direção**, não para consertar tela. Correção de
tela é contrato comum (`execute-task`).

O protocolo geral está em `experiment-protocol`. Aqui ficam as especificidades visuais.

## Contrato congelado — o que nunca é livre

- **Tokens.** `docs/agents/DESIGN_SPEC.md` é a fonte da verdade. Valor cru no lugar de token
  invalida o candidato, por melhor que pareça.
- **HeroUI v3** é a única biblioteca de componentes. Wrapper de `apps/web/app/components/bivaque/`
  antes de importar HeroUI direto — o wrapper é o que mantém o sistema coerente.
- **Acessibilidade é eliminatória**, não estética: alvo de toque, contraste, foco visível,
  ordem de leitura. Reprovou aqui, não compete por mérito.
- **Três viewports**: 375 / 768 / 1440. Candidato que só funciona em um não é candidato.

## Produção

Cada `visual-designer` trabalha isolado, sem ver os outros. Entrega: diff dentro da
fronteira, `gate --fast` verde, e uma justificativa **sem se identificar** — o julgamento é cego.

## Medida

```sh
node scripts/visual/loop.mjs          # gates -> build -> serve -> screenshot -> auditoria
node scripts/visual/loop.mjs --fast   # captura contra servidor já rodando
```

A auditoria determinística de `.visual/<run>/` é a parte objetiva da comparação: contagem
de achados por severidade, por candidato, no mesmo conjunto de rotas.

**Nunca** dirija o browser por fora do loop: é o gatilho do perfil fantasma "Visual Capture",
que quebra seis asserts de pgTAP parecendo regressão real.

## Julgamento

A régua está em `references/evaluation-rubric.md`. Ordem: eliminatórios → objetivo → ofício.
Termina em decisão humana, sempre.
