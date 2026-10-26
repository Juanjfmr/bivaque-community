# APP-007 — bloqueio do fechamento, 26/10/2026

Os três defeitos da V1 foram corrigidos; o fechamento técnico continua **FAIL**.
Três execuções completas do gate falharam por timeout, sem alterar os limites:

1. Importação de `scripts/visual/capture.mjs` em dois testes antigos do web:
   1.724/1.726 unitários; os mesmos dois arquivos passaram isolados, 26/26.
2. Varredura `keeps declared product-boundary terms out of product source`:
   188/189 de privacidade. O arquivo inteiro passou isolado, 6/6 em 2,18 s.
3. Mesmo caso de privacidade com `VITEST_MAX_WORKERS=1`: 5.849 ms para limite
   de 5.000 ms; 188/189. Unitários 1.726/1.726, app 84/84, mobile 76/76 e
   web 19/19 passaram. Lint, tipos e os dois builds passaram nas três tentativas.

Logs: `.visual/coordenacao/APP-REAL-C1-gate-timeouts.log`,
`APP-REAL-C1-gate-privacidade-timeout.log` e `APP-CODEX-final-gate.log`.
Focais: `APP-REAL-C1-gate-timeouts-focal.log` e
`APP-REAL-C1-privacidade-focal.log`, no mesmo diretório.

O arquivo de privacidade não foi alterado. Isso não prova que a lentidão já
ocorria na base limpa: a influência da árvore V1 ainda não foi isolada.
Não aumentar timeout, excluir fontes novas ou trocar a regra por falso PASS.

## Lista única para retomada

1. Comparar a varredura com a base limpa em ambiente isolado, sem outro escritor.
   Medir coleta, leitura e regex separadamente; investigar a leitura antes da
   exclusão em `tests/privacy/product-boundaries-and-pii.test.ts:55` e a repetição
   da coleta a cada `scan`. São hipóteses de custo, não causas comprovadas.
2. Se necessário, propor uma alteração pequena no instrumento que preserve todas
   as fontes, exclusões e asserções. Obter revisão de outro modelo antes de usá-la
   como prova. Não alterar o app para contornar a auditoria.
3. Rodar o gate canônico completo e a conferência de cobertura. O orçamento
   APP-007 de três tentativas está encerrado: **HUMAN_DECISION** para nova rodada.
   Não commitar o código como aprovado nem iniciar nova cadeia para esconder
   repetição do mesmo bloqueio.

O refino visual é outro pendente: fotos/placeholders, coluna lateral do Início,
ações por rota no topo, painel de cidade e diferenças de layout das telas V1.
As capturas novas mostram esses limites; não existe aceite visual do dono.
