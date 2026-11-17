# Roteiro da revisão às cegas (DS-022)

O critério 2 de [LANCAMENTO.md](../../LANCAMENTO.md) julga cada jornada contra as telas do Nextdoor no
Mobbin. O revisor recebe **só imagens e a régua**: nunca o código, o spec, o cartão, o diff ou este arquivo.

## 1. Baixar o artefato

```sh
gh run list --branch <branch> --limit 5          # o run com o CI completo (label ci:full)
gh run download <run-id> -n visual-evidence -D .visual/cega
find .visual/cega -name '*.png' | wc -l          # telas do roteiro × 3 larguras
```

O job `CI` publica `.visual/` inteiro a cada execução; as capturas ficam em
`.visual/cega/<jornada>/<tela>-<largura>-claro.png`, jornada em `f02 f03 f06 f07 f08 f09 f10` e largura
em `375 768 1440`. Artefato pequeno ou vazio (o de 43969006143 tinha < 1 MB e zero imagens em f02, f06 e
f09) é falha da captura, não falta de tela: confira a contagem antes de julgar.

## 2. Montar o pedido

- Anexe as imagens de **uma jornada por vez**, na ordem do nome; identifique cada uma só pela largura e
  pelo nome da tela.
- Entregue a régua: [PADRAO-DE-TELA.md](PADRAO-DE-TELA.md), [IDENTIDADE-DAS-PECAS.md](IDENTIDADE-DAS-PECAS.md)
  e as referências do Mobbin citadas no cartão da jornada. Não conte o que mudou, o que foi consertado,
  qual tela é nova, de que lote veio nem quem escreveu.
- Peça o veredito **por tela**: "no nível" ou "abaixo da régua", com o motivo em uma linha e a
  referência do Mobbin que sustenta a comparação.

**Registrar.** Guarde no cartão da jornada a data, a origem (run e artefato) e a lista julgada —
ressalva sem tela citada não cumpre o critério 2.
