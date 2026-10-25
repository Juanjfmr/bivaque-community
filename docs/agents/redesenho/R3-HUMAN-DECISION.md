# R3 — orçamento esgotado, 25/10/2026

**HUMAN_DECISION / bloqueada. Não pronta; nenhum pedido de merge.**

O contrato RED-003 fixa `retry_budget: 3` e `on_budget_exhausted: HUMAN_DECISION`.
O produtor encerrou por orçamento. O coordenador confirmou que os mesmos erros
de `declared-arrivals.sql:31` e `listing-alerts.sql:54` persistem nas três últimas
provas (7, 8 e 9), portanto não abre outra rodada automaticamente.

## Evidência confrontada

- Migration atual: SHA256 `56CAD1E65F941627836951DF1C93EDB61CC403BBB285BFB21787332D4F7D1FA3`.
- O replay chegou ao pgTAP nas iterações posteriores ao primeiro erro de dependência.
- Última prova: **154 arquivos, 1734 asserções executadas, Result: FAIL**; também há
  planos interrompidos por erros SQL. Isso não significa 1734 testes aprovados.
- Logs: `.visual/r3/test-db-7.log`, `test-db-8.log`, `test-db-9.log`.
- `db:lint` repetido pelo coordenador, pela fila: **exit 0**, sem erros de schema.
  Log `.visual/coordenacao/R3-db-lint-1.log`. Este resultado não substitui pgTAP.
- Gate completo solicitado pelo coordenador: **FAIL no lint**, quatro erros
  preexistentes dos scripts R1/R2 já reproduzidos no checkout R2 limpo. Typecheck,
  build, testes e secrets não foram executados por esse gate; o gate desta base
  ainda ignora variáveis públicas de processo e assinala build pulado sem `.env.local`.
  Log `.visual/coordenacao/R3-gate-bloqueado.log`; nenhum `.env.local` foi criado.
- Revisão independente anterior: oito HIGH, com reparos declarados pelo produtor
  ainda não aceitos em revisão final. Suíte antiga, cobertura integral por célula,
  golden completo e tipos públicos continuam pendentes.

## Decisão solicitada

Recomendação: autorizar um novo orçamento explícito de três tentativas **por lote
menor**, mantendo o DeepSeek como implementador e a revisão independente:

1. fixtures e contratos antigos remanescentes, preservando negativos e mapeamento;
2. permissões/transições restantes, golden integral e tipos públicos;
3. prova final pela fila, gate com classificação e nova revisão de segurança.

Sem essa decisão, R3 fica bloqueada. O app em demonstração continua independente.
Os arquivos são preservados em checkpoint de rascunho, sem publicar ou integrar.
